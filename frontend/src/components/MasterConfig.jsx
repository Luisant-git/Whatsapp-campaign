import React, { useState, useEffect } from "react";
import { getMasterConfigs, createMasterConfig, updateMasterConfig, deleteMasterConfig } from "../api/masterConfig";
import { getAllSettings } from "../api/auth";
import { useToast } from '../contexts/ToastContext';
import { API_BASE_URL } from "../api/config";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";

const MasterConfig = () => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [masterConfigs, setMasterConfigs] = useState([]);
  const [allSettings, setAllSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentConfig, setCurrentConfig] = useState({
    name: "",
    phoneNumberId: "",
    accessToken: "",
    verifyToken: "",
  });
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [verifyTokenError, setVerifyTokenError] = useState('');
  const [activeTab, setActiveTab] = useState('configurations');
  const [featureAssignments, setFeatureAssignments] = useState({
    whatsappChat: '',
    aiChatbot: '',
    quickReply: '',
    ecommerce: '',
    campaigns: ''
  });

  useEffect(() => {
    fetchMasterConfigs();
    fetchAllSettings();
    fetchFeatureAssignments();
  }, []);

  const fetchMasterConfigs = async () => {
    try {
      const data = await getMasterConfigs();
      setMasterConfigs(data || []);
    } catch (error) {
      console.error("Failed to fetch master configs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSettings = async () => {
    try {
      const data = await getAllSettings();
      setAllSettings(data || []);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const fetchFeatureAssignments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/feature-assignments`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setFeatureAssignments(data || {
          whatsappChat: '',
          aiChatbot: '',
          quickReply: '',
          ecommerce: '',
          campaigns: ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch feature assignments:', error);
    }
  };

  const handleFeatureAssignment = async (feature, phoneNumberId) => {
    const previousAssignments = { ...featureAssignments };
    const updated = { ...featureAssignments, [feature]: phoneNumberId };
    setFeatureAssignments(updated);
    
    try {
      const response = await fetch(`${API_BASE_URL}/settings/feature-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated)
      });
      
      if (response.ok) {
        showSuccess(`${feature.replace(/([A-Z])/g, ' $1').trim()} number updated`);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save feature assignment:', error);
      showError('Failed to save assignment');
      setFeatureAssignments(previousAssignments);
    }
  };

  const resetForm = () => {
    setCurrentConfig({ name: "", phoneNumberId: "", accessToken: "", verifyToken: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setVerifyTokenError('');
    try {
      if (editingId) {
        await updateMasterConfig(editingId, currentConfig);
        showSuccess('Master config updated successfully!');
      } else {
        await createMasterConfig(currentConfig);
        showSuccess('Master config created successfully!');
      }
      resetForm();
      fetchMasterConfigs();
    } catch (error) {
      console.error("Failed to save master config:", error);
      const errorMessage = error.message || 'Failed to save master config';
      if (errorMessage.toLowerCase().includes('verify token')) {
        setVerifyTokenError(errorMessage);
      }
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (config) => {
    setCurrentConfig({
      name: config.name,
      phoneNumberId: config.phoneNumberId,
      accessToken: config.accessToken,
      verifyToken: config.verifyToken,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this master config?');
    if (confirmed) {
      try {
        await deleteMasterConfig(id);
        showSuccess('Master config deleted successfully!');
        fetchMasterConfigs();
      } catch (error) {
        console.error("Failed to delete master config:", error);
        showError('Failed to delete master config');
      }
    }
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">Loading master configurations...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div>
          <h1>Configurations</h1>
          <p>Manage WhatsApp API configurations that can be reused across multiple settings.</p>
        </div>
        {activeTab === 'configurations' && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Configuration
          </button>
        )}
      </div>

      <div className="tabs" style={{marginBottom: '24px', borderBottom: '2px solid #e0e0e0'}}>
        <button 
          className={activeTab === 'configurations' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('configurations')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'configurations' ? '2px solid #25d366' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: activeTab === 'configurations' ? '600' : '500',
            color: activeTab === 'configurations' ? '#25d366' : '#666'
          }}
        >
          Configurations
        </button>
        <button 
          className={activeTab === 'assignments' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('assignments')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'assignments' ? '2px solid #25d366' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: activeTab === 'assignments' ? '600' : '500',
            color: activeTab === 'assignments' ? '#25d366' : '#666'
          }}
        >
          Feature Assignment
        </button>
      </div>

      {activeTab === 'assignments' && (
        <div className="preference-container">
          <div className="preference-card">
            <div className="preference-header">
              <h2>📱 Feature Phone Number Assignment</h2>
              <p>Select which WhatsApp number handles each feature</p>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div style={{padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                  <span style={{fontSize: '24px'}}>💬</span>
                  <div style={{flex: 1}}>
                    <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>One-to-One Chat</h3>
                    <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#666'}}>Phone number for manual customer support chats</p>
                  </div>
                </div>
                <select 
                  value={featureAssignments.whatsappChat || ''}
                  onChange={(e) => handleFeatureAssignment('whatsappChat', e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                >
                  <option value="">Use Default Configuration</option>
                  {masterConfigs.map(mc => (
                    <option key={mc.id} value={mc.phoneNumberId}>{mc.name} - {mc.phoneNumberId}</option>
                  ))}
                </select>
              </div>

              <div style={{padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                  <span style={{fontSize: '24px'}}>📢</span>
                  <div style={{flex: 1}}>
                    <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>Campaigns</h3>
                    <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#666'}}>Phone number for bulk message campaigns (send-only)</p>
                  </div>
                </div>
                <select 
                  value={featureAssignments.campaigns || ''}
                  onChange={(e) => handleFeatureAssignment('campaigns', e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                >
                  <option value="">Use Default Configuration</option>
                  {masterConfigs.map(mc => (
                    <option key={mc.id} value={mc.phoneNumberId}>{mc.name} - {mc.phoneNumberId}</option>
                  ))}
                </select>
              </div>

              <div style={{padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                  <span style={{fontSize: '24px'}}>🛒</span>
                  <div style={{flex: 1}}>
                    <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>Meta Catalog</h3>
                    <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#666'}}>Phone number for product catalog and ecommerce orders</p>
                  </div>
                </div>
                <select 
                  value={featureAssignments.ecommerce || ''}
                  onChange={(e) => handleFeatureAssignment('ecommerce', e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                >
                  <option value="">Use Default Configuration</option>
                  {masterConfigs.map(mc => (
                    <option key={mc.id} value={mc.phoneNumberId}>{mc.name} - {mc.phoneNumberId}</option>
                  ))}
                </select>
              </div>

              <div style={{padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                  <span style={{fontSize: '24px'}}>🤖</span>
                  <div style={{flex: 1}}>
                    <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>AI Chatbot</h3>
                    <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#666'}}>Phone number for AI-powered responses</p>
                  </div>
                </div>
                <select 
                  value={featureAssignments.aiChatbot || ''}
                  onChange={(e) => handleFeatureAssignment('aiChatbot', e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                >
                  <option value="">Use Default Configuration</option>
                  {masterConfigs.map(mc => (
                    <option key={mc.id} value={mc.phoneNumberId}>{mc.name} - {mc.phoneNumberId}</option>
                  ))}
                </select>
              </div>

              <div style={{padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                  <span style={{fontSize: '24px'}}>⚡</span>
                  <div style={{flex: 1}}>
                    <h3 style={{margin: 0, fontSize: '16px', fontWeight: '600'}}>Quick Reply</h3>
                    <p style={{margin: '4px 0 0 0', fontSize: '13px', color: '#666'}}>Phone number for quick reply automation</p>
                  </div>
                </div>
                <select 
                  value={featureAssignments.quickReply || ''}
                  onChange={(e) => handleFeatureAssignment('quickReply', e.target.value)}
                  style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px'}}
                >
                  <option value="">Use Default Configuration</option>
                  {masterConfigs.map(mc => (
                    <option key={mc.id} value={mc.phoneNumberId}>{mc.name} - {mc.phoneNumberId}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="preference-info" style={{marginTop: '20px'}}>
              <div className="info-icon">ℹ️</div>
              <div className="info-content">
                <strong>How it works:</strong> When a message is received on a specific phone number, it will be routed to the assigned feature. If no assignment is made, the default configuration will handle all features.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'configurations' && (
        <div className="settings-list">
        {masterConfigs.length === 0 ? (
          <p>No configurations found.</p>
        ) : (
          <div className="configurations-grid">
            {masterConfigs.map((config) => (
              <div key={config.id} className="config-card">
                <div className="config-header">
                  <h3>{config.name}</h3>
                </div>
                <div className="config-details">
                  <p><strong>Phone ID:</strong> {config.phoneNumberId}</p>
                </div>
                <div className="config-actions">
                  <button onClick={() => handleEdit(config)} className="btn-secondary">
                    Edit
                  </button>
                  <button onClick={() => setSelectedConfig(config)} className="btn-outline">
                    <Eye size={16} /> View Details
                  </button>
                  <button onClick={() => handleDelete(config.id)} className="btn-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? "Edit Configuration" : "Add Configuration"}</h2>
              <button onClick={resetForm} className="close-btn">×</button>
            </div>
            <div className="settings-form">
              <div className="form-group">
                <label>Config Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Production API, Test API"
                  value={currentConfig.name}
                  onChange={(e) => setCurrentConfig({...currentConfig, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Phone Number ID *</label>
                <input
                  type="text"
                  placeholder="Enter Phone Number ID"
                  value={currentConfig.phoneNumberId}
                  onChange={(e) => setCurrentConfig({...currentConfig, phoneNumberId: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Access Token *</label>
                <div className="input-with-icon">
                  <input
                    type={showAccessToken ? "text" : "password"}
                    placeholder="Enter Access Token"
                    value={currentConfig.accessToken}
                    onChange={(e) => setCurrentConfig({...currentConfig, accessToken: e.target.value})}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                  >
                    {showAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Verify Token *</label>
                <div className="input-with-icon">
                  <input
                    type={showVerifyToken ? "text" : "password"}
                    placeholder="Enter Verify Token"
                    value={currentConfig.verifyToken}
                    onChange={(e) => {
                      setCurrentConfig({...currentConfig, verifyToken: e.target.value});
                      setVerifyTokenError('');
                    }}
                    style={verifyTokenError ? {borderColor: '#ef4444'} : {}}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowVerifyToken(!showVerifyToken)}
                  >
                    {showVerifyToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {verifyTokenError && (
                  <small style={{color: '#ef4444', fontSize: '12px', fontWeight: '500', display: 'block', marginTop: '4px'}}>
                    {verifyTokenError}
                  </small>
                )}
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={resetForm}>Cancel</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedConfig && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Configuration Details</h2>
              <button onClick={() => setSelectedConfig(null)} className="close-btn">×</button>
            </div>
            <div className="settings-form">
              <div className="form-group">
                <label>Phone Number ID</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0'}}>
                  {selectedConfig.phoneNumberId}
                </p>
              </div>
              <div className="form-group">
                <label>Access Token</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0', fontFamily: 'monospace', wordBreak: 'break-all'}}>
                  {selectedConfig.accessToken}
                </p>
              </div>
              <div className="form-group">
                <label>Verify Token</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0', fontFamily: 'monospace'}}>
                  {selectedConfig.verifyToken}
                </p>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setSelectedConfig(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterConfig;