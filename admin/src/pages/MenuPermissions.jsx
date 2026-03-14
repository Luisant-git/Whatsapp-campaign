import { useState, useEffect } from 'react';
import '../styles/Users.css';
import { useToast } from '../contexts/ToastContext';
import { MENU_CONFIG } from '../config/menuConfig';

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

  const handlePermissionToggle = async (userId, permissionKey, hasPermission) => {
    setUpdating(prev => ({ ...prev, [`${userId}-${permissionKey}`]: true }));
    try {
      // Get current permissions
      const currentUser = users.find(u => u.id === userId);
      const currentPermissions = currentUser?.menuPermission?.permission || {};
      
      // Update the specific permission
      const updatedPermissions = {
        ...currentPermissions,
        [permissionKey]: !hasPermission
      };

      const response = await fetch(`/api/admin/menu-permissions/${userId}`, {
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

      const menuItem = MENU_CONFIG.find(item => item.key === permissionKey);
      const permissionName = menuItem ? menuItem.label : permissionKey;
      showToast(`${permissionName} ${!hasPermission ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      console.error('Error updating permission:', err);
      showToast('Error updating permission', 'error');
    } finally {
      setUpdating(prev => ({ ...prev, [`${userId}-${permissionKey}`]: false }));
    }
  };

  if (loading) {
    return <div className="users-loading">Loading permissions...</div>;
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>Menu Permissions</h1>
        <p>Fine-tune access control for Standard plan users</p>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Company Name</th>
              <th>Email</th>
              <th>Plan</th>
              {MENU_CONFIG.map(menuItem => (
                <th key={menuItem.key}>{menuItem.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => {
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
                  {MENU_CONFIG.map(menuItem => {
                    const hasPermission = user.menuPermission?.permission?.[menuItem.key] !== false;
                    return (
                      <td key={menuItem.key}>
                        <input
                          type="checkbox"
                          checked={hasPermission}
                          onChange={() => handlePermissionToggle(user.id, menuItem.key, hasPermission)}
                          disabled={updating[`${user.id}-${menuItem.key}`]}
                        />
                        {updating[`${user.id}-${menuItem.key}`] && (
                          <span style={{marginLeft: '8px', fontSize: '12px', color: '#666'}}>Updating...</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}