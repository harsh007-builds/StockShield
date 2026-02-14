const pool = require('../config/db');

exports.dashboard = async (req, res) => {
  try {
    // Total components
    const totalComponents = await pool.query('SELECT COUNT(*) as count FROM components');

    // Total PCBs
    const totalPcbs = await pool.query('SELECT COUNT(*) as count FROM pcbs');

    // Low-stock count
    const lowStock = await pool.query(
      `SELECT COUNT(*) as count FROM components 
       WHERE current_stock < CEIL(monthly_required_quantity * 0.2)`
    );

    // Total production entries
    const totalProductions = await pool.query('SELECT COUNT(*) as count FROM production_entries');

    // Pending procurement triggers
    const pendingTriggers = await pool.query(
      "SELECT COUNT(*) as count FROM procurement_triggers WHERE status = 'PENDING'"
    );

    res.json({
      total_components: parseInt(totalComponents.rows[0].count),
      total_pcbs: parseInt(totalPcbs.rows[0].count),
      low_stock_count: parseInt(lowStock.rows[0].count),
      total_productions: parseInt(totalProductions.rows[0].count),
      pending_procurement_triggers: parseInt(pendingTriggers.rows[0].count),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.consumptionSummary = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.component_name, c.part_number,
              COALESCE(SUM(ch.quantity_consumed), 0) as total_consumed,
              COUNT(ch.id) as consumption_count
       FROM components c
       LEFT JOIN consumption_history ch ON ch.component_id = c.id
       GROUP BY c.id, c.component_name, c.part_number
       ORDER BY total_consumed DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Consumption summary error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.topConsumed = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const result = await pool.query(
      `SELECT c.id, c.component_name, c.part_number,
              SUM(ch.quantity_consumed) as total_consumed
       FROM consumption_history ch
       JOIN components c ON c.id = ch.component_id
       GROUP BY c.id, c.component_name, c.part_number
       ORDER BY total_consumed DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Top consumed error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.lowStockComponents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, component_name, part_number, current_stock, monthly_required_quantity,
              CEIL(monthly_required_quantity * 0.2) as threshold
       FROM components
       WHERE current_stock < CEIL(monthly_required_quantity * 0.2)
       ORDER BY current_stock ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Low stock error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.consumptionTimeline = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DATE(ch.created_at) as date,
              SUM(ch.quantity_consumed) as total_consumed,
              COUNT(DISTINCT ch.production_entry_id) as production_runs
       FROM consumption_history ch
       GROUP BY DATE(ch.created_at)
       ORDER BY date DESC
       LIMIT 30`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Consumption timeline error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};
