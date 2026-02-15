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
        // Rename purchase_order to po_reference if it exists
        await pool.query(`
      DO $$
      BEGIN
        IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='procurement_triggers' AND column_name='purchase_order') THEN
          ALTER TABLE procurement_triggers RENAME COLUMN purchase_order TO po_reference;
        END IF;
      END
      $$;
    `);

        // Add resolved_at if not exists
        await pool.query(`
      ALTER TABLE procurement_triggers 
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
    `);

        // Ensure po_reference exists (if purchase_order didn't exist before)
        await pool.query(`
      ALTER TABLE procurement_triggers 
      ADD COLUMN IF NOT EXISTS po_reference VARCHAR(100);
    `);

        console.log('Migration successful: Updated procurement_triggers columns.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
