import React, { useEffect, useState } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [topConsumed, setTopConsumed] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/dashboard'),
      api.get('/analytics/top-consumed?limit=10'),
      api.get('/analytics/low-stock'),
      api.get('/analytics/consumption-timeline'),
    ]).then(([d, t, l, tl]) => {
      setStats(d.data);
      setTopConsumed(t.data);
      setLowStock(l.data);
      setTimeline(tl.data.reverse());
    });
  }, []);

  if (!stats) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-label">Total Components</div>
          <div className="stat-value">{stats.total_components}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Total PCBs</div>
          <div className="stat-value">{stats.total_pcbs}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Low Stock Alerts</div>
          <div className="stat-value">{stats.low_stock_count}</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Production Runs</div>
          <div className="stat-value">{stats.total_productions}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Pending Procurement</div>
          <div className="stat-value">{stats.pending_procurement_triggers}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <h3 style={{marginBottom:16}}>Top Consumed Components</h3>
          {topConsumed.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topConsumed}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="part_number" fontSize={11} angle={-30} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_consumed" fill="#3b82f6" name="Total Consumed" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">No consumption data yet</div>
          )}
        </div>

        <div className="card">
          <h3 style={{marginBottom:16}}>Daily Consumption</h3>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_consumed" fill="#10b981" name="Units Consumed" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">No consumption data yet</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{marginBottom:16}}>Low Stock Components</h3>
        {lowStock.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Part Number</th>
                  <th>Current Stock</th>
                  <th>Monthly Required</th>
                  <th>Threshold (20%)</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((c) => (
                  <tr key={c.id}>
                    <td>{c.component_name}</td>
                    <td><code>{c.part_number}</code></td>
                    <td style={{color:'#dc2626',fontWeight:600}}>{c.current_stock}</td>
                    <td>{c.monthly_required_quantity}</td>
                    <td>{c.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">All components are adequately stocked</div>
        )}
      </div>
    </div>
  );
}
