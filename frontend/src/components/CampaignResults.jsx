import React, { useState, useEffect } from 'react';
import { getCampaignResults, downloadCampaignResults } from '../api/campaign';
import { useToast } from '../contexts/ToastContext';
import '../styles/CampaignResults.scss';

const CampaignResults = ({ campaignId, onBack }) => {
  const { showSuccess, showError } = useToast();
  const [campaign, setCampaign] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterResponse, setFilterResponse] = useState('all');

  useEffect(() => {
    fetchCampaignResults();
  }, [campaignId]);

  const fetchCampaignResults = async () => {
    try {
      setLoading(true);
      const data = await getCampaignResults(campaignId);
      setCampaign(data.campaign);
      setResults(data.results || []);
    } catch (error) {
      console.error('Error fetching campaign results:', error);
      showError('Failed to fetch campaign results');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format) => {
    try {
      const blob = await downloadCampaignResults(campaignId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaign?.name}-results.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showSuccess(`Campaign results downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error downloading results:', error);
      showError('Failed to download results');
    }
  };

  const getFilteredResults = () => {
    return results.filter(result => {
      const statusMatch = filterStatus === 'all' || result.status === filterStatus;
      const responseMatch = filterResponse === 'all' || 
        (filterResponse === 'responded' && result.hasResponse) ||
        (filterResponse === 'not_responded' && !result.hasResponse);
      return statusMatch && responseMatch;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'status-sent';
      case 'delivered': return 'status-delivered';
      case 'read': return 'status-read';
      case 'failed': return 'status-failed';
      default: return 'status-unknown';
    }
  };

  if (loading) {
    return (
      <div className="campaign-results-container">
        <div className="loading">Loading campaign results...</div>
      </div>
    );
  }

  const filteredResults = getFilteredResults();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentResults = filteredResults.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);

  return (
    <div className="campaign-results-container">
      <div className="results-header">
        <div className="header-left">
          <button onClick={onBack} className="back-btn">
            ← Back to Campaigns
          </button>
          <div className="campaign-info">
            <h2>{campaign?.name}</h2>
            <p>Template: {campaign?.templateName}</p>
            <p>Created: {new Date(campaign?.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="header-right">
          <div className="download-buttons">
            <button onClick={() => handleDownload('csv')} className="download-btn">
              Download CSV
            </button>
            <button onClick={() => handleDownload('xlsx')} className="download-btn">
              Download Excel
            </button>
          </div>
        </div>
      </div>

      <div className="results-summary">
        <div className="summary-card">
          <h3>Total Contacts</h3>
          <span className="summary-number">{results.length}</span>
        </div>
        <div className="summary-card">
          <h3>Sent</h3>
          <span className="summary-number sent">{results.filter(r => r.status === 'sent').length}</span>
        </div>
        <div className="summary-card">
          <h3>Delivered</h3>
          <span className="summary-number delivered">{results.filter(r => r.status === 'delivered').length}</span>
        </div>
        <div className="summary-card">
          <h3>Failed</h3>
          <span className="summary-number failed">{results.filter(r => r.status === 'failed').length}</span>
        </div>
        <div className="summary-card">
          <h3>Responded</h3>
          <span className="summary-number responded">{results.filter(r => r.hasResponse).length}</span>
        </div>
      </div>

      <div className="results-filters">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Response:</label>
          <select value={filterResponse} onChange={(e) => setFilterResponse(e.target.value)}>
            <option value="all">All</option>
            <option value="responded">Responded</option>
            <option value="not_responded">Not Responded</option>
          </select>
        </div>
      </div>

      <div className="results-table">
        <table>
          <thead>
            <tr>
              <th>Contact</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Sent At</th>
              <th>Response</th>
              <th>Last Response</th>
            </tr>
          </thead>
          <tbody>
            {currentResults.map((result, index) => (
              <tr key={index}>
                <td>{result.name || 'N/A'}</td>
                <td>{result.phone}</td>
                <td>
                  <span className={`status-badge ${getStatusColor(result.status)}`}>
                    {result.status.toUpperCase()}
                  </span>
                </td>
                <td>{new Date(result.createdAt).toLocaleString()}</td>
                <td>
                  <span className={`response-badge ${result.hasResponse ? 'responded' : 'not-responded'}`}>
                    {result.hasResponse ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  {result.lastResponse ? (
                    <div className="last-response">
                      <div className="response-text">{result.lastResponse.message}</div>
                      <div className="response-time">{new Date(result.lastResponse.createdAt).toLocaleString()}</div>
                    </div>
                  ) : (
                    'No response'
                  )}
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
            Page {currentPage} of {totalPages} ({filteredResults.length} results)
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
    </div>
  );
};

export default CampaignResults;