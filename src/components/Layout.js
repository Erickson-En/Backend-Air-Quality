// src/components/Layout.js
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="app-root">
      <Sidebar />
      <main className="main">
        <Header />
        {children}
      </main>
    </div>
  );
}
