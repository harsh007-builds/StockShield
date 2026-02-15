import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Procurement() {
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState(null); // { id, component_name }
  const [resolveForm, setResolveForm] = useState({ quantity_received: '', po_reference: '' });

  useEffect(() => { fetchTriggers(); }, []);

  const fetchTriggers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/procurement');
      setTriggers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openResolveModal = (trigger) => {
    setResolveModal(trigger);
    setResolveForm({ quantity_received: '', po_reference: '' });
  };

  const closeResolveModal = () => {
    setResolveModal(null);
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolveModal) return;

    try {
      await api.put(`/procurement/${resolveModal.id}/resolve`, {
        quantity_received: parseInt(resolveForm.quantity_received),
        po_reference: resolveForm.po_reference,
      });
      setResolveModal(null);
      fetchTriggers();
    } catch (err) {
      alert(err.response?.data?.error || 'Error resolving trigger.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Procurement Triggers</h1>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : triggers.length === 0 ? (
          <div className="empty">No procurement triggers</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Part Number</th>
                  <th>Stock at Trigger</th>
                  <th>Monthly Required</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {triggers.map((t) => (
                  <tr key={t.id}>
                    <td>{t.component_name}</td>
                    <td><code>{t.part_number}</code></td>
                    <td>{t.current_stock}</td>
                    <td>{t.monthly_required_quantity}</td>
                    <td>{t.threshold}</td>
                    <td>
                      <span className={`badge ${t.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>{new Date(t.created_at).toLocaleString()}</td>
                    <td>
                      {t.status === 'PENDING' && (
                        <button className="btn btn-success btn-sm" onClick={() => openResolveModal(t)}>
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {resolveModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Resolve Procurement: {resolveModal.component_name}</h3>
            <form onSubmit={handleResolveSubmit}>
              <div className="form-group">
                <label>Quantity Received (Units)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={resolveForm.quantity_received}
                  onChange={(e) => setResolveForm({ ...resolveForm, quantity_received: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Purchase Order (PO) Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PO-2023-001"
                  value={resolveForm.po_reference}
                  onChange={(e) => setResolveForm({ ...resolveForm, po_reference: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeResolveModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
