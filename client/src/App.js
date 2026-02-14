import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Components from './pages/Components';
import PCBs from './pages/PCBs';
import Production from './pages/Production';
import Procurement from './pages/Procurement';
import Analytics from './pages/Analytics';
import ExcelIO from './pages/ExcelIO';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: '📊' },
    { to: '/components', label: 'Components', icon: '🔧' },
    { to: '/pcbs', label: 'PCB Boards', icon: '🔲' },
    { to: '/production', label: 'Production', icon: '🏭' },
    { to: '/procurement', label: 'Procurement', icon: '📋' },
    { to: '/analytics', label: 'Analytics', icon: '📈' },
    { to: '/excel', label: 'Import / Export', icon: '📁' },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>Invictus PCB</h2>
          <small>Inventory Management</small>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: 12, marginBottom: 8, color: '#94a3b8' }}>
            Signed in as <strong style={{ color: '#fff' }}>{user?.username}</strong>
          </div>
          <button onClick={logout}>Sign Out</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/components" element={<ProtectedRoute><Layout><Components /></Layout></ProtectedRoute>} />
      <Route path="/pcbs" element={<ProtectedRoute><Layout><PCBs /></Layout></ProtectedRoute>} />
      <Route path="/production" element={<ProtectedRoute><Layout><Production /></Layout></ProtectedRoute>} />
      <Route path="/procurement" element={<ProtectedRoute><Layout><Procurement /></Layout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
      <Route path="/excel" element={<ProtectedRoute><Layout><ExcelIO /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
