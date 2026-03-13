import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/TenantDomains.css';

const TenantDomainManager = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [newDomain, setNewDomain] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchTenantDomains();
  }, []);

  const fetchTenantDomains = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/admin/tenants/domains');
      console.log('API Response:', response.data);
      
      // Handle different response structures
      const tenantsData = response.data?.tenants || response.data || [];
      setTenants(Array.isArray(tenantsData) ? tenantsData : []);
    } catch (error) {
      console.error('Error fetching tenant domains:', error);
      setError(error.response?.data?.message || 'Failed to fetch tenant domains');
      setTenants([]); // Set empty array as fallback
    } finally {
      setLoading(false);
    }
  };

  const updateTenantDomain = async (tenantId, domain) => {
    try {
      await axios.put(`/api/admin/tenants/${tenantId}/domain`, { domain });
      setMessage('Domain updated successfully');
      setEditingTenant(null);
      setNewDomain('');
      fetchTenantDomains();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error updating domain');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const removeTenantDomain = async (tenantId) => {
    if (!window.confirm('Are you sure you want to remove this domain?')) return;
    
    try {
      await axios.delete(`/api/admin/tenants/${tenantId}/domain`);
      setMessage('Domain removed successfully');
      fetchTenantDomains();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error removing domain');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleEditClick = (tenant) => {
    setEditingTenant(tenant.id);
    setNewDomain(tenant.domain || '');
  };

  const handleSave = (tenantId) => {
    if (newDomain.trim()) {
      updateTenantDomain(tenantId, newDomain.trim());
    }
  };

  const handleCancel = () => {
    setEditingTenant(null);
    setNewDomain('');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading tenant domains...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
        <button onClick={fetchTenantDomains} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="tenant-domains-page">
      <div className="tenant-domains-header">
        <h2>Tenant Domain Management</h2>
        <p>
          Primary Domain: <span className="primary-domain">whatsapp.luisant.cloud</span>
        </p>
      </div>

      {message && (
        <div className={`message-alert ${
          message.includes('Error') || message.includes('already assigned') 
            ? 'message-error' 
            : 'message-success'
        }`}>
          {message}
        </div>
      )}

      {!tenants || tenants.length === 0 ? (
        <div className="empty-state">
          <p>No tenants found</p>
          <button onClick={fetchTenantDomains} className="refresh-btn">
            Refresh
          </button>
        </div>
      ) : (
        <div className="domains-table-container">
          <table className="domains-table">
            <thead>
              <tr>
                <th>Tenant ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Custom Domain</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="tenant-id">{tenant.id}</td>
                  <td className="tenant-name">{tenant.name || 'N/A'}</td>
                  <td className="tenant-email">{tenant.email}</td>
                  <td>
                    {editingTenant === tenant.id ? (
                      <div className="domain-edit-container">
                        <input
                          type="text"
                          value={newDomain}
                          onChange={(e) => setNewDomain(e.target.value)}
                          placeholder="e.g., crm.luisant.in"
                          className="domain-input"
                        />
                        <button
                          onClick={() => handleSave(tenant.id)}
                          className="btn-save"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="btn-cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className={`domain-display ${
                        tenant.domain ? 'domain-active' : 'domain-inactive'
                      }`}>
                        {tenant.domain || 'No custom domain'}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${
                      tenant.isActive ? 'status-active' : 'status-inactive'
                    }`}>
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {editingTenant === tenant.id ? null : (
                      <div className="actions-container">
                        <button
                          onClick={() => handleEditClick(tenant)}
                          className="btn-edit"
                        >
                          {tenant.domain ? 'Edit' : 'Add Domain'}
                        </button>
                        {tenant.domain && (
                          <button
                            onClick={() => removeTenantDomain(tenant.id)}
                            className="btn-remove"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* <div className="info-panel">
        <h3>Domain Access Control</h3>
        <ul className="info-list">
          <li>• <strong>Primary Domain:</strong> whatsapp.luisant.cloud - Admin controlled, session-based access</li>
          <li>• <strong>Custom Domains:</strong> Automatically route to specific tenants</li>
          <li>• <strong>Example:</strong> crm.luisant.in → Tenant ID 1 (Client A)</li>
          <li>• <strong>Access:</strong> Only admin can assign/remove custom domains</li>
        </ul>
      </div> */}
    </div>
  );
};

export default TenantDomainManager;