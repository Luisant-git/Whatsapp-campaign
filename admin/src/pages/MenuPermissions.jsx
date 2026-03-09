import { useState, useEffect } from 'react';
import '../styles/Users.css';
import { useToast } from '../contexts/ToastContext';

export default function MenuPermissions() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const { showToast } = useToast();

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

  const handlePermissionToggle = async (userId, permissionType, hasPermission) => {
    setUpdating(prev => ({ ...prev, [`${userId}-${permissionType}`]: true }));
    try {
      // Get current permissions
      const currentUser = users.find(u => u.id === userId);
      const currentPermissions = currentUser?.menuPermission?.permission || {};
      
      // Update the specific permission
      const updatedPermissions = {
        ...currentPermissions,
        [permissionType]: !hasPermission
      };

      const response = await fetch(`/api/menu-permissions/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          permission: updatedPermissions
        })
      });

      if (!response.ok) throw new Error('Failed to update permission');

      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, menuPermission: { ...user.menuPermission, permission: updatedPermissions } }
          : user
      ));

      const permissionName = permissionType === 'flowAppointments' ? 'Flow Appointments' : 'AI Chatbot';
      showToast(`${permissionName} ${!hasPermission ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      console.error('Error updating permission:', err);
      showToast('Error updating permission', 'error');
    } finally {
      setUpdating(prev => ({ ...prev, [`${userId}-${permissionType}`]: false }));
    }
  };

  if (loading) {
    return <div className="users-loading">Loading permissions...</div>;
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>Menu Permissions</h1>
        <p>Manage feature access for Standard plan users</p>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Company Name</th>
              <th>Email</th>
              <th>Plan</th>
              <th>AI Chatbot</th>
              <th>Flow Appointments</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => {
              const flowPermission = user.menuPermission?.permission?.flowAppointments || false;
              const chatbotPermission = user.menuPermission?.permission?.chatbot !== false; // Default to true
              return (
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
                    <input
                      type="checkbox"
                      checked={chatbotPermission}
                      onChange={() => handlePermissionToggle(user.id, 'chatbot', chatbotPermission)}
                      disabled={updating[`${user.id}-chatbot`]}
                    />
                    {updating[`${user.id}-chatbot`] && <span style={{marginLeft: '8px', fontSize: '12px', color: '#666'}}>Updating...</span>}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={flowPermission}
                      onChange={() => handlePermissionToggle(user.id, 'flowAppointments', flowPermission)}
                      disabled={updating[`${user.id}-flowAppointments`]}
                    />
                    {updating[`${user.id}-flowAppointments`] && <span style={{marginLeft: '8px', fontSize: '12px', color: '#666'}}>Updating...</span>}
                  </td>
                </tr>
              );
            })}}
          </tbody>
        </table>
      </div>
    </div>
  );
}