// routes/mps.js
const express = require('express');
const pool = require('../db'); // Use the pool from db.js
const router = express.Router();

// Helper to format date fields and prevent timezone issues
const formatDate = (row) => {
    if (!row) return null;

    let formattedRow = { ...row };

    // Fields to format:
    const dateFields = ['planned_start_date', 'planned_end_date']; 

    dateFields.forEach(field => {
        if (formattedRow[field]) {
            try {
                // Use a try-catch for robustness, in case the date string is malformed
                const dateObj = new Date(formattedRow[field]);
                
                if (!isNaN(dateObj)) {
                    // Calculate the user's local timezone offset in milliseconds
                    const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000; 
                    
                    // Adjust the date time by subtracting the offset. This forces the date
                    // to be interpreted as the local date when .toISOString() is called.
                    const localDate = new Date(dateObj.getTime() - userTimezoneOffset);
                    
                    // Format to YYYY-MM-DD
                    formattedRow[field] = localDate.toISOString().split('T')[0];
                } else {
                    // Handle invalid date strings
                    formattedRow[field] = null;
                }
            } catch (e) {
                console.error(`Date formatting error for ${field}:`, e);
                formattedRow[field] = null;
            }
        }
    });
    
    return formattedRow;
};


// GET all schedules
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM "MANM".mps ORDER BY planned_start_date ASC, schedule_id ASC');
        // Apply formatting to all rows
        res.json(result.rows.map(formatDate));
    } catch (err) {
        console.error("Error fetching schedules:", err.message);
        next(err);
    }
});

