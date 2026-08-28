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
      <div className="settings-panel">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="settings-panel meta-leads-config">
      <div className="settings-header">
        <div>
          <h2>Meta Leads Automation</h2>
          <p>Automatically send WhatsApp messages to new Meta Leads after a set delay.</p>
        </div>
        {!showForm && (
          <button className="add-config-btn" onClick={() => setShowForm(true)}>
            <Plus size={20} />
            Add Rule
          </button>
        )}
      </div>

      {showForm ? (
        <div className="config-form-container">
          <div className="config-form-header">
            <h3>{editingId ? 'Edit Automation Rule' : 'New Automation Rule'}</h3>
            <button 
              className="close-btn"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ templateName: '', delayMinutes: 5, isActive: true });
              }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="config-form">
            <div className="form-group">
              <label>WhatsApp Template *</label>
              <select
                value={formData.templateName}
                onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                required
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}
              >
                <option value="">Select a template...</option>
                {templates.map((t) => (
                  <option key={t.id || t.templateId} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              <small style={{ color: '#64748b' }}>Only approved templates can be selected.</small>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Delay in Minutes *</label>
              <input
                type="number"
                min="0"
                value={formData.delayMinutes}
                onChange={(e) => setFormData({ ...formData, delayMinutes: e.target.value })}
                placeholder="e.g., 5"
                required
              />
              <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                How long to wait after the lead is received before sending the message. Enter 0 to send immediately.
              </small>
            </div>

            <div className="form-group checkbox-group" style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                style={{ width: 'auto' }}
              />
              <label htmlFor="isActive" style={{ margin: 0, fontWeight: 'normal' }}>Enable this automation</label>
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-btn"
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
        <div className="configs-grid">
          {rules.length === 0 ? (
            <div className="no-configs">
              <Zap size={48} color="#94a3b8" />
              <p>No automation rules configured.</p>
              <button className="add-config-btn" onClick={() => setShowForm(true)} style={{ marginTop: '16px' }}>
                Create your first rule
              </button>
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="config-card">
                <div className="config-header">
                  <h3>Template: {rule.templateName}</h3>
                  <div className="config-status">
                    <span className={`status-badge ${rule.isActive ? 'active' : 'inactive'}`}>
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                
                <div className="config-details">
                  <div className="detail-item">
                    <span className="label">Delay:</span>
                    <span className="value">{rule.delayMinutes} {rule.delayMinutes === 1 ? 'minute' : 'minutes'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Created:</span>
                    <span className="value">{new Date(rule.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="config-actions">
                  <button 
                    className={`toggle-btn ${rule.isActive ? 'active' : ''}`}
                    onClick={() => toggleStatus(rule)}
                    title={rule.isActive ? "Disable" : "Enable"}
                  >
                    {rule.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button 
                    className="edit-btn"
                    onClick={() => handleEdit(rule)}
                    title="Edit Rule"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(rule.id)}
                    title="Delete Rule"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MetaLeadsAutomation;
