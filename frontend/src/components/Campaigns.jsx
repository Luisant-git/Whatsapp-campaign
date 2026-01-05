import React, { useState, useEffect } from 'react';
import { getAllCampaigns, rerunCampaign, deleteCampaign } from '../api/campaign';
import { getAllSettings } from '../api/auth';
import { useToast } from '../contexts/ToastContext';
import EditCampaign from './EditCampaign';
import CampaignResults from './CampaignResults';
import { RotateCw, BarChart3, Edit2, RefreshCw } from 'lucide-react';
import '../styles/Campaign.scss';

const Campaigns = () => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedSettingsName, setSelectedSettingsName] = useState('');
  const [viewingResults, setViewingResults] = useState(null);

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
      showSuccess('Campaign rerun successfully!');
      fetchCampaigns();
    } catch (error) {
      console.error('Error rerunning campaign:', error);
      showError('Failed to rerun campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign.id);
  };

  const handleBackToCampaigns = () => {
    setEditingCampaign(null);
    setViewingResults(null);
    fetchCampaigns();
  };

  const handleViewResults = (campaign) => {
    setViewingResults(campaign.id);
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
            <option value="">All Phone Numbers</option>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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