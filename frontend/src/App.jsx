import { useState, useEffect } from 'react'
import { MessageSquare, Settings, BarChart3, User, Send, MessageCircle, Bot, Megaphone, Sliders, Menu, X } from 'lucide-react'
import { ToastProvider } from './contexts/ToastContext'
import WhatsAppChat from './components/WhatsAppChat'
import BulkWhatsApp from './components/BulkWhatsApps'
import Campaigns from './components/Campaigns'
import Login from './components/Login'
import Analytics from './components/Analytics'
import SettingsPanel from './components/Settings'
import MasterConfig from './components/MasterConfig'
import Profile from './components/Profile'
import AutoReply from './components/AutoReply'
import QuickReply from './components/QuickReply'
import Chatbot from './components/Chatbot'
import './App.css'
import './styles/Analytics.css'
import './styles/Settings.css'
import './styles/Profile.css'

function App() {
  const [activeView, setActiveView] = useState('chats')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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

  const handleMenuClick = (view) => {
    setActiveView(view);
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }

  return (
    <ToastProvider>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
      <div className="dashboard">
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <svg viewBox="0 0 24 24" fill="#25d366" width="32" height="32">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          <h2>Dashboard</h2>
          <button className="menu-toggle sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeView === 'chats' ? 'active' : ''}`}
            onClick={() => handleMenuClick('chats')}
          >
            <MessageSquare size={18} />
            <span>WhatsApp Chats</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'bulk' ? 'active' : ''}`}
            onClick={() => handleMenuClick('bulk')}
          >
            <Send size={18} />
            <span>Bulk Messages</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'campaigns' ? 'active' : ''}`}
            onClick={() => handleMenuClick('campaigns')}
          >
            <Megaphone size={18} />
            <span>Campaigns</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'auto-reply' ? 'active' : ''}`}
            onClick={() => handleMenuClick('auto-reply')}
          >
            <MessageCircle size={18} />
            <span>Auto Reply</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'quick-reply' ? 'active' : ''}`}
            onClick={() => setActiveView('quick-reply')}
          >
            <Zap size={18} />
            <span>Quick Reply</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'chatbot' ? 'active' : ''}`}
            onClick={() => handleMenuClick('chatbot')}
          >
            <Bot size={18} />
            <span>AI Chatbot</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => handleMenuClick('settings')}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'master-config' ? 'active' : ''}`}
            onClick={() => handleMenuClick('master-config')}
          >
            <Sliders size={18} />
            <span>Configurations</span>
          </button>
          <button 
            className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => handleMenuClick('analytics')}
          >
            <BarChart3 size={18} />
            <span>Analytics</span>
          </button>
        </nav>
      </div>
      <div className="main-content">
        <div className="header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1>WhatsApp Dashboard</h1>
          </div>
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
        {activeView === 'campaigns' && <Campaigns />}
        {activeView === 'auto-reply' && <AutoReply />}
        {activeView === 'quick-reply' && <QuickReply />}
        {activeView === 'chatbot' && <Chatbot />}
        {activeView === 'analytics' && <Analytics />}
        {activeView === 'settings' && <SettingsPanel />}
        {activeView === 'master-config' && <MasterConfig />}
        {activeView === 'profile' && <Profile />}
      </div>
    </div>
      )}
    </ToastProvider>
  )
}

export default App
