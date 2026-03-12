import React, { useState, useEffect } from "react";
import {
  getAllSettings,
  createSettings,
  updateSettings,
  deleteSettings,
  setDefaultSettings,
  uploadHeaderImage,
  getProfile,
  updateUserPreference,
} from "../api/auth";
import { getMasterConfigs } from "../api/masterConfig";
import { API_BASE_URL } from "../api/config";
import { useToast } from '../contexts/ToastContext';
import { Eye, EyeOff, Plus, Trash2, Star, Upload } from "lucide-react";
import '../styles/QuickReply.css';

const Settings = ({ onNavigate }) => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [allSettings, setAllSettings] = useState([]);
  const [masterConfigs, setMasterConfigs] = useState([]);
  const [currentSettings, setCurrentSettings] = useState({
    name: "",
    templateName: "",
    phoneNumberId: "",
    accessToken: "",
    verifyToken: "",
    language: "en",
    headerImageUrl: "",
    isDefault: false,
    masterConfigId: "",
  });
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifyTokenError, setVerifyTokenError] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedMasterConfig, setSelectedMasterConfig] = useState(null);
  const [useQuickReply, setUseQuickReply] = useState(true);
  const [aiChatbotEnabled, setAiChatbotEnabled] = useState(false);
  const [responsePriority, setResponsePriority] = useState('quickreply');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const [activeTab, setActiveTab] = useState('configurations');
  const [featureAssignments, setFeatureAssignments] = useState({
    whatsappChat: '',
    aiChatbot: '',
    quickReply: '',
    ecommerce: '',
    campaigns: ''
  });

  useEffect(() => {
    fetchAllSettings();
    fetchMasterConfigs();
    fetchUserProfile();
    fetchFeatureAssignments();
  }, []);

  const fetchMasterConfigs = async () => {
    try {
      const data = await getMasterConfigs();
      setMasterConfigs(data || []);
    } catch (error) {
      console.error("Failed to fetch master configs:", error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const data = await getProfile();
      setUseQuickReply(data.user?.useQuickReply !== false);
      setAiChatbotEnabled(data.user?.aiChatbotEnabled || false);
      setResponsePriority(data.user?.responsePriority || 'quickreply');
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const fetchFeatureAssignments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/feature-assignments`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded feature assignments:', data);
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
    const updated = { ...featureAssignments, [feature]: phoneNumberId };
    setFeatureAssignments(updated);
    console.log('Saving feature assignment:', feature, phoneNumberId, updated);
    
    try {
      const response = await fetch(`${API_BASE_URL}/settings/feature-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Save result:', result);
        showSuccess(`${feature.replace(/([A-Z])/g, ' $1').trim()} number updated`);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save feature assignment:', error);
      showError('Failed to save assignment');
      setFeatureAssignments(featureAssignments); // Revert on error
    }
  };

  const fetchAllSettings = async () => {
    try {
      const data = await getAllSettings();
      setAllSettings(data || []);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentSettings({
      name: "",
      templateName: "",
      phoneNumberId: "",
      accessToken: "",
      verifyToken: "",
      language: "en",
      headerImageUrl: "",
      isDefault: false,
      masterConfigId: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleInputChange = (field, value) => {
    setCurrentSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      // If no file selected (user cancelled), clear the current upload
      setUploadedFile(null);
      handleInputChange('headerImageUrl', '');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadHeaderImage(file);
      handleInputChange('headerImageUrl', result.url);
      showSuccess('Image uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload image:', error);
      showError('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    setVerifyTokenError('');
    try {
      if (editingId) {
        await updateSettings(editingId, currentSettings);
        showSuccess('Configuration updated successfully!');
      } else {
        await createSettings(currentSettings);
        showSuccess('Configuration created successfully!');
      }
      resetForm();
      fetchAllSettings();
    } catch (error) {
      console.error("Failed to save settings:", error);
      const errorMessage = error.message || 'Failed to save configuration';
      if (errorMessage.toLowerCase().includes('verify token')) {
        setVerifyTokenError(errorMessage);
      }
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (settings) => {
    // If the settings use a master config, get the values from master config
    let phoneNumberId = settings.phoneNumberId;
    let accessToken = settings.accessToken;
    let verifyToken = settings.verifyToken;
    let masterConfigId = settings.masterConfigId || "";
    
    if (settings.masterConfigId) {
      const masterConfig = masterConfigs.find(mc => mc.id === settings.masterConfigId);
      if (masterConfig) {
        phoneNumberId = masterConfig.phoneNumberId;
        accessToken = masterConfig.accessToken;
        verifyToken = masterConfig.verifyToken;
      }
    }
    
    setCurrentSettings({
      name: settings.name,
      templateName: settings.templateName,
      phoneNumberId: phoneNumberId,
      accessToken: accessToken,
      verifyToken: verifyToken,
      language: settings.language,
      headerImageUrl: settings.headerImageUrl || "",
      isDefault: settings.isDefault,
      masterConfigId: masterConfigId,
    });
    setEditingId(settings.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this configuration?');
    if (confirmed) {
      try {
        await deleteSettings(id);
        showSuccess('Configuration deleted successfully!');
        fetchAllSettings();
      } catch (error) {
        console.error("Failed to delete settings:", error);
        showError('Failed to delete configuration');
      }
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultSettings(id);
      showSuccess('Default configuration updated!');
      fetchAllSettings();
    } catch (error) {
      console.error("Failed to set default settings:", error);
      showError('Failed to set default configuration');
    }
  };

  const handleToggleQuickReply = async (value) => {
    if (value && !useQuickReply) {
      setUpgradeFeature('Quick Reply');
      setShowPurchaseModal(true);
      return;
    }
    try {
      await updateUserPreference({ useQuickReply: value });
      setUseQuickReply(value);
      showSuccess(`Quick Reply ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      showError('Failed to update preference');
    }
  };

  const handleToggleChatbot = async (value) => {
    if (value && !aiChatbotEnabled) {
      setUpgradeFeature('AI Chatbot');
      setShowPurchaseModal(true);
      return;
    }
    try {
      await updateUserPreference({ aiChatbotEnabled: value });
      setAiChatbotEnabled(value);
      showSuccess(`AI Chatbot ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      showError('Failed to update preference');
    }
  };

  const handlePriorityChange = async (priority) => {
    try {
      await updateUserPreference({ responsePriority: priority });
      setResponsePriority(priority);
      showSuccess(`Response priority updated to ${priority === 'quickreply' ? 'Quick Reply' : 'AI Chatbot'}`);
    } catch (error) {
      showError('Failed to update priority');
    }
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div>
          <h1>WhatsApp API Settings</h1>
          <p>Manage multiple WhatsApp Business API configurations.</p>
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
        {/* <button 
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
        </button> */}
        <button 
          className={activeTab === 'preferences' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('preferences')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'preferences' ? '2px solid #25d366' : '2px solid transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: activeTab === 'preferences' ? '600' : '500',
            color: activeTab === 'preferences' ? '#25d366' : '#666'
          }}
        >
          Response Preference
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
              {/* One-to-One Chat */}
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

              {/* Campaigns */}
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

              {/* Meta Catalog */}
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

              {/* AI Chatbot */}
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

              {/* Quick Reply */}
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

{activeTab === 'preferences' && (
        <div className="preference-container">
          <div className="preference-card">
            <div className="preference-header">
              <h2>Response Methods</h2>
              <p>Configure how your WhatsApp bot responds to incoming messages</p>
            </div>

            <div className="response-methods">
              <div className={`method-card ${useQuickReply ? 'active' : ''} ${!useQuickReply ? 'locked' : ''}`}>
                <div className="method-icon">⚡</div>
                <div className="method-content">
                  <div className="method-title">
                    <h3>Quick Reply Buttons {!useQuickReply && <span className="lock-badge">🔒 Premium</span>}</h3>
                    <label className={`toggle-switch ${!useQuickReply ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={useQuickReply}
                        onChange={(e) => handleToggleQuickReply(e.target.checked)}
                        disabled={!useQuickReply}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <p className="method-description">
                    Provide predefined button options for quick customer responses. Perfect for FAQs and common queries.
                  </p>
                  {useQuickReply && (
                    <div className="method-status active-status">
                      <span className="status-dot"></span>
                      Active
                    </div>
                  )}
                  {!useQuickReply && (
                    <button className="upgrade-btn" onClick={() => { setUpgradeFeature('Quick Reply'); setShowPurchaseModal(true); }}>
                      Upgrade to Enable
                    </button>
                  )}
                </div>
              </div>

              <div className={`method-card ${aiChatbotEnabled ? 'active' : ''} ${!aiChatbotEnabled && !useQuickReply ? 'locked' : ''}`}>
                <div className="method-icon">🤖</div>
                <div className="method-content">
                  <div className="method-title">
                    <h3>AI Chatbot {!aiChatbotEnabled && !useQuickReply && <span className="lock-badge">🔒 Premium</span>}</h3>
                    <label className={`toggle-switch ${!aiChatbotEnabled && !useQuickReply ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={aiChatbotEnabled}
                        onChange={(e) => handleToggleChatbot(e.target.checked)}
                        disabled={!aiChatbotEnabled && !useQuickReply}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <p className="method-description">
                    Intelligent AI-powered responses that understand context and provide natural conversations.
                  </p>
                  {aiChatbotEnabled && (
                    <div className="method-status active-status">
                      <span className="status-dot"></span>
                      Active
                    </div>
                  )}
                  {!aiChatbotEnabled && !useQuickReply && (
                    <button className="upgrade-btn" onClick={() => setShowPurchaseModal(true)}>
                      Upgrade to Enable
                    </button>
                  )}
                </div>
              </div>
            </div>

            {useQuickReply && aiChatbotEnabled && (
              <div className="priority-section">
                <div className="priority-header">
                  <h3>Response Priority</h3>
                  <p>Choose which method responds first. The system will fallback to the other if no match is found.</p>
                </div>
                <div className="priority-options">
                  <button
                    className={`priority-btn ${responsePriority === 'quickreply' ? 'selected' : ''}`}
                    onClick={() => handlePriorityChange('quickreply')}
                  >
                    <div className="priority-icon">⚡</div>
                    <div className="priority-content">
                      <span className="priority-label">Quick Reply First</span>
                      <span className="priority-desc">Try button matches first, then AI</span>
                    </div>
                    {responsePriority === 'quickreply' && <span className="check-icon">✓</span>}
                  </button>
                  <button
                    className={`priority-btn ${responsePriority === 'chatbot' ? 'selected' : ''}`}
                    onClick={() => handlePriorityChange('chatbot')}
                  >
                    <div className="priority-icon">🤖</div>
                    <div className="priority-content">
                      <span className="priority-label">AI Chatbot First</span>
                      <span className="priority-desc">Try AI response first, then buttons</span>
                    </div>
                    {responsePriority === 'chatbot' && <span className="check-icon">✓</span>}
                  </button>
                </div>
              </div>
            )}

            <div className="preference-info">
              <div className="info-icon">ℹ️</div>
              <div className="info-content">
                <strong>Current Configuration:</strong>
                {useQuickReply && aiChatbotEnabled
                  ? ` Both methods enabled. ${responsePriority === 'quickreply' ? 'Quick Reply' : 'AI Chatbot'} will respond first with automatic fallback.`
                  : useQuickReply && !aiChatbotEnabled
                    ? ' Only Quick Reply buttons are active.'
                    : !useQuickReply && aiChatbotEnabled
                      ? ' Only AI Chatbot is active.'
                      : ' No response method is active. Please enable at least one method.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'configurations' && (
        <div className="settings-list">
          <h2>Configurations</h2>
          {allSettings.length === 0 ? (
            <p>No configurations found. Create your first configuration.</p>
          ) : (
            <div className="configurations-grid">
              {allSettings.map((config) => (
                <div
                  key={config.id}
                  className={`config-card ${config.isDefault ? "default" : ""}`}
                >
                  <div className="config-header">
                    <h3>{config.name}</h3>
                    {config.isDefault && (
                      <Star size={16} className="default-icon" />
                    )}
                  </div>
                  <div className="config-details">
                    <p>
                      <strong>Template:</strong> {config.templateName}
                    </p>
                    <p>
                      <strong>Language:</strong> {config.language}
                    </p>
                    {config.masterConfigId ? (
                      <p>
                        <strong>Config:</strong> {masterConfigs.find(mc => mc.id === config.masterConfigId)?.name || 'Unknown'}
                      </p>
                    ) : (
                      <p>
                        <strong>Phone ID:</strong> {config.phoneNumberId}
                      </p>
                    )}
                  </div>
                  <div className="config-actions">
                    <button
                      onClick={() => handleEdit(config)}
                      className="btn-secondary"
                    >
                      Edit
                    </button>
                    {!config.masterConfigId && (
                      <button
                        onClick={() => setSelectedMasterConfig(config)}
                        className="btn-outline"
                      >
                        <Eye size={16} /> View Details
                      </button>
                    )}
                    {!config.isDefault && (
                      <button
                        onClick={() => handleSetDefault(config.id)}
                        className="btn-outline"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="btn-danger"
                    >
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
              <h2>
                {editingId ? "Edit Configuration" : "Add New Configuration"}
              </h2>
              <button onClick={resetForm} className="close-btn">
                ×
              </button>
            </div>

            <div className="settings-form">
              <div className="form-group">
                <label>Configuration Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Production, Testing, Campaign A"
                  value={currentSettings.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  disabled={editingId !== null}
                />
              </div>

              <div className="form-group">
                <label>Configuration</label>
                <select
                  value={currentSettings.masterConfigId}
                  onChange={(e) => {
                    const configId = e.target.value;
                    handleInputChange("masterConfigId", configId);
                    if (configId) {
                      const config = masterConfigs.find(c => c.id.toString() === configId);
                      if (config) {
                        handleInputChange("phoneNumberId", config.phoneNumberId);
                        handleInputChange("accessToken", config.accessToken);
                        handleInputChange("verifyToken", config.verifyToken);
                      }
                    }
                  }}
                >
                  <option value="">Select Configuration</option>
                  {masterConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Template Name</label>
                <input
                  type="text"
                  placeholder="e.g. quarterly_newsletter"
                  value={currentSettings.templateName}
                  onChange={(e) =>
                    handleInputChange("templateName", e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Template Language</label>
                <select
                  value={currentSettings.language}
                  onChange={(e) =>
                    handleInputChange("language", e.target.value)
                  }
                >
                  <option value="af">Afrikaans</option>
                  <option value="sq">Albanian</option>
                  <option value="ar">Arabic</option>
                  <option value="ar_EG">Arabic (Egypt)</option>
                  <option value="ar_AE">Arabic (UAE)</option>
                  <option value="ar_LB">Arabic (Lebanon)</option>
                  <option value="ar_MA">Arabic (Morocco)</option>
                  <option value="ar_QA">Arabic (Qatar)</option>
                  <option value="az">Azerbaijani</option>
                  <option value="be_BY">Belarusian</option>
                  <option value="bn">Bengali</option>
                  <option value="bn_IN">Bengali (India)</option>
                  <option value="bg">Bulgarian</option>
                  <option value="ca">Catalan</option>
                  <option value="zh_CN">Chinese (China)</option>
                  <option value="zh_HK">Chinese (Hong Kong)</option>
                  <option value="zh_TW">Chinese (Taiwan)</option>
                  <option value="hr">Croatian</option>
                  <option value="cs">Czech</option>
                  <option value="da">Danish</option>
                  <option value="prs_AF">Dari</option>
                  <option value="nl">Dutch</option>
                  <option value="nl_BE">Dutch (Belgium)</option>
                  <option value="en">English</option>
                  <option value="en_GB">English (UK)</option>
                  <option value="en_US">English (US)</option>
                  <option value="en_AE">English (UAE)</option>
                  <option value="en_AU">English (Australia)</option>
                  <option value="en_CA">English (Canada)</option>
                  <option value="en_GH">English (Ghana)</option>
                  <option value="en_IE">English (Ireland)</option>
                  <option value="en_IN">English (India)</option>
                  <option value="en_JM">English (Jamaica)</option>
                  <option value="en_MY">English (Malaysia)</option>
                  <option value="en_NZ">English (New Zealand)</option>
                  <option value="en_QA">English (Qatar)</option>
                  <option value="en_SG">English (Singapore)</option>
                  <option value="en_UG">English (Uganda)</option>
                  <option value="en_ZA">English (South Africa)</option>
                  <option value="et">Estonian</option>
                  <option value="fil">Filipino</option>
                  <option value="fi">Finnish</option>
                  <option value="fr">French</option>
                  <option value="fr_BE">French (Belgium)</option>
                  <option value="fr_CA">French (Canada)</option>
                  <option value="fr_CH">French (Switzerland)</option>
                  <option value="fr_CI">French (Ivory Coast)</option>
                  <option value="fr_MA">French (Morocco)</option>
                  <option value="ka">Georgian</option>
                  <option value="de">German</option>
                  <option value="de_AT">German (Austria)</option>
                  <option value="de_CH">German (Switzerland)</option>
                  <option value="el">Greek</option>
                  <option value="gu">Gujarati</option>
                  <option value="ha">Hausa</option>
                  <option value="he">Hebrew</option>
                  <option value="hi">Hindi</option>
                  <option value="hu">Hungarian</option>
                  <option value="id">Indonesian</option>
                  <option value="ga">Irish</option>
                  <option value="it">Italian</option>
                  <option value="ja">Japanese</option>
                  <option value="kn">Kannada</option>
                  <option value="kk">Kazakh</option>
                  <option value="rw_RW">Kinyarwanda</option>
                  <option value="ko">Korean</option>
                  <option value="ky_KG">Kyrgyz</option>
                  <option value="lo">Lao</option>
                  <option value="lv">Latvian</option>
                  <option value="lt">Lithuanian</option>
                  <option value="mk">Macedonian</option>
                  <option value="ms">Malay</option>
                  <option value="ml">Malayalam</option>
                  <option value="mr">Marathi</option>
                  <option value="nb">Norwegian</option>
                  <option value="ps_AF">Pashto</option>
                  <option value="fa">Persian</option>
                  <option value="pl">Polish</option>
                  <option value="pt_BR">Portuguese (Brazil)</option>
                  <option value="pt_PT">Portuguese (Portugal)</option>
                  <option value="pa">Punjabi</option>
                  <option value="ro">Romanian</option>
                  <option value="ru">Russian</option>
                  <option value="sr">Serbian</option>
                  <option value="si_LK">Sinhala</option>
                  <option value="sk">Slovak</option>
                  <option value="sl">Slovenian</option>
                  <option value="es">Spanish</option>
                  <option value="es_AR">Spanish (Argentina)</option>
                  <option value="es_CL">Spanish (Chile)</option>
                  <option value="es_CO">Spanish (Colombia)</option>
                  <option value="es_CR">Spanish (Costa Rica)</option>
                  <option value="es_DO">Spanish (Dominican Republic)</option>
                  <option value="es_EC">Spanish (Ecuador)</option>
                  <option value="es_HN">Spanish (Honduras)</option>
                  <option value="es_MX">Spanish (Mexico)</option>
                  <option value="es_PA">Spanish (Panama)</option>
                  <option value="es_PE">Spanish (Peru)</option>
                  <option value="es_ES">Spanish (Spain)</option>
                  <option value="es_UY">Spanish (Uruguay)</option>
                  <option value="sw">Swahili</option>
                  <option value="sv">Swedish</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="th">Thai</option>
                  <option value="tr">Turkish</option>
                  <option value="uk">Ukrainian</option>
                  <option value="ur">Urdu</option>
                  <option value="uz">Uzbek</option>
                  <option value="vi">Vietnamese</option>
                  <option value="zu">Zulu</option>
                </select>
              </div>

              <div className="form-group">
                <label>Phone Number ID</label>
                <input
                  type="text"
                  placeholder="Enter the unique ID for your business phone number"
                  value={currentSettings.phoneNumberId}
                  onChange={(e) =>
                    handleInputChange("phoneNumberId", e.target.value)
                  }
                  disabled={currentSettings.masterConfigId}
                />
                {currentSettings.masterConfigId && (
                  <small style={{color: '#28a745', fontSize: '12px', fontWeight: '500'}}>Auto-filled from configuration</small>
                )}
              </div>

              <div className="form-group">
                <label>Access Token</label>
                <div className="input-with-icon">
                  <input
                    type={showAccessToken ? "text" : "password"}
                    placeholder="Enter your access token"
                    value={currentSettings.accessToken}
                    onChange={(e) =>
                      handleInputChange("accessToken", e.target.value)
                    }
                    disabled={currentSettings.masterConfigId}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                  >
                    {showAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {currentSettings.masterConfigId && (
                  <small style={{color: '#28a745', fontSize: '12px', fontWeight: '500'}}>Auto-filled from configuration</small>
                )}
              </div>

              <div className="form-group">
                <label>Verify Token</label>
                <div className="input-with-icon">
                  <input
                    type={showVerifyToken ? "text" : "password"}
                    placeholder="Enter your verify token"
                    value={currentSettings.verifyToken}
                    onChange={(e) => {
                      handleInputChange("verifyToken", e.target.value);
                      setVerifyTokenError('');
                    }}
                    disabled={currentSettings.masterConfigId}
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
                {currentSettings.masterConfigId && (
                  <small style={{color: '#28a745', fontSize: '12px', fontWeight: '500'}}>Auto-filled from configuration</small>
                )}
              </div>

              <div className="form-group">
                <label>Header Media (Optional)</label>
                <small style={{display: 'block', marginBottom: '8px', color: '#666'}}>
                  Only add if your WhatsApp template has a media header parameter
                </small>
                <div style={{fontSize: '12px', color: '#8d949e', marginBottom: '8px'}}>
                  <strong>Images:</strong> JPG, JPEG, PNG, GIF • <strong>Videos:</strong> MP4, AVI, MOV • <strong>Documents:</strong> PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX • Max size: 16MB
                </div>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <label className="btn-secondary" style={{cursor: 'pointer', margin: 0}}>
                    <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Media'}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,video/mp4,video/avi,video/mov,video/quicktime,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file size (16MB)
                          if (file.size > 16 * 1024 * 1024) {
                            showError('File size exceeds 16MB limit');
                            e.target.value = '';
                            return;
                          }
                          handleImageUpload(e);
                        }
                      }}
                      disabled={uploading}
                      style={{display: 'none'}}
                    />
                  </label>
                  {currentSettings.headerImageUrl && (
                    <span style={{fontSize: '12px', color: '#28a745'}}>✓ Media uploaded</span>
                  )}
                </div>
                {currentSettings.headerImageUrl && (
                  <div style={{marginTop: '10px', position: 'relative', display: 'inline-block', width: '200px'}}>
                    {currentSettings.headerImageUrl.match(/\.(mp4|avi|mov)$/i) ? (
                      <video 
                        src={currentSettings.headerImageUrl} 
                        style={{
                          width: '100%',
                          height: '150px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        controls
                      />
                    ) : currentSettings.headerImageUrl.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i) ? (
                      <div style={{
                        width: '100%',
                        height: '150px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8f9fa',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{fontSize: '48px'}}>📄</div>
                        <div style={{fontSize: '12px', color: '#666', textAlign: 'center', padding: '0 10px'}}>
                          {currentSettings.headerImageUrl.split('/').pop()}
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={currentSettings.headerImageUrl} 
                        alt="Header preview" 
                        style={{
                          width: '100%',
                          height: '150px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                      />
                    )}
                    <button 
                      type="button"
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '28px',
                        height: '28px',
                        padding: '0',
                        border: 'none',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        lineHeight: '1'
                      }}
                      onClick={() => {
                        handleInputChange('headerImageUrl', '');
                        // Reset the file input
                        const fileInput = document.querySelector('input[type="file"]');
                        if (fileInput) fileInput.value = '';
                      }}
                      title="Remove media"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={currentSettings.isDefault}
                    onChange={(e) =>
                      handleInputChange("isDefault", e.target.checked)
                    }
                  />
                  Set as default configuration
                </label>
              </div>

              <div className="form-actions">
                <button className="btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSaveConfiguration}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Update Configuration"
                    : "Save Configuration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedMasterConfig && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Configuration Details</h2>
              <button onClick={() => setSelectedMasterConfig(null)} className="close-btn">×</button>
            </div>
            <div className="settings-form">
              <div className="form-group">
                <label>Phone Number ID</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0'}}>
                  {selectedMasterConfig.phoneNumberId}
                </p>
              </div>
              <div className="form-group">
                <label>Access Token</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0', fontFamily: 'monospace', wordBreak: 'break-all'}}>
                  {selectedMasterConfig.accessToken}
                </p>
              </div>
              <div className="form-group">
                <label>Verify Token</label>
                <p style={{padding: '12px', background: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '4px', margin: '8px 0', fontFamily: 'monospace'}}>
                  {selectedMasterConfig.verifyToken}
                </p>
              </div>
              <div className="form-actions">
                <button className="btn-secondary" onClick={() => setSelectedMasterConfig(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPurchaseModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h2>🔒 {upgradeFeature} Feature Locked</h2>
              <button onClick={() => setShowPurchaseModal(false)} className="close-btn">×</button>
            </div>
            <div className="settings-form">
              <div style={{display: 'flex', alignItems: 'center', gap: '20px', padding: '10px 0'}}>
                <div style={{fontSize: '48px'}}>{upgradeFeature === 'AI Chatbot' ? '🤖' : '⚡'}</div>
                <div style={{flex: 1}}>
                  <p style={{fontSize: '16px', color: '#333', marginBottom: '8px', lineHeight: '1.5'}}>
                    The {upgradeFeature} feature is not enabled for your account.
                  </p>
                  <p style={{fontSize: '14px', color: '#666', marginBottom: '0', lineHeight: '1.5'}}>
                    Upgrade your plan to unlock {upgradeFeature === 'AI Chatbot' ? 'intelligent automated responses powered by AI' : 'predefined button options for quick customer responses'}.
                  </p>
                </div>
              </div>
              <div style={{background: '#f8f9fa', padding: '12px 16px', borderRadius: '8px', marginTop: '16px', marginBottom: '16px'}}>
                <p style={{fontSize: '13px', color: '#555', margin: 0}}>
                  <strong>Contact Support:</strong> Email: support@example.com | Phone: +1 (555) 123-4567
                </p>
              </div>
              <div className="form-actions" style={{marginTop: '16px', paddingTop: '0', borderTop: 'none'}}>
                <button className="btn-primary" onClick={() => {
                  setShowPurchaseModal(false);
                  if (onNavigate) onNavigate('subscription');
                }} style={{width: '100%'}}>
                  View Subscription Plans
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
