const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  try {
    await c.query('ALTER TABLE announcements ADD COLUMN category VARCHAR(50) DEFAULT "General" AFTER content');
    console.log('Successfully added category column!');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      throw e;
    }
  }
  await c.end();
}

run().catch(console.error);
