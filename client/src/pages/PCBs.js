import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';

export default function PCBs() {
  const [pcbs, setPcbs] = useState([]);
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'map'
  const [form, setForm] = useState({ pcb_name: '', pcb_code: '', description: '' });
  const [editId, setEditId] = useState(null);
  const [selectedPcb, setSelectedPcb] = useState(null);
  const [mapForm, setMapForm] = useState({ component_id: '', quantity_per_pcb: 1 });
  const [error, setError] = useState('');

  const fetchPcbs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/pcbs');
      setPcbs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchComponents = async () => {
    try {
      const res = await api.get('/components');
      setComponents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchPcbs(); fetchComponents(); }, [fetchPcbs]);

  const openAdd = () => {
    setForm({ pcb_name: '', pcb_code: '', description: '' });
    setEditId(null);
    setError('');
    setModal('add');
  };

  const openEdit = (p) => {
    setForm({ pcb_name: p.pcb_name, pcb_code: p.pcb_code, description: p.description || '' });
    setEditId(p.id);
    setError('');
    setModal('edit');
  };

  const openMap = async (p) => {
    try {
      const res = await api.get(`/pcbs/${p.id}`);
      setSelectedPcb(res.data);
      setMapForm({ component_id: '', quantity_per_pcb: 1 });
      setError('');
      setModal('map');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (modal === 'add') {
        await api.post('/pcbs', form);
      } else {
        await api.put(`/pcbs/${editId}`, form);
      }
      setModal(null);
      fetchPcbs();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving PCB.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this PCB and all its mappings?')) return;
    try {
      await api.delete(`/pcbs/${id}`);
      fetchPcbs();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting PCB.');
    }
  };

  const handleAddMapping = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/pcbs/${selectedPcb.id}/components`, {
        component_id: parseInt(mapForm.component_id),
        quantity_per_pcb: parseInt(mapForm.quantity_per_pcb),
      });
      const res = await api.get(`/pcbs/${selectedPcb.id}`);
      setSelectedPcb(res.data);
      setMapForm({ component_id: '', quantity_per_pcb: 1 });
    } catch (err) {
      setError(err.response?.data?.error || 'Error adding mapping.');
    }
  };

  const handleRemoveMapping = async (mappingId) => {
    try {
      await api.delete(`/pcbs/${selectedPcb.id}/components/${mappingId}`);
      const res = await api.get(`/pcbs/${selectedPcb.id}`);
      setSelectedPcb(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Error removing mapping.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>PCB Boards</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add PCB</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : pcbs.length === 0 ? (
          <div className="empty">No PCBs created yet</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>PCB Name</th>
                  <th>PCB Code</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pcbs.map((p) => (
                  <tr key={p.id}>
                    <td>{p.pcb_name}</td>
                    <td><code>{p.pcb_code}</code></td>
                    <td>{p.description || '—'}</td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={() => openMap(p)}>Components</button>{' '}
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>{' '}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit PCB Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'add' ? 'Add PCB' : 'Edit PCB'}</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>PCB Name</label>
                  <input className="form-control" value={form.pcb_name}
                    onChange={(e) => setForm({ ...form, pcb_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>PCB Code</label>
                  <input className="form-control" value={form.pcb_code}
                    onChange={(e) => setForm({ ...form, pcb_code: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input className="form-control" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{modal === 'add' ? 'Create' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Component Mapping Modal */}
      {modal === 'map' && selectedPcb && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h2>Components for: {selectedPcb.pcb_name}</h2>
            {error && <div className="error-msg">{error}</div>}

            <form onSubmit={handleAddMapping} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <select className="form-control" value={mapForm.component_id}
                onChange={(e) => setMapForm({ ...mapForm, component_id: e.target.value })} required style={{ flex: 2 }}>
                <option value="">Select component...</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>{c.component_name} ({c.part_number})</option>
                ))}
              </select>
              <input className="form-control" type="number" min="1" placeholder="Qty" value={mapForm.quantity_per_pcb}
                onChange={(e) => setMapForm({ ...mapForm, quantity_per_pcb: e.target.value })} required style={{ flex: 1 }} />
              <button className="btn btn-success" type="submit">Add</button>
            </form>

            {selectedPcb.components?.length > 0 ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Part Number</th>
                      <th>Qty / PCB</th>
                      <th>Stock</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPcb.components.map((c) => (
                      <tr key={c.mapping_id}>
                        <td>{c.component_name}</td>
                        <td><code>{c.part_number}</code></td>
                        <td>{c.quantity_per_pcb}</td>
                        <td>{c.current_stock}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMapping(c.mapping_id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">No components mapped yet</div>
            )}

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
