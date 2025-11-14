import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import EditCampaign from './EditCampaign';
import '../styles/Campaign.scss';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get('http://localhost:3010/whatsapp/campaigns', {
        withCredentials: true
      });
      setCampaigns(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setCampaigns([]);
    }
  };

  const handleRerunCampaign = async (campaignId) => {
    setLoading(true);
    try {
      await axios.post(`http://localhost:3010/whatsapp/campaigns/${campaignId}/run`, {}, {
        withCredentials: true
      });
      toast.success('Campaign rerun successfully!');
      fetchCampaigns();
    } catch (error) {
      console.error('Error rerunning campaign:', error);
      toast.error('Failed to rerun campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCampaign = (campaign) => {
    setEditingCampaign(campaign.id);
  };

  const handleBackToCampaigns = () => {
    setEditingCampaign(null);
    fetchCampaigns();
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        await axios.delete(`http://localhost:3010/whatsapp/campaigns/${campaignId}`, {
          withCredentials: true
        });
        toast.success('Campaign deleted successfully!');
        fetchCampaigns();
      } catch (error) {
        console.error('Error deleting campaign:', error);
        toast.error('Failed to delete campaign');
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

  return (
    <div className="campaigns-container">
      <div className="campaigns-header">
        <h2>Campaigns</h2>
        <button onClick={fetchCampaigns} className="refresh-btn">
          Refresh
        </button>
      </div>



      <div className="campaigns-table">
        <table>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Template</th>
              <th>Status</th>
              <th>Results</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(campaigns) && campaigns.map((campaign) => (
              <tr key={campaign.id}>
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
                  >
                    {campaign.status === 'running' ? 'Running...' : 'Rerun'}
                  </button>
                  <button
                    onClick={() => handleEditCampaign(campaign)}
                    disabled={campaign.status === 'running'}
                    className="edit-btn"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    disabled={campaign.status === 'running'}
                    className="delete-btn"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {campaigns.length === 0 && (
        <div className="no-campaigns">
          <p>No campaigns found. Create your first campaign by sending bulk messages.</p>
        </div>
      )}

      <Toaster position="top-center" />
    </div>
  );
};

export default Campaigns;