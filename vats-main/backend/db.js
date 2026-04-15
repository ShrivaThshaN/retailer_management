const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',     
  host: 'localhost',    
  database: 'MANM', 
  password: 'Yasir@123',     
  port: 5432,
  //options: '-c search_path=MANM'
});

module.exports = pool;
