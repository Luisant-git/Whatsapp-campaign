import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Save, X, Zap, Clock, MessageSquare, ArrowRight, Play, Check } from 'lucide-react';
import '../styles/MetaLeadsAutomation.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';

const MetaLeadsAutomation = () => {
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Single Unified Form State for the "Quick Setup"
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
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        delayMinutes: parseInt(formData.delayMinutes, 10),
      };

      await axios.post(`${API_BASE_URL}/meta-leads/automation-rules`, payload, {
        headers: getHeaders(),
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
      <div className="mla-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <Zap size={48} color="#25D366" style={{ animation: 'pulse 2s infinite' }} />
          <h2 style={{ color: '#1E293B' }}>Loading Automations...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="mla-container">
      <div className="mla-header">
        <h1>Meta Leads Auto-Responder</h1>
        <p>Instantly engage your Facebook & Instagram leads. Set your delay, pick a template, and let the automation do the rest.</p>
      </div>

      <div className="mla-quick-setup">
        <div className="mla-setup-title">
          <div className="mla-setup-icon">
            <Zap size={24} />
          </div>
          Create New Automation
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mla-setup-flow">
            <div className="mla-flow-step">
              <label className="mla-flow-label">
                <Clock size={16} /> Wait Time (Minutes)
              </label>
              <input
                type="number"
                className="mla-input"
                min="0"
                value={formData.delayMinutes}
                onChange={(e) => setFormData({ ...formData, delayMinutes: e.target.value })}
                placeholder="e.g., 5"
                required
              />
            </div>

            <div className="mla-flow-arrow">
              <ArrowRight size={24} />
            </div>

            <div className="mla-flow-step" style={{ flex: 2 }}>
              <label className="mla-flow-label">
                <MessageSquare size={16} /> Then Send Template
              </label>
              <select
                className="mla-select"
                value={formData.templateName}
                onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                required
              >
                <option value="" disabled>Select a WhatsApp Template...</option>
                {templates.map((t) => (
                  <option key={t.id || t.templateId} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mla-flow-step">
              <button 
                type="submit" 
                className="mla-btn-primary" 
                disabled={isSubmitting || !formData.templateName}
              >
                {isSubmitting ? 'Saving...' : (
                  <>
                    <Play size={20} />
                    Start Automating
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {rules.length > 0 && (
        <div className="mla-rules-section">
          <div className="mla-rules-header">
            <h2><Check size={28} color="#25D366" /> Active Automations ({rules.filter(r => r.isActive).length})</h2>
          </div>
          
          <div className="mla-rule-list">
            {rules.map((rule) => (
              <div key={rule.id} className={`mla-rule-item ${!rule.isActive ? 'inactive' : ''}`}>
                <div className="mla-rule-info">
                  <div className="mla-rule-time">
                    <Clock size={18} />
                    Wait {rule.delayMinutes} min
                  </div>
                  <ArrowRight size={20} color="#94A3B8" />
                  <div className="mla-rule-template">
                    <MessageSquare size={20} color={rule.isActive ? "#25D366" : "#94A3B8"} />
                    {rule.templateName}
                  </div>
                </div>

                <div className="mla-rule-actions">
                  <label className="mla-switch" title={rule.isActive ? "Pause Automation" : "Resume Automation"}>
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={() => toggleStatus(rule)}
                    />
                    <span className="mla-slider"></span>
                  </label>
                  
                  <button 
                    className="mla-btn-icon" 
                    onClick={() => handleDelete(rule.id)}
                    title="Delete Automation"
                  >
                    <Trash2 size={20} />
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
