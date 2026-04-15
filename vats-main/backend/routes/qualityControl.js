// routes/qualityControl.js
const express = require('express');
const pool = require('../db'); 
const router = express.Router();

// ⭐ CRITICAL FIX: Helper function to compensate for timezone-induced 1-day rollback (+1 date logic)
const correctDateOffset = (dateValue) => {
    if (!dateValue) return null;
    let date = new Date(dateValue); 
    date.setDate(date.getDate() + 1); 
    return date.toISOString().split('T')[0];
};

// Helper to format the full inspection object for client consumption
const toCamelCase = (row) => {
    if (!row) return null;
    return {
        inspection_id: row.inspection_id,
        product_name: row.product_name,
        batch_number: row.batch_number,
        inspection_date: correctDateOffset(row.inspection_date), 
        inspector: row.inspector,
        test_type: row.test_type,
        result: row.result,
        defect_count: parseInt(row.defect_count), 
        notes: row.notes,
    };
};

// GET all quality inspections
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM "MANM".quality_control ORDER BY inspection_date DESC, inspection_id ASC');
        res.json(result.rows.map(toCamelCase));
    } catch (err) {
        console.error("Error fetching quality inspections:", err.message);
        next(err);
    }
});

// GET a single quality inspection by inspection_id
router.get('/:inspectionId', async (req, res, next) => {
    try {
        const { inspectionId } = req.params;
        const result = await pool.query('SELECT * FROM "MANM".quality_control WHERE inspection_id = $1', [inspectionId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quality inspection not found' });
        }
        res.json(toCamelCase(result.rows[0]));
    } catch (err) {
        console.error("Error fetching quality inspection:", err.message);
        next(err);
    }
});

// POST a new quality inspection - UPDATED FOR CASE-INSENSITIVE VALIDATION
router.post('/', async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { product_name, batch_number, inspection_date, inspector, test_type, result: inspection_result, defect_count, notes } = req.body;
        
        if (!product_name || !inspection_date || !inspector || !test_type || !inspection_result || defect_count == null) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        // --- 1. Check for Duplicate product_name in Quality Control (Case-Insensitive Uniqueness) ---
        const duplicateCheck = await client.query('SELECT inspection_id FROM "MANM".quality_control WHERE LOWER(product_name) = LOWER($1)', [product_name]);
        if (duplicateCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: `A Quality Inspection record already exists for Product Name "${product_name}". Only one inspection per product is allowed.` });
        }
        
        // --- 2. Validate if product_name exists in customer_orders (Case-Insensitive Existence) ---
        const orderCheck = await client.query('SELECT product_name FROM "MANM".customer_orders WHERE LOWER(product_name) = LOWER($1) LIMIT 1', [product_name]);
        if (orderCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Product Name "${product_name}" is not associated with any Customer Order.` });
        }
        
        // --- 3. Generate sequential inspection_id (QC-YYYY-###) ---
        const maxIdResult = await client.query(
            'SELECT MAX(CAST(SUBSTRING(inspection_id FROM \'QC-\\d{4}-(\\d+)\') AS INTEGER)) as max_num FROM "MANM".quality_control WHERE inspection_id ~ \'^QC-\\d{4}-\\d+$\''
        );
        
        const maxNum = maxIdResult.rows[0]?.max_num || 0;
        const nextNum = (maxNum + 1).toString().padStart(3, '0');
        const year = new Date().getFullYear();
        const newInspectionId = `QC-${year}-${nextNum}`;
        
        // --- 4. Insert the new record ---
        const dbResult = await client.query(
            `INSERT INTO "MANM".quality_control (inspection_id, product_name, batch_number, inspection_date, inspector, test_type, result, defect_count, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [newInspectionId, product_name, batch_number, inspection_date, inspector, test_type, inspection_result, defect_count, notes]
        );
        
        await client.query('COMMIT');
        res.status(201).json(toCamelCase(dbResult.rows[0]));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error adding quality inspection:", err.message);
        next(err);
    } finally {
        client.release();
    }
});

// PUT (update) a quality inspection - UPDATED FOR CASE-INSENSITIVE VALIDATION
router.put('/:inspectionId', async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { inspectionId } = req.params;
        const { product_name, batch_number, inspection_date, inspector, test_type, result: inspection_result, defect_count, notes } = req.body;

        const fields = [];
        const values = [];
        let queryIndex = 1;

        if (product_name !== undefined) { 
             // 1. Check for product_name existence in customer_orders (Case-Insensitive Existence)
            const orderCheck = await client.query('SELECT product_name FROM "MANM".customer_orders WHERE LOWER(product_name) = LOWER($1) LIMIT 1', [product_name]);
            if (orderCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Product Name "${product_name}" is not associated with any Customer Order.` });
            }

            // 2. Check for Duplicate product_name (Case-Insensitive Uniqueness, excluding current ID)
            const duplicateCheck = await client.query('SELECT inspection_id FROM "MANM".quality_control WHERE LOWER(product_name) = LOWER($1) AND inspection_id != $2', [product_name, inspectionId]);
            if (duplicateCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ error: `A different Quality Inspection record already exists for Product Name "${product_name}".` });
            }

            fields.push(`product_name = $${queryIndex++}`); 
            values.push(product_name); 
        }

        if (batch_number !== undefined) { fields.push(`batch_number = $${queryIndex++}`); values.push(batch_number); }
        if (inspection_date !== undefined) { fields.push(`inspection_date = $${queryIndex++}`); values.push(inspection_date); }
        if (inspector !== undefined) { fields.push(`inspector = $${queryIndex++}`); values.push(inspector); }
        if (test_type !== undefined) { fields.push(`test_type = $${queryIndex++}`); values.push(test_type); }
        if (inspection_result !== undefined) { fields.push(`result = $${queryIndex++}`); values.push(inspection_result); }
        if (defect_count !== undefined) { fields.push(`defect_count = $${queryIndex++}`); values.push(defect_count); }
        if (notes !== undefined) { fields.push(`notes = $${queryIndex++}`); values.push(notes); }
        

        if (fields.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No fields provided for update' });
        }

        values.push(inspectionId); // Add the ID for the WHERE clause

        const updateQuery = `UPDATE "MANM".quality_control SET ${fields.join(', ')} WHERE inspection_id = $${queryIndex} RETURNING *`;

        const dbResult = await client.query(updateQuery, values);

        if (dbResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Quality inspection not found' });
        }
        await client.query('COMMIT');
        res.json(toCamelCase(dbResult.rows[0]));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error updating quality inspection:", err.message);
        next(err);
    } finally {
        client.release();
    }
});

// DELETE a quality inspection
router.delete('/:inspectionId', async (req, res, next) => {
    try {
        const { inspectionId } = req.params;
        const dbResult = await pool.query('DELETE FROM "MANM".quality_control WHERE inspection_id = $1 RETURNING *', [inspectionId]);
        if (dbResult.rows.length === 0) {
            return res.status(404).json({ error: 'Quality inspection not found' });
        }
        res.status(200).json({ message: 'Quality inspection deleted successfully', item: toCamelCase(dbResult.rows[0]) });
    } catch (err) {
        console.error("Error deleting quality inspection:", err.message);
        next(err);
    }
});

module.exports = router;
