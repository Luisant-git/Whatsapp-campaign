import { useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Header.css';

export default function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();

  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <FiMenu size={24} />
        </button>
        <h2>WhatsApp Campaign Admin</h2>
      </div>
      
      <div className="header-right">
        <div className="user-info">
          <span className="user-name">{user?.name || 'Admin'}</span>
          <div className="user-avatar">{user?.name?.[0] || 'A'}</div>
        </div>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
