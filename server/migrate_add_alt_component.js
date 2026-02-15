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
      ALTER TABLE pcb_components 
      ADD COLUMN IF NOT EXISTS alternative_component_id INTEGER REFERENCES components(id) ON DELETE SET NULL;
    `);
        console.log('Migration successful: Added alternative_component_id to pcb_components.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
