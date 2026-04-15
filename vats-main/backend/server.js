// server.js
require('dotenv').config(); // Load environment variables first
const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Import the db pool directly

const app = express();
const port = process.env.PORT || 5001;

// --- Middleware ---
app.use(cors()); // Allow requests from your React app (configure origins in production)
app.use(express.json()); // Parse incoming JSON request bodies

// --- Basic Root Route ---
app.get('/', (req, res) => {
  res.send('ERP Backend API is running!');
});

// --- API Routes ---
// Import route handlers
const inventoryRoutes = require('./routes/inventory');
const mrpRoutes = require('./routes/mrp'); 
const mpsRoutes = require('./routes/mps');
const procurementRoutes = require('./routes/procurement');
const customerOrdersRoutes = require('./routes/control'); 
const logisticsRoutes = require('./routes/logistics');
const qualityControlRoutes = require('./routes/qualityControl'); // CORRECT IMPORT

// Use route handlers with base paths
app.use('/api/inventory', inventoryRoutes);
app.use('/api/mrp', mrpRoutes); 
app.use('/api/mps', mpsRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/customer-orders', customerOrdersRoutes); 
app.use('/api/logistics', logisticsRoutes);
app.use('/api/quality-control', qualityControlRoutes); // CORRECT SINGLE USAGE

// --- Simple Ping Route for DB Check ---
app.get('/api/db-ping', async (req, res, next) => {
  try {
    const time = await pool.query('SELECT NOW()');
    res.json({ message: 'PostgreSQL connection successful!', time: time.rows[0].now });
  } catch (err) {
    console.error("Database ping failed:", err.message);
    next(err); // Pass error to the global handler
  }
});

// --- Global Error Handler (Basic) ---
// This should be the LAST app.use() call
app.use((err, req, res, next) => {
  console.error('Error occurred:', err.stack); // Log the full error stack trace
  // Send a generic error response
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`🚀 Server listening at http://localhost:${port}`);
  console.log('🐘 Attempting to connect to PostgreSQL...');
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Initial PostgreSQL connection error:', err.message);
    } else {
      console.log('✅ Initial PostgreSQL connection successful at:', res.rows[0].now);
    }
  });
});