// GET single schedule by schedule_id
router.get('/:scheduleId', async (req, res, next) => {
    try {
        const { scheduleId } = req.params;
        const result = await pool.query('SELECT * FROM "MANM".mps WHERE schedule_id = $1', [scheduleId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        // Apply formatting to the single row
        res.json(formatDate(result.rows[0]));
    } catch (err) {
        console.error("Error fetching schedule:", err.message);
        next(err);
    }
});

// POST a new schedule
router.post('/', async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { product_name, order_number, planned_start_date, planned_end_date, priority, workstation, supervisor, status } = req.body;
        
        if (!product_name || !order_number) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Missing required fields (product_name, order_number)' });
        }

        // ***** Schedule ID Generation Logic *****
        const maxIdResult = await client.query(
            'SELECT MAX(CAST(SUBSTRING(schedule_id FROM \'PS-\\d{4}-(\\d+)\') AS INTEGER)) as max_num FROM "MANM".mps WHERE schedule_id ~ \'^PS-\\d{4}-\\d+$\''
        );
        
        const maxId = maxIdResult.rows[0]?.max_num || 0;
        const nextId = (maxId + 1).toString().padStart(3, '0');
        const year = new Date().getFullYear();
        const newScheduleId = `PS-${year}-${nextId}`;

        const scheduleResult = await client.query(
            `INSERT INTO "MANM".mps (schedule_id, product_name, order_number, planned_start_date, planned_end_date, status, priority, workstation, supervisor)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [newScheduleId, product_name, order_number, planned_start_date, planned_end_date, status || 'Scheduled', priority, workstation, supervisor]
        );
        
        await client.query('COMMIT');
        // Apply formatting before sending the response
        res.status(201).json(formatDate(scheduleResult.rows[0]));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error adding schedule:", err.message);
        if (err.code === '23505') {
            return res.status(409).json({ error: `A record with that ID or key already exists.` });
        }
        next(err);
    } finally {
        client.release();
    }
});

// PUT (update) a schedule - WITH INVENTORY DEDUCTION & ORDER STATUS UPDATE
router.put('/:scheduleId', async (req, res, next) => {
    const { scheduleId } = req.params;
    const { product_name, order_number, planned_start_date, planned_end_date, status, priority, workstation, supervisor } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const originalResult = await client.query('SELECT *, status as original_status FROM "MANM".mps WHERE schedule_id = $1 FOR UPDATE', [scheduleId]);
        if (originalResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Schedule not found' });
        }
        const originalSchedule = originalResult.rows[0];
        const originalStatus = originalSchedule.original_status;

        let inventoryMessage = 'Schedule updated.';
        let orderStatusMessage = '';
        
        // --- 1. Inventory Deduction & Customer Order Status Update Logic ---
        if (originalStatus !== 'Completed' && status === 'Completed') {
            const orderNumberForAutomation = originalSchedule.order_number;

            // --- Inventory Deduction from MRP (Existing Logic) ---
            const materialsResult = await client.query('SELECT item_code, required_qty FROM "MANM".mrp WHERE related_order = $1', [orderNumberForAutomation]);
            const materialsToDeduct = materialsResult.rows.map(row => ({ itemCode: row.item_code, quantity: row.required_qty }));

            if (materialsToDeduct && materialsToDeduct.length > 0) {
                for (const material of materialsToDeduct) {
                    const updateInventoryQuery = `
                        UPDATE "MANM".inventory
                        SET
                            current_stock = current_stock - $1,
                            status = CASE
                                WHEN current_stock - $1 <= 0 THEN 'Out of Stock'
                                WHEN (SELECT minimum_stock FROM "MANM".inventory WHERE item_code = $2) IS NOT NULL AND current_stock - $1 <= minimum_stock THEN 'Low Stock'
                                ELSE 'In Stock'
                            END,
                            last_updated = CURRENT_DATE
                        WHERE item_code = $2 AND current_stock >= $1
                        RETURNING item_name, current_stock;
                    `;
                    const invUpdateResult = await client.query(updateInventoryQuery, [material.quantity, material.itemCode]);
                    if (invUpdateResult.rowCount === 0) {
                        await client.query('ROLLBACK');
                        const stockCheck = await pool.query('SELECT current_stock FROM "MANM".inventory WHERE item_code = $1', [material.itemCode]);
                        const currentStock = stockCheck.rows.length > 0 ? stockCheck.rows[0].current_stock : 'unknown';
                        return res.status(409).json({ error: `Inventory deduction failed: Insufficient stock for ${material.itemCode}. Required: ${material.quantity}, Available: ${currentStock}.`});
                    }
                }
                inventoryMessage = `Schedule completed and inventory deducted for order ${orderNumberForAutomation}.`;
            } else {
                inventoryMessage = `Schedule completed. No materials found in MRP for order ${orderNumberForAutomation}.`;
            }
            
            // --- NEW: Update Customer Order Status to 'Ready to Ship' ---
            const updateOrderQuery = `
                UPDATE "MANM".customer_orders
                SET status = 'Ready to Ship'
                WHERE order_number = $1 AND status != 'Ready to Ship'
                RETURNING id;
            `;
            const orderUpdateResult = await client.query(updateOrderQuery, [orderNumberForAutomation]);

            if (orderUpdateResult.rowCount > 0) {
                orderStatusMessage = ` Customer Order ${orderNumberForAutomation} status updated to 'Ready to Ship'.`;
            } else {
                orderStatusMessage = ` Customer Order ${orderNumberForAutomation} was not updated (either not found or already 'Ready to Ship').`;
            }
        }
        
        // --- 2. MPS Schedule Update (Existing Logic) ---
        const updateFields = []; const updateValues = []; let updateIndex = 1;
        if (product_name !== undefined) { updateFields.push(`product_name = $${updateIndex++}`); updateValues.push(product_name); }
        if (order_number !== undefined) { updateFields.push(`order_number = $${updateIndex++}`); updateValues.push(order_number); }
        if (planned_start_date !== undefined) { updateFields.push(`planned_start_date = $${updateIndex++}`); updateValues.push(planned_start_date); }
        if (planned_end_date !== undefined) { updateFields.push(`planned_end_date = $${updateIndex++}`); updateValues.push(planned_end_date); }
        if (status !== undefined) { updateFields.push(`status = $${updateIndex++}`); updateValues.push(status); }
        if (priority !== undefined) { updateFields.push(`priority = $${updateIndex++}`); updateValues.push(priority); }
        if (workstation !== undefined) { updateFields.push(`workstation = $${updateIndex++}`); updateValues.push(workstation); }
        if (supervisor !== undefined) { updateFields.push(`supervisor = $${updateIndex++}`); updateValues.push(supervisor); }
        updateValues.push(scheduleId);

        let scheduleUpdateResult;
        if (updateFields.length > 0) {
            const updateScheduleQuery = `UPDATE "MANM".mps SET ${updateFields.join(', ')} WHERE schedule_id = $${updateIndex} RETURNING *`;
            scheduleUpdateResult = await client.query(updateScheduleQuery, updateValues);
        } else {
            scheduleUpdateResult = { rows: [originalSchedule] };
        }
        
        // --- 3. Final Commit and Response ---
        await client.query('COMMIT');
        // Apply formatting to the schedule data in the response
        res.json({ message: inventoryMessage + orderStatusMessage, schedule: formatDate(scheduleUpdateResult.rows[0]) });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error updating schedule:", err.message);
        next(err);
    } finally {
        client.release();
    }
});

// DELETE a schedule
router.delete('/:scheduleId', async (req, res, next) => {
    try {
        const { scheduleId } = req.params;
        const result = await pool.query('DELETE FROM "MANM".mps WHERE schedule_id = $1 RETURNING *', [scheduleId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Schedule not found' });
        }
        // Apply formatting to the deleted item in the response
        res.status(200).json({ message: 'Schedule deleted successfully', item: formatDate(result.rows[0]) });
    } catch (err) {
        console.error("Error deleting schedule:", err.message);
        next(err);
    }
});

module.exports = router;
