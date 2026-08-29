import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Trash2,
  MessageSquare
} from 'lucide-react';
import { sendBulkMessages } from "../api/whatsapp";
import { getAllSettings } from "../api/auth";
import { useToast } from "../contexts/ToastContext";
import '../styles/MetaLeads.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';

const MetaLeads = ({ onNavigate }) => {
  const { showSuccess, showError, showConfirm } = useToast();
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
  const [metaForms, setMetaForms] = useState([]);
  const [formFilter, setFormFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('All');
  const [tabCounts, setTabCounts] = useState({ All: 0, Intake: 0, Qualified: 0, Converted: 0 });
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeCampaignFilter, setComposeCampaignFilter] = useState('');
  const [composeCampaignName, setComposeCampaignName] = useState('');
  const [syncType, setSyncType] = useState('all');
  const [specificFormId, setSpecificFormId] = useState('');
  const fileInputRef = useRef(null);

  // Bulk Message states
  const [settings, setSettings] = useState([]);
  const [templateName, setTemplateName] = useState("");
  const [scheduleType, setScheduleType] = useState("one-time");
  const [scheduledDays, setScheduledDays] = useState([]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [sendingCampaign, setSendingCampaign] = useState(false);

  const daysOfWeek = [
    { value: "sunday", label: "Sunday" },
    { value: "monday", label: "Monday" },
    { value: "tuesday", label: "Tuesday" },
    { value: "wednesday", label: "Wednesday" },
    { value: "thursday", label: "Thursday" },
    { value: "friday", label: "Friday" },
    { value: "saturday", label: "Saturday" },
  ];

  const statuses = ['Intake', 'Qualified', 'Converted'];
  const tabs = ['All', 'Intake', 'Qualified', 'Converted'];

  useEffect(() => {
    fetchLeads();
  }, [page, search, statusFilter, campaignFilter, formFilter]);

  useEffect(() => {
    fetchCampaigns();
    fetchMetaForms();
    const fetchSettings = async () => {
      try {
        const data = await getAllSettings();
        const settingsList = Array.isArray(data) ? data : [];
        setSettings(settingsList);
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchSettings();
  }, []);

  const uniqueTemplateNames = useMemo(() => {
    return [...new Set(settings.map((item) => item.templateName).filter(Boolean))];
  }, [settings]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const tenantId = localStorage.getItem('tenantId');
      const { data } = await axios.get(`${API_BASE_URL}/meta-leads`, {
        params: { page, limit: 50, search, status: statusFilter, campaignName: formFilter !== 'all' ? (metaForms.find(f => f.id === formFilter)?.name || campaignFilter) : campaignFilter },
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

  const fetchMetaForms = async () => {
    try {
      const tenantId = localStorage.getItem('tenantId');
      const { data } = await axios.get(`${API_BASE_URL}/meta-leads/forms`, {
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });
      if (data.forms) setMetaForms(data.forms);
    } catch (error) {
      console.error('Error fetching Meta forms:', error);
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

  const handleSyncClick = () => {
    setSyncType('all');
    setSpecificFormId('');
    setShowSyncModal(true);
  };

  const performSync = async () => {
    let formId = 'all';
    if (syncType === 'specific') {
      if (!specificFormId.trim()) {
        alert('Please enter a specific Form ID');
        return;
      }
      formId = specificFormId.trim();
    }
    
    setShowSyncModal(false);
    
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

  const handleComposeClick = () => {
    setComposeCampaignFilter('');
    setComposeCampaignName('');
    setTemplateName("");
    setScheduleType("one-time");
    setScheduledDays([]);
    setScheduledTime("09:00");
    setShowComposeModal(true);
  };

  const handleDayToggle = (day) => {
    setScheduledDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
  };

  const parseScheduledTime = (timeStr) => {
    if (!timeStr) return { h: 9, m: 0, ampm: 'AM' };
    let [h, m] = timeStr.split(':').map(Number);
    return { h: h % 12 || 12, m, ampm: h >= 12 ? 'PM' : 'AM' };
  };

  const handleTimeChange = (type, val) => {
    let { h, m, ampm } = parseScheduledTime(scheduledTime);
    if (type === 'h') h = val;
    if (type === 'm') m = val;
    if (type === 'ampm') ampm = val;
    let h24 = (h % 12) + (ampm === 'PM' ? 12 : 0);
    setScheduledTime(`${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  const proceedToCompose = async () => {
    if (!composeCampaignFilter) {
      showError('Please select a Form Campaign.');
      return;
    }
    if (!composeCampaignName.trim()) {
      showError('Please enter a Campaign Name.');
      return;
    }
    if (!templateName) {
      showError('Please select a template.');
      return;
    }
    if (scheduleType === "time-based" && scheduledDays.length === 0) {
      showError("Please select at least one day for time-based scheduling.");
      return;
    }
    
    try {
      setSendingCampaign(true);
      const tenantId = localStorage.getItem('tenantId');
      const { data } = await axios.get(`${API_BASE_URL}/meta-leads`, {
        params: { page: 1, limit: 10000, search: '', status: '', campaignName: composeCampaignFilter },
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });

      const leadsToCompose = data.data || [];
      if (leadsToCompose.length === 0) {
        showError('No leads found for this campaign.');
        setSendingCampaign(false);
        return;
      }

      const dataToSend = leadsToCompose
        .filter(lead => lead.phone)
        .map(lead => ({ phone: lead.phone, name: lead.name || '' }));

      if (dataToSend.length === 0) {
        showError('No valid phone numbers found for this campaign.');
        setSendingCampaign(false);
        return;
      }

      let confirmMsg = `Campaign will run in the background and send to ${dataToSend.length} contact${dataToSend.length > 1 ? 's' : ''}. You can check progress in the Campaigns Reports. Continue?`;
      if (dataToSend.length > 2000) {
        confirmMsg = `⚠️ WARNING: You are sending to ${dataToSend.length} contacts. It is highly recommended to keep campaigns below 2000 contacts at a time to prevent delivery issues. Are you sure you want to continue?`;
      } else if (dataToSend.length > 200) {
        confirmMsg = `You are about to send to ${dataToSend.length} contacts. (Note: keeping batches below 200-2000 at a time is recommended for best results). Campaign will run in the background. Continue?`;
      }

      const confirmed = await showConfirm(confirmMsg);
      if (!confirmed) {
        setSendingCampaign(false);
        return;
      }

      const campaignData = {
        name: composeCampaignName,
        contacts: dataToSend,
        templateName,
        scheduleType,
        ...(scheduleType === "time-based" && {
          scheduledDays,
          scheduledTime,
        }),
      };

      const response = await sendBulkMessages(campaignData);
      
      if (response.success) {
        showSuccess(`Campaign started! Sending to ${dataToSend.length} contacts in the background.`);
        setShowComposeModal(false);
      } else {
        throw new Error(response.message || "Failed to start campaign");
      }
    } catch (error) {
      console.error('Compose campaign error:', error);
      showError(error.message || 'Failed to send campaign messages');
    } finally {
      setSendingCampaign(false);
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
            <button className="sync-btn" onClick={handleComposeClick} style={{ background: '#25D366' }}>
              <MessageSquare size={16} />
              Compose
            </button>
            <button onClick={handleSyncClick} disabled={syncing} className="sync-btn">
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
        {/* Form Filter Dropdown - like Meta's UI */}
            <div style={{ position: 'relative' }}>
              <select
                value={formFilter}
                onChange={(e) => { setFormFilter(e.target.value); setPage(1); }}
                className="sync-btn secondary"
                style={{ padding: '6px 12px', cursor: 'pointer', minWidth: 180 }}
              >
                <option value="all">All forms</option>
                {metaForms.map(form => (
                  <option key={form.id} value={form.id}>
                    {form.name} {form.leads_count ? `(${form.leads_count})` : ''}
                  </option>
                ))}
              </select>
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
                  <tr key={lead.id} onClick={() => viewLeadDetails(lead)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="lead-name-cell">
                        <div className="lead-initials">
                          {(lead.name?.charAt(0) || 'L').toUpperCase()}
                        </div>
                        <span className="lead-name">{lead.name || 'Anonymous Lead'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="campaign-tag">{lead.campaignName || '—'}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
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
                      <span className="phone-text">
                        {typeof lead.phone === 'string' ? lead.phone : (lead.phone ? String(lead.phone) : '—')}
                      </span>
                    </td>
                    <td>
                      <div className="date-cell">
                        <span className="date-main">{new Date(lead.createdTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="date-time">{new Date(lead.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="action-dots" title="View details" onClick={() => viewLeadDetails(lead)}>
                        <ExternalLink size={15} />
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

      {/* Lead Details Drawer */}
      {showDetailsModal && selectedLead && (
        <>
          <div
            onClick={closeDetailsModal}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999
            }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, height: '100vh', width: '380px',
            background: 'white', zIndex: 1000, boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideInRight 0.25s ease'
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e4e6eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e7f3ff', color: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
                  {selectedLead.name?.charAt(0) || 'L'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#1c1e21' }}>{selectedLead.name || 'Anonymous Lead'}</div>
                  <div style={{ fontSize: 13, color: '#65676b' }}>{selectedLead.campaignName || 'N/A'}</div>
                </div>
              </div>
              <button onClick={closeDetailsModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676b', fontSize: 24, lineHeight: 1 }}>×</button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Basic Info */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#65676b', textTransform: 'uppercase', marginBottom: 8 }}>Basic Information</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    ['Status', <span className={`status-pill ${selectedLead.status?.toLowerCase()}`}>{selectedLead.status}</span>],
                    ['Phone', selectedLead.phone || 'N/A'],
                    ['Email', selectedLead.email || 'N/A'],
                    ['Company', selectedLead.company || 'N/A'],
                    ['City', selectedLead.city || 'N/A'],
                    ['Business Type', selectedLead.businessType || 'N/A'],
                    ['Created', new Date(selectedLead.createdTime).toLocaleString()],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0f2f5' }}>
                      <span style={{ fontSize: 14, color: '#65676b', minWidth: 110 }}>{label}</span>
                      <span style={{ fontSize: 14, color: '#1c1e21', fontWeight: 500, textAlign: 'right' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Fields */}
              {selectedLead.customFields && Object.keys(selectedLead.customFields).length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#65676b', textTransform: 'uppercase', marginBottom: 8 }}>Additional Fields</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(selectedLead.customFields).map(([key, value]) => (
                      <div key={key} style={{ padding: '8px 10px', background: '#f7f8fa', borderRadius: 6, borderLeft: '3px solid #1877f2' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#65676b', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div style={{ fontSize: 14, color: '#1c1e21', fontWeight: 600, wordBreak: 'break-word' }}>
                          {String(value || 'N/A').replace(/_/g, ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta Info */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#65676b', textTransform: 'uppercase', marginBottom: 8 }}>Meta Information</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    ['Lead ID', selectedLead.leadId],
                    ['Form ID', selectedLead.formId],
                    ['Page ID', selectedLead.pageId],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f0f2f5' }}>
                      <span style={{ fontSize: 14, color: '#65676b', minWidth: 110 }}>{label}</span>
                      <span style={{ fontSize: 12, color: '#1c1e21', fontFamily: 'monospace', textAlign: 'right', wordBreak: 'break-all', maxWidth: 200 }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e4e6eb' }}>
              <button className="sync-btn secondary" onClick={closeDetailsModal} style={{ width: '100%', justifyContent: 'center' }}>Close</button>
            </div>
          </div>
          <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        </>
      )}

      {/* Sync Leads Modal */}
      {showSyncModal && (
        <div className="modal-overlay" onClick={() => setShowSyncModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Sync Meta Leads</h2>
              <button className="modal-close" onClick={() => setShowSyncModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#65676B', marginBottom: '20px', fontSize: '14px' }}>
                Choose whether you want to sync all active forms or specify a single Form ID.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="syncType" 
                    value="all" 
                    checked={syncType === 'all'} 
                    onChange={() => setSyncType('all')} 
                    style={{ width: '18px', height: '18px', accentColor: '#1877f2' }}
                  />
                  <span style={{ fontSize: '15px', color: '#1c1e21', fontWeight: '500' }}>Sync ALL forms (Recommended)</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="syncType" 
                    value="specific" 
                    checked={syncType === 'specific'} 
                    onChange={() => setSyncType('specific')} 
                    style={{ width: '18px', height: '18px', accentColor: '#1877f2' }}
                  />
                  <span style={{ fontSize: '15px', color: '#1c1e21', fontWeight: '500' }}>Sync a specific Form ID</span>
                </label>

                {syncType === 'specific' && (
                  <div style={{ marginLeft: '26px', marginTop: '4px' }}>
                    <input 
                      type="text" 
                      placeholder="Enter Form ID..." 
                      value={specificFormId}
                      onChange={(e) => setSpecificFormId(e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        border: '1px solid #ced0d4', 
                        borderRadius: '6px',
                        outline: 'none',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: '0' }}>
              <button className="sync-btn secondary" onClick={() => setShowSyncModal(false)}>Cancel</button>
              <button className="sync-btn" onClick={performSync}>Start Sync</button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Campaign Modal */}
      {showComposeModal && (
        <div className="modal-overlay" onClick={() => setShowComposeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2>Compose Message for Meta Leads</h2>
              <button className="modal-close" onClick={() => setShowComposeModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <p style={{ color: '#65676B', marginBottom: '20px', fontSize: '14px' }}>
                Quickly send a WhatsApp campaign to all valid leads in a selected Form Campaign.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21', textTransform: 'uppercase' }}>Target Form Campaign <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    value={composeCampaignFilter} 
                    onChange={(e) => {
                      setComposeCampaignFilter(e.target.value);
                      if (e.target.value) {
                        setComposeCampaignName(e.target.value);
                      }
                    }}
                    style={{ 
                      width: '100%', padding: '10px 12px', border: '1px solid #ced0d4', borderRadius: '6px',
                      outline: 'none', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer'
                    }}
                  >
                    <option value="">Select a Campaign</option>
                    {campaigns.map(campaign => (
                      <option key={campaign} value={campaign}>{campaign}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21', textTransform: 'uppercase' }}>Campaign Name <span style={{ color: 'red' }}>*</span></label>
                  <input 
                    type="text" 
                    value={composeCampaignName}
                    onChange={(e) => setComposeCampaignName(e.target.value)}
                    placeholder="Enter a name for this run..."
                    style={{ 
                      width: '100%', padding: '10px 12px', border: '1px solid #ced0d4', borderRadius: '6px',
                      outline: 'none', fontSize: '14px', backgroundColor: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21', textTransform: 'uppercase' }}>Template Name <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    value={templateName} 
                    onChange={(e) => setTemplateName(e.target.value)}
                    style={{ 
                      width: '100%', padding: '10px 12px', border: '1px solid #ced0d4', borderRadius: '6px',
                      outline: 'none', fontSize: '14px', backgroundColor: 'white', cursor: 'pointer'
                    }}
                  >
                    <option value="">Select a Template</option>
                    {uniqueTemplateNames.map((name, index) => (
                      <option key={`template-${index}`} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21', textTransform: 'uppercase' }}>Scheduling Type</label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="radio" value="one-time" checked={scheduleType === "one-time"} onChange={(e) => setScheduleType(e.target.value)} style={{ width: '16px', height: '16px', accentColor: '#1877f2' }} />
                      <span style={{ fontSize: '14px' }}>Send Now</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input type="radio" value="time-based" checked={scheduleType === "time-based"} onChange={(e) => setScheduleType(e.target.value)} style={{ width: '16px', height: '16px', accentColor: '#1877f2' }} />
                      <span style={{ fontSize: '14px' }}>Time-based</span>
                    </label>
                  </div>
                </div>

                {scheduleType === "time-based" && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f5f6f7', padding: '12px', borderRadius: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21', textTransform: 'uppercase' }}>Select Days</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {daysOfWeek.map((day) => {
                          const isSelected = scheduledDays.includes(day.value);
                          return (
                            <label 
                              key={day.value} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                cursor: 'pointer', 
                                fontSize: '12px',
                                padding: '6px 10px',
                                border: `1px solid ${isSelected ? '#1877f2' : '#ced0d4'}`,
                                borderRadius: '6px',
                                backgroundColor: isSelected ? '#e7f3ff' : 'white',
                                color: isSelected ? '#1877f2' : '#1c1e21',
                                fontWeight: isSelected ? '600' : '500',
                                transition: 'all 0.2s ease',
                                userSelect: 'none'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleDayToggle(day.value)}
                                style={{ accentColor: '#1877f2', margin: 0, width: '14px', height: '14px', cursor: 'pointer' }}
                              />
                              {day.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: '600', color: '#1c1e21', textTransform: 'uppercase' }}>Time (IST)</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {(() => {
                          const { h, m, ampm } = parseScheduledTime(scheduledTime);
                          return (
                            <>
                              <select 
                                value={h} 
                                onChange={(e) => handleTimeChange('h', Number(e.target.value))}
                                style={{ padding: '8px 12px', border: '1px solid #ced0d4', borderRadius: '6px', outline: 'none', backgroundColor: 'white', cursor: 'pointer', fontSize: '14px' }}
                              >
                                {Array.from({length: 12}, (_, i) => i + 1).map(hour => (
                                  <option key={hour} value={hour}>{String(hour).padStart(2, '0')}</option>
                                ))}
                              </select>
                              <span style={{ fontWeight: '600', color: '#1c1e21' }}>:</span>
                              <select 
                                value={m} 
                                onChange={(e) => handleTimeChange('m', Number(e.target.value))}
                                style={{ padding: '8px 12px', border: '1px solid #ced0d4', borderRadius: '6px', outline: 'none', backgroundColor: 'white', cursor: 'pointer', fontSize: '14px' }}
                              >
                                {Array.from({length: 60}, (_, i) => i).map(minute => (
                                  <option key={minute} value={minute}>{String(minute).padStart(2, '0')}</option>
                                ))}
                              </select>
                              
                              <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', background: '#f0f2f5', padding: '4px', borderRadius: '8px' }}>
                                <button 
                                  onClick={() => handleTimeChange('ampm', 'AM')}
                                  style={{ 
                                    padding: '6px 12px', 
                                    border: 'none', 
                                    borderRadius: '6px', 
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    backgroundColor: ampm === 'AM' ? 'white' : 'transparent',
                                    color: ampm === 'AM' ? '#1877f2' : '#65676b',
                                    boxShadow: ampm === 'AM' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  AM
                                </button>
                                <button 
                                  onClick={() => handleTimeChange('ampm', 'PM')}
                                  style={{ 
                                    padding: '6px 12px', 
                                    border: 'none', 
                                    borderRadius: '6px', 
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    backgroundColor: ampm === 'PM' ? 'white' : 'transparent',
                                    color: ampm === 'PM' ? '#1877f2' : '#65676b',
                                    boxShadow: ampm === 'PM' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  PM
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="sync-btn secondary" onClick={() => setShowComposeModal(false)} disabled={sendingCampaign}>Cancel</button>
              <button className="sync-btn" onClick={proceedToCompose} disabled={sendingCampaign} style={{ background: sendingCampaign ? '#90ee90' : '#25D366' }}>
                {sendingCampaign ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} />
                    Send Campaign Messages
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaLeads;

