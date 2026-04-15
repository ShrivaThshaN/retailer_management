// routes/procurement.js
const express = require('express');
const pool = require('../db'); // Use pool from db.js
const { format } = require('date-fns'); // Import format for date handling if needed
const router = express.Router();

// ----------------------------------------------------------------------
// ⭐ DATE CORRECTION FIX: Compensates for timezone-induced 1-day rollback
// ----------------------------------------------------------------------
const correctDateOffset = (dateValue) => {
    if (!dateValue) return null;
    
    // Create a Date object from the database value.
    let date = new Date(dateValue); 

    // Add 1 day to the date to counteract the date shifting back due to timezone offset.
    date.setDate(date.getDate() + 1); 

    // Format to YYYY-MM-DD string
    return date.toISOString().split('T')[0];
};

/**
 * Helper function to clean currency strings (e.g., "₹1,234.56" -> 1234.56)
 * @param {string | number | null | undefined} value The value to clean
 * @returns {number | null} A clean number or null
 */
const cleanCurrency = (value) => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'number') {
        return value;
    }
    const cleanedString = String(value)
        .replace('₹', '')     // Remove currency symbol
        .replace(/,/g, '');   // Remove commas
    
    const numberValue = parseFloat(cleanedString);
    return isNaN(numberValue) ? null : numberValue;
};

// Helper to format the procurement order object for client consumption
// Applies the date correction on retrieval
const formatProcurementOrder = (row) => {
    if (!row) return null;
    return {
        po_number: row.po_number,
        supplier: row.supplier,
        material_name: row.material_name,
        item_code: row.item_code,
        quantity: parseInt(row.quantity),
        unit_price: row.unit_price, 
        total_amount: row.total_amount, 
        // Applying date correction for both date fields
        order_date: row.order_date ? correctDateOffset(row.order_date) : null,
        expected_delivery: row.expected_delivery ? correctDateOffset(row.expected_delivery) : null,
        status: row.status,
        related_order: row.related_order,
    };
};
// ----------------------------------------------------------------------


// GET all procurement orders
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM "MANM".procurement ORDER BY order_date DESC, po_number ASC');
        // Apply formatting to all rows
        res.json(result.rows.map(formatProcurementOrder));
    } catch (err) {
        console.error("Error fetching procurement orders:", err.message);
        next(err);
    }
});

// GET single procurement order by po_number
router.get('/:poNumber', async (req, res, next) => {
     try {
        const { poNumber } = req.params;
        const result = await pool.query('SELECT * FROM "MANM".procurement WHERE po_number = $1', [poNumber]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Procurement order not found' });
        }
        // Apply formatting to the single row
        res.json(formatProcurementOrder(result.rows[0]));
    } catch (err) {
        console.error("Error fetching procurement order:", err.message);
        next(err);
    }
});

