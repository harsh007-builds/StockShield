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
  try {
    const result = await pool.query(
      `UPDATE procurement_triggers SET status = 'RESOLVED' WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Procurement trigger not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Resolve procurement trigger error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};
