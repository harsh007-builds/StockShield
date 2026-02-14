const pool = require('../config/db');
const { checkProcurementTrigger } = require('./componentController');

exports.produce = async (req, res) => {
  const client = await pool.connect();
  try {
    const { pcb_id, quantity_produced } = req.body;
    if (!pcb_id || !quantity_produced || quantity_produced <= 0) {
      return res.status(400).json({ error: 'pcb_id and a positive quantity_produced are required.' });
    }

    await client.query('BEGIN');

    // Get all components for this PCB
    const mappings = await client.query(
      `SELECT pc.component_id, pc.quantity_per_pcb, c.component_name, c.part_number, c.current_stock
       FROM pcb_components pc
       JOIN components c ON c.id = pc.component_id
       WHERE pc.pcb_id = $1`,
      [pcb_id]
    );

    if (mappings.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No components mapped to this PCB.' });
    }

    // Check stock sufficiency for ALL components first
    const insufficientStock = [];
    for (const mapping of mappings.rows) {
      const required = mapping.quantity_per_pcb * quantity_produced;
      if (mapping.current_stock < required) {
        insufficientStock.push({
          component_name: mapping.component_name,
          part_number: mapping.part_number,
          current_stock: mapping.current_stock,
          required: required,
          shortfall: required - mapping.current_stock,
        });
      }
    }

    if (insufficientStock.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient stock for production.',
        insufficient_components: insufficientStock,
      });
    }

    // Create production entry
    const prodEntry = await client.query(
      `INSERT INTO production_entries (pcb_id, quantity_produced, produced_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [pcb_id, quantity_produced, req.user.id]
    );
    const productionEntryId = prodEntry.rows[0].id;

    // Deduct stock and record consumption
    const consumptionRecords = [];
    for (const mapping of mappings.rows) {
      const quantityConsumed = mapping.quantity_per_pcb * quantity_produced;
      const stockBefore = mapping.current_stock;
      const stockAfter = stockBefore - quantityConsumed;

      // Deduct stock (CHECK constraint prevents negative)
      await client.query(
        'UPDATE components SET current_stock = $1, updated_at = NOW() WHERE id = $2',
        [stockAfter, mapping.component_id]
      );

      // Record consumption
      const consumption = await client.query(
        `INSERT INTO consumption_history 
         (production_entry_id, component_id, quantity_consumed, stock_before, stock_after)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [productionEntryId, mapping.component_id, quantityConsumed, stockBefore, stockAfter]
      );

      consumptionRecords.push(consumption.rows[0]);
    }

    await client.query('COMMIT');

    // Check procurement triggers after commit (non-blocking)
    for (const mapping of mappings.rows) {
      try {
        await checkProcurementTrigger(mapping.component_id);
      } catch (e) {
        console.error('Procurement trigger check error:', e);
      }
    }

    res.status(201).json({
      production_entry: prodEntry.rows[0],
      consumption: consumptionRecords,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Production error:', err);
    res.status(500).json({ error: 'Server error during production.' });
  } finally {
    client.release();
  }
};

exports.getHistory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pe.*, p.pcb_name, p.pcb_code, u.username as produced_by_name
       FROM production_entries pe
       JOIN pcbs p ON p.id = pe.pcb_id
       LEFT JOIN users u ON u.id = pe.produced_by
       ORDER BY pe.created_at DESC
       LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get production history error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getConsumptionByEntry = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ch.*, c.component_name, c.part_number
       FROM consumption_history ch
       JOIN components c ON c.id = ch.component_id
       WHERE ch.production_entry_id = $1
       ORDER BY c.component_name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get consumption error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};
