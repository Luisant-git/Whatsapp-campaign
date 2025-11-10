import React, { useState, useEffect } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { IoCheckmarkOutline, IoCloseOutline } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { getSettings, updateSettings } from '../api/auth';
import '../styles/Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    templateName: '',
    phoneNumberId: '',
    accessToken: '',
    verifyToken: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getSettings();
      setSettings({
        templateName: data.templateName || '',
        phoneNumberId: data.phoneNumberId || '',
        accessToken: data.accessToken === '***masked***' ? '' : data.accessToken || '',
        verifyToken: data.verifyToken === '***masked***' ? '' : data.verifyToken || ''
      });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
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
        <div className="settings-title-section">
          <FaWhatsapp size={32} />
          <div>
            <h1>WhatsApp Configuration</h1>
            <p>Configure your WhatsApp Business API settings</p>
          </div>
        </div>
      </div>

      <div className="settings-content">
        <div className="settings-form">
          <div className="form-group">
            <label className="form-label">
              Template Name
            </label>
            <input
              type="text"
              className="form-input"
              value={settings.templateName}
              onChange={(e) => setSettings({...settings, templateName: e.target.value})}
              placeholder="e.g., luisant_diwali_website50_v1"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              Phone Number ID
            </label>
            <input
              type="text"
              className="form-input"
              value={settings.phoneNumberId}
              onChange={(e) => setSettings({...settings, phoneNumberId: e.target.value})}
              placeholder="Enter WhatsApp Phone Number ID"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              WhatsApp Access Token
            </label>
            <textarea
              rows="4"
              className="form-textarea"
              value={settings.accessToken}
              onChange={(e) => setSettings({...settings, accessToken: e.target.value})}
              placeholder="Paste your WhatsApp Business API access token"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">
              Verify Token (Optional)
            </label>
            <input
              type="text"
              className="form-input"
              value={settings.verifyToken}
              onChange={(e) => setSettings({...settings, verifyToken: e.target.value})}
              placeholder="Enter webhook verify token"
            />
          </div>
        </div>
        
        <div className="settings-actions">
          <button 
            className={`save-btn ${saving ? 'loading' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="loading-spinner"></span>
                Saving...
              </>
            ) : (
              <>
                <IoCheckmarkOutline size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;