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
  const [templates, setTemplates] = useState([]);
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
  const [formErrors, setFormErrors] = useState({});

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
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/templates`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

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
    setFormErrors({});
  };

  const handleInputChange = (field, value) => {
    setCurrentSettings((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: false }));
    }
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
    const errors = {};
    if (!currentSettings.name) errors.name = true;

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      showError('Please fill in all mandatory fields');
      return;
    }

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

  const uniqueTemplateNames = Array.from(new Set(templates.map(t => t.name))).filter(Boolean);
  const selectedTemplates = templates.filter(t => t.name === currentSettings.templateName);
  const availableLanguages = selectedTemplates.map(t => t.language).filter(Boolean);
  
  let requiresMediaHeader = false;
  if (currentSettings.templateName) {
    const activeTemplate = selectedTemplates.find(t => t.language === currentSettings.language) || selectedTemplates[0];
    if (activeTemplate) {
      let components = activeTemplate.components;
      if (typeof components === 'string') {
        try { components = JSON.parse(components); } catch (e) { components = []; }
      }
      if (Array.isArray(components)) {
        const headerComponent = components.find(c => c.type === 'HEADER');
        if (headerComponent && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComponent.format)) {
          requiresMediaHeader = true;
        }
      }
    }
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
                    {/* {!config.isDefault && (
                      // <button
                      //   onClick={() => handleSetDefault(config.id)}
                      //   className="btn-outline"
                      // >
                      //   Set Default
                      // </button>
                    )} */}
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
                  style={formErrors.name ? { borderColor: '#ef4444' } : {}}
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
                  placeholder="Enter template name"
                  value={currentSettings.templateName}
                  onChange={(e) => {
                    const newTemplateName = e.target.value;
                    handleInputChange("templateName", newTemplateName);
                    
                    // Auto-select language if there's only one available for this template
                    const templateLangs = templates.filter(t => t.name === newTemplateName).map(t => t.language).filter(Boolean);
                    if (templateLangs.length === 1) {
                      handleInputChange("language", templateLangs[0]);
                    } else if (templateLangs.length > 0 && !templateLangs.includes(currentSettings.language)) {
                      handleInputChange("language", templateLangs[0]);
                    }
                  }}
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
                  {availableLanguages.length === 0 && <option value="en">English (Default)</option>}
                  {[
                    { value: "af", label: "Afrikaans" },
                    { value: "sq", label: "Albanian" },
                    { value: "ar", label: "Arabic" },
                    { value: "ar_EG", label: "Arabic (Egypt)" },
                    { value: "ar_AE", label: "Arabic (UAE)" },
                    { value: "ar_LB", label: "Arabic (Lebanon)" },
                    { value: "ar_MA", label: "Arabic (Morocco)" },
                    { value: "ar_QA", label: "Arabic (Qatar)" },
                    { value: "az", label: "Azerbaijani" },
                    { value: "be_BY", label: "Belarusian" },
                    { value: "bn", label: "Bengali" },
                    { value: "bn_IN", label: "Bengali (India)" },
                    { value: "bg", label: "Bulgarian" },
                    { value: "ca", label: "Catalan" },
                    { value: "zh_CN", label: "Chinese (China)" },
                    { value: "zh_HK", label: "Chinese (Hong Kong)" },
                    { value: "zh_TW", label: "Chinese (Taiwan)" },
                    { value: "hr", label: "Croatian" },
                    { value: "cs", label: "Czech" },
                    { value: "da", label: "Danish" },
                    { value: "prs_AF", label: "Dari" },
                    { value: "nl", label: "Dutch" },
                    { value: "nl_BE", label: "Dutch (Belgium)" },
                    { value: "en", label: "English" },
                    { value: "en_GB", label: "English (UK)" },
                    { value: "en_US", label: "English (US)" },
                    { value: "en_AE", label: "English (UAE)" },
                    { value: "en_AU", label: "English (Australia)" },
                    { value: "en_CA", label: "English (Canada)" },
                    { value: "en_GH", label: "English (Ghana)" },
                    { value: "en_IE", label: "English (Ireland)" },
                    { value: "en_IN", label: "English (India)" },
                    { value: "en_JM", label: "English (Jamaica)" },
                    { value: "en_MY", label: "English (Malaysia)" },
                    { value: "en_NZ", label: "English (New Zealand)" },
                    { value: "en_QA", label: "English (Qatar)" },
                    { value: "en_SG", label: "English (Singapore)" },
                    { value: "en_UG", label: "English (Uganda)" },
                    { value: "en_ZA", label: "English (South Africa)" },
                    { value: "et", label: "Estonian" },
                    { value: "fil", label: "Filipino" },
                    { value: "fi", label: "Finnish" },
                    { value: "fr", label: "French" },
                    { value: "fr_BE", label: "French (Belgium)" },
                    { value: "fr_CA", label: "French (Canada)" },
                    { value: "fr_CH", label: "French (Switzerland)" },
                    { value: "fr_CI", label: "French (Ivory Coast)" },
                    { value: "fr_MA", label: "French (Morocco)" },
                    { value: "ka", label: "Georgian" },
                    { value: "de", label: "German" },
                    { value: "de_AT", label: "German (Austria)" },
                    { value: "de_CH", label: "German (Switzerland)" },
                    { value: "el", label: "Greek" },
                    { value: "gu", label: "Gujarati" },
                    { value: "ha", label: "Hausa" },
                    { value: "he", label: "Hebrew" },
                    { value: "hi", label: "Hindi" },
                    { value: "hu", label: "Hungarian" },
                    { value: "id", label: "Indonesian" },
                    { value: "ga", label: "Irish" },
                    { value: "it", label: "Italian" },
                    { value: "ja", label: "Japanese" },
                    { value: "kn", label: "Kannada" },
                    { value: "kk", label: "Kazakh" },
                    { value: "rw_RW", label: "Kinyarwanda" },
                    { value: "ko", label: "Korean" },
                    { value: "ky_KG", label: "Kyrgyz" },
                    { value: "lo", label: "Lao" },
                    { value: "lv", label: "Latvian" },
                    { value: "lt", label: "Lithuanian" },
                    { value: "mk", label: "Macedonian" },
                    { value: "ms", label: "Malay" },
                    { value: "ml", label: "Malayalam" },
                    { value: "mr", label: "Marathi" },
                    { value: "nb", label: "Norwegian" },
                    { value: "ps_AF", label: "Pashto" },
                    { value: "fa", label: "Persian" },
                    { value: "pl", label: "Polish" },
                    { value: "pt_BR", label: "Portuguese (Brazil)" },
                    { value: "pt_PT", label: "Portuguese (Portugal)" },
                    { value: "pa", label: "Punjabi" },
                    { value: "ro", label: "Romanian" },
                    { value: "ru", label: "Russian" },
                    { value: "sr", label: "Serbian" },
                    { value: "si_LK", label: "Sinhala" },
                    { value: "sk", label: "Slovak" },
                    { value: "sl", label: "Slovenian" },
                    { value: "es", label: "Spanish" },
                    { value: "es_AR", label: "Spanish (Argentina)" },
                    { value: "es_CL", label: "Spanish (Chile)" },
                    { value: "es_CO", label: "Spanish (Colombia)" },
                    { value: "es_CR", label: "Spanish (Costa Rica)" },
                    { value: "es_DO", label: "Spanish (Dominican Republic)" },
                    { value: "es_EC", label: "Spanish (Ecuador)" },
                    { value: "es_HN", label: "Spanish (Honduras)" },
                    { value: "es_MX", label: "Spanish (Mexico)" },
                    { value: "es_PA", label: "Spanish (Panama)" },
                    { value: "es_PE", label: "Spanish (Peru)" },
                    { value: "es_ES", label: "Spanish (Spain)" },
                    { value: "es_UY", label: "Spanish (Uruguay)" },
                    { value: "sw", label: "Swahili" },
                    { value: "sv", label: "Swedish" },
                    { value: "ta", label: "Tamil" },
                    { value: "te", label: "Telugu" },
                    { value: "th", label: "Thai" },
                    { value: "tr", label: "Turkish" },
                    { value: "uk", label: "Ukrainian" },
                    { value: "ur", label: "Urdu" },
                    { value: "uz", label: "Uzbek" },
                    { value: "vi", label: "Vietnamese" },
                    { value: "zu", label: "Zulu" }
                  ]
                    .filter(lang => availableLanguages.length === 0 || availableLanguages.includes(lang.value))
                    .map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
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

              {requiresMediaHeader && (
                <div className="form-group">
                  <label>Header Media (Required)</label>
                  <small style={{display: 'block', marginBottom: '8px', color: '#666'}}>
                    This template requires a media header. Please upload the appropriate file.
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
              )}

              {/* <div className="form-group">
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
              </div> */}

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
