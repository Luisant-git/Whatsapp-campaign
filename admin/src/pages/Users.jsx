import { useState, useEffect } from 'react';
import '../styles/Users.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/users/all`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleChatbot = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/toggle-chatbot`, {
        method: 'PATCH',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error toggling chatbot:', error);
    }
  };

  const toggleQuickReply = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/toggle-quickreply`, {
        method: 'PATCH',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error toggling quick reply:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const response = await fetch(`${API_URL}/admin/users/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowModal(false);
        setFormData({ name: '', email: '', password: '' });
        fetchUsers();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create user');
      }
    } catch (error) {
      setError('Error creating user');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="users-loading">Loading users...</div>;
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>Users</h1>
        <button className="btn-create" onClick={() => setShowModal(true)}>
          + Create User
        </button>
      </div>
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Quick Reply</th>
              <th>AI Chatbot</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={user.useQuickReply !== false}
                      onChange={() => toggleQuickReply(user.id)}
                    />
                    <span className="slider"></span>
                  </label>
                </td>
                <td>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={user.aiChatbotEnabled}
                      onChange={() => toggleChatbot(user.id)}
                    />
                    <span className="slider"></span>
                  </label>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New User</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser}>
              {error && <div className="error-message">{error}</div>}
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength="6"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

