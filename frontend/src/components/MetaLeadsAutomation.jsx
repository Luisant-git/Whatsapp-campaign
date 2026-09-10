import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Clock, Play, ArrowRight } from 'lucide-react';
import '../styles/Settings.css';
import Select from 'react-select';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';

const MetaLeadsAutomation = () => {
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ 
    campaignName: '',
    templateName: '', 
    delayValue: 5, 
    delayUnit: 'minutes', 
    isActive: true 
  });

  useEffect(() => {
    fetchRules();
    fetchTemplates();
    fetchCampaigns();
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

  const fetchCampaigns = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/meta-leads`, {
        params: { page: 1, limit: 1000 },
        headers: getHeaders(),
        withCredentials: true,
      });
      const uniqueCampaigns = [...new Set(data.data?.map(lead => lead.campaignName).filter(Boolean))];
      setCampaigns(uniqueCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
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
      const response = await axios.post(`${API_BASE_URL}/meta-leads/automation-rules`, {
        campaignName: formData.campaignName,
        templateName: formData.templateName,
        delayValue: parseInt(formData.delayValue, 10),
        delayUnit: formData.delayUnit,
        isActive: formData.isActive
      }, {
        headers: getHeaders(),
        withCredentials: true,
      });

      if (response.data && !response.data.error) {
        fetchRules();
        setFormData({ campaignName: '', templateName: '', delayValue: 5, delayUnit: 'minutes', isActive: true });
      }
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                <label className="form-label">Target Campaign (Optional)</label>
                <select
                  className="form-input"
                  value={formData.campaignName}
                  onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                  style={{ width: '100%', minHeight: '48px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                >
                  <option value="">All Campaigns (Any new lead)</option>
                  {campaigns.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                <label className="form-label">
                  <Clock size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                  Wait Time
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={formData.delayValue}
                    onChange={(e) => setFormData({ ...formData, delayValue: e.target.value })}
                    placeholder="e.g., 5"
                    required
                    style={{ flex: 1, minHeight: '48px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                  <select
                    className="form-input"
                    value={formData.delayUnit}
                    onChange={(e) => setFormData({ ...formData, delayUnit: e.target.value })}
                    style={{ flex: 1, minHeight: '48px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 2, minWidth: '250px' }}>
                <label className="form-label">Then Send Template</label>
                <Select
                  options={templates.map(t => ({ value: t.name, label: t.name }))}
                  value={formData.templateName ? { value: formData.templateName, label: formData.templateName } : null}
                  onChange={(option) => setFormData({ ...formData, templateName: option ? option.value : '' })}
                  placeholder="Select a WhatsApp Template..."
                  isClearable
                  isSearchable
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '48px',
                      borderRadius: '8px',
                      borderColor: '#cbd5e1',
                      boxShadow: 'none',
                      '&:hover': {
                        borderColor: '#94a3b8'
                      }
                    })
                  }}
                />
              </div>

              <div className="form-group" style={{ minWidth: '180px' }}>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isSubmitting || !formData.templateName}
                  style={{ width: '100%', height: '48px', justifyContent: 'center', backgroundColor: '#1877f2', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: (isSubmitting || !formData.templateName) ? 'not-allowed' : 'pointer' }}
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
          </div>
        </form>
      </div>

      {rules.length > 0 && (
        <div className="settings-content" style={{ maxWidth: '480px', margin: 0 }}>
          <div className="preference-header" style={{ marginBottom: '12px', textAlign: 'left' }}>
            <h2 style={{ fontSize: '15px', margin: 0 }}>Automation Sequence</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
            {[...rules].sort((a, b) => a.delayMinutes - b.delayMinutes).map((rule, index, arr) => (
              <React.Fragment key={rule.id}>
                <div style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: rule.isActive ? '1.5px solid #25d366' : '1px solid #e2e8f0',
                  background: rule.isActive ? '#f0fdf4' : '#fafafa',
                  opacity: rule.isActive ? 1 : 0.6,
                  boxSizing: 'border-box',
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                    background: rule.isActive ? '#dcfce7' : '#f1f5f9',
                    color: rule.isActive ? '#16a34a' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 'bold'
                  }}>{index + 1}</div>

                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#1c1e21' }}>{rule.templateName}</span>
                      {rule.campaignName && (
                        <span style={{ marginLeft: '10px', fontSize: '11px', backgroundColor: '#e7f3ff', color: '#1877f2', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          {rule.campaignName}
                        </span>
                      )}
                      {!rule.campaignName && (
                        <span style={{ marginLeft: '10px', fontSize: '11px', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          All Campaigns
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '12px', color: '#65676b', display: 'flex', alignItems: 'center' }}>
                      <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      Wait {rule.delayValue || rule.delayMinutes} {rule.delayUnit || 'minutes'} before sending
                      {!rule.isActive && <span style={{ color: '#ef4444', marginLeft: '6px', fontWeight: 600 }}>• Paused</span>}
                    </span>
                  </div>

                  <label className="toggle-switch" style={{ flexShrink: 0 }} title={rule.isActive ? 'Pause' : 'Resume'}>
                    <input type="checkbox" checked={rule.isActive} onChange={() => toggleStatus(rule)} />
                    <span className="toggle-slider"></span>
                  </label>

                  <button className="btn-danger" onClick={() => handleDelete(rule.id)}
                    style={{ padding: '5px 8px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {index < arr.length - 1 && (
                  <div style={{ height: '16px', width: '2px', background: '#cbd5e1', margin: '0 0 0 22px' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaLeadsAutomation;
