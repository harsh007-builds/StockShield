import React, { useEffect, useState } from 'react';
import api from '../api';

export default function Procurement() {
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const resolve = async (id) => {
    try {
      await api.put(`/procurement/${id}/resolve`);
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
                        <button className="btn btn-success btn-sm" onClick={() => resolve(t.id)}>
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
    </div>
  );
}
