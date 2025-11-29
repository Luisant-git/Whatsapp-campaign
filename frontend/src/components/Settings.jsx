import React, { useState, useEffect } from "react";
import {
  getAllSettings,
  createSettings,
  updateSettings,
  deleteSettings,
  setDefaultSettings,
} from "../api/auth";
import { useToast } from '../contexts/ToastContext';
import { Eye, EyeOff, Plus, Trash2, Star } from "lucide-react";

const Settings = () => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [allSettings, setAllSettings] = useState([]);
  const [currentSettings, setCurrentSettings] = useState({
    name: "",
    templateName: "",
    phoneNumberId: "",
    accessToken: "",
    verifyToken: "",
    language: "en",
    isDefault: false,
  });
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAllSettings();
  }, []);

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
      isDefault: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleInputChange = (field, value) => {
    setCurrentSettings((prev) => ({ ...prev, [field]: value }));
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
    setCurrentSettings({
      name: settings.name,
      templateName: settings.templateName,
      phoneNumberId: settings.phoneNumberId,
      accessToken: settings.accessToken,
      verifyToken: settings.verifyToken,
      language: settings.language,
      isDefault: settings.isDefault,
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
                  <p>
                    <strong>Phone ID:</strong> {config.phoneNumberId}
                  </p>
                </div>
                <div className="config-actions">
                  <button
                    onClick={() => handleEdit(config)}
                    className="btn-secondary"
                  >
                    Edit
                  </button>
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
                />
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
                />
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
                <label>Verify Token</label>
                <div className="input-with-icon">
                  <input
                    type={showVerifyToken ? "text" : "password"}
                    placeholder="Enter your verify token"
                    value={currentSettings.verifyToken}
                    onChange={(e) =>
                      handleInputChange("verifyToken", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="toggle-visibility"
                    onClick={() => setShowVerifyToken(!showVerifyToken)}
                  >
                    {showVerifyToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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


    </div>
  );
};

export default Settings;
