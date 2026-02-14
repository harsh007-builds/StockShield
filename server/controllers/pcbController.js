const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pcbs ORDER BY pcb_name');
    res.json(result.rows);
  } catch (err) {
    console.error('Get PCBs error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const pcb = await pool.query('SELECT * FROM pcbs WHERE id = $1', [req.params.id]);
    if (pcb.rows.length === 0) {
      return res.status(404).json({ error: 'PCB not found.' });
    }

    const components = await pool.query(
      `SELECT pc.id as mapping_id, pc.quantity_per_pcb,
              c.id as component_id, c.component_name, c.part_number, c.current_stock
       FROM pcb_components pc
       JOIN components c ON c.id = pc.component_id
       WHERE pc.pcb_id = $1
       ORDER BY c.component_name`,
      [req.params.id]
    );

    res.json({ ...pcb.rows[0], components: components.rows });
  } catch (err) {
    console.error('Get PCB error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { pcb_name, pcb_code, description } = req.body;
    if (!pcb_name || !pcb_code) {
      return res.status(400).json({ error: 'pcb_name and pcb_code are required.' });
    }

    const result = await pool.query(
      'INSERT INTO pcbs (pcb_name, pcb_code, description) VALUES ($1, $2, $3) RETURNING *',
      [pcb_name, pcb_code, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'PCB code already exists.' });
    }
    console.error('Create PCB error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { pcb_name, pcb_code, description } = req.body;
    const result = await pool.query(
      `UPDATE pcbs SET pcb_name = COALESCE($1, pcb_name),
                       pcb_code = COALESCE($2, pcb_code),
                       description = COALESCE($3, description)
       WHERE id = $4 RETURNING *`,
      [pcb_name, pcb_code, description, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PCB not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'PCB code already exists.' });
    }
    console.error('Update PCB error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pcbs WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'PCB not found.' });
    }
    res.json({ message: 'PCB deleted.' });
  } catch (err) {
    console.error('Delete PCB error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// ---- Component Mapping ----
exports.addComponent = async (req, res) => {
  try {
    const { component_id, quantity_per_pcb } = req.body;
    if (!component_id || !quantity_per_pcb) {
      return res.status(400).json({ error: 'component_id and quantity_per_pcb are required.' });
    }

    const result = await pool.query(
      `INSERT INTO pcb_components (pcb_id, component_id, quantity_per_pcb)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, component_id, quantity_per_pcb]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Component already mapped to this PCB.' });
    }
    if (err.code === '23503') {
      return res.status(404).json({ error: 'PCB or Component not found.' });
    }
    console.error('Add component mapping error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.updateComponent = async (req, res) => {
  try {
    const { quantity_per_pcb } = req.body;
    const result = await pool.query(
      'UPDATE pcb_components SET quantity_per_pcb = $1 WHERE id = $2 AND pcb_id = $3 RETURNING *',
      [quantity_per_pcb, req.params.mappingId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update component mapping error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.removeComponent = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM pcb_components WHERE id = $1 AND pcb_id = $2 RETURNING id',
      [req.params.mappingId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found.' });
    }
    res.json({ message: 'Mapping removed.' });
  } catch (err) {
    console.error('Remove component mapping error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};
