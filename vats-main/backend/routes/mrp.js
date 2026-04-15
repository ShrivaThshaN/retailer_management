// routes/mrp.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

// Helper to format date and add units to lead time
const formatDate = (row) => {
    if (!row) return null;

    let formattedRow = { ...row };

    // --- Date Fix: Prevent the day from shifting back due to timezone differences. ---
    if (formattedRow.planned_date) {
        try {
            const dateObj = new Date(formattedRow.planned_date);
            
            if (!isNaN(dateObj)) {
                // Calculate the user's timezone offset in milliseconds
                const userTimezoneOffset = dateObj.getTimezoneOffset() * 60000; 
                
                // Apply the offset to get the correct "local" day's start time in UTC
                const localDate = new Date(dateObj.getTime() - userTimezoneOffset);
                
                // Format to YYYY-MM-DD
                formattedRow.planned_date = localDate.toISOString().split('T')[0];
            } else {
                formattedRow.planned_date = null;
            }
        } catch (e) {
            console.error("Date formatting error:", e);
            formattedRow.planned_date = null;
        }
    }
    
    // --- Lead Time Fix: Add ' days' suffix to lead_time for display ---
    if (formattedRow.lead_time != null && !String(formattedRow.lead_time).includes('days')) {
        const numLeadTime = Number(formattedRow.lead_time);
        if (!isNaN(numLeadTime)) {
            formattedRow.lead_time = `${numLeadTime} days`;
        }
    }
    
    return formattedRow;
};

// =================================================================
// GET all material requirements
// =================================================================
router.get('/', async (req, res, next) => {
    try {
        const query = `
            SELECT
                mrp.material_code,
                mrp.material_name,
                mrp.item_code,
                mrp.related_order,
                mrp.required_qty,
                mrp.supplier,
                mrp.lead_time,
                -- !!! STATUS CHANGE HERE !!!
                CASE
                    WHEN mrp.required_qty <= COALESCE(inv.current_stock, 0) THEN 'Available'
                    ELSE 'Required'
                END AS status,
                mrp.planned_date,
                COALESCE(inv.current_stock, 0) AS available_qty,
                GREATEST(0, mrp.required_qty - COALESCE(inv.current_stock, 0)) AS shortfall
            FROM
                "MANM".mrp
            LEFT JOIN
                "MANM".inventory AS inv ON mrp.item_code = inv.item_code
            ORDER BY
                mrp.planned_date ASC, mrp.material_code ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows.map(formatDate));
    } catch (err) {
        console.error("Error fetching material requirements:", err.message);
        next(err);
    }
});

// =================================================================
// GET a single material requirement
// =================================================================
router.get('/:materialCode', async (req, res, next) => {
    try {
        const { materialCode } = req.params;
        const query = `
            SELECT
                mrp.material_code,
                mrp.material_name,
                mrp.item_code,
                mrp.related_order,
                mrp.required_qty,
                mrp.supplier,
                mrp.lead_time,
                -- !!! STATUS CHANGE HERE !!!
                CASE
                    WHEN mrp.required_qty <= COALESCE(inv.current_stock, 0) THEN 'Available'
                    ELSE 'Required'
                END AS status,
                mrp.planned_date,
                COALESCE(inv.current_stock, 0) AS available_qty,
                GREATEST(0, mrp.required_qty - COALESCE(inv.current_stock, 0)) AS shortfall
            FROM
                "MANM".mrp
            LEFT JOIN
                "MANM".inventory AS inv ON mrp.item_code = inv.item_code
            WHERE
                mrp.material_code = $1;
        `;
        const result = await pool.query(query, [materialCode]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Material requirement not found' });
        }
        res.json(formatDate(result.rows[0]));
    } catch (err) {
        console.error("Error fetching material requirement:", err.message);
        next(err);
    }
});

// =================================================================
// POST a new material requirement
// =================================================================
router.post('/', async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { material_code, material_name, related_order, required_qty, supplier, lead_time, status, planned_date } = req.body;

        const invResult = await client.query('SELECT item_code FROM "MANM".inventory WHERE item_name = $1 LIMIT 1', [material_name]);
        let item_code = 'N/A';
        if (invResult.rows.length > 0) {
            item_code = invResult.rows[0].item_code;
        }

        if (!material_code || !material_name || required_qty == null) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Missing required fields (material_code, material_name, required_qty)' });
        }

        // Logic Change: Since the frontend doesn't want to use 'Shortfall', 
        // we'll explicitly set the status to 'Required' on creation. 
        // The GET endpoints will dynamically check inventory and override the status for display.
        const effectiveStatus = status || 'Required';

        const dbResult = await client.query(
            `INSERT INTO "MANM".mrp (material_code, material_name, item_code, related_order, required_qty, supplier, lead_time, status, planned_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [material_code, material_name, item_code, related_order, required_qty, supplier, lead_time, effectiveStatus, planned_date]
        );
        
        await client.query('COMMIT');
        res.status(201).json(formatDate(dbResult.rows[0]));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error adding material requirement:", err.message);
        if (err.code === '23505') {
            return res.status(409).json({ error: `Material code '${req.body.material_code}' already exists.` });
        }
        next(err);
    } finally {
        client.release();
    }
});

