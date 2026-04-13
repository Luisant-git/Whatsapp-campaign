import { useNavigate, useLocation } from 'react-router-dom';
import {
  MdDashboard,
  MdPeople,
  MdCampaign,
  MdCardMembership,
  MdReceipt,
  MdDomain,
  MdClose,
  MdContactMail
} from 'react-icons/md';
import '../styles/Sidebar.css';

export default function Sidebar({ isOpen, toggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();

  const activeMenu =
    location.pathname === '/users'
      ? 'users'
      : location.pathname === '/subscriptions'
      ? 'subscriptions'
      : location.pathname === '/subscription-orders'
      ? 'orders'
      : location.pathname === '/tenant-domains'
      ? 'domains'
      : location.pathname === '/landing-contacts'
      ? 'landing-contacts'
      : 'dashboard';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: MdDashboard, path: '/' },
    { id: 'users', label: 'Company Creation', icon: MdPeople, path: '/users' },
    { id: 'domains', label: 'Tenant Domains', icon: MdDomain, path: '/tenant-domains' },
    { id: 'subscriptions', label: 'Subscriptions', icon: MdCardMembership, path: '/subscriptions' },
    { id: 'orders', label: 'Subscription Orders', icon: MdReceipt, path: '/subscription-orders' },
    { id: 'landing-contacts', label: 'Landing Contacts', icon: MdContactMail, path: '/landing-contacts' },
  ];

  const handleNavigate = (path) => {
    navigate(path);

    if (window.innerWidth <= 1023) {
      toggleSidebar();
    }
  };

  return (
    <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-brand">
          <MdCampaign size={30} />
          <span className="logo-text">WhatsApp Admin</span>
        </div>

        <button className="sidebar-close-btn" onClick={toggleSidebar}>
          <MdClose size={24} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.path)}
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