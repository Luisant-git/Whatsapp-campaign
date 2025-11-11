import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../api/auth';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState({
    templateName: '',
    phoneNumberId: '',
    accessToken: '',
    verifyToken: ''
  });
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showVerifyToken, setShowVerifyToken] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data || {
        templateName: '',
        phoneNumberId: '',
        accessToken: '',
        verifyToken: ''
      });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveConfiguration = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = () => {
    console.log('Testing connection...');
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
        <h1>WhatsApp API Settings</h1>
        <p>Connect your account to the WhatsApp Business API to enable messaging.</p>
      </div>

      <div className="settings-form">
        <div className="form-section">
          <h2>API Credentials</h2>
          
          <div className="form-group">
            <label>Template Name</label>
            <input
              type="text"
              placeholder="e.g. quarterly_newsletter"
              value={settings.templateName}
              onChange={(e) => handleInputChange('templateName', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Phone Number ID</label>
            <input
              type="text"
              placeholder="Enter the unique ID for your business phone number"
              value={settings.phoneNumberId}
              onChange={(e) => handleInputChange('phoneNumberId', e.target.value)}
            />
            <small>This is the unique identifier for your WhatsApp business number.</small>
          </div>

          <div className="form-group">
            <label>Access Token</label>
            <div className="input-with-icon">
              <input
                type={showAccessToken ? "text" : "password"}
                placeholder="Enter your access token"
                value={settings.accessToken}
                onChange={(e) => handleInputChange('accessToken', e.target.value)}
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
                value={settings.verifyToken}
                onChange={(e) => handleInputChange('verifyToken', e.target.value)}
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

          <div className="help-link">
            <a href="#">Need help finding your credentials?</a>
          </div>
        </div>

        <div className="form-actions">
          {/* <button className="btn-secondary" onClick={handleTestConnection}>
            Test Connection
          </button> */}
          <button className="btn-primary" onClick={handleSaveConfiguration} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {showSuccess && (
        <div className="success-message">
          <CheckCircle size={20} />
          Configuration saved successfully!
        </div>
      )}
    </div>
  );
};

export default Settings;