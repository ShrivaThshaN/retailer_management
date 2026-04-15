// routes/control.js
const express = require('express');
const pool = require('../db');
const router = express.Router();

// ⭐ CRITICAL FIX: Helper function to compensate for timezone-induced 1-day rollback (+1 date logic)
const correctDateOffset = (dateValue) => {
    if (!dateValue) return null;
    
    // 1. Create a Date object from the value.
    let date = new Date(dateValue); 

    // 2. Add 1 day to the date to compensate for the date shifting back due to local timezone offset.
    date.setDate(date.getDate() + 1); 

    // 3. Format to YYYY-MM-DD string
    return date.toISOString().split('T')[0];
};

// --- Helper for general conversion ---
const toCamelCase = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        orderNumber: row.order_number,
        customerName: row.customer_name,
        productName: row.product_name,
        orderDate: row.order_date ? correctDateOffset(row.order_date) : null, // APPLIED FIX
        deliveryDate: row.delivery_date ? correctDateOffset(row.delivery_date) : null, // APPLIED FIX
        status: row.status,
        totalValue: parseFloat(row.total_value), 
        items: parseInt(row.items),
    };
};

// =================================================================
// GET /api/customer-orders: Fetch all orders (Used by NewQualityDialog.tsx)
// =================================================================
router.get('/', async (req, res, next) => {
    try {
        const queryText = `
            SELECT 
                id, order_number, customer_name, product_name, 
                order_date, delivery_date, status, 
                CAST(total_value AS NUMERIC), items
            FROM "MANM".customer_orders 
            ORDER BY order_date DESC, id DESC
        `;
        const result = await pool.query(queryText);
        // Use the updated helper for output
        res.json(result.rows.map(toCamelCase));
    } catch (err) {
        console.error("Error fetching orders:", err.message);
        next(err);
    }
});

// =================================================================
// POST /api/customer-orders: Add new order 
// =================================================================
router.post('/', async (req, res, next) => {
    const {
        customerName, productName, orderDate, 
        deliveryDate, status, totalValue, items
    } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Generate the new orderNumber on the backend
        const maxNumResult = await client.query(
            'SELECT MAX(CAST(SUBSTRING(order_number FROM \'CO-\\d{4}-(\\d+)\') AS INTEGER)) as max_num FROM "MANM".customer_orders WHERE order_number ~ \'^CO-\\d{4}-\\d+$\''
        );
        
        const maxNum = maxNumResult.rows[0]?.max_num || 0;
        const nextNum = (maxNum + 1).toString().padStart(3, '0');
        const year = new Date().getFullYear();
        const newOrderNumber = `CO-${year}-${nextNum}`; 

        // Prepare values for INSERT
        const values = [
            newOrderNumber, // Use the new generated number
            customerName, 
            productName, 
            orderDate, 
            deliveryDate, 
            status, 
            totalValue, 
            items
        ];

        // Run the INSERT query
        const queryText = `
            INSERT INTO "MANM".customer_orders (
                order_number, customer_name, product_name, order_date, 
                delivery_date, status, total_value, items
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *
        `;
        const insertResult = await client.query(queryText, values);
        
        await client.query('COMMIT');
        // Use the updated helper for output
        res.status(201).json(toCamelCase(insertResult.rows[0]));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error creating new order:", err.message);
        
        next(err);
    } finally {
        client.release();
    }
});


router.put('/:id', async (req, res, next) => {
    const { id } = req.params;
    const {
        orderNumber, customerName, productName, orderDate, 
        deliveryDate, status, totalValue, items
    } = req.body;
    const values = [
        orderNumber, customerName, productName, orderDate, 
        deliveryDate, status, totalValue, items, id
    ];
    try {
        const queryText = `
            UPDATE "MANM".customer_orders SET
                order_number = $1, customer_name = $2, product_name = $3, 
                order_date = $4, delivery_date = $5, status = $6, 
                total_value = $7, items = $8
            WHERE id = $9
            RETURNING *
        `;
        const result = await pool.query(queryText, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // Use the updated helper for output
        res.json(toCamelCase(result.rows[0]));
    } catch (err) {
        console.error("Error updating order:", err.message);
        next(err);
    }
});


router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM "MANM".customer_orders WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // Use the updated helper for output
        res.status(200).json({ message: 'Order deleted successfully', item: toCamelCase(result.rows[0]) });
    } catch (err) {
        console.error("Error deleting order:", err.message);
        next(err);
    }
});

module.exports = router;
