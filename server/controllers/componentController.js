const pool = require('../config/db');

// Check procurement trigger for a component
async function checkProcurementTrigger(componentId) {
  const result = await pool.query('SELECT * FROM components WHERE id = $1', [componentId]);
  if (result.rows.length === 0) return;

  const comp = result.rows[0];
  const threshold = Math.ceil(comp.monthly_required_quantity * 0.2);

  if (comp.current_stock < threshold) {
    // Check if there's already a pending trigger
    const existing = await pool.query(
      `SELECT id FROM procurement_triggers 
       WHERE component_id = $1 AND status = 'PENDING'`,
      [componentId]
    );
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO procurement_triggers 
         (component_id, current_stock, monthly_required_quantity, threshold, status)
         VALUES ($1, $2, $3, $4, 'PENDING')`,
        [componentId, comp.current_stock, comp.monthly_required_quantity, threshold]
      );
    }
  }
}

exports.getAll = async (req, res) => {
  try {
    const { search, low_stock } = req.query;
    let query = `SELECT c.*, 
      CASE WHEN c.current_stock < CEIL(c.monthly_required_quantity * 0.2) 
           THEN true ELSE false END AS is_low_stock
      FROM components c WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (c.component_name ILIKE $${params.length} OR c.part_number ILIKE $${params.length})`;
    }

    if (low_stock === 'true') {
      query += ` AND c.current_stock < CEIL(c.monthly_required_quantity * 0.2)`;
    }

    query += ' ORDER BY c.component_name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get components error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
        CASE WHEN c.current_stock < CEIL(c.monthly_required_quantity * 0.2) 
             THEN true ELSE false END AS is_low_stock
       FROM components c WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Component not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get component error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { component_name, part_number, current_stock, monthly_required_quantity } = req.body;
    if (!component_name || !part_number) {
      return res.status(400).json({ error: 'component_name and part_number are required.' });
    }

    const result = await pool.query(
      `INSERT INTO components (component_name, part_number, current_stock, monthly_required_quantity)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [component_name, part_number, current_stock || 0, monthly_required_quantity || 0]
    );

    const comp = result.rows[0];
    await checkProcurementTrigger(comp.id);
    res.status(201).json(comp);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Part number already exists.' });
    }
    console.error('Create component error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { component_name, part_number, current_stock, monthly_required_quantity } = req.body;
    const result = await pool.query(
      `UPDATE components 
       SET component_name = COALESCE($1, component_name),
           part_number = COALESCE($2, part_number),
           current_stock = COALESCE($3, current_stock),
           monthly_required_quantity = COALESCE($4, monthly_required_quantity),
           updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [component_name, part_number, current_stock, monthly_required_quantity, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Component not found.' });
    }

    await checkProcurementTrigger(req.params.id);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Part number already exists.' });
    }
    console.error('Update component error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM components WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Component not found.' });
    }
    res.json({ message: 'Component deleted.' });
  } catch (err) {
    console.error('Delete component error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports.checkProcurementTrigger = checkProcurementTrigger;
