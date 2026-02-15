const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pt.*, c.component_name, c.part_number
       FROM procurement_triggers pt
       JOIN components c ON c.id = pt.component_id
       ORDER BY pt.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get procurement triggers error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.resolve = async (req, res) => {
  const { quantity_received, po_reference } = req.body;

  if (!quantity_received || quantity_received <= 0) {
    return res.status(400).json({ error: 'Valid quantity received is required.' });
  }
  if (!po_reference) {
    return res.status(400).json({ error: 'PO Reference is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get trigger to find component_id
    const triggerRes = await client.query('SELECT * FROM procurement_triggers WHERE id = $1', [req.params.id]);
    if (triggerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Trigger not found.' });
    }
    const trigger = triggerRes.rows[0];

    // Update component stock
    const stockUpdate = await client.query(
      'UPDATE components SET current_stock = current_stock + $1, updated_at = NOW() WHERE id = $2 RETURNING current_stock',
      [quantity_received, trigger.component_id]
    );
    const newStock = stockUpdate.rows[0].current_stock;
    const stockBefore = newStock - quantity_received;

    // Update trigger status and details
    const result = await client.query(
      `UPDATE procurement_triggers 
       SET status = 'RESOLVED', 
           stock_at_resolution = $1, 
           po_reference = $2,
           resolved_at = NOW()
       WHERE id = $3 RETURNING *`,
      [stockBefore, po_reference, req.params.id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Resolve procurement trigger error:', err);
    res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
};
