import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';

export default function Components() {
  const [components, setComponents] = useState([]);
  const [search, setSearch] = useState('');
  const [showLow, setShowLow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [form, setForm] = useState({ component_name: '', part_number: '', current_stock: 0, monthly_required_quantity: 0 });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (showLow) params.low_stock = 'true';
      const res = await api.get('/components', { params });
      setComponents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, showLow]);

  useEffect(() => { fetchComponents(); }, [fetchComponents]);

  const openAdd = () => {
    setForm({ component_name: '', part_number: '', current_stock: 0, monthly_required_quantity: 0 });
    setEditId(null);
    setError('');
    setModal('add');
  };

  const openEdit = (c) => {
    setForm({
      component_name: c.component_name,
      part_number: c.part_number,
      current_stock: c.current_stock,
      monthly_required_quantity: c.monthly_required_quantity,
    });
    setEditId(c.id);
    setError('');
    setModal('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (modal === 'add') {
        await api.post('/components', form);
      } else {
        await api.put(`/components/${editId}`, form);
      }
      setModal(null);
      fetchComponents();
    } catch (err) {
      setError(err.response?.data?.error || 'Error saving component.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this component?')) return;
    try {
      await api.delete(`/components/${id}`);
      fetchComponents();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting component.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Components</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Component</button>
      </div>

      <div className="card">
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <input
            className="search-input"
            placeholder="Search by name or part number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={showLow} onChange={(e) => setShowLow(e.target.checked)} />
            Low Stock Only
          </label>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : components.length === 0 ? (
          <div className="empty">No components found</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Component Name</th>
                  <th>Part Number</th>
                  <th>Current Stock</th>
                  <th>Monthly Required</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {components.map((c) => (
                  <tr key={c.id}>
                    <td>{c.component_name}</td>
                    <td><code>{c.part_number}</code></td>
                    <td>{c.current_stock}</td>
                    <td>{c.monthly_required_quantity}</td>
                    <td>
                      {c.is_low_stock ? (
                        <span className="badge badge-danger">LOW STOCK</span>
                      ) : (
                        <span className="badge badge-success">OK</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Edit</button>{' '}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal === 'add' ? 'Add Component' : 'Edit Component'}</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Component Name</label>
                  <input className="form-control" value={form.component_name}
                    onChange={(e) => setForm({ ...form, component_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Part Number</label>
                  <input className="form-control" value={form.part_number}
                    onChange={(e) => setForm({ ...form, part_number: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Current Stock</label>
                  <input className="form-control" type="number" min="0" value={form.current_stock}
                    onChange={(e) => setForm({ ...form, current_stock: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Monthly Required Qty</label>
                  <input className="form-control" type="number" min="0" value={form.monthly_required_quantity}
                    onChange={(e) => setForm({ ...form, monthly_required_quantity: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{modal === 'add' ? 'Create' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
