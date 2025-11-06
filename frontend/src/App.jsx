import { useState } from 'react'
import { MessageSquare, Settings, BarChart3, User } from 'lucide-react'
import WhatsAppChat from './WhatsAppChat'
import './App.css'

function App() {
  const [activeView, setActiveView] = useState('chats')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [credentials, setCredentials] = useState({ username: '', password: '' })

  const handleLogin = (e) => {
    e.preventDefault()
    if (credentials.username && credentials.password) {
      setIsLoggedIn(true)
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCredentials({ username: '', password: '' })
    setShowProfileMenu(false)
  }

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
        <form onSubmit={handleLogin} style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '300px' }}>
          <h2 style={{ textAlign: 'center', color: '#075e54', marginBottom: '1.5rem' }}>Login</h2>
          <input
            type="text"
            placeholder="Username"
            value={credentials.username}
            onChange={(e) => setCredentials({...credentials, username: e.target.value})}
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={credentials.password}
            onChange={(e) => setCredentials({...credentials, password: e.target.value})}
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
            required
          />
          <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#075e54', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Login
          </button>
        </form>
      </div>
    )
  }

  return (
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
          <button className="nav-item">
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <button className="nav-item">
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
                <button className="profile-menu-item">My Profile</button>
                <button className="profile-menu-item">Settings</button>
                <button className="profile-menu-item" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
        <WhatsAppChat />
      </div>
    </div>
  )
}

export default App
