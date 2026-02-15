import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Production() {
  const [pcbs, setPcbs] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ pcb_id: '', quantity_produced: 1 });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [insufficientDetails, setInsufficientDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [consumptionModal, setConsumptionModal] = useState(null);
  const [substitutions, setSubstitutions] = useState({});

  useEffect(() => {
    api.get('/pcbs').then((res) => setPcbs(res.data));
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const res = await api.get('/production/history');
    setHistory(res.data);
  };

  const handleProduce = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setInsufficientDetails(null);
    setLoading(true);

    try {
      const res = await api.post('/production', {
        pcb_id: parseInt(form.pcb_id),
        quantity_produced: parseInt(form.quantity_produced),
        substitutions,
      });
      setSuccess(`Production successful! Entry #${res.data.production_entry.id} created. ${res.data.consumption.length} components consumed.`);
      setForm({ pcb_id: '', quantity_produced: 1 });
      setSubstitutions({});
      fetchHistory();
    } catch (err) {
      const data = err.response?.data;
      if (data?.insufficient_components) {
        setInsufficientDetails(data.insufficient_components);
        setError(data.error);
      } else {
        setError(data?.error || 'Production failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const viewConsumption = async (entryId) => {
    try {
      const res = await api.get(`/production/${entryId}/consumption`);
      setConsumptionModal(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSubstitution = (componentId, useAlt) => {
    setSubstitutions(prev => ({
      ...prev,
      [componentId]: useAlt
    }));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Production Entry</h1>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Record Production</h3>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {insufficientDetails && (
          <div style={{ marginBottom: 16 }}>
            <div className="alert alert-danger">
              <strong>Insufficient Stock!</strong> Some components are missing.
              {insufficientDetails.some(c => c.alternative) && " You can select approved alternatives below."}
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Part Number</th>
                    <th>Available</th>
                    <th>Required</th>
                    <th>Shortfall</th>
                    <th>Suggestion</th>
                  </tr>
                </thead>
                <tbody>
                  {insufficientDetails.map((c, i) => (
                    <tr key={i}>
                      <td>{c.component_name}</td>
                      <td><code>{c.part_number}</code></td>
                      <td>{c.current_stock}</td>
                      <td>{c.required}</td>
                      <td style={{ color: '#dc2626', fontWeight: 600 }}>{c.shortfall}</td>
                      <td>
                        {c.alternative ? (
                          <div style={{ border: '1px solid #e5e7eb', padding: 8, borderRadius: 4, background: '#f9fafb' }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.alternative.component_name}</div>
                            <div style={{ fontSize: '0.9em', marginBottom: 4 }}>
                              Stock: <span className={c.alternative.current_stock >= c.required ? 'text-success' : 'text-danger'}>
                                {c.alternative.current_stock}
                              </span>
                            </div>
                            {c.alternative.current_stock >= c.required ? (
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginTop: 4 }}>
                                <input type="checkbox"
                                  checked={!!substitutions[c.component_id]}
                                  onChange={(e) => toggleSubstitution(c.component_id, e.target.checked)}
                                />
                                <span style={{ fontSize: '0.9em' }}>Use Alternative</span>
                              </label>
                            ) : (
                              <span style={{ fontSize: '0.85em', color: '#999' }}>Alt also insufficient</span>
                            )}
                          </div>
                        ) : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {Object.values(substitutions).some(Boolean) && (
              <div style={{ marginTop: 8, textAlign: 'right' }}>
                <button className="btn btn-primary" onClick={handleProduce}>
                  Retry with Substitutions
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleProduce} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
            <label>Select PCB</label>
            <select className="form-control" value={form.pcb_id}
              onChange={(e) => setForm({ ...form, pcb_id: e.target.value })} required>
              <option value="">Choose PCB...</option>
              {pcbs.map((p) => (
                <option key={p.id} value={p.id}>{p.pcb_name} ({p.pcb_code})</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Quantity</label>
            <input className="form-control" type="number" min="1" value={form.quantity_produced}
              onChange={(e) => setForm({ ...form, quantity_produced: e.target.value })} required />
          </div>
          <button className="btn btn-success" disabled={loading} type="submit" style={{ height: 38 }}>
            {loading ? 'Processing...' : 'Produce'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Production History</h3>
        {history.length === 0 ? (
          <div className="empty">No production entries yet</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>PCB</th>
                  <th>Code</th>
                  <th>Qty Produced</th>
                  <th>By</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>#{h.id}</td>
                    <td>{h.pcb_name}</td>
                    <td><code>{h.pcb_code}</code></td>
                    <td>{h.quantity_produced}</td>
                    <td>{h.produced_by_name || '—'}</td>
                    <td>{new Date(h.created_at).toLocaleString()}</td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => viewConsumption(h.id)}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {consumptionModal && (
        <div className="modal-overlay" onClick={() => setConsumptionModal(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h2>Consumption Details</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Part Number</th>
                    <th>Consumed</th>
                    <th>Before</th>
                    <th>After</th>
                  </tr>
                </thead>
                <tbody>
                  {consumptionModal.map((c) => (
                    <tr key={c.id}>
                      <td>{c.component_name}</td>
                      <td><code>{c.part_number}</code></td>
                      <td>{c.quantity_consumed}</td>
                      <td>{c.stock_before}</td>
                      <td>{c.stock_after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setConsumptionModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
