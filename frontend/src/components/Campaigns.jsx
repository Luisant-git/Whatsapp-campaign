import React, { useState, useEffect } from 'react';
import { getAllCampaigns, rerunCampaign, deleteCampaign, getCampaignResults } from '../api/campaign';
import { getAllSettings } from '../api/auth';
import { useToast } from '../contexts/ToastContext';
import EditCampaign from './EditCampaign';
import CampaignResults from './CampaignResults';
import { RotateCw, BarChart3, Edit2, RefreshCw, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import '../styles/Campaign.scss';

const Campaigns = ({ onResendFailed }) => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedSettingsName, setSelectedSettingsName] = useState('');
  const [viewingResults, setViewingResults] = useState(null);
  const [resendData, setResendData] = useState(null);

  useEffect(() => {
    fetchPhoneNumbers();
    fetchCampaigns();
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [selectedSettingsName]);

  const fetchPhoneNumbers = async () => {
    try {
      const data = await getAllSettings();
      setPhoneNumbers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const data = await getAllCampaigns(selectedSettingsName || null);
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setCampaigns([]);
    }
  };

  const handleRerunCampaign = async (campaignId) => {
    setLoading(true);
    try {
      await rerunCampaign(campaignId);
      showSuccess('Campaign started! Messages are being sent in the background. Refresh to see progress.');
      
      // Auto-refresh after 3 seconds
      setTimeout(() => {
        fetchCampaigns();
      }, 3000);
    } catch (error) {
      console.error('Error rerunning campaign:', error);
      showError('Failed to start campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign.id);
  };

  const handleBackToCampaigns = (data) => {
    if (data?.resendFailed) {
      // Pass to parent to switch to bulk messages
      if (onResendFailed) {
        onResendFailed(data);
      }
      return;
    }
    setEditingCampaign(null);
    setViewingResults(null);
    fetchCampaigns();
  };

  const handleViewResults = (campaign) => {
    setViewingResults(campaign.id);
  };
 
  const handleDownloadFromCampaign = async (campaign) => {
    try {
      const data = await getCampaignResults(campaign.id);
      const results = data.results || [];
  
      if (!results.length) {
        showError('No campaign results available to download');
        return;
      }
  
      const exportData = results.map((result, index) => ({
        'S.No': index + 1,
        'Campaign Name': campaign.name || '',
        'Template Name': campaign.templateName || '',
        'Group Name': campaign.group?.name || '—',
        'Campaign Status': campaign.status || '',
        'Campaign Created Date': campaign.createdAt
          ? new Date(campaign.createdAt).toLocaleString()
          : '',
        'Contact': result.name || 'N/A',
        'Phone': result.phone || '',
        'Message Status': result.status || '',
        'Sent At': result.createdAt
          ? new Date(result.createdAt).toLocaleString()
          : '',
        'Has Response': result.hasResponse ? 'Yes' : 'No',
        'Last Response': result.lastResponse?.message || 'No response',
        'Last Response Time': result.lastResponse?.createdAt
          ? new Date(result.lastResponse.createdAt).toLocaleString()
          : '',
      }));
  
      const worksheet = XLSX.utils.json_to_sheet(exportData);
  
      worksheet['!cols'] = [
        { wch: 8 },   // S.No
        { wch: 25 },  // Campaign Name
        { wch: 25 },  // Template Name
        { wch: 20 },  // Group Name
        { wch: 18 },  // Campaign Status
        { wch: 24 },  // Campaign Created Date
        { wch: 20 },  // Contact
        { wch: 18 },  // Phone
        { wch: 18 },  // Message Status
        { wch: 22 },  // Sent At
        { wch: 15 },  // Has Response
        { wch: 30 },  // Last Response
        { wch: 24 },  // Last Response Time
      ];
  
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Campaign Results');
  
      const safeName = (campaign.name || 'campaign').replace(/[\\/:*?"<>|]/g, '_');
      XLSX.writeFile(workbook, `campaign-${safeName}-results.xlsx`);
  
      showSuccess('Campaign results downloaded successfully!');
    } catch (error) {
      console.error('Error downloading campaign results:', error);
      showError('Failed to download campaign results');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    const confirmed = await showConfirm('Are you sure you want to delete this campaign?');
    if (confirmed) {
      try {
        await deleteCampaign(campaignId);
        showSuccess('Campaign deleted successfully!');
        fetchCampaigns();
      } catch (error) {
        console.error('Error deleting campaign:', error);
        showError('Failed to delete campaign');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (editingCampaign) {
    return <EditCampaign campaignId={editingCampaign} onBack={handleBackToCampaigns} />;
  }

  if (viewingResults) {
    return <CampaignResults campaignId={viewingResults} onBack={handleBackToCampaigns} />;
  }

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCampaigns = campaigns.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(campaigns.length / itemsPerPage);

  return (
    <div className="campaigns-container">
      <div className="campaigns-header">
        <h2>View Campaigns</h2>
        <div className="campaigns-controls">
          <select
            value={selectedSettingsName}
            onChange={(e) => setSelectedSettingsName(e.target.value)}
            className="phone-filter"
          >
            <option value="">All Templates</option>
            {phoneNumbers.map((phone, index) => (
              <option key={`phone-${phone.id}-${index}`} value={phone.name}>
                {phone.name} ({phone.phoneNumberId})
              </option>
            ))}
          </select>
          <button onClick={fetchCampaigns} className="refresh-btn">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
      </div>

      <div className="campaigns-table">
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Campaign</th>
              <th>Template</th>
              <th>Group</th>
              <th>Status</th>
              <th>Results</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(currentCampaigns) && currentCampaigns.map((campaign, index) => (
              <tr key={campaign.id}>
                <td>{indexOfFirstItem + index + 1}</td>
                <td className="campaign-name">{campaign.name}</td>
                <td>{campaign.templateName}</td>
                <td>{campaign.group?.name || '—'}</td>
                <td>
                  <span className={`status-badge ${campaign.status}`}>
                    {campaign.status.toUpperCase()}
                  </span>
                </td>
                <td className="results">
                  <div>Total: {campaign.totalCount}</div>
                  <div className="success">Success: {campaign.successCount}</div>
                  <div className="failed">Failed: {campaign.failedCount}</div>
                </td>
                <td className="created-date">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </td>
                <td className="actions">
                  <button
                    onClick={() => handleRerunCampaign(campaign.id)}
                    disabled={loading || campaign.status === 'running'}
                    className="rerun-btn"
                    title="Rerun Campaign"
                  >
                    <RotateCw size={16} />
                  </button>
                  <button
                    onClick={() => handleViewResults(campaign)}
                    className="results-btn"
                    title="View Results"
                  >
                    <BarChart3 size={16} />
                  </button>
                  <button
                    onClick={() => handleEditCampaign(campaign)}
                    disabled={campaign.status === 'running'}
                    className="edit-btn"
                    title="Edit Campaign"
                  >
                    <Edit2 size={16} />
                  </button>

                  <button
                    onClick={() => handleDownloadFromCampaign(campaign)}
                    className="download-btn"
                    title="Download Results"
                  >
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
      </div>
      <div className="campaign-note">
  <p>
    Note: Campaign records will be automatically deleted after 15 days. If needed, please download the campaign results before that.
  </p>
</div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {campaigns.length === 0 && (
        <div className="no-campaigns">
          <p>No campaigns found. Create your first campaign by sending bulk messages.</p>
        </div>
      )}


    </div>
  );
};

export default Campaigns;