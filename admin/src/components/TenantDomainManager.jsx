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

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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


  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && tenant.isActive) ||
      (statusFilter === 'inactive' && !tenant.isActive);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTenants.length / itemsPerPage) || 1;

  const paginatedTenants = filteredTenants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <div className="filters-container">
  <div className="filter-inline">
    <label className="filter-label">Company</label>
    <input
      type="text"
      placeholder="Search Company or email..."
      value={searchTerm}
      onChange={(e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
      }}
      className="search-input"
    />
  </div>

  <div className="filter-inline">
    <label className="filter-label">Status</label>
    <select
      value={statusFilter}
      onChange={(e) => {
        setStatusFilter(e.target.value);
        setCurrentPage(1);
      }}
      className="status-dropdown"
    >
      <option value="all">All</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </select>
  </div>
</div>
      </div>

      {message && (
        <div className={`message-alert ${message.includes('Error') || message.includes('already assigned')
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
        <>
          <div className="domains-table-container desktop-domains-table">
            <table className="domains-table">
              <thead>
                <tr>
                  <th>Tenant ID</th>
                  <th>Name</th>
                  <th className="email-col">Email</th>
                  <th className="domain-col">Custom Domain</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="tenant-id">{tenant.id}</td>
                    <td className="tenant-name">{tenant.name || 'N/A'}</td>
                    <td className="tenant-email email-col">{tenant.email}</td>
                    <td className="domain-col">
                      <span
                         className={`domain-display ${tenant.domain ? 'domain-active' : 'domain-inactive'
                          }`}
                      >
                        {tenant.domain || 'No custom domain'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${tenant.isActive ? 'status-active' : 'status-inactive'
                          }`}
                      >
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-container">
                        <button
                          onClick={() => handleEditClick(tenant)}
                          className="btn-edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          {tenant.domain ? '' : 'Add Domain'}
                        </button>

                        {tenant.domain && (
                          <button
                            onClick={() => removeTenantDomain(tenant.id)}
                            className="btn-remove"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3,6 5,6 21,6"></polyline>
                              <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

          </div>



          <div className="mobile-domains-list">
            {paginatedTenants.map((tenant) => (
              <div className="domain-card" key={tenant.id}>
                <div className="domain-card-top">
                  <div>
                    <h3>{tenant.name || 'N/A'}</h3>
                    <p>{tenant.email}</p>
                  </div>

                  <span
                    className={`status-badge ${tenant.isActive ? 'status-active' : 'status-inactive'
                      }`}
                  >
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="domain-card-details">
                  <div className="domain-card-row">
                    <span className="domain-card-label">Tenant ID</span>
                    <span>{tenant.id}</span>
                  </div>

                  <div className="domain-card-row">
                    <span className="domain-card-label">Domain</span>
                    <span
                      className={`domain-display ${tenant.domain ? 'domain-active' : 'domain-inactive'
                        }`}
                    >
                      {tenant.domain || 'No custom domain'}
                    </span>
                  </div>
                </div>

                <div className="domain-card-actions">
                  <button
                    onClick={() => handleEditClick(tenant)}
                    className="btn-edit"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>

                  </button>

                  {tenant.domain && (
                    <button
                      onClick={() => removeTenantDomain(tenant.id)}
                      className="btn-remove"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>

                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}


      <div className="domains-pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        >
          Prev
        </button>

        <span>
          Page {currentPage} of {totalPages}
        </span>

        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        >
          Next
        </button>
      </div>
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