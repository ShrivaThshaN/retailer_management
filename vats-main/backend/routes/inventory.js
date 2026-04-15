// routes/inventory.js
const express = require('express');
const pool = require('../db'); // Use the pool directly from db.js
const router = express.Router();

// GET all inventory items
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM "MANM".inventory ORDER BY item_code ASC');
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching inventory:", err.message);
        next(err); // Pass error to global handler
    }
});

// GET a single inventory item by item_code
router.get('/:itemCode', async (req, res, next) => {
    try {
        const { itemCode } = req.params;
        const result = await pool.query('SELECT * FROM "MANM".inventory WHERE item_code = $1', [itemCode]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching inventory item:", err.message);
        next(err);
    }
});

// POST a new inventory item (Backend generates item_code)
router.post('/', async (req, res, next) => {
    // --- ADD THIS CONSOLE LOG ---
    console.log("Received POST /api/inventory request body:", req.body);
    // --- END ADD ---

    const client = await pool.connect(); // Use client for transaction
    try {
        await client.query('BEGIN'); // Start transaction

        // 1. Get data from request (item_code is NOT expected from frontend)
        const { item_name, category, current_stock, minimum_stock, maximum_stock, location, unit_price, status } = req.body;

        // 2. Basic validation (removed item_code check)
        if (!item_name || current_stock == null) {
            console.error("Validation failed: Missing item_name or current_stock", req.body); // Log validation failure
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Missing required fields (item_name, current_stock)' });
        }

        // 3. Generate the next item_code (e.g., INV-0016)
        const maxCodeResult = await client.query(
            'SELECT MAX(CAST(SUBSTRING(item_code FROM \'INV-(\\d+)\') AS INTEGER)) as max_num FROM "MANM".inventory WHERE item_code ~ \'^INV-\\d+$\''
        );
        const maxNum = maxCodeResult.rows[0]?.max_num || 0;
        const nextNum = maxNum + 1;
        const newItemCode = `INV-${String(nextNum).padStart(4, '0')}`; // Format as INV-000X
        console.log("Generated newItemCode:", newItemCode); // Log generated code

        // 4. Set last updated date
        const last_updated = new Date();

        // 5. Determine status based on stock
        let effectiveStatus = status;
        if (!effectiveStatus) { // Calculate if not provided
            if (current_stock <= 0) effectiveStatus = "Out of Stock";
            else if (minimum_stock != null && current_stock <= minimum_stock) effectiveStatus = "Low Stock";
            else effectiveStatus = "In Stock";
        }
        console.log("Using status:", effectiveStatus); // Log status being used

        // 6. Insert into database using generated item_code
        const result = await client.query(
            `INSERT INTO "MANM".inventory (item_code, item_name, category, current_stock, minimum_stock, maximum_stock, location, unit_price, status, last_updated)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [newItemCode, item_name, category, current_stock, minimum_stock, maximum_stock, location, unit_price, effectiveStatus, last_updated]
        );

        await client.query('COMMIT'); // Commit transaction
        console.log("Successfully inserted:", result.rows[0]); // Log success
        res.status(201).json(result.rows[0]); // Send back the complete new item

    } catch (err) {
        await client.query('ROLLBACK'); // Rollback on any error
        console.error("Error adding inventory item:", err.message); // Log the specific error
        next(err); // Pass to global error handler
    } finally {
        client.release(); // Release client back to pool
    }
});


// PUT (update) an inventory item
router.put('/:itemCode', async (req, res, next) => {
    try {
        const { itemCode } = req.params;
        const { item_name, category, current_stock, minimum_stock, maximum_stock, location, unit_price, status } = req.body;

        const fields = [];
        const values = [];
        let queryIndex = 1;

        // Dynamically build the update query parts based on provided fields
        if (item_name !== undefined) { fields.push(`item_name = $${queryIndex++}`); values.push(item_name); }
        if (category !== undefined) { fields.push(`category = $${queryIndex++}`); values.push(category); }
        if (current_stock !== undefined) { fields.push(`current_stock = $${queryIndex++}`); values.push(current_stock); }
        if (minimum_stock !== undefined) { fields.push(`minimum_stock = $${queryIndex++}`); values.push(minimum_stock); }
        if (maximum_stock !== undefined) { fields.push(`maximum_stock = $${queryIndex++}`); values.push(maximum_stock); }
        if (location !== undefined) { fields.push(`location = $${queryIndex++}`); values.push(location); }
        if (unit_price !== undefined) { fields.push(`unit_price = $${queryIndex++}`); values.push(unit_price); }
        if (status !== undefined) { fields.push(`status = $${queryIndex++}`); values.push(status); }

        if (fields.length === 0) {
             return res.status(400).json({ error: 'No fields provided for update' });
        }

        // Always update the last_updated timestamp
        fields.push(`last_updated = $${queryIndex++}`); values.push(new Date());

        values.push(itemCode); // Add itemCode for the WHERE clause

        const updateQuery = `UPDATE "MANM".inventory SET ${fields.join(', ')} WHERE item_code = $${queryIndex} RETURNING *`;

        const result = await pool.query(updateQuery, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }
        res.json(result.rows[0]); // Return the updated item
    } catch (err) {
        console.error("Error updating inventory item:", err.message);
        next(err);
    }
});


// DELETE an inventory item
router.delete('/:itemCode', async (req, res, next) => {
    try {
        const { itemCode } = req.params;
        const result = await pool.query('DELETE FROM "MANM".inventory WHERE item_code = $1 RETURNING *', [itemCode]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }
        res.status(200).json({ message: 'Inventory item deleted successfully', item: result.rows[0] });
    } catch (err) {
        console.error("Error deleting inventory item:", err.message);
        next(err);
    }
});

module.exports = router; // Make sure router is exported
