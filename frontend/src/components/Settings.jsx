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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedMasterConfig, setSelectedMasterConfig] = useState(null);
  const [useQuickReply, setUseQuickReply] = useState(true);
  const [aiChatbotEnabled, setAiChatbotEnabled] = useState(false);
  const [responsePriority, setResponsePriority] = useState('quickreply');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [activeTab, setActiveTab] = useState('configurations');

  useEffect(() => {
    fetchAllSettings();
    fetchMasterConfigs();
    fetchUserProfile();
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
    if (!file) return;

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
      showError('Failed to save configuration');
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

      {activeTab === 'preferences' && (
        <div className="preference-container">
          <div className="preference-card">
            <div className="preference-header">
              <h2>Response Methods</h2>
              <p>Configure how your WhatsApp bot responds to incoming messages</p>
            </div>

            <div className="response-methods">
              <div className={`method-card ${useQuickReply ? 'active' : ''}`}>
                <div className="method-icon">⚡</div>
                <div className="method-content">
                  <div className="method-title">
                    <h3>Quick Reply Buttons</h3>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={useQuickReply}
                        onChange={(e) => handleToggleQuickReply(e.target.checked)}
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
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ta">Tamil</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="pt">Portuguese</option>
                  <option value="ar">Arabic</option>
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
                    onChange={(e) =>
                      handleInputChange("verifyToken", e.target.value)
                    }
                    disabled={currentSettings.masterConfigId}
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowVerifyToken(!showVerifyToken)}
                  >
                    {showVerifyToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {currentSettings.masterConfigId && (
                  <small style={{color: '#28a745', fontSize: '12px', fontWeight: '500'}}>Auto-filled from configuration</small>
                )}
              </div>

              <div className="form-group">
                <label>Header Image (Optional)</label>
                <small style={{display: 'block', marginBottom: '8px', color: '#666'}}>
                  Only add if your WhatsApp template has an image header parameter
                </small>
                <ul style={{margin: '0 0 8px 0', padding: '0 0 0 20px', fontSize: '12px', color: '#666'}}>
                  <li>Supported formats: JPG, JPEG, PNG, GIF</li>
                  <li>Maximum size: 5MB</li>
                </ul>
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <label className="btn-secondary" style={{cursor: 'pointer', margin: 0}}>
                    <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      style={{display: 'none'}}
                    />
                  </label>
                  {currentSettings.headerImageUrl && (
                    <span style={{fontSize: '12px', color: '#28a745'}}>✓ Image uploaded</span>
                  )}
                </div>
                {currentSettings.headerImageUrl && (
                  <div style={{marginTop: '10px', position: 'relative', display: 'inline-block', width: '200px'}}>
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
                      onClick={() => handleInputChange('headerImageUrl', '')}
                      title="Remove image"
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
              <h2>🔒 AI Chatbot Feature Locked</h2>
              <button onClick={() => setShowPurchaseModal(false)} className="close-btn">×</button>
            </div>
            <div className="settings-form">
              <div style={{display: 'flex', alignItems: 'center', gap: '20px', padding: '10px 0'}}>
                <div style={{fontSize: '48px'}}>🤖</div>
                <div style={{flex: 1}}>
                  <p style={{fontSize: '16px', color: '#333', marginBottom: '8px', lineHeight: '1.5'}}>
                    The AI Chatbot feature is not enabled for your account.
                  </p>
                  <p style={{fontSize: '14px', color: '#666', marginBottom: '0', lineHeight: '1.5'}}>
                    Upgrade your plan to unlock intelligent automated responses powered by AI.
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
