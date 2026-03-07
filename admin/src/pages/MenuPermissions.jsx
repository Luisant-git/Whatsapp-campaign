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

  const handlePermissionToggle = async (userId, permissionKey, currentValue) => {
    setUpdating(prev => ({ ...prev, [`${userId}-${permissionKey}`]: true }));
    try {
      const user = users.find(u => u.id === userId);
      const currentPermissions = user.menuPermission?.permission || {};
      
      const response = await fetch(`/api/menu-permissions/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          permission: { ...currentPermissions, [permissionKey]: !currentValue }
        })
      });

      if (!response.ok) throw new Error('Failed to update permission');

      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, menuPermission: { ...u.menuPermission, permission: { ...currentPermissions, [permissionKey]: !currentValue } } }
          : u
      ));

      const permissionNames = {
        flowAppointments: 'Flow Appointments',
        'ecommerce.meta-catalog': 'Meta Catalog'
      };
      showToast(`${permissionNames[permissionKey]} ${!currentValue ? 'enabled' : 'disabled'}`, 'success');
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
        <p>Manage additional features for Standard plan users</p>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Company Name</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Flow Appointments</th>
              <th>Meta Catalog</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => {
              const permissions = user.menuPermission?.permission || {};
              const hasFlowAppointments = permissions.flowAppointments || false;
              const hasMetaCatalog = permissions['ecommerce.meta-catalog'] || false;
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
                      checked={hasFlowAppointments}
                      onChange={() => handlePermissionToggle(user.id, 'flowAppointments', hasFlowAppointments)}
                      disabled={updating[`${user.id}-flowAppointments`]}
                    />
                    {updating[`${user.id}-flowAppointments`] && <span style={{marginLeft: '8px', fontSize: '12px', color: '#666'}}>Updating...</span>}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={hasMetaCatalog}
                      onChange={() => handlePermissionToggle(user.id, 'ecommerce.meta-catalog', hasMetaCatalog)}
                      disabled={updating[`${user.id}-ecommerce.meta-catalog`]}
                    />
                    {updating[`${user.id}-ecommerce.meta-catalog`] && <span style={{marginLeft: '8px', fontSize: '12px', color: '#666'}}>Updating...</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}