import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Zap, Clock, Play, ArrowRight } from 'lucide-react';
import '../styles/Settings.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';

const MetaLeadsAutomation = () => {
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    templateName: '',
    delayMinutes: 5,
    isActive: true,
  });

  useEffect(() => {
    fetchRules();
    fetchTemplates();
  }, []);

  const getHeaders = () => {
    const tenantId = localStorage.getItem('tenantId');
    return {
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json',
    };
  };

  const fetchRules = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/meta-leads/automation-rules`, {
        headers: getHeaders(),
        withCredentials: true,
      });
      setRules(response.data || []);
    } catch (error) {
      console.error('Failed to fetch automation rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/templates`, {
        headers: getHeaders(),
        withCredentials: true,
      });
      setTemplates(response.data.templates || response.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.templateName) {
      alert('Please select a template');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        delayMinutes: parseInt(formData.delayMinutes, 10),
      };

      await axios.post(`${API_BASE_URL}/meta-leads/automation-rules`, payload, {
        headers: getHeaders(),
        withCredentials: true,
      });

      setFormData({ templateName: '', delayMinutes: 5, isActive: true });
      fetchRules();
    } catch (error) {
      console.error('Failed to save rule:', error);
      alert('Failed to save automation rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this automation?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/meta-leads/automation-rules/${id}`, {
        headers: getHeaders(),
        withCredentials: true,
      });
      fetchRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      alert('Failed to delete automation rule');
    }
  };

  const toggleStatus = async (rule) => {
    try {
      const payload = {
        ...rule,
        isActive: !rule.isActive,
      };
      await axios.post(`${API_BASE_URL}/meta-leads/automation-rules`, payload, {
        headers: getHeaders(),
        withCredentials: true,
      });
      fetchRules();
    } catch (error) {
      console.error('Failed to toggle status:', error);
      alert('Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="settings-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <span style={{ marginLeft: '12px' }}>Loading automations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="settings-title-section">
          <Zap size={32} />
          <div>
            <h1>Meta Leads Automation</h1>
            <p>Automatically send WhatsApp messages to new Meta Leads after a set delay.</p>
          </div>
        </div>
      </div>

      <div className="preference-card" style={{ marginBottom: '32px' }}>
        <div className="preference-header">
          <h2>Create New Automation</h2>
          <p>Set a delay and pick a template to automatically engage new leads.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="settings-form" style={{ padding: 0 }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label">
                <Clock size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                Wait Time (Minutes)
              </label>
              <input
                type="number"
                className="form-input"
                min="0"
                value={formData.delayMinutes}
                onChange={(e) => setFormData({ ...formData, delayMinutes: e.target.value })}
                placeholder="e.g., 5"
                required
              />
            </div>

            <div style={{ color: '#94a3b8', paddingBottom: '14px', display: 'flex', alignItems: 'center' }}>
              <ArrowRight size={24} />
            </div>

            <div className="form-group" style={{ flex: 2, minWidth: '250px' }}>
              <label className="form-label">Then Send Template</label>
              <select
                className="form-input"
                value={formData.templateName}
                onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                required
                style={{ cursor: 'pointer' }}
              >
                <option value="" disabled>Select a WhatsApp Template...</option>
                {templates.map((t) => (
                  <option key={t.id || t.templateId} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ minWidth: '180px' }}>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isSubmitting || !formData.templateName}
                style={{ width: '100%', height: '48px', justifyContent: 'center' }}
              >
                {isSubmitting ? 'Saving...' : (
                  <>
                    <Play size={18} />
                    Start Automating
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {rules.length > 0 && (
        <div className="settings-content">
          <div className="preference-header" style={{ marginBottom: '24px' }}>
            <h2>Active Automations</h2>
          </div>
          <div className="configurations-grid">
            {rules.map((rule) => (
              <div key={rule.id} className={`config-card ${rule.isActive ? 'default' : ''}`}>
                <div className="config-header">
                  <h3>{rule.templateName}</h3>
                  <label className="toggle-switch" title={rule.isActive ? "Pause Automation" : "Resume Automation"}>
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={() => toggleStatus(rule)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                
                <div className="config-details">
                  <p><strong>Delay:</strong> {rule.delayMinutes} {rule.delayMinutes === 1 ? 'minute' : 'minutes'}</p>
                  <p><strong>Status:</strong> <span style={{ color: rule.isActive ? '#16a34a' : '#64748b', fontWeight: 600 }}>{rule.isActive ? 'Active' : 'Inactive'}</span></p>
                  <p><strong>Created:</strong> {new Date(rule.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="config-actions" style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn-danger"
                    onClick={() => handleDelete(rule.id)}
                    title="Delete Automation"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaLeadsAutomation;
