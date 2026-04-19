// ─────────────────────────────────────────────────────────────
// Database Configuration — MySQL2 Connection Pool
// Local dev: uses .env credentials
// Production: replace with AWS RDS endpoint in .env
// ─────────────────────────────────────────────────────────────
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'international_high_school',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+05:30', // IST
  charset:            'utf8mb4',
});

// Test the connection on startup
const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };
