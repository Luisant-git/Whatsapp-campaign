import { useState, useEffect } from 'react';
import '../styles/Users.css';
import { useToast } from '../contexts/ToastContext';

export default function MenuPermissions() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [permissions, setPermissions] = useState({});
  const { showToast } = useToast();

  const menuItems = [
    'Dashboard',
    'WhatsApp Chats',
    'Contacts',
    'All Contacts',
    'Blacklist',
    'Ungrouped Contacts',
    'Campaigns',
    'Compose Campaign',
    'Campaign Reports',
    'AI Chatbot',
    'Quick Reply',
    'Flow Manager',
    'Flow Appointments',
    'E-Commerce',
    'Categories',
    'Products',
    'Orders',
    'Customers',
    'Settings',
    'WhatsApp Setup',
    'Templates',
    'Labels',
    'Create User',
    'Subscription'
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      });
      const data = await response.json();
      setUsers(data.filter(user => user.subscription?.name === 'Standard'));
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('Error fetching users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openPermissionModal = async (user) => {
    setSelectedUser(user);
    try {
      const response = await fetch(`/api/menu-permissions/${user.id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setPermissions(data.permission || {});
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setPermissions({});
    }
    setShowModal(true);
  };

  const handlePermissionChange = (menuItem, checked) => {
    setPermissions(prev => ({
      ...prev,
      [menuItem.toLowerCase().replace(/\s+/g, '')]: checked
    }));
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    
    setUpdating(prev => ({ ...prev, [selectedUser.id]: true }));
    try {
      const response = await fetch(`/api/menu-permissions/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permission: permissions })
      });

      if (!response.ok) throw new Error('Failed to update permissions');

      showToast('Permissions updated successfully', 'success');
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Error updating permissions:', err);
      showToast('Error updating permissions', 'error');
    } finally {
      setUpdating(prev => ({ ...prev, [selectedUser.id]: false }));
    }
  };

  if (loading) {
    return <div className="users-loading">Loading permissions...</div>;
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>Menu Permissions</h1>
        <p>Manage menu access for Standard plan users</p>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Company Name</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={user.id}>
                <td>{idx + 1}</td>
                <td>{user.companyName || user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className="status-badge active">
                    {user.subscription?.name || 'Standard'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-create"
                    onClick={() => openPermissionModal(user)}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Manage Permissions
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permission Modal */}
      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Plan Menu Permission</h2>
              <p>Standard Plan</p>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
              {menuItems.map((item) => {
                const key = item.toLowerCase().replace(/\s+/g, '');
                return (
                  <div key={item} style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      id={key}
                      checked={permissions[key] || false}
                      onChange={(e) => handlePermissionChange(item, e.target.checked)}
                      style={{ marginRight: '8px' }}
                    />
                    <label htmlFor={key} style={{ cursor: 'pointer' }}>{item}</label>
                  </div>
                );
              })}
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-submit"
                onClick={savePermissions}
                disabled={updating[selectedUser.id]}
              >
                {updating[selectedUser.id] ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}