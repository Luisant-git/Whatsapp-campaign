import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Clock, Play, ArrowRight, Target, MessageSquare, Zap, AlertTriangle, X } from 'lucide-react';
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
  const [deletingRuleId, setDeletingRuleId] = useState(null);
  
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

  const triggerDelete = (id) => {
    setDeletingRuleId(id);
  };

  const confirmDelete = async () => {
    if (!deletingRuleId) return;
    try {
      await axios.delete(`${API_BASE_URL}/meta-leads/automation-rules/${deletingRuleId}`, {
        headers: getHeaders(),
        withCredentials: true,
      });
      fetchRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      alert('Failed to delete automation rule');
    } finally {
      setDeletingRuleId(null);
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
    if (rule.targetType === 'contact_group') return { bg: 'transparent', color: '#16a34a' };
    return { bg: '#f3f4f6', color: '#4b5563' };
  };

  const toggleSequence = async (targetType, campaignName, groupId, isActive) => {
    try {
      await axios.patch(`${API_BASE_URL}/meta-leads/automation-toggle`, {
        targetType, campaignName, groupId, isActive
      }, { headers: getHeaders(), withCredentials: true });
      fetchRules();
    } catch (error) {
      console.error('Failed to toggle sequence:', error);
      alert('Failed to update sequence status');
    }
  };

  const PipelineProgress = ({ targetType, campaignName, groupId, totalSteps }) => {
    const [progress, setProgress] = useState(null);

    useEffect(() => {
      let active = true;
      const fetchProgress = async () => {
        try {
          const { data } = await axios.get(`${API_BASE_URL}/meta-leads/automation-progress`, {
            params: { targetType, campaignName: campaignName || '', groupId: groupId || '', totalSteps },
            headers: getHeaders(),
            withCredentials: true
          });
          if (active) setProgress(data);
        } catch (err) {
          console.error("Progress fetch error", err);
        }
      };
      fetchProgress();
      const interval = setInterval(fetchProgress, 60000);
      return () => { active = false; clearInterval(interval); };
    }, [targetType, campaignName, groupId, totalSteps]);

    if (!progress) return null;

    return (
      <div style={{ marginTop: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
          <span>Overall Sequence Progress</span>
          <span>{progress.percentage}% ({progress.completed} / {progress.total} Completed)</span>
        </div>
        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress.percentage}%`, background: '#25D366', transition: 'width 0.5s ease-in-out' }} />
        </div>
      </div>
    );
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
      <div className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>Campaign Automation</h1>
            <p style={{ margin: 0, color: '#64748b' }}>Automatically send WhatsApp sequences to leads or contacts after a set delay.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left Column: Form */}
        <div className="preference-card" style={{ flex: 1, minWidth: '400px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', background: '#fff', borderRadius: '16px' }}>
        <div className="preference-header" style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Create Automation Rule</h2>
          <p style={{ color: '#64748b' }}>Configure your automated WhatsApp engagement sequence.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="settings-form" style={{ padding: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            
            {/* Step 1: Target */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>1</div>
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
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>2</div>
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
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>3</div>
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
                          backgroundColor: '#25D366', color: 'white', 
                          borderRadius: '8px', border: 'none', fontWeight: 600, 
                          display: 'flex', alignItems: 'center', gap: '8px', 
                          cursor: (isSubmitting || !formData.templateName) ? 'not-allowed' : 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        {isSubmitting ? 'Saving...' : (
                          <>
                            <Play size={16} />
                            Start Automation
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

        {/* Right Column: Active Sequences Pipeline */}
        {rules.length > 0 && (
          <div className="settings-content" style={{ flex: 1, minWidth: '400px', margin: 0 }}>
            <div className="preference-header" style={{ marginBottom: '24px', textAlign: 'left' }}>
              <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600, color: '#0f172a' }}>Active Sequences</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Your running automation pipelines</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
              {Object.values(rules.reduce((acc, rule) => {
                const key = `${rule.targetType}_${rule.campaignName}_${rule.groupId}`;
                if (!acc[key]) {
                  acc[key] = {
                    label: getTargetLabel(rule),
                    color: getTargetColor(rule),
                    targetType: rule.targetType,
                    campaignName: rule.campaignName,
                    groupId: rule.groupId,
                    rules: []
                  };
                }
                acc[key].rules.push(rule);
                return acc;
              }, {})).map(group => {
                group.rules.sort((a, b) => (a.delayMinutes || 0) - (b.delayMinutes || 0));
                return group;
              }).map((group, idx) => (
                <div key={idx} style={{ 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '12px', 
                  background: '#fff', 
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
                }}>
                  {/* Container Header */}
                  <div style={{ 
                    padding: '12px 16px', 
                    background: group.color.bg, 
                    color: group.color.color, 
                    fontWeight: 600, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                    fontSize: '13px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Target size={14} /> {group.label}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {group.rules.every(r => r.isActive) ? 'RUNNING' : 'PAUSED'}
                      </span>
                      <label className="toggle-switch" title={group.rules.every(r => r.isActive) ? 'Pause Entire Sequence' : 'Play Entire Sequence'}>
                        <input 
                          type="checkbox" 
                          checked={group.rules.every(r => r.isActive)} 
                          onChange={(e) => toggleSequence(group.targetType, group.campaignName, group.groupId, e.target.checked)} 
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Pipeline Steps */}
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                    
                    <PipelineProgress targetType={group.targetType} campaignName={group.campaignName} groupId={group.groupId} totalSteps={group.rules.length} />
                    <div style={{ height: '16px' }} />

                    {group.rules.map((rule, index) => (
                      <div key={rule.id} style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                        
                        {/* Timeline Graphic */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ 
                            width: '22px', height: '22px', borderRadius: '50%', 
                            background: rule.isActive ? '#3b82f6' : '#cbd5e1', 
                            color: '#fff', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', zIndex: 1 
                          }}>
                            {index + 1}
                          </div>
                          {index < group.rules.length - 1 && (
                            <div style={{ width: '2px', flex: 1, background: '#e2e8f0', margin: '2px 0' }} />
                          )}
                        </div>
                        
                        {/* Step Content */}
                        <div style={{ 
                          flex: 1, border: '1px solid #e2e8f0', borderRadius: '6px', 
                          padding: '10px 12px', background: rule.isActive ? '#fff' : '#f8fafc', 
                          opacity: rule.isActive ? 1 : 0.6, display: 'flex', 
                          justifyContent: 'space-between', alignItems: 'center',
                          marginBottom: index < group.rules.length - 1 ? '10px' : '0',
                          transition: 'opacity 0.2s'
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>
                              {rule.templateName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                              <Clock size={12} style={{ marginRight: '4px' }} /> 
                              Wait {rule.delayValue || rule.delayMinutes} {rule.delayUnit || 'minutes'}
                              {!rule.isActive && <span style={{ color: '#ef4444', marginLeft: '6px', fontWeight: 600 }}>• Paused</span>}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label className="toggle-switch" title={rule.isActive ? 'Pause' : 'Resume'} style={{ transform: 'scale(0.8)' }}>
                              <input type="checkbox" checked={rule.isActive} onChange={() => toggleStatus(rule)} />
                              <span className="toggle-slider"></span>
                            </label>
                            <div style={{ width: '1px', height: '20px', background: '#e2e8f0' }} />
                            <button 
                              onClick={() => triggerDelete(rule.id)} 
                              style={{ padding: '6px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '6px' }} 
                              onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'} 
                              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingRuleId && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: '400px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', margin: '0 0 12px 0' }}>
                Delete Automation Rule?
              </h3>
              <p style={{ color: '#64748b', fontSize: '15px', margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to delete this automation? This action cannot be undone and scheduled messages will be stopped.
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px 24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
              <button 
                onClick={() => setDeletingRuleId(null)}
                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                style={{ padding: '10px 16px', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaLeadsAutomation;
