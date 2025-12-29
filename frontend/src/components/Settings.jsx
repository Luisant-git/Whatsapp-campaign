import React, { useState, useEffect } from "react";
import {
  getAllSettings,
  createSettings,
  updateSettings,
  deleteSettings,
  setDefaultSettings,
  uploadHeaderImage,
} from "../api/auth";
import { getMasterConfigs } from "../api/masterConfig";
import { useToast } from '../contexts/ToastContext';
import { Eye, EyeOff, Plus, Trash2, Star, Upload } from "lucide-react";

const Settings = () => {
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

  useEffect(() => {
    fetchAllSettings();
    fetchMasterConfigs();
  }, []);

  const fetchMasterConfigs = async () => {
    try {
      const data = await getMasterConfigs();
      setMasterConfigs(data || []);
    } catch (error) {
      console.error("Failed to fetch master configs:", error);
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
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add Configuration
        </button>
      </div>

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
                  <small style={{color: '#666', fontSize: '12px'}}>Auto-filled from configuration</small>
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
                  <small style={{color: '#666', fontSize: '12px'}}>Auto-filled from configuration</small>
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
                  <small style={{color: '#666', fontSize: '12px'}}>Auto-filled from configuration</small>
                )}
              </div>

              <div className="form-group">
                <label>Header Image</label>
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
                    <span style={{fontSize: '12px', color: '#666'}}>✓ Image uploaded</span>
                  )}
                </div>
                {currentSettings.headerImageUrl && (
                  <div style={{marginTop: '10px'}}>
                    <img 
                      src={currentSettings.headerImageUrl} 
                      alt="Header preview" 
                      style={{
                        maxWidth: '200px', 
                        maxHeight: '150px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                      onLoad={(e) => {
                        e.target.style.display = 'block';
                        e.target.nextSibling.style.display = 'none';
                      }}
                    />
                    <div style={{
                      display: 'none',
                      padding: '20px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: '#f5f5f5',
                      color: '#666',
                      textAlign: 'center',
                      maxWidth: '200px'
                    }}>
                      Image preview unavailable
                    </div>
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

    </div>
  );
};

export default Settings;
