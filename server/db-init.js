require('dotenv').config();
const { Pool } = require('pg');

const ADMIN_PASSWORD = 'admin123';

async function initDB() {
  // Connect without database to create it if needed
  const rootPool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres',
  });

  try {
    const dbCheck = await rootPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1", [process.env.DB_NAME]
    );
    if (dbCheck.rows.length === 0) {
      await rootPool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`Database "${process.env.DB_NAME}" created.`);
    } else {
      console.log(`Database "${process.env.DB_NAME}" already exists.`);
    }
  } finally {
    await rootPool.end();
  }

  // Connect to the app database
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS components (
      id SERIAL PRIMARY KEY,
      component_name VARCHAR(255) NOT NULL,
      part_number VARCHAR(100) UNIQUE NOT NULL,
      current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
      monthly_required_quantity INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pcbs (
      id SERIAL PRIMARY KEY,
      pcb_name VARCHAR(255) NOT NULL,
      pcb_code VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pcb_components (
      id SERIAL PRIMARY KEY,
      pcb_id INTEGER NOT NULL REFERENCES pcbs(id) ON DELETE CASCADE,
      component_id INTEGER NOT NULL REFERENCES components(id) ON DELETE CASCADE,
      quantity_per_pcb INTEGER NOT NULL CHECK (quantity_per_pcb > 0),
      UNIQUE(pcb_id, component_id)
    );

    CREATE TABLE IF NOT EXISTS production_entries (
      id SERIAL PRIMARY KEY,
      pcb_id INTEGER NOT NULL REFERENCES pcbs(id),
      quantity_produced INTEGER NOT NULL CHECK (quantity_produced > 0),
      produced_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS consumption_history (
      id SERIAL PRIMARY KEY,
      production_entry_id INTEGER NOT NULL REFERENCES production_entries(id),
      component_id INTEGER NOT NULL REFERENCES components(id),
      quantity_consumed INTEGER NOT NULL,
      stock_before INTEGER NOT NULL,
      stock_after INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS procurement_triggers (
      id SERIAL PRIMARY KEY,
      component_id INTEGER NOT NULL REFERENCES components(id),
      current_stock INTEGER NOT NULL,
      monthly_required_quantity INTEGER NOT NULL,
      threshold INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  try {
    await pool.query(schema);
    console.log('Schema created successfully.');

    // Seed admin user
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (username) DO NOTHING`,
      ['admin', hash]
    );
    console.log('Admin user seeded (username: admin, password: admin123).');
  } catch (err) {
    console.error('Error initializing database:', err.message);
  } finally {
    await pool.end();
  }
}

initDB();
