import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Clock, Play, ArrowRight, Target, MessageSquare } from 'lucide-react';
import '../styles/Settings.css';
import Select from 'react-select';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';

const MetaLeadsAutomation = () => {
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [contactGroups, setContactGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ 
    targetType: 'all',
    campaignName: '',
    groupId: '',
    templateName: '', 
    delayValue: 5, 
    delayUnit: 'minutes', 
    isActive: true 
  });

  useEffect(() => {
    fetchRules();
    fetchTemplates();
    fetchCampaigns();
    fetchContactGroups();
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

  const fetchContactGroups = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/group`, {
        headers: getHeaders(),
        withCredentials: true,
      });
      setContactGroups(response.data || []);
    } catch (error) {
      console.error('Failed to fetch contact groups:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.templateName) {
      alert('Please select a template');
      return;
    }
    if (formData.targetType === 'meta_campaign' && !formData.campaignName) {
      alert('Please select a Meta Campaign');
      return;
    }
    if (formData.targetType === 'contact_group' && !formData.groupId) {
      alert('Please select a Contact Group');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = {
        targetType: formData.targetType,
        campaignName: formData.targetType === 'meta_campaign' ? formData.campaignName : null,
        groupId: formData.targetType === 'contact_group' ? parseInt(formData.groupId, 10) : null,
        templateName: formData.templateName,
        delayValue: parseInt(formData.delayValue, 10),
        delayUnit: formData.delayUnit,
        isActive: formData.isActive
      };
      const response = await axios.post(`${API_BASE_URL}/meta-leads/automation-rules`, payload, {
        headers: getHeaders(),
        withCredentials: true,
      });

      if (response.data && !response.data.error) {
        fetchRules();
        setFormData({ ...formData, templateName: '', delayValue: 5, delayUnit: 'minutes', isActive: true });
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

  const getTargetLabel = (rule) => {
    if (rule.targetType === 'meta_campaign') return `Meta Campaign: ${rule.campaignName}`;
    if (rule.targetType === 'contact_group') {
      const group = contactGroups.find(g => g.id === rule.groupId);
      return `Contact Group: ${group ? group.name : rule.groupId}`;
    }
    return 'All Targets (Global)';
  };

  const getTargetColor = (rule) => {
    if (rule.targetType === 'meta_campaign') return { bg: '#e7f3ff', color: '#1877f2' };
    if (rule.targetType === 'contact_group') return { bg: '#fdf4ff', color: '#c026d3' };
    return { bg: '#f3f4f6', color: '#4b5563' };
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
            <h1>Campaign Automation</h1>
            <p>Automatically send WhatsApp sequences to leads or contacts after a set delay.</p>
          </div>
        </div>
      </div>

      <div className="preference-card" style={{ marginBottom: '40px', padding: '32px', maxWidth: '800px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
        <div className="preference-header" style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Create Automation Rule</h2>
          <p style={{ color: '#64748b' }}>Configure your automated WhatsApp engagement sequence.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="settings-form" style={{ padding: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Step 1: Target */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>1</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Target size={16} /> Choose Target Audience
                </h3>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
                    <select
                      className="form-input"
                      value={formData.targetType}
                      onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                      style={{ width: '100%', minHeight: '44px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                    >
                      <option value="all">Global (All New Records)</option>
                      <option value="meta_campaign">Meta Lead Campaign</option>
                      <option value="contact_group">Contact Group</option>
                    </select>
                  </div>

                  {formData.targetType === 'meta_campaign' && (
                    <div className="form-group" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
                      <select
                        className="form-input"
                        value={formData.campaignName}
                        onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                        style={{ width: '100%', minHeight: '44px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                        required
                      >
                        <option value="">Select a Campaign...</option>
                        {campaigns.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.targetType === 'contact_group' && (
                    <div className="form-group" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
                      <select
                        className="form-input"
                        value={formData.groupId}
                        onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                        style={{ width: '100%', minHeight: '44px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                        required
                      >
                        <option value="">Select a Group...</option>
                        {contactGroups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Delay */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>2</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> Set Wait Time
                </h3>
                <div style={{ display: 'flex', gap: '12px', maxWidth: '300px' }}>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={formData.delayValue}
                    onChange={(e) => setFormData({ ...formData, delayValue: e.target.value })}
                    placeholder="e.g., 5"
                    required
                    style={{ flex: 1, minHeight: '44px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                  <select
                    className="form-input"
                    value={formData.delayUnit}
                    onChange={(e) => setFormData({ ...formData, delayUnit: e.target.value })}
                    style={{ flex: 2, minHeight: '44px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 3: Message */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>3</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={16} /> Select Message Template
                </h3>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 2, minWidth: '250px' }}>
                    <Select
                      options={templates.map(t => ({ value: t.name, label: t.name }))}
                      value={formData.templateName ? { value: formData.templateName, label: formData.templateName } : null}
                      onChange={(option) => setFormData({ ...formData, templateName: option ? option.value : '' })}
                      placeholder="Search templates..."
                      isClearable
                      isSearchable
                      styles={{
                        control: (base) => ({
                          ...base,
                          minHeight: '44px',
                          borderRadius: '8px',
                          borderColor: '#cbd5e1',
                          boxShadow: 'none',
                          '&:hover': { borderColor: '#94a3b8' }
                        })
                      }}
                    />
                  </div>
                  <div style={{ minWidth: '160px' }}>
                    <button 
                      type="submit" 
                      className="btn-primary" 
                      disabled={isSubmitting || !formData.templateName}
                      style={{ 
                        width: '100%', height: '44px', justifyContent: 'center', 
                        backgroundColor: '#4f46e5', color: 'white', 
                        borderRadius: '8px', border: 'none', fontWeight: 600, 
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        cursor: (isSubmitting || !formData.templateName) ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {isSubmitting ? 'Saving...' : (
                        <>
                          <Play size={16} />
                          Activate Rule
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>
      </div>

      {rules.length > 0 && (
        <div className="settings-content" style={{ maxWidth: '800px', margin: 0 }}>
          <div className="preference-header" style={{ marginBottom: '16px', textAlign: 'left' }}>
            <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 600 }}>Active Sequences</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {[...rules].sort((a, b) => {
              // Group by targetType then targetId, then sort by delay
              const targetA = `${a.targetType}_${a.campaignName}_${a.groupId}`;
              const targetB = `${b.targetType}_${b.campaignName}_${b.groupId}`;
              if (targetA !== targetB) return targetA.localeCompare(targetB);
              return a.delayMinutes - b.delayMinutes;
            }).map((rule) => {
              const targetColor = getTargetColor(rule);
              return (
                <div key={rule.id} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px',
                  border: rule.isActive ? '1px solid #e2e8f0' : '1px solid #e2e8f0',
                  background: rule.isActive ? '#ffffff' : '#f8fafc',
                  opacity: rule.isActive ? 1 : 0.6, boxSizing: 'border-box',
                  boxShadow: rule.isActive ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' : 'none'
                }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>{rule.templateName}</span>
                      <span style={{ fontSize: '12px', backgroundColor: targetColor.bg, color: targetColor.color, padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        {getTargetLabel(rule)}
                      </span>
                    </div>
                    <span style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                      <Clock size={14} style={{ display: 'inline', marginRight: '6px' }} />
                      Wait {rule.delayValue || rule.delayMinutes} {rule.delayUnit || 'minutes'} before sending
                      {!rule.isActive && <span style={{ color: '#ef4444', marginLeft: '8px', fontWeight: 600 }}>• Paused</span>}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                    <label className="toggle-switch" title={rule.isActive ? 'Pause' : 'Resume'}>
                      <input type="checkbox" checked={rule.isActive} onChange={() => toggleStatus(rule)} />
                      <span className="toggle-slider"></span>
                    </label>
                    <div style={{ width: '1px', height: '24px', background: '#e2e8f0' }} />
                    <button onClick={() => handleDelete(rule.id)} style={{ padding: '8px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', borderRadius: '6px' }} onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaLeadsAutomation;
