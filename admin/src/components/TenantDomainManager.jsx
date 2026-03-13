import React, { useState, useEffect } from 'react';
import '../styles/TenantDomains.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010';

const TenantDomainManager = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingTenant, setEditingTenant] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTenant, setModalTenant] = useState(null);
  const [newDomain, setNewDomain] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchTenantDomains();
  }, []);

  const fetchTenantDomains = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching tenant domains from:', `${API_URL}/admin/tenants/domains`);
      
      const response = await fetch(`${API_URL}/admin/tenants/domains`, {
        credentials: 'include',
      });
      
      console.log('API Response Status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Response Data:', data);
      
      // Handle different response structures
      const tenantsData = data?.tenants || data || [];
      console.log('Processed tenants data:', tenantsData);
      console.log('Is array?', Array.isArray(tenantsData));
      
      setTenants(Array.isArray(tenantsData) ? tenantsData : []);
    } catch (error) {
      console.error('Error fetching tenant domains:', error);
      setError(error.message || 'Failed to fetch tenant domains');
      setTenants([]); // Set empty array as fallback
    } finally {
      setLoading(false);
    }
  };

  const updateTenantDomain = async (tenantId, domain) => {
    try {
      const response = await fetch(`${API_URL}/admin/tenants/${tenantId}/domain`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update domain');
      }
      
      setMessage('Domain updated successfully');
      setEditingTenant(null);
      setNewDomain('');
      fetchTenantDomains();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.message || 'Error updating domain');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const removeTenantDomain = async (tenantId) => {
    if (!window.confirm('Are you sure you want to remove this domain?')) return;
    
    try {
      const response = await fetch(`${API_URL}/admin/tenants/${tenantId}/domain`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove domain');
      }
      
      setMessage('Domain removed successfully');
      fetchTenantDomains();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage(error.message || 'Error removing domain');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleEditClick = (tenant) => {
    setModalTenant(tenant);
    setNewDomain(tenant.domain || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (newDomain.trim() && modalTenant) {
      await updateTenantDomain(modalTenant.id, newDomain.trim());
      setShowModal(false);
      setModalTenant(null);
      setNewDomain('');
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setModalTenant(null);
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
                    <span className={`domain-display ${
                      tenant.domain ? 'domain-active' : 'domain-inactive'
                    }`}>
                      {tenant.domain || 'No custom domain'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${
                      tenant.isActive ? 'status-active' : 'status-inactive'
                    }`}>
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
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

      {/* Domain Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalTenant?.domain ? 'Edit Domain' : 'Add Domain'}</h2>
              <button onClick={handleCancel} className="close-btn">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="tenant-info">
                <p><strong>Company:</strong> {modalTenant?.name || 'N/A'}</p>
                <p><strong>Email:</strong> {modalTenant?.email}</p>
                <p><strong>Current Domain:</strong> {modalTenant?.domain || 'None'}</p>
              </div>
              
              <div className="form-group">
                <label htmlFor="domain-input">Custom Domain</label>
                <input
                  id="domain-input"
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="e.g., crm.luisant.in"
                  className="domain-modal-input"
                  autoFocus
                />
                <small className="input-help">
                  Enter the custom domain for this company. Make sure the domain points to your server.
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleCancel} className="btn-modal-cancel">
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                className="btn-modal-save"
                disabled={!newDomain.trim()}
              >
                {modalTenant?.domain ? 'Update Domain' : 'Add Domain'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDomainManager;