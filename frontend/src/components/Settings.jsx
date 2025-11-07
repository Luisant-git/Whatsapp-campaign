import React, { useState, useEffect } from 'react';
import { getSettings } from '../api/auth';
import { Settings as SettingsIcon, Key, Phone, MessageSquare } from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
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
        <h1>WhatsApp Settings</h1>
        <p>Current WhatsApp Business API configuration</p>
      </div>

      <div className="settings-content">
        <div className="setting-card">
          <div className="setting-icon">
            <MessageSquare size={24} />
          </div>
          <div className="setting-info">
            <h3>Template Name</h3>
            <p>{settings?.templateName || 'Not configured'}</p>
          </div>
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <Phone size={24} />
          </div>
          <div className="setting-info">
            <h3>Phone Number ID</h3>
            <p>{settings?.phoneNumberId || 'Not configured'}</p>
          </div>
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <Key size={24} />
          </div>
          <div className="setting-info">
            <h3>Access Token</h3>
            <p>{settings?.accessToken || 'Not configured'}</p>
          </div>
        </div>

        <div className="setting-card">
          <div className="setting-icon">
            <SettingsIcon size={24} />
          </div>
          <div className="setting-info">
            <h3>Verify Token</h3>
            <p>{settings?.verifyToken || 'Not configured'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;