// =================================================================
// PUT (update) a material requirement
// =================================================================
router.put('/:materialCode', async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { materialCode } = req.params;
        const { material_name, item_code, related_order, required_qty, supplier, lead_time, status, planned_date } = req.body;

        let effective_item_code = item_code;
        if (!effective_item_code && material_name) {
            const invResult = await client.query('SELECT item_code FROM "MANM".inventory WHERE item_name = $1 LIMIT 1', [material_name]);
            if (invResult.rows.length > 0) {
                effective_item_code = invResult.rows[0].item_code;
            }
        }

        const fields = []; const values = []; let queryIndex = 1;
        if (material_name !== undefined) { fields.push(`material_name = $${queryIndex++}`); values.push(material_name); }
        if (related_order !== undefined) { fields.push(`related_order = $${queryIndex++}`); values.push(related_order); }
        if (required_qty !== undefined) { fields.push(`required_qty = $${queryIndex++}`); values.push(required_qty); }
        if (supplier !== undefined) { fields.push(`supplier = $${queryIndex++}`); values.push(supplier); }
        if (lead_time !== undefined) { fields.push(`lead_time = $${queryIndex++}`); values.push(lead_time); }
        
        // Status Update: If the client is sending a status, we use it. 
        // Otherwise, it remains unchanged in the DB.
        if (status !== undefined) { fields.push(`status = $${queryIndex++}`); values.push(status); }
        
        if (planned_date !== undefined) { fields.push(`planned_date = $${queryIndex++}`); values.push(planned_date); }
        if (effective_item_code !== undefined) { fields.push(`item_code = $${queryIndex++}`); values.push(effective_item_code); }

        if (fields.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No fields provided for update' });
        }

        values.push(materialCode);
        const updateQuery = `UPDATE "MANM".mrp SET ${fields.join(', ')} WHERE material_code = $${queryIndex} RETURNING *`;
        const dbResult = await pool.query(updateQuery, values);

        if (dbResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Material requirement not found' });
        }
        
        await client.query('COMMIT');
        res.json(formatDate(dbResult.rows[0])); 
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error updating material requirement:", err.message);
        next(err);
    } finally {
        client.release();
    }
});

// =================================================================
// DELETE a material requirement
// =================================================================
router.delete('/:materialCode', async (req, res, next) => {
    try {
        const { materialCode } = req.params;
        const dbResult = await pool.query('DELETE FROM "MANM".mrp WHERE material_code = $1 RETURNING *', [materialCode]);
        if (dbResult.rows.length === 0) {
            return res.status(404).json({ error: 'Material requirement not found' });
        }
        res.status(200).json({ message: 'Material requirement deleted successfully', item: formatDate(dbResult.rows[0]) });
    } catch (err) {
        console.error("Error deleting material requirement:", err.message);
        next(err);
    }
});

module.exports = router;
