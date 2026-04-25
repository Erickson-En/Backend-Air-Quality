// src/components/Sidebar.js
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Dashboard',    icon: '▦',  title: 'Overview' },
  { path: '/real-time',  label: 'Real-Time',    icon: '◎',  title: 'Live Feed' },
  { path: '/historical', label: 'Historical',   icon: '⊞',  title: 'Trends' },
  { path: '/analytics',  label: 'Analytics',    icon: '✦',  title: 'AI Analytics' },
  { path: '/settings',   label: 'Settings',     icon: '⚙',  title: 'Configuration' },
];

export default function Sidebar() {
  const loc = useLocation();
  const { user, logout } = useAuth() || {};
  const isActive = (path) => loc.pathname === path;
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand">
        <div className="logo" aria-hidden="true" />
        <h1>
          AirQuality
          <span>Pro Monitor</span>
        </h1>
      </div>

      {/* Navigation */}
      <span className="nav-label">Navigation</span>
      <nav className="nav" aria-label="Main navigation">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={isActive(item.path) ? 'active' : ''}
            title={item.title}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Live clock */}
        <div className="sidebar-footer-item" style={{ justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.05em', opacity: 0.5 }}>LOCAL TIME</span>
          <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, fontWeight: 600 }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* System status */}
        <div className="sidebar-footer-item">
          <span className="status-dot" />
          <span>System Online</span>
        </div>

        {/* Logged-in user */}
        {user && (
          <div
            className="sidebar-footer-item"
            style={{ justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={logout}
            title="Click to sign out"
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email || user.username || 'User'}
            </span>
            <span style={{ opacity: 0.5, fontSize: 11 }}>Sign out</span>
          </div>
        )}

        <div className="sidebar-footer-item" style={{ marginTop: 6 }}>
          <span style={{ fontSize: 10, opacity: 0.3, letterSpacing: '0.04em' }}>
            v1.0 · Nairobi, Kenya
          </span>
        </div>
      </div>
    </aside>
  );
}
