// routes/logistics.js
const express = require('express');
const pool = require('../db'); // Use the pool directly from db.js
const router = express.Router();

// GET all logistics records
router.get('/', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM "MANM".logistics ORDER BY departure_date DESC, shipment_id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching logistics data:", err.message);
        next(err);
    }
});

// GET a single logistics record by shipment_id
router.get('/:shipmentId', async (req, res, next) => {
    try {
        const { shipmentId } = req.params;
        const result = await pool.query('SELECT * FROM "MANM".logistics WHERE shipment_id = $1', [shipmentId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching shipment:", err.message);
        next(err);
    }
});

// POST a new logistics record
router.post('/', async (req, res, next) => {
    try {
        const { shipment_id, order_number, carrier, tracking_number, origin, destination, departure_date, estimated_arrival, status, priority } = req.body;
        // Basic validation
        if (!shipment_id || !order_number || !carrier || !destination || !status || !priority) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const dbResult = await pool.query(
            `INSERT INTO "MANM".logistics (shipment_id, order_number, carrier, tracking_number, origin, destination, departure_date, estimated_arrival, status, priority)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [shipment_id, order_number, carrier, tracking_number, origin, destination, departure_date, estimated_arrival, status, priority]
        );
        res.status(201).json(dbResult.rows[0]);
    } catch (err) {
        console.error("Error adding shipment:", err.message);
        next(err);
    }
});

// PUT (update) a logistics record
router.put('/:shipmentId', async (req, res, next) => {
    try {
        const { shipmentId } = req.params;
        const { order_number, carrier, tracking_number, origin, destination, departure_date, estimated_arrival, status, priority } = req.body;

        const fields = [];
        const values = [];
        let queryIndex = 1;

        // Build SET clause dynamically
        if (order_number !== undefined) { fields.push(`order_number = $${queryIndex++}`); values.push(order_number); }
        if (carrier !== undefined) { fields.push(`carrier = $${queryIndex++}`); values.push(carrier); }
        if (tracking_number !== undefined) { fields.push(`tracking_number = $${queryIndex++}`); values.push(tracking_number); }
        if (origin !== undefined) { fields.push(`origin = $${queryIndex++}`); values.push(origin); }
        if (destination !== undefined) { fields.push(`destination = $${queryIndex++}`); values.push(destination); }
        if (departure_date !== undefined) { fields.push(`departure_date = $${queryIndex++}`); values.push(departure_date); }
        if (estimated_arrival !== undefined) { fields.push(`estimated_arrival = $${queryIndex++}`); values.push(estimated_arrival); }
        if (status !== undefined) { fields.push(`status = $${queryIndex++}`); values.push(status); }
        if (priority !== undefined) { fields.push(`priority = $${queryIndex++}`); values.push(priority); }


        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields provided for update' });
        }

        values.push(shipmentId); // ID for WHERE clause

        const updateQuery = `UPDATE "MANM".logistics SET ${fields.join(', ')} WHERE shipment_id = $${queryIndex} RETURNING *`;

        const dbResult = await pool.query(updateQuery, values);

        if (dbResult.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        res.json(dbResult.rows[0]);
    } catch (err) {
        console.error("Error updating shipment:", err.message);
        next(err);
    }
});

// DELETE a logistics record
router.delete('/:shipmentId', async (req, res, next) => {
    try {
        const { shipmentId } = req.params;
        const dbResult = await pool.query('DELETE FROM "MANM".logistics WHERE shipment_id = $1 RETURNING *', [shipmentId]);
        if (dbResult.rows.length === 0) {
            return res.status(404).json({ error: 'Shipment not found' });
        }
        res.status(200).json({ message: 'Shipment deleted successfully', item: dbResult.rows[0] });
    } catch (err) {
        console.error("Error deleting shipment:", err.message);
        next(err);
    }
});

module.exports = router;
