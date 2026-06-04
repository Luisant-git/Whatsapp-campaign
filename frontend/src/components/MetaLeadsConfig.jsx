import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Save, X, Facebook } from 'lucide-react';
import '../styles/Settings.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';

const MetaLeadsConfig = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    pageId: '',
    accessToken: '',
    verifyToken: '',
    isActive: true,
  });

  const [showPageSelect, setShowPageSelect] = useState(false);
  const [availablePages, setAvailablePages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [userAccessToken, setUserAccessToken] = useState('');

  useEffect(() => {
    fetchConfigs();

    // Initialize Facebook SDK
    window.fbAsyncInit = function() {
      if (window.FB) {
        window.FB.init({
          appId      : '1983839335719624', 
          cookie     : true,
          xfbml      : true,
          version    : 'v20.0'
        });
      }
    };

    if (window.FB) {
      window.fbAsyncInit();
    } else {
      (function(d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) return;
        js = d.createElement(s); js.id = id;
        js.src = "https://connect.facebook.net/en_US/sdk.js";
        fjs.parentNode.insertBefore(js, fjs);
      }(document, 'script', 'facebook-jssdk'));
    }
  }, []);

  const handleFacebookConnect = () => {
    if (!window.FB) {
      alert('Facebook SDK not loaded. Please check your internet connection.');
      return;
    }

    window.FB.login((response) => {
      if (response.authResponse) {
        const accessToken = response.authResponse.accessToken;
        setUserAccessToken(accessToken);
        
        window.FB.api('/me/accounts', { access_token: accessToken }, (res) => {
          if (res && res.data && res.data.length > 0) {
            setAvailablePages(res.data);
            setSelectedPageId(res.data[0].id); // Select first by default
            setShowPageSelect(true);
          } else {
            alert('No Facebook Pages found. Make sure you selected a page during login and have admin access.');
          }
        });
      } else {
        console.log('Login cancelled');
      }
    }, {
      scope: 'leads_retrieval,pages_show_list,pages_manage_metadata,pages_read_engagement'
    });
  };

  const submitAutoConnect = async () => {
    if (!selectedPageId) return;
    const selectedPage = availablePages.find(p => p.id === selectedPageId);

    try {
      setLoading(true);
      const tenantId = localStorage.getItem('tenantId');
      await axios.post(`${API_BASE_URL}/meta-config/auto-connect`, {
        userAccessToken,
        pageId: selectedPage.id,
        name: selectedPage.name
      }, {
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });
      
      alert('Facebook Page successfully connected! (Long-lived token generated automatically)');
      setShowPageSelect(false);
      fetchConfigs();
    } catch (error) {
      console.error('Auto-connect error:', error);
      alert('Failed to connect: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const tenantId = localStorage.getItem('tenantId');
      const { data } = await axios.get(`${API_BASE_URL}/meta-config`, {
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });
      setConfigs(data);
    } catch (error) {
      console.error('Error fetching configs:', error);
      alert('Failed to load Meta Leads configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const tenantId = localStorage.getItem('tenantId');
      if (editingId) {
        await axios.put(`${API_BASE_URL}/meta-config/${editingId}`, formData, {
          headers: { 'x-tenant-id': tenantId },
          withCredentials: true,
        });
        alert('Configuration updated successfully!');
      } else {
        await axios.post(`${API_BASE_URL}/meta-config`, formData, {
          headers: { 'x-tenant-id': tenantId },
          withCredentials: true,
        });
        alert('Configuration created successfully!');
      }
      
      resetForm();
      fetchConfigs();
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (config) => {
    setFormData({
      name: config.name,
      pageId: config.pageId,
      accessToken: config.accessToken,
      verifyToken: config.verifyToken || '',
      isActive: config.isActive,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    
    try {
      const tenantId = localStorage.getItem('tenantId');
      await axios.delete(`${API_BASE_URL}/meta-config/${id}`, {
        headers: { 'x-tenant-id': tenantId },
        withCredentials: true,
      });
      alert('Configuration deleted successfully!');
      fetchConfigs();
    } catch (error) {
      console.error('Error deleting config:', error);
      alert('Failed to delete configuration');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      pageId: '',
      accessToken: '',
      verifyToken: '',
      isActive: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div>
          <h1>Meta Leads Configuration</h1>
          <p>Manage Facebook Page credentials for Meta Lead Forms integration.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-primary" 
            onClick={handleFacebookConnect}
            style={{ backgroundColor: '#1877F2', borderColor: '#1877F2', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Facebook size={16} /> Connect Facebook Page
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Manual Configuration
          </button>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit' : 'Add'} Meta Leads Configuration</h2>
              <button onClick={resetForm} className="close-btn">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Configuration Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Meta Leads"
                  required
                />
              </div>

              <div className="form-group">
                <label>Facebook Page ID *</label>
                <input
                  type="text"
                  value={formData.pageId}
                  onChange={(e) => setFormData({ ...formData, pageId: e.target.value })}
                  placeholder="Enter Facebook Page ID"
                  required
                />
                <small>Find this in your Facebook Page settings</small>
              </div>

              <div className="form-group">
                <label>Page Access Token *</label>
                <textarea
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  placeholder="Enter Page Access Token with leads_retrieval permission"
                  rows="3"
                  required
                />
                <small>Must have leads_retrieval permission</small>
              </div>

              <div className="form-group">
                <label>Verify Token (Optional)</label>
                <input
                  type="text"
                  value={formData.verifyToken}
                  onChange={(e) => setFormData({ ...formData, verifyToken: e.target.value })}
                  placeholder="For webhook verification"
                />
              </div>

              <div className="form-group-checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={16} />
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPageSelect && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Select Facebook Page</h2>
              <button onClick={() => setShowPageSelect(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '20px 0' }}>
              <p style={{ marginBottom: '16px', color: '#666' }}>
                Select the Facebook Page you want to sync leads from. We will automatically generate and securely save a permanent Page Access Token.
              </p>
              <div className="form-group">
                <label>Available Pages *</label>
                <select 
                  value={selectedPageId} 
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px' }}
                >
                  {availablePages.map(page => (
                    <option key={page.id} value={page.id}>
                      {page.name} (ID: {page.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button type="button" onClick={() => setShowPageSelect(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={submitAutoConnect} className="btn-primary" disabled={loading}>
                  {loading ? 'Connecting...' : 'Connect Page'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="settings-list">
        {loading ? (
          <div className="loading">Loading configurations...</div>
        ) : configs.length === 0 ? (
          <div className="loading">
            <p>No Meta Leads configurations found.</p>
            <p>Click "Add Configuration" to create one.</p>
          </div>
        ) : (
          <div className="configurations-grid">
            {configs.map((config) => (
              <div key={config.id} className="config-card">
                <div className="config-info">
                  <h3>{config.name}</h3>
                  <div className="config-details">
                    <p><strong>Page ID:</strong> {config.pageId}</p>
                    <p><strong>Status:</strong> 
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: config.isActive ? '#d4edda' : '#f8d7da',
                        color: config.isActive ? '#155724' : '#721c24',
                        marginLeft: '8px'
                      }}>
                        {config.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                    <p><strong>Created:</strong> {new Date(config.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="config-actions">
                  <button onClick={() => handleEdit(config)} className="btn-secondary">
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(config.id)} className="btn-danger">
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MetaLeadsConfig;
