import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Phone, 
  Mail, 
  Building2, 
  Calendar, 
  RefreshCw, 
  Search, 
  Download, 
  Filter,
  ExternalLink,
  Upload,
  Trash2
} from 'lucide-react';
import '../styles/MetaLeads.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';

const MetaLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [tabCounts, setTabCounts] = useState({ All: 0, Intake: 0, Qualified: 0, Converted: 0 });
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const fileInputRef = useRef(null);

  const statuses = ['Intake', 'Qualified', 'Converted'];
  const tabs = ['All', 'Intake', 'Qualified', 'Converted'];

  useEffect(() => {
    fetchLeads();
  }, [page, search, statusFilter, campaignFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const tenantId = localStorage.getItem('tenantId');
      const { data } = await axios.get(`${API_BASE_URL}/meta-leads`, {
        params: { page, limit: 50, search, status: statusFilter, campaignName: campaignFilter },
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });
      setLeads(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      
      // Fetch counts for all tabs
      fetchTabCounts();
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId');
      const { data } = await axios.get(`${API_BASE_URL}/meta-leads`, {
        params: { page: 1, limit: 1000 },
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });
      
      const uniqueCampaigns = [...new Set(data.data?.map(lead => lead.campaignName).filter(Boolean))];
      setCampaigns(uniqueCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchTabCounts = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId');
      const counts = { All: 0, Intake: 0, Qualified: 0, Converted: 0 };
      
      // Fetch total count
      const allResponse = await axios.get(`${API_BASE_URL}/meta-leads`, {
        params: { page: 1, limit: 1, search: '' },
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });
      counts.All = allResponse.data.pagination?.total || 0;
      
      // Fetch counts for each status
      for (const status of statuses) {
        const response = await axios.get(`${API_BASE_URL}/meta-leads`, {
          params: { page: 1, limit: 1, status },
          headers: { 'x-tenant-id': tenantId },
          withCredentials: true,
        });
        counts[status] = response.data.pagination?.total || 0;
      }
      
      setTabCounts(counts);
    } catch (error) {
      console.error('Error fetching tab counts:', error);
    }
  };

  const syncLeads = async () => {
    const choice = confirm('Sync ALL forms or specific form?\n\nOK = Sync ALL forms (recommended)\nCancel = Enter specific Form ID');
    
    let formId = 'all';
    if (!choice) {
      formId = prompt('Enter Form ID from Meta Leads:');
      if (!formId) return;
    }
    
    try {
      setSyncing(true);
      const tenantId = localStorage.getItem('tenantId');
      const { data: metaConfigs } = await axios.get(`${API_BASE_URL}/meta-config`, {
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });
      
      if (!metaConfigs || metaConfigs.length === 0) {
        alert('No Meta Leads Config found. Please configure Meta Leads first in Settings.');
        return;
      }

      const activeConfig = metaConfigs.find(c => c.isActive) || metaConfigs[0];
      
      const payload = { 
        pageId: activeConfig.pageId,
        formId, 
        accessToken: activeConfig.accessToken,
        phoneNumberId: activeConfig.phoneNumberId || activeConfig.pageId,
      };
      
      console.log('Syncing leads from Meta...');
      
      const response = await axios.post(`${API_BASE_URL}/meta-leads/sync`, payload, { 
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true 
      });
      
      if (response.data.error) {
        alert(`❌ Sync failed: ${response.data.message}`);
        return;
      }
      
      alert(`✅ SUCCESS! ${response.data.count || 0} leads imported from Meta`);
      fetchLeads();
    } catch (error) {
      alert('❌ ' + (error.response?.data?.message || 'Failed to sync leads.'));
    } finally {
      setSyncing(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const tenantId = localStorage.getItem('tenantId');
      await axios.patch(`${API_BASE_URL}/meta-leads/${id}/status`, { status }, {
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });
      fetchLeads();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setStatusFilter(tab === 'All' ? '' : tab);
    setPage(1);
  };

  const handleCSVImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('❌ Please upload a CSV file');
      return;
    }

    try {
      setImporting(true);
      const tenantId = localStorage.getItem('tenantId');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const { data: metaConfigs } = await axios.get(`${API_BASE_URL}/meta-config`, {
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });
      
      if (metaConfigs && metaConfigs.length > 0) {
        const activeConfig = metaConfigs.find(c => c.isActive) || metaConfigs[0];
        formData.append('pageId', activeConfig.pageId);
        formData.append('phoneNumberId', activeConfig.phoneNumberId || activeConfig.pageId);
      }

      const response = await axios.post(`${API_BASE_URL}/meta-leads/import-csv`, formData, {
        withCredentials: true,
        headers: {
          'x-tenant-id': tenantId,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.error) {
        alert(`❌ Import failed: ${response.data.message}`);
        return;
      }

      alert(`✅ SUCCESS! ${response.data.count || 0} leads imported from CSV${response.data.skipped ? ` (${response.data.skipped} rows skipped)` : ''}`);
      fetchLeads();
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      alert('❌ ' + (error.response?.data?.message || 'Failed to import CSV'));
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = confirm('⚠️ WARNING: This will permanently delete ALL leads!\n\nAre you sure you want to continue?');
    if (!confirmed) return;

    const doubleConfirm = confirm('⚠️ FINAL CONFIRMATION\n\nThis action CANNOT be undone. All lead data will be lost forever.\n\nType YES in your mind and click OK to proceed.');
    if (!doubleConfirm) return;

    try {
      setLoading(true);
      const tenantId = localStorage.getItem('tenantId');
      const response = await axios.delete(`${API_BASE_URL}/meta-leads/all`, {
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });

      if (response.data.error) {
        alert(`❌ Delete failed: ${response.data.message}`);
        return;
      }

      alert(`✅ Successfully deleted ${response.data.count || 0} leads`);
      fetchLeads();
    } catch (error) {
      alert('❌ ' + (error.response?.data?.message || 'Failed to delete leads'));
    } finally {
      setLoading(false);
    }
  };

  const viewLeadDetails = (lead) => {
    setSelectedLead(lead);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedLead(null);
  };

  const handleExport = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId');
      const { data } = await axios.get(`${API_BASE_URL}/meta-leads`, {
        params: { page: 1, limit: 10000, search, status: statusFilter, campaignName: campaignFilter },
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });

      const leadsToExport = data.data || [];
      
      if (leadsToExport.length === 0) {
        alert('No leads to export');
        return;
      }

      // Create CSV content
      const headers = ['Name', 'Campaign', 'Status', 'Phone', 'Email', 'Company', 'City', 'Business Type', 'Created Date'];
      const csvRows = [headers.join(',')];

      leadsToExport.forEach(lead => {
        const row = [
          lead.name || '',
          lead.campaignName || '',
          lead.status || '',
          lead.phone || '',
          lead.email || '',
          lead.company || '',
          lead.city || '',
          lead.businessType || '',
          new Date(lead.createdTime).toLocaleString()
        ];
        csvRows.push(row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`✅ Successfully exported ${leadsToExport.length} leads`);
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export leads');
    }
  };

  return (
    <div className="meta-leads-wrapper">
      <div className="meta-leads-container">
        {/* Header Section */}
        <div className="leads-header">
          <div className="header-title-section">
            <h1>Lead Center</h1>
            <p className="header-subtitle">Manage and nurture your leads from Facebook and Instagram</p>
          </div>
          <div className="leads-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              style={{ display: 'none' }}
              id="csv-upload"
            />
            <button onClick={handleDeleteAll} className="sync-btn" style={{ background: '#dc3545' }}>
              <Trash2 size={16} />
              Delete All
            </button>
            <label htmlFor="csv-upload" className="sync-btn secondary" style={{ cursor: 'pointer', margin: 0 }}>
              <Upload size={16} />
              {importing ? 'Importing...' : 'Import CSV'}
            </label>
            <button className="sync-btn secondary" onClick={handleExport}>
              <Download size={16} />
              Export
            </button>
            <button onClick={syncLeads} disabled={syncing} className="sync-btn">
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Leads'}
            </button>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="leads-tabs">
          {tabs.map(tab => (
            <div 
              key={tab} 
              className={`tab-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => handleTabChange(tab)}
            >
              {tab}
              <span className="tab-count">{tabCounts[tab] || 0}</span>
            </div>
          ))}
        </div>

        {/* Filters & Table Section */}
        <div className="leads-filters-bar">
          <div className="filters-left">
            <div className="search-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <select 
              value={campaignFilter} 
              onChange={(e) => setCampaignFilter(e.target.value)}
              className="sync-btn secondary"
              style={{ padding: '6px 12px', cursor: 'pointer' }}
            >
              <option value="">All Campaigns</option>
              {campaigns.map(campaign => (
                <option key={campaign} value={campaign}>{campaign}</option>
              ))}
            </select>
          </div>
          <div className="filters-right">
            <p className="pagination-info">Showing {leads.length} leads</p>
          </div>
        </div>

        <div className="leads-table-container">
          <table className="meta-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Campaign</th>
                <th>Status</th>
                <th>Contact</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan="6">
                      <div className="shimmer" style={{ height: '40px', borderRadius: '4px' }}></div>
                    </td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#65676B' }}>
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div className="lead-name-cell">
                        <div className="lead-initials">
                          {lead.name?.charAt(0) || 'L'}
                        </div>
                        <div className="lead-name-info">
                          <span className="lead-name">{lead.name || 'Anonymous Lead'}</span>
                          <span className="lead-source">Meta Lead Forms</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '13px', color: '#1C1E21', fontWeight: '500' }}>
                        {lead.campaignName || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className={`status-pill ${lead.status?.toLowerCase()}`}
                        style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={14} color="#65676B" />
                        <span style={{ fontSize: '13px', color: '#1C1E21' }}>
                          {typeof lead.phone === 'string' ? lead.phone : (lead.phone ? String(lead.phone) : 'N/A')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13px', color: '#1C1E21' }}>
                          {new Date(lead.createdTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span style={{ fontSize: '12px', color: '#65676B' }}>
                          {new Date(lead.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button 
                        className="action-dots" 
                        title="View details"
                        onClick={() => viewLeadDetails(lead)}
                      >
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="meta-pagination">
              <div className="pagination-info">
                Page {page} of {totalPages}
              </div>
              <div className="pagination-controls">
                <button 
                  className="page-btn" 
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                >
                  Previous
                </button>
                <button 
                  className="page-btn" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lead Details Modal */}
      {showDetailsModal && selectedLead && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Lead Details</h2>
              <button className="modal-close" onClick={closeDetailsModal}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Name</label>
                    <p>{selectedLead.name || 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Campaign</label>
                    <p>{selectedLead.campaignName || 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <p><span className={`status-pill ${selectedLead.status?.toLowerCase()}`}>{selectedLead.status}</span></p>
                  </div>
                  <div className="detail-item">
                    <label><Phone size={14} /> Phone</label>
                    <p>{typeof selectedLead.phone === 'string' ? selectedLead.phone : (selectedLead.phone ? String(selectedLead.phone) : 'N/A')}</p>
                  </div>
                  <div className="detail-item">
                    <label><Building2 size={14} /> Company</label>
                    <p>{selectedLead.company || 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <label>City</label>
                    <p>{selectedLead.city || 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <label>Business Type</label>
                    <p>{selectedLead.businessType || 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <label><Calendar size={14} /> Created</label>
                    <p>{new Date(selectedLead.createdTime).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {selectedLead.customFields && Object.keys(selectedLead.customFields).length > 0 && (
                <div className="detail-section">
                  <h3>Additional Fields</h3>
                  <div className="detail-grid">
                    {Object.entries(selectedLead.customFields).map(([key, value]) => (
                      <div className="detail-item" key={key}>
                        <label>{key}</label>
                        <p>{value || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h3>Meta Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Lead ID</label>
                    <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>{selectedLead.leadId}</p>
                  </div>
                  <div className="detail-item">
                    <label>Form ID</label>
                    <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>{selectedLead.formId}</p>
                  </div>
                  <div className="detail-item">
                    <label>Page ID</label>
                    <p style={{ fontSize: '12px', wordBreak: 'break-all' }}>{selectedLead.pageId}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="sync-btn secondary" onClick={closeDetailsModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaLeads;

