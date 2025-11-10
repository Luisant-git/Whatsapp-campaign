import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { MessageSquare, Settings, BarChart3, User, Send } from 'lucide-react'
import WhatsAppChat from './components/WhatsAppChat'
import BulkWhatsApp from './components/BulkWhatsApps'
import Login from './components/Login'
import Analytics from './components/Analytics'
import SettingsPanel from './components/Settings'
import Profile from './components/Profile'
import './App.css'
import './styles/Analytics.css'
import './styles/Settings.css'
import './styles/Profile.css'

function App() {
  const [activeView, setActiveView] = useState('chats')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setUser(null);
    setShowProfileMenu(false);
  }

  return (
    <>
      <Toaster position="top-center" />
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
      <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Dashboard</h2>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeView === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveView('chats')}
          >
            <MessageSquare size={18} />
            <span>WhatsApp Chats</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'bulk' ? 'active' : ''}`}
            onClick={() => setActiveView('bulk')}
          >
            <Send size={18} />
            <span>Bulk Messages</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveView('settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            <BarChart3 size={18} />
            <span>Analytics</span>
          </button>
        </nav>
      </div>
      <div className="main-content">
        <div className="header">
          <h1>WhatsApp Dashboard</h1>
          <div className="profile-dropdown">
            <button className="profile-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>
            {showProfileMenu && (
              <div className="profile-menu">
                <button 
                  className="profile-menu-item" 
                  onClick={() => {
                    setActiveView('profile');
                    setShowProfileMenu(false);
                  }}
                >
                  My Profile
                </button>
                <button 
                  className="profile-menu-item"
                  onClick={() => {
                    setActiveView('settings');
                    setShowProfileMenu(false);
                  }}
                >
                  Settings
                </button>
                <button className="profile-menu-item" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
        {activeView === 'chats' && <WhatsAppChat />}
        {activeView === 'bulk' && <BulkWhatsApp />}
        {activeView === 'analytics' && <Analytics />}
        {activeView === 'settings' && <SettingsPanel />}
        {activeView === 'profile' && <Profile />}
      </div>
    </div>
      )}
    </>
  )
}

export default App
