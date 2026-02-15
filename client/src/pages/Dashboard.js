import React, { useEffect, useState } from 'react';
import api from '../api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
          <h3 style={{ marginBottom: 20 }}>Top Consumed Components</h3>
          {topConsumed.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={topConsumed}>
                <defs>
                  <linearGradient id="colorConsumed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="part_number"
                  fontSize={11}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="total_consumed"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorConsumed)"
                  name="Total Consumed"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">No consumption data yet</div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 20 }}>Daily Consumption</h3>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  fontSize={11}
                  tick={{ fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="total_consumed"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDaily)"
                  name="Units Consumed"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">No consumption data yet</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 20 }}>Low Stock Components</h3>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((c) => (
                  <tr key={c.id}>
                    <td><span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{c.component_name}</span></td>
                    <td><code>{c.part_number}</code></td>
                    <td style={{ color: 'var(--red-500)', fontWeight: 700 }}>{c.current_stock}</td>
                    <td>{c.monthly_required_quantity}</td>
                    <td>{c.threshold}</td>
                    <td><span className="badge badge-danger">LOW STOCK</span></td>
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
