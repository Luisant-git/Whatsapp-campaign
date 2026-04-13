import React, { useState, useEffect } from 'react';
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
  MoreHorizontal,
  ArrowRight,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import '../styles/MetaLeads.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';

const MetaLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [tabCounts, setTabCounts] = useState({ All: 0, Intake: 0, Qualified: 0, Converted: 0 });

  const statuses = ['Intake', 'Qualified', 'Converted'];
  const tabs = ['All', 'Intake', 'Qualified', 'Converted'];

  useEffect(() => {
    fetchLeads();
  }, [page, search, statusFilter]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE_URL}/meta-leads`, {
        params: { page, limit: 10, search, status: statusFilter },
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

  const fetchTabCounts = async () => {
    try {
      const counts = { All: 0, Intake: 0, Qualified: 0, Converted: 0 };
      
      // Fetch total count
      const allResponse = await axios.get(`${API_BASE_URL}/meta-leads`, {
        params: { page: 1, limit: 1, search: '' },
        withCredentials: true,
      });
      counts.All = allResponse.data.pagination?.total || 0;
      
      // Fetch counts for each status
      for (const status of statuses) {
        const response = await axios.get(`${API_BASE_URL}/meta-leads`, {
          params: { page: 1, limit: 1, status },
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
    const formId = prompt('Enter Form ID from Meta Leads:');
    if (!formId) return;

    // Optional: Ask if user wants to fetch historical data
    const fetchHistorical = confirm('Do you want to fetch ALL historical leads? (This may take longer but ensures you get all old leads)');
    
    try {
      setSyncing(true);
      const { data: metaConfigs } = await axios.get(`${API_BASE_URL}/meta-config`, {
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
      
      // Add 'since' parameter for historical data (fetch from 2 years ago)
      if (fetchHistorical) {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        payload.since = twoYearsAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      }
      
      const response = await axios.post(`${API_BASE_URL}/meta-leads/sync`, payload, { 
        withCredentials: true 
      });
      
      if (response.data.error) {
        alert(`Sync failed: ${response.data.message}`);
        return;
      }
      
      alert(`✅ Leads synced successfully! ${response.data.count || 0} leads imported.${fetchHistorical ? ' (Including historical data)' : ''}`);
      fetchLeads();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to sync leads.');
    } finally {
      setSyncing(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`${API_BASE_URL}/meta-leads/${id}/status`, { status }, {
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
            <button className="sync-btn secondary">
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
            <button className="sync-btn secondary" style={{ padding: '6px 12px' }}>
              <Filter size={14} />
              Filters
            </button>
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
                    <td colSpan="5">
                      <div className="shimmer" style={{ height: '40px', borderRadius: '4px' }}></div>
                    </td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#65676B' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '13px', color: '#1C1E21', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} color="#65676B" /> {lead.phone || 'N/A'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#65676B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={12} color="#65676B" /> {lead.email || 'N/A'}
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
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="action-dots" title="View details">
                          <ExternalLink size={16} />
                        </button>
                        <button className="action-dots" title="Quick assign">
                          <UserCheck size={16} />
                        </button>
                        <button className="action-dots">
                          <MoreHorizontal size={18} />
                        </button>
                      </div>
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
    </div>
  );
};

export default MetaLeads;

