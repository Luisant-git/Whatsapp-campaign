import { useState, useEffect, useRef } from 'react';
import { FiMenu } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Header.css';

export default function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowMobileProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <FiMenu size={22} />
        </button>
        <h2>WhatsApp Campaign Admin</h2>
      </div>

      <div className="header-right" ref={profileRef}>
        <span className="user-name">{user?.name || 'Admin'}</span>

        <button
          className="avatar-btn"
          onClick={() => setShowMobileProfile((prev) => !prev)}
        >
          <div className="user-avatar">{user?.name?.[0] || 'A'}</div>
        </button>

        <button className="logout-btn desktop-logout" onClick={logout}>
          Logout
        </button>

        {showMobileProfile && (
          <div className="mobile-profile-modal">
            <div className="mobile-profile-name">{user?.name || 'Admin'}</div>
            <button className="mobile-profile-logout" onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}