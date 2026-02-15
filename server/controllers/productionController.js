const pool = require('../config/db');
const { checkProcurementTrigger } = require('./componentController');

exports.produce = async (req, res) => {
  const client = await pool.connect();
  try {
    const { pcb_id, quantity_produced, substitutions = {} } = req.body;
    if (!pcb_id || !quantity_produced || quantity_produced <= 0) {
      return res.status(400).json({ error: 'pcb_id and a positive quantity_produced are required.' });
    }

    await client.query('BEGIN');

    // Get all components for this PCB
    const mappings = await client.query(
      `SELECT pc.component_id, pc.quantity_per_pcb, pc.alternative_component_id,
              c.component_name, c.part_number, c.current_stock,
              ac.component_name as alt_component_name, ac.part_number as alt_part_number, ac.current_stock as alt_current_stock
       FROM pcb_components pc
       JOIN components c ON c.id = pc.component_id
       LEFT JOIN components ac ON ac.id = pc.alternative_component_id
       WHERE pc.pcb_id = $1`,
      [pcb_id]
    );

    if (mappings.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No components mapped to this PCB.' });
    }

    // Check stock sufficiency for ALL components
    const insufficientStock = [];
    const componentsToConsume = [];

    for (const mapping of mappings.rows) {
      const required = mapping.quantity_per_pcb * quantity_produced;
      let targetComponentId = mapping.component_id;
      let targetStock = mapping.current_stock;
      let targetName = mapping.component_name;
      let targetPart = mapping.part_number;

      // Check if substitution is requested and valid
      if (substitutions[mapping.component_id] && mapping.alternative_component_id) {
        // Use alternative
        targetComponentId = mapping.alternative_component_id;
        targetStock = mapping.alt_current_stock;
        targetName = mapping.alt_component_name;
        targetPart = mapping.alt_part_number;
      }

      if (targetStock < required) {
        const errorDetail = {
          component_id: mapping.component_id,
          component_name: targetName,
          part_number: targetPart,
          current_stock: targetStock,
          required: required,
          shortfall: required - targetStock,
        };

        // If we were trying to use primary, and an alternative exists, include it in suggestion
        if (targetComponentId === mapping.component_id && mapping.alternative_component_id) {
          errorDetail.alternative = {
            component_id: mapping.alternative_component_id,
            component_name: mapping.alt_component_name,
            part_number: mapping.alt_part_number,
            current_stock: mapping.alt_current_stock,
          };
        }

        insufficientStock.push(errorDetail);
      } else {
        componentsToConsume.push({
          component_id: targetComponentId,
          quantity: required,
          stock_before: targetStock,
          stock_after: targetStock - required
        });
      }
    }

    if (insufficientStock.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient stock.',
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
    for (const item of componentsToConsume) {
      // Deduct stock
      await client.query(
        'UPDATE components SET current_stock = $1, updated_at = NOW() WHERE id = $2',
        [item.stock_after, item.component_id]
      );

      // Record consumption
      const consumption = await client.query(
        `INSERT INTO consumption_history 
         (production_entry_id, component_id, quantity_consumed, stock_before, stock_after)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [productionEntryId, item.component_id, item.quantity, item.stock_before, item.stock_after]
      );

      consumptionRecords.push(consumption.rows[0]);
    }

    await client.query('COMMIT');

    // Check procurement triggers (non-blocking)
    for (const item of componentsToConsume) {
      try {
        await checkProcurementTrigger(item.component_id);
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
