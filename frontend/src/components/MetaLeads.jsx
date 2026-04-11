import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Phone, Mail, Building2, Calendar, RefreshCw } from 'lucide-react';
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

  const statuses = ['Intake', 'Qualified', 'Converted'];

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
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const syncLeads = async () => {
    const formId = prompt('Enter Form ID from Meta Leads:');
    
    if (!formId) return;

    try {
      setSyncing(true);
      const { data: config } = await axios.get(`${API_BASE_URL}/master-config`, {
        withCredentials: true,
      });
      
      if (!config || config.length === 0) {
        alert('No Master Config found. Please configure Master Config first.');
        return;
      }

      const activeConfig = config.find(c => c.isActive) || config[0];
      
      await axios.post(`${API_BASE_URL}/meta-leads/sync`, { 
        pageId: activeConfig.wabaId || activeConfig.appId,
        formId, 
        accessToken: activeConfig.accessToken,
        phoneNumberId: activeConfig.phoneNumberId,
      }, {
        withCredentials: true,
      });
      
      alert('Leads synced successfully!');
      fetchLeads();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      if (errorMsg.includes('does not exist') || errorMsg.includes('missing permissions')) {
        alert('Failed to sync leads: Invalid Form ID or missing permissions.\n\nPlease ensure:\n1. The Form ID is correct\n2. Your access token has "leads_retrieval" permission\n3. The form belongs to your Facebook Page');
      } else {
        alert('Failed to sync leads: ' + errorMsg);
      }
      console.error(error);
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

  return (
    <div className="meta-leads-container">
      <div className="leads-header">
        <h1>Meta Leads Center</h1>
        <div className="leads-actions">
          <button onClick={syncLeads} disabled={syncing} className="sync-btn">
            <RefreshCw size={16} />
            {syncing ? 'Syncing...' : 'Sync Leads'}
          </button>
        </div>
      </div>

      <div className="leads-filters">
        <input
          type="text"
          placeholder="Search leads..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="status-filter"
        >
          <option value="">All Status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="leads-stats">
        <div className="stat-card">
          <h3>Intake: {leads.filter(l => l.status === 'Intake').length}</h3>
        </div>
        <div className="stat-card">
          <h3>Qualified: {leads.filter(l => l.status === 'Qualified').length}</h3>
        </div>
        <div className="stat-card">
          <h3>Converted: {leads.filter(l => l.status === 'Converted').length}</h3>
        </div>
      </div>

      <div className="leads-board">
        {statuses.map((status) => (
          <div key={status} className="leads-column">
            <div className="column-header">
              <h3>{status}</h3>
              <span className="count">{leads.filter(l => l.status === status).length}</span>
            </div>
            <div className="leads-list">
              {leads
                .filter((lead) => lead.status === status)
                .map((lead) => (
                  <div key={lead.id} className="lead-card">
                    <div className="lead-header">
                      <div className="lead-avatar">
                        {lead.name?.charAt(0) || 'L'}
                      </div>
                      <div className="lead-info">
                        <h4>{lead.name || 'Unknown'}</h4>
                        <span className="lead-badge">Paid</span>
                      </div>
                    </div>
                    
                    {lead.phone && (
                      <div className="lead-detail">
                        <Phone size={16} />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                    
                    {lead.email && (
                      <div className="lead-detail">
                        <Mail size={16} />
                        <span>{lead.email}</span>
                      </div>
                    )}
                    
                    {lead.company && (
                      <div className="lead-detail">
                        <Building2 size={16} />
                        <span>{lead.company}</span>
                      </div>
                    )}
                    
                    <div className="lead-detail">
                      <Calendar size={16} />
                      <span>{new Date(lead.createdTime).toLocaleDateString()}</span>
                    </div>

                    <div className="lead-actions">
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className="status-select"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MetaLeads;
