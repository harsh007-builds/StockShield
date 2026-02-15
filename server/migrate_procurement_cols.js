require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function migrate() {
    try {
        await pool.query(`
      ALTER TABLE procurement_triggers 
      ADD COLUMN IF NOT EXISTS stock_at_resolution INTEGER,
      ADD COLUMN IF NOT EXISTS purchase_order VARCHAR(100);
    `);
        console.log('Migration successful: Added columns to procurement_triggers.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
