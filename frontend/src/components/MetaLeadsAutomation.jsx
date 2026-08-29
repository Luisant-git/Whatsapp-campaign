import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Save, X, Zap } from 'lucide-react';
import '../styles/Settings.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';

const MetaLeadsAutomation = () => {
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
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
      });
      const allTemplates = response.data.templates || [];
      // Only approved templates can be sent
      const approvedTemplates = allTemplates.filter((t) => t.status === 'APPROVED');
      setTemplates(approvedTemplates);
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

    try {
      const payload = {
        ...formData,
        id: editingId,
        delayMinutes: parseInt(formData.delayMinutes, 10),
      };

      await axios.post(`${API_BASE_URL}/meta-leads/automation-rules`, payload, {
        headers: getHeaders(),
      });

      setShowForm(false);
      setEditingId(null);
      setFormData({ templateName: '', delayMinutes: 5, isActive: true });
      fetchRules();
    } catch (error) {
      console.error('Failed to save rule:', error);
      alert('Failed to save automation rule');
    }
  };

  const handleEdit = (rule) => {
    setFormData({
      templateName: rule.templateName,
      delayMinutes: rule.delayMinutes,
      isActive: rule.isActive,
    });
    setEditingId(rule.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this automation rule?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/meta-leads/automation-rules/${id}`, {
        headers: getHeaders(),
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
          <span style={{ marginLeft: '12px' }}>Loading automation rules...</span>
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
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={20} />
            Add Rule
          </button>
        )}
      </div>

      <div className="settings-content">
        {showForm ? (
          <div className="config-form-container">
            <div className="modal-header" style={{ padding: '0 0 20px 0', marginBottom: '20px' }}>
              <h2>{editingId ? 'Edit Automation Rule' : 'New Automation Rule'}</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ templateName: '', delayMinutes: 5, isActive: true });
                }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="settings-form" style={{ padding: 0 }}>
              <div className="form-group">
                <label className="form-label">WhatsApp Template *</label>
                <select
                  className="form-input"
                  value={formData.templateName}
                  onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                  required
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.id || t.templateId} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <small>Only approved templates can be selected.</small>
              </div>

              <div className="form-group">
                <label className="form-label">Delay in Minutes *</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={formData.delayMinutes}
                  onChange={(e) => setFormData({ ...formData, delayMinutes: e.target.value })}
                  placeholder="e.g., 5"
                  required
                />
                <small>
                  How long to wait after the lead is received before sending the message. Enter 0 to send immediately.
                </small>
              </div>

              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span style={{ fontWeight: 600 }}>Enable this automation</span>
                </label>
              </div>

              <div className="form-actions" style={{ padding: '20px 0 0 0' }}>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  <Save size={18} />
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {rules.length === 0 ? (
              <div className="no-configs" style={{ textAlign: 'center', padding: '60px 20px' }}>
                <Zap size={64} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                <h2 style={{ fontSize: '20px', color: '#1e293b', margin: '0 0 8px 0' }}>No automation rules configured.</h2>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>Create your first rule to automatically engage with your Meta leads.</p>
                <button className="btn-primary" onClick={() => setShowForm(true)} style={{ margin: '0 auto' }}>
                  <Plus size={20} />
                  Create your first rule
                </button>
              </div>
            ) : (
              <div className="configurations-grid">
                {rules.map((rule) => (
                  <div key={rule.id} className={`config-card ${rule.isActive ? 'default' : ''}`}>
                    <div className="config-header">
                      <h3>{rule.templateName}</h3>
                      <label className="toggle-switch" title={rule.isActive ? "Disable" : "Enable"}>
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

                    <div className="config-actions" style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                      <button 
                        className="btn-secondary"
                        onClick={() => handleEdit(rule)}
                        title="Edit Rule"
                        style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
                      >
                        <Edit2 size={16} /> Edit
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={() => handleDelete(rule.id)}
                        title="Delete Rule"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MetaLeadsAutomation;
