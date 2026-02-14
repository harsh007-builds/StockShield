import React, { useEffect, useState } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export default function Analytics() {
  const [summary, setSummary] = useState([]);
  const [topConsumed, setTopConsumed] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/consumption-summary'),
      api.get('/analytics/top-consumed?limit=10'),
      api.get('/analytics/low-stock'),
    ]).then(([s, t, l]) => {
      setSummary(s.data);
      setTopConsumed(t.data);
      setLowStock(l.data);
    });
  }, []);

  const pieData = topConsumed.map((c) => ({
    name: c.part_number,
    value: parseInt(c.total_consumed),
  }));

  return (
    <div>
      <div className="page-header">
        <h1>Analytics</h1>
      </div>

      <div className="charts-grid">
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Top 10 Consumed Components</h3>
          {topConsumed.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topConsumed} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="part_number" type="category" width={100} fontSize={11} />
                <Tooltip />
                <Bar dataKey="total_consumed" fill="#3b82f6" name="Total Consumed" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">No data yet</div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 16 }}>Consumption Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty">No data yet</div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Component-wise Consumption Summary</h3>
        {summary.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Part Number</th>
                  <th>Total Consumed</th>
                  <th>Times Consumed</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((c) => (
                  <tr key={c.id}>
                    <td>{c.component_name}</td>
                    <td><code>{c.part_number}</code></td>
                    <td>{c.total_consumed}</td>
                    <td>{c.consumption_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No consumption data yet</div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Low Stock Components</h3>
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
                    <td style={{ color: '#dc2626', fontWeight: 600 }}>{c.current_stock}</td>
                    <td>{c.monthly_required_quantity}</td>
                    <td>{c.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">All stock levels are healthy</div>
        )}
      </div>
    </div>
  );
}
