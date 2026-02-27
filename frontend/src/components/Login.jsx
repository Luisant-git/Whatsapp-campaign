import { useState } from 'react'
import { loginUser } from '../api/auth'
import { useToast } from '../contexts/ToastContext'
import '../styles/Login.css'

function Login({ onLogin }) {
  const { showSuccess } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await loginUser(email, password)
      localStorage.setItem('token', result.token)
      showSuccess('Login successful!')
      onLogin(result.user)
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Login failed')
      setShowErrorModal(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>WhatsApp Dashboard</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>

      {showErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-icon">🔒</div>
            <h2>Access Denied</h2>
            <p>{errorMessage}</p>
            <button className="error-modal-btn" onClick={() => setShowErrorModal(false)}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
