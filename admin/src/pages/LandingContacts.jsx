import { useState, useEffect } from 'react';
import '../styles/Users.css';
import { useToast } from '../contexts/ToastContext';
import { getLandingContacts } from '../api/landingContacts';

export default function LandingContacts() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGoal, setFilterGoal] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const { showToast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, [currentPage, searchQuery]);

  const fetchSubmissions = async () => {
    try {
      console.log('🚀 Starting to fetch submissions...');
      setLoading(true);
      const data = await getLandingContacts(currentPage, limit, searchQuery);
      
      console.log('✅ Submissions fetched successfully:', data);
      setSubmissions(data.submissions || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('❌ Error fetching submissions:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      });
      showToast(err.message || 'Error fetching submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (filterGoal === 'all') return true;
    return sub.primaryGoal === filterGoal;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getGoalBadgeColor = (goal) => {
    const colors = {
      marketing: '#3b82f6',
      ecommerce: '#10b981',
      appointment: '#f59e0b',
      all: '#8b5cf6'
    };
    return colors[goal] || '#6b7280';
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          style={{
            padding: '8px 12px',
            margin: '0 4px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            background: currentPage === i ? '#1976d2' : 'white',
            color: currentPage === i ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: currentPage === i ? '600' : '400',
          }}
        >
          {i}
        </button>
      );
    }

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '24px',
        gap: '8px'
      }}>
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          style={{
            padding: '8px 16px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            background: 'white',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.5 : 1,
          }}
        >
          Previous
        </button>
        
        {startPage > 1 && (
          <>
            <button
              onClick={() => setCurrentPage(1)}
              style={{
                padding: '8px 12px',
                margin: '0 4px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              1
            </button>
            {startPage > 2 && <span style={{ padding: '0 8px' }}>...</span>}
          </>
        )}
        
        {pages}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span style={{ padding: '0 8px' }}>...</span>}
            <button
              onClick={() => setCurrentPage(totalPages)}
              style={{
                padding: '8px 12px',
                margin: '0 4px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              {totalPages}
            </button>
          </>
        )}
        
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          style={{
            padding: '8px 16px',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            background: 'white',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.5 : 1,
          }}
        >
          Next
        </button>
      </div>
    );
  };

  if (loading) {
    return <div className="users-loading">Loading submissions...</div>;
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <div>
          <h1>Landing Page Submissions</h1>
          <p>Contact form submissions from landing page</p>
        </div>
        <button 
          onClick={fetchSubmissions}
          className="btn-primary"
          style={{ padding: '10px 20px' }}
        >
          🔄 Refresh
        </button>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <input
          type="text"
          placeholder="Search by business, name, or phone..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '300px',
            padding: '10px 16px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px'
          }}
        />

        <select
          value={filterGoal}
          onChange={(e) => setFilterGoal(e.target.value)}
          style={{
            padding: '10px 16px',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Goals</option>
          <option value="marketing">Marketing</option>
          <option value="ecommerce">E-commerce</option>
          <option value="appointment">Appointment</option>
        </select>

        <div style={{ 
          fontSize: '14px', 
          color: '#666',
          fontWeight: '500'
        }}>
          Total: {total} | Page {currentPage} of {totalPages}
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Business Name</th>
              <th>Contact Person</th>
              <th>WhatsApp Number</th>
              <th>Has Website</th>
              <th>Primary Goal</th>
              <th>WhatsApp Sent</th>
              <th>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubmissions.map((sub, idx) => (
              <tr key={sub.id}>
                <td>{(currentPage - 1) * limit + idx + 1}</td>
                <td style={{ fontWeight: '600' }}>{sub.businessName}</td>
                <td>{sub.yourName}</td>
                <td>
                  <a 
                    href={`https://wa.me/${sub.whatsappNumber.replace(/\+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      color: '#25d366',
                      textDecoration: 'none',
                      fontWeight: '500'
                    }}
                  >
                    {sub.whatsappNumber}
                  </a>
                </td>
                <td>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: sub.hasWebsite === 'yes' ? '#dcfce7' : '#fee2e2',
                    color: sub.hasWebsite === 'yes' ? '#166534' : '#991b1b'
                  }}>
                    {sub.hasWebsite === 'yes' ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: `${getGoalBadgeColor(sub.primaryGoal)}20`,
                    color: getGoalBadgeColor(sub.primaryGoal)
                  }}>
                    {sub.primaryGoal.charAt(0).toUpperCase() + sub.primaryGoal.slice(1)}
                  </span>
                </td>
                <td>
                  {sub.whatsappMessageSent ? (
                    <span style={{ color: '#10b981', fontWeight: '500' }}>✓ Sent</span>
                  ) : (
                    <span style={{ color: '#ef4444', fontWeight: '500' }}>✗ Failed</span>
                  )}
                </td>
                <td style={{ fontSize: '13px', color: '#666' }}>
                  {formatDate(sub.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSubmissions.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#999'
          }}>
            {searchQuery || filterGoal !== 'all' 
              ? 'No submissions found matching your filters'
              : 'No submissions yet'
            }
          </div>
        )}
      </div>

      {totalPages > 1 && renderPagination()}
    </div>
  );
}
