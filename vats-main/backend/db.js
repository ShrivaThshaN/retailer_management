const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',     
  host: 'localhost',    
  database: 'MANM', 
  password: 'Now63750',     
  port: 5432,
  //options: '-c search_path=MANM'
});

module.exports = pool;
