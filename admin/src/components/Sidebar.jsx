import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdDashboard, MdPeople, MdCampaign, MdMessage, MdAnalytics, MdSettings } from 'react-icons/md';
import '../styles/Sidebar.css';

export default function Sidebar({ isOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeMenu = location.pathname === '/users' ? 'users' : 'dashboard';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: MdDashboard, path: '/' },
    { id: 'users', label: 'Users', icon: MdPeople, path: '/users' },
    // { id: 'campaigns', label: 'Campaigns', icon: MdCampaign },
    // { id: 'messages', label: 'Messages', icon: MdMessage },
    // { id: 'analytics', label: 'Analytics', icon: MdAnalytics },
    // { id: 'settings', label: 'Settings', icon: MdSettings },
  ];

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <MdCampaign size={32} />
        <span className="logo-text">WhatsApp Admin</span>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => item.path && navigate(item.path)}
            >
              <Icon className="nav-icon" size={20} />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