// POST a new procurement order
router.post('/', async (req, res, next) => {
    const { po_number, supplier, material_name, item_code, quantity, unit_price, total_amount, order_date, expected_delivery, status, related_order } = req.body;
    
    const cleanedUnitPrice = cleanCurrency(unit_price);
    const cleanedTotalAmount = cleanCurrency(total_amount);

    const client = await pool.connect(); 

     try {
         await client.query('BEGIN');

         if (!po_number || !material_name || quantity == null || !supplier || !expected_delivery) {
             await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Missing required fields (po_number, supplier, material_name, quantity, expected_delivery)' });
         }

         let effectiveItemCode = item_code;
         if (!effectiveItemCode || effectiveItemCode === 'N/A') {
             // Corrected query to check material_name against inventory item_name
             const itemLookup = await client.query('SELECT item_code FROM "MANM".inventory WHERE item_name = $1 LIMIT 1', [material_name]);
             if (itemLookup.rows.length > 0) {
                 effectiveItemCode = itemLookup.rows[0].item_code;
             } else {
                 console.warn(`Item code lookup failed for material: ${material_name}`);
                 effectiveItemCode = 'N/A';
             }
         }

         const effectiveOrderDate = order_date || format(new Date(), 'yyyy-MM-dd');

       const result = await client.query(
            `INSERT INTO "MANM".procurement (po_number, supplier, material_name, item_code, quantity, unit_price, total_amount, order_date, expected_delivery, status, related_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [po_number, supplier, material_name, effectiveItemCode, quantity, cleanedUnitPrice, cleanedTotalAmount, effectiveOrderDate, expected_delivery, status || 'Pending', related_order] 
       );

       await client.query('COMMIT');
       // Apply formatting to the returned row
       res.status(201).json(formatProcurementOrder(result.rows[0]));

    } catch (err) {
       await client.query('ROLLBACK');
       console.error("Error adding procurement order:", err.message);
        if (err.code === '23505') { 
           return res.status(409).json({ error: `Purchase Order number '${req.body.po_number}' already exists.` });
        }
       next(err);
    } finally {
       client.release();
    }
});

// PUT (update) a procurement order - WITH INVENTORY ADDITION
router.put('/:poNumber', async (req, res, next) => {
    const { poNumber } = req.params;
    const { supplier, material_name, item_code, quantity, unit_price, total_amount, expected_delivery, status, related_order } = req.body;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get the original order
        const originalResult = await client.query('SELECT * FROM "MANM".procurement WHERE po_number = $1 FOR UPDATE', [poNumber]);
        if (originalResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Procurement order not found' });
        }
        const originalOrder = originalResult.rows[0];

        // Use original values as fallback if not provided in request body
        const effectiveItemCode = item_code !== undefined ? item_code : originalOrder.item_code;
        const effectiveQuantity = quantity !== undefined ? quantity : originalOrder.quantity;
        const effectiveStatus = status !== undefined ? status : originalOrder.status;

        // 2. Check if status is changing TO 'Received'
        let inventoryMessage = 'Procurement order updated.';
        let inventoryUpdateSuccess = true;

        if (originalOrder.status !== 'Received' && effectiveStatus === 'Received') {
            console.log(`PO ${poNumber} status changing to Received. Attempting inventory update for ${effectiveItemCode}.`);
            if (!effectiveItemCode || effectiveItemCode === 'N/A') {
                inventoryUpdateSuccess = false;
                inventoryMessage = `Cannot update inventory: Missing Item Code for material "${material_name || originalOrder.material_name}".`;
                console.error(inventoryMessage);
            } else {
                const receivedQuantity = Number(effectiveQuantity);
                if (isNaN(receivedQuantity) || receivedQuantity <= 0) {
                    inventoryUpdateSuccess = false;
                    inventoryMessage = `Cannot update inventory: Invalid quantity (${effectiveQuantity}) for ${effectiveItemCode}.`;
                    console.error(inventoryMessage);
                } else {
                    // 3. Update Inventory: Add the quantity
                    const updateInventoryQuery = `
                        UPDATE "MANM".inventory
                        SET
                            current_stock = current_stock + $1,
                            status = CASE
                                WHEN current_stock + $1 > minimum_stock THEN 'In Stock'
                                WHEN current_stock + $1 > 0 THEN 'Low Stock'
                                ELSE 'Out of Stock'
                            END,
                            last_updated = CURRENT_DATE
                        WHERE item_code = $2
                        RETURNING item_name, current_stock;
                    `;
                    const invUpdateResult = await client.query(updateInventoryQuery, [receivedQuantity, effectiveItemCode]);

                    if (invUpdateResult.rowCount === 0) {
                         inventoryUpdateSuccess = false;
                         inventoryMessage = `Inventory update failed: Item ${effectiveItemCode} not found in inventory.`;
                         console.error(inventoryMessage);
                    } else {
                         inventoryMessage = `Order received. Stock for ${invUpdateResult.rows[0].item_name} increased by ${receivedQuantity}.`;
                         console.log(`Received ${receivedQuantity} of ${effectiveItemCode}. New stock: ${invUpdateResult.rows[0].current_stock}`);
                    }
                }
            }
        }

        // 4. Update the procurement order itself
        const updateFields = [];
        const updateValues = [];
        let updateIndex = 1;

        // Build SET clause dynamically only with fields provided in request
        if (supplier !== undefined) { updateFields.push(`supplier = $${updateIndex++}`); updateValues.push(supplier); }
        if (material_name !== undefined) { updateFields.push(`material_name = $${updateIndex++}`); updateValues.push(material_name); }
        if (item_code !== undefined) { updateFields.push(`item_code = $${updateIndex++}`); updateValues.push(item_code); }
        if (quantity !== undefined) { updateFields.push(`quantity = $${updateIndex++}`); updateValues.push(quantity); }
        
        if (unit_price !== undefined) { 
            updateFields.push(`unit_price = $${updateIndex++}`); 
            updateValues.push(cleanCurrency(unit_price));
        }
        if (total_amount !== undefined) { 
            updateFields.push(`total_amount = $${updateIndex++}`); 
            updateValues.push(cleanCurrency(total_amount));
        }
        
        if (expected_delivery !== undefined) { updateFields.push(`expected_delivery = $${updateIndex++}`); updateValues.push(expected_delivery); }
        if (status !== undefined) { updateFields.push(`status = $${updateIndex++}`); updateValues.push(effectiveStatus); }
        if (related_order !== undefined) { updateFields.push(`related_order = $${updateIndex++}`); updateValues.push(related_order); }

        updateValues.push(poNumber); // For the WHERE clause

        let procurementUpdateResult;
        if (updateFields.length > 0) {
            const updateProcurementQuery = `UPDATE "MANM".procurement SET ${updateFields.join(', ')} WHERE po_number = $${updateIndex} RETURNING *`;
            procurementUpdateResult = await client.query(updateProcurementQuery, updateValues);
        } else {
            // If no fields to update, use original data for return (should be rare)
            procurementUpdateResult = originalResult;
        }

        await client.query('COMMIT'); // Commit transaction
        
        // Apply formatting to the returned order object
        res.json({ 
            message: inventoryMessage, 
            order: formatProcurementOrder(procurementUpdateResult.rows[0]) 
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error("Error updating procurement order:", err.message);
        next(err);
    } finally {
        client.release(); // Release client
    }
});


// DELETE a procurement order
router.delete('/:poNumber', async (req, res, next) => {
     try {
        const { poNumber } = req.params;
        const result = await pool.query('DELETE FROM "MANM".procurement WHERE po_number = $1 RETURNING *', [poNumber]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Procurement order not found' });
        }
        // Apply formatting to the deleted item's return value
        res.status(200).json({ message: 'Procurement order deleted successfully', item: formatProcurementOrder(result.rows[0]) });
    } catch (err) {
        console.error("Error deleting procurement order:", err.message);
        next(err);
    }
});


module.exports = router;
