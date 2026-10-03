import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Trash2, Clock, Play, Target, MessageSquare, AlertTriangle, HelpCircle, CheckCircle, XCircle, Info, Zap, Bot, RefreshCw, Timer, ClipboardList, ShieldAlert } from 'lucide-react';
import '../styles/Settings.css';
import Select from 'react-select';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';

// ── Toast ──────────────────────────────────────────────────────────────────
const Toast = ({ toasts, remove }) => (
  <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8 }}>
    {toasts.map(t => (
      <div key={t.id} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 10, minWidth: 280, maxWidth: 380,
        background: t.type === 'success' ? '#f0fdf4' : t.type === 'error' ? '#fef2f2' : '#eff6ff',
        border: `1px solid ${t.type === 'success' ? '#86efac' : t.type === 'error' ? '#fca5a5' : '#93c5fd'}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        animation: 'slideIn 0.25s ease',
      }}>
        {t.type === 'success' && <CheckCircle size={18} color="#16a34a" />}
        {t.type === 'error' && <XCircle size={18} color="#dc2626" />}
        {t.type === 'info' && <Info size={18} color="#2563eb" />}
        <span style={{ flex: 1, fontSize: 14, color: t.type === 'success' ? '#15803d' : t.type === 'error' ? '#b91c1c' : '#1d4ed8', fontWeight: 500 }}>{t.message}</span>
        <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, lineHeight: 1 }}>✕</button>
      </div>
    ))}
  </div>
);

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

// ── Delay preview helper ───────────────────────────────────────────────────
function delayLabel(value, unit) {
  const v = parseInt(value) || 0;
  if (v === 0) return 'immediately after contact is added';
  return `${v} ${unit} after contact is added`;
}

// ── PipelineProgress ───────────────────────────────────────────────────────
const PipelineProgress = ({ targetType, campaignName, groupId, totalSteps, onProgress }) => {
  const [progress, setProgress] = useState(null);
  const getHeaders = () => ({ 'x-tenant-id': localStorage.getItem('tenantId'), 'Content-Type': 'application/json' });

  useEffect(() => {
    let active = true;
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/meta-leads/automation-progress`, {
          params: { targetType, campaignName: campaignName || '', groupId: groupId || '', totalSteps },
          headers: getHeaders(), withCredentials: true,
        });
        if (active) {
          setProgress(data);
          if (onProgress) onProgress(data);
        }
      } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 5000);
    return () => { active = false; clearInterval(iv); };
  }, [targetType, campaignName, groupId, totalSteps, onProgress]);

  if (!progress || progress.error) return null;

  return (
    <div style={{ marginTop: 12, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#475569', fontWeight: 600 }}>
        <span>Overall Sequence Progress</span>
        <span>{progress.percentage}% ({progress.completed} / {progress.total} Completed)</span>
      </div>
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress.percentage}%`, background: '#25D366', transition: 'width 0.5s ease-in-out' }} />
      </div>
    </div>
  );
};

// ── Live Activity Modal ────────────────────────────────────────────────────
const LiveActivityModal = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => ({ 'x-tenant-id': localStorage.getItem('tenantId'), 'Content-Type': 'application/json' });

  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/meta-leads/automation-logs`, {
          params: { page: 1, limit: 15 },
          headers: getHeaders(),
          withCredentials: true,
        });
        if (active) {
          setLogs(data?.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (active) setLoading(false);
      }
    };
    fetchLogs();
    const iv = setInterval(fetchLogs, 5000);
    return () => { active = false; clearInterval(iv); };
  }, []);

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600, padding: 0, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', maxHeight: '80vh', width: '100%', margin: '0 20px' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>Live Sending Activity</h3>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite', display: 'inline-block' }} /> Auto-updating every 5s
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, color: '#94a3b8', cursor: 'pointer', lineHeight: 1, padding: 0 }}>✕</button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1, background: '#fff' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, color: '#94a3b8' }}>
               <div className="loading-spinner" style={{ borderColor: '#cbd5e1', borderTopColor: '#4f46e5', width: 24, height: 24, marginBottom: 12 }} />
               <div style={{ fontSize: 14 }}>Fetching live logs...</div>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, color: '#94a3b8' }}>
              <Bot size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>No recent sending activity.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logs.map((log) => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: 16, border: '1px solid #f1f5f9', borderRadius: 10, background: '#f8fafc', animation: 'slideIn 0.3s ease' }}>
                   <div style={{ marginTop: 2 }}>
                     {log.status === 'sent' ? <CheckCircle size={20} color="#16a34a" /> : <XCircle size={20} color="#dc2626" />}
                   </div>
                   <div style={{ flex: 1 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                       <span style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{log.metaLead?.name || log.contact?.name || log.metaLead?.phone || log.contact?.phone || 'Unknown Contact'}</span>
                       <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{new Date(log.sentAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                     </div>
                     <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
                       Step {log.stepIndex}: Template <strong>{log.templateName}</strong>
                     </div>
                     {log.status === 'failed' && log.error && (
                       <div style={{ fontSize: 12, color: '#b91c1c', background: '#fef2f2', padding: '8px 10px', borderRadius: 8, border: '1px solid #fecaca', marginTop: 8, wordBreak: 'break-word', lineHeight: 1.5 }}>
                         {log.error}
                       </div>
                     )}
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
const MetaLeadsAutomation = () => {
  const { toasts, add: toast, remove: removeToast } = useToast();

  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [contactGroups, setContactGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [newRuleId, setNewRuleId] = useState(null); // for highlight animation
  const [newRuleGroupKey, setNewRuleGroupKey] = useState(null); // hide progress for new sequence
  const [groupProgressMap, setGroupProgressMap] = useState({}); // track step completions

  const [formData, setFormData] = useState({
    targetType: 'all', campaignNames: [], groupIds: [],
    templateName: '', delayValue: 5, delayUnit: 'minutes', isActive: true,
  });

  const getHeaders = () => ({
    'x-tenant-id': localStorage.getItem('tenantId'),
    'Content-Type': 'application/json',
  });

  useEffect(() => {
    fetchRules();
    fetchTemplates();
    fetchCampaigns();
    fetchContactGroups();
  }, []);

  const fetchRules = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/meta-leads/automation-rules`, { headers: getHeaders(), withCredentials: true });
      setRules(data || []);
    } catch { toast('Failed to load automation rules', 'error'); }
    finally { setLoading(false); }
  };

  const fetchTemplates = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/settings/all`, { headers: getHeaders(), withCredentials: true });
      // Map configured settings to template objects and remove duplicates
      const uniqueTemplates = [...new Set((data || []).map(s => s.templateName).filter(Boolean))];
      setTemplates(uniqueTemplates.map(name => ({ name })));
    } catch {}
  };

  const fetchCampaigns = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/meta-leads`, { params: { page: 1, limit: 1000 }, headers: getHeaders(), withCredentials: true });
      setCampaigns([...new Set(data.data?.map(l => l.campaignName).filter(Boolean))]);
    } catch {}
  };

  const fetchContactGroups = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/group`, { headers: getHeaders(), withCredentials: true });
      setContactGroups(data || []);
    } catch {}
  };

  const formValid =
    formData.templateName &&
    parseInt(formData.delayValue) >= 0 &&
    (formData.targetType !== 'meta_campaign' || formData.campaignNames.length > 0) &&
    (formData.targetType !== 'contact_group' || formData.groupIds.length > 0);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formValid) return;
    setIsSubmitting(true);
    try {
      const payloads = [];
      const basePayload = {
        templateName: formData.templateName,
        delayValue: parseInt(formData.delayValue, 10),
        delayUnit: formData.delayUnit,
        isActive: true,
      };

      if (formData.targetType === 'all') {
        payloads.push({ ...basePayload, targetType: 'all', campaignName: null, groupId: null });
      } else if (formData.targetType === 'meta_campaign') {
        for (const name of formData.campaignNames) {
          payloads.push({ ...basePayload, targetType: 'meta_campaign', campaignName: name, groupId: null });
        }
      } else if (formData.targetType === 'contact_group') {
        for (const id of formData.groupIds) {
          payloads.push({ ...basePayload, targetType: 'contact_group', campaignName: null, groupId: parseInt(id, 10) });
        }
      }

      let lastId = null;
      let lastGroupKey = null;
      for (const payload of payloads) {
        const { data } = await axios.post(`${API_BASE_URL}/meta-leads/automation-rules`, payload, { headers: getHeaders(), withCredentials: true });
        if (data && !data.error) {
          lastId = data.id;
          lastGroupKey = `${payload.targetType}_${payload.campaignName}_${payload.groupId}`;
        } else {
          toast(data.message || 'Failed to save rule', 'error');
        }
      }
      
      if (lastId) {
        toast(`Successfully created ${payloads.length} automation rule(s)!`, 'success');
        setNewRuleId(lastId);
        setTimeout(() => setNewRuleId(null), 2500);
        setNewRuleGroupKey(lastGroupKey);
        setTimeout(() => setNewRuleGroupKey(null), 30000);
        setFormData(f => ({ ...f, templateName: '', delayValue: 5, delayUnit: 'minutes' }));
        fetchRules();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save automation rule(s)', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deletingRuleId) return;
    try {
      await axios.delete(`${API_BASE_URL}/meta-leads/automation-rules/${deletingRuleId}`, { headers: getHeaders(), withCredentials: true });
      toast('Rule deleted', 'info');
      fetchRules();
    } catch {
      toast('Failed to delete rule', 'error');
    } finally {
      setDeletingRuleId(null);
    }
  };

  // ── Toggle single rule ──────────────────────────────────────────────────
  const toggleStatus = async (rule) => {
    try {
      await axios.post(`${API_BASE_URL}/meta-leads/automation-rules`, { ...rule, isActive: !rule.isActive }, { headers: getHeaders(), withCredentials: true });
      fetchRules();
    } catch {
      toast('Failed to update status', 'error');
    }
  };

  // ── Toggle whole sequence ───────────────────────────────────────────────
  const toggleSequence = async (targetType, campaignName, groupId, isActive) => {
    try {
      await axios.patch(`${API_BASE_URL}/meta-leads/automation-toggle`, { targetType, campaignName, groupId, isActive }, { headers: getHeaders(), withCredentials: true });
      toast(isActive ? 'Sequence resumed' : 'Sequence paused', 'info');
      fetchRules();
    } catch {
      toast('Failed to update sequence', 'error');
    }
  };

  // ── Group helpers ───────────────────────────────────────────────────────
  const getTargetLabel = (rule) => {
    if (rule.targetType === 'meta_campaign') return `Meta Campaign: ${rule.campaignName}`;
    if (rule.targetType === 'contact_group') {
      const g = contactGroups.find(g => g.id === rule.groupId);
      return `Contact Group: ${g ? g.name : rule.groupId}`;
    }
    return 'Global (All New Records)';
  };

  const getTargetColor = (rule) => {
    if (rule.targetType === 'meta_campaign') return { bg: '#e7f3ff', color: '#1877f2' };
    if (rule.targetType === 'contact_group') return { bg: '#f0fdf4', color: '#16a34a' };
    return { bg: '#f3f4f6', color: '#4b5563' };
  };

  // ── Group rules by sequence ─────────────────────────────────────────────
  const groupedSequences = Object.values(
    rules.reduce((acc, rule) => {
      const key = `${rule.targetType}_${rule.campaignName}_${rule.groupId}`;
      if (!acc[key]) acc[key] = {
        label: getTargetLabel(rule), color: getTargetColor(rule),
        targetType: rule.targetType, campaignName: rule.campaignName,
        groupId: rule.groupId, rules: [],
      };
      acc[key].rules.push(rule);
      return acc;
    }, {})
  ).map(g => ({ ...g, rules: [...g.rules].sort((a, b) => (a.delayMinutes || 0) - (b.delayMinutes || 0)) }));

  if (loading) return (
    <div className="settings-container">
      <div className="loading"><div className="loading-spinner" /><span style={{ marginLeft: 12 }}>Loading automations...</span></div>
    </div>
  );

  return (
    <div className="settings-container">
      <Toast toasts={toasts} remove={removeToast} />

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>Campaign Automation</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Automatically send WhatsApp sequences to leads or contacts after a set delay.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={async () => {
              if (!window.confirm('🚨 DANGER: This will completely WIPE all automation sequences, delete all logs, and reset every single contact back to Step 1. Are you absolutely sure?')) return;
              try {
                const { data } = await axios.get(`${API_BASE_URL}/meta-leads/automation-reset-all`, { headers: getHeaders(), withCredentials: true });
                if (data.ok) {
                  toast(data.message || 'Successfully wiped all automations', 'success');
                  fetchRules();
                } else {
                  toast(data.error || 'Failed to wipe automations', 'error');
                }
              } catch (err) {
                toast('Failed to wipe automations', 'error');
              }
            }}
            style={{ padding: '9px 16px', background: '#fff', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, transition: 'all 0.2s ease' }}
            onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#f87171'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#fecaca'; }}
          >
            <ShieldAlert size={16} /> Wipe All Data
          </button>
          <button
            onClick={() => setShowActivityModal(true)}
            style={{ padding: '9px 16px', background: '#4f46e5', border: '1px solid #4338ca', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 14, boxShadow: '0 2px 4px rgba(79,70,229,0.2)' }}
          >
            <Zap size={16} color="#fff" /> Live Activity
          </button>
          <button
            onClick={() => setShowHelpModal(true)}
            style={{ padding: '9px 16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, color: '#334155', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 14 }}
          >
            <HelpCircle size={16} color="#64748b" /> How it works
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── Left: Create Form ── */}
        <div style={{ flex: 1, minWidth: 340, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ marginBottom: 22, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px 0', color: '#0f172a' }}>New Automation Step</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Configure a message step for your WhatsApp sequence.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Step 1 */}
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 2 }}>1</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Target size={14} /> Choose Target Audience
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <select
                    className="form-input"
                    value={formData.targetType}
                    onChange={e => setFormData(f => ({ ...f, targetType: e.target.value, campaignNames: [], groupIds: [] }))}
                    style={{ minHeight: 42, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  >
                    <option value="all">Global (All New Records)</option>
                    <option value="meta_campaign">Meta Lead Campaign</option>
                    <option value="contact_group">Contact Group</option>
                  </select>

                  {formData.targetType === 'meta_campaign' && (
                    <div className="form-input" style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto', padding: 8, borderColor: formData.campaignNames.length === 0 ? '#f97316' : '#e5e7eb' }}>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, padding: '4px 8px' }}>Select campaigns (multiple allowed):</div>
                      {campaigns.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px' }}>No campaigns found</div>}
                      {campaigns.map(c => {
                        const isSelected = formData.campaignNames?.includes(c);
                        return (
                          <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer', padding: '8px 12px', background: isSelected ? '#f0fdf4' : 'transparent', border: isSelected ? '1px solid #25d366' : '1px solid transparent', borderRadius: 6, transition: 'all 0.2s ease' }}>
                            <input type="checkbox" checked={isSelected} onChange={e => {
                              if (e.target.checked) setFormData(f => ({ ...f, campaignNames: [...(f.campaignNames || []), c] }));
                              else setFormData(f => ({ ...f, campaignNames: (f.campaignNames || []).filter(name => name !== c) }));
                            }} style={{ width: 16, height: 16, accentColor: '#25d366', cursor: 'pointer' }} />
                            <span style={{ fontWeight: isSelected ? 600 : 400, color: '#374151' }}>{c}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {formData.targetType === 'contact_group' && (
                    <div className="form-input" style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto', padding: 8, borderColor: formData.groupIds.length === 0 ? '#f97316' : '#e5e7eb' }}>
                      <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, padding: '4px 8px' }}>Select groups (multiple allowed):</div>
                      {contactGroups.length === 0 && <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px' }}>No groups found</div>}
                      {contactGroups.map(g => {
                        const isSelected = formData.groupIds?.includes(g.id);
                        return (
                          <label key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, cursor: 'pointer', padding: '8px 12px', background: isSelected ? '#f0fdf4' : 'transparent', border: isSelected ? '1px solid #25d366' : '1px solid transparent', borderRadius: 6, transition: 'all 0.2s ease' }}>
                            <input type="checkbox" checked={isSelected} onChange={e => {
                              if (e.target.checked) setFormData(f => ({ ...f, groupIds: [...(f.groupIds || []), g.id] }));
                              else setFormData(f => ({ ...f, groupIds: (f.groupIds || []).filter(id => id !== g.id) }));
                            }} style={{ width: 16, height: 16, accentColor: '#25d366', cursor: 'pointer' }} />
                            <span style={{ fontWeight: isSelected ? 600 : 400, color: '#374151' }}>{g.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 2 }}>2</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} /> Set Wait Time
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="number" min="0"
                    className="form-input"
                    value={formData.delayValue}
                    onChange={e => setFormData(f => ({ ...f, delayValue: e.target.value }))}
                    style={{ width: 90, minHeight: 42, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                    required
                  />
                  <select
                    className="form-input"
                    value={formData.delayUnit}
                    onChange={e => setFormData(f => ({ ...f, delayUnit: e.target.value }))}
                    style={{ flex: 1, minHeight: 42, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
                {/* Live preview */}
                <div style={{ marginTop: 7, fontSize: 12, color: '#6366f1', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Zap size={12} />
                  Sends {delayLabel(formData.delayValue, formData.delayUnit)}
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 2 }}>3</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MessageSquare size={14} /> Select Message Template
                </div>
                <Select
                  options={templates.map(t => ({ value: t.name, label: t.name }))}
                  value={formData.templateName ? { value: formData.templateName, label: formData.templateName } : null}
                  onChange={opt => setFormData(f => ({ ...f, templateName: opt ? opt.value : '' }))}
                  placeholder="Search templates..."
                  isClearable isSearchable
                  styles={{
                    control: (base, state) => ({
                      ...base, minHeight: 42, borderRadius: 8,
                      borderColor: state.isFocused ? '#6366f1' : '#cbd5e1',
                      boxShadow: state.isFocused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
                      '&:hover': { borderColor: '#94a3b8' },
                    }),
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !formValid}
              style={{
                width: '100%', height: 44, borderRadius: 8, border: 'none',
                background: formValid ? '#25D366' : '#e2e8f0',
                color: formValid ? '#fff' : '#94a3b8',
                fontWeight: 700, fontSize: 15, cursor: formValid ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.2s',
              }}
            >
              {isSubmitting ? (
                <><div className="loading-spinner" style={{ borderTopColor: '#fff' }} /> Saving...</>
              ) : (
                <><Play size={16} /> Start Automation</>
              )}
            </button>

            {!formValid && formData.templateName === '' && (
              <p style={{ margin: '-12px 0 0 0', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                Fill in all steps above to save
              </p>
            )}
          </form>
        </div>

        {/* ── Right: Active Sequences ── */}
        <div style={{ flex: 1, minWidth: 340 }}>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 2px 0', color: '#0f172a' }}>Active Sequences</h2>
            </div>
            {rules.length > 0 && (
              <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                {rules.length} step{rules.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Empty state */}
          {groupedSequences.length === 0 ? (
            <div style={{ background: '#fff', border: '2px dashed #e2e8f0', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}><Bot size={40} color="#94a3b8" /></div>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: 6 }}>No automations yet</div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Create your first rule on the left to start sending automated WhatsApp messages.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {groupedSequences.map((group, idx) => (
                <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

                  {/* Sequence header */}
                  <div style={{ padding: '11px 16px', background: group.color.bg, color: group.color.color, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Target size={13} />
                      {group.label}
                      <span style={{ background: 'rgba(0,0,0,0.08)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                        {group.rules.length} step{group.rules.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {group.targetType === 'contact_group' && (
                        <button
                          onClick={async () => {
                            if (!window.confirm('This will restart the entire sequence from Step 1 for ALL contacts in this group. Are you sure?')) return;
                            try {
                              const { data } = await axios.get(`${API_BASE_URL}/meta-leads/automation-reset-group?groupId=${group.groupId}`, { headers: getHeaders(), withCredentials: true });
                              if (data.ok) toast(`Successfully reset ${data.contactsReset} contacts. They will start receiving messages again in 1 minute.`, 'success');
                              else toast(data.error || 'Failed to reset sequence', 'error');
                              // Force re-fetch of progress by slightly changing key or just relying on polling
                            } catch (err) {
                              toast('Failed to reset sequence', 'error');
                            }
                          }}
                          style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                          title="Restart this sequence from Step 1 for all contacts in the group"
                        >
                          <RefreshCw size={11} /> Restart
                        </button>
                      )}
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {group.rules.every(r => r.isActive) ? '● RUNNING' : '⏸ PAUSED'}
                      </span>
                      <label className="toggle-switch" title={group.rules.every(r => r.isActive) ? 'Pause sequence' : 'Resume sequence'}>
                        <input type="checkbox" checked={group.rules.every(r => r.isActive)} onChange={e => toggleSequence(group.targetType, group.campaignName, group.groupId, e.target.checked)} />
                        <span className="toggle-slider" />
                      </label>
                    </div>
                  </div>

                  {/* Steps */}
                  <div style={{ padding: '12px 16px' }}>
                    {newRuleGroupKey !== `${group.targetType}_${group.campaignName}_${group.groupId}` && (
                      <PipelineProgress 
                        targetType={group.targetType} campaignName={group.campaignName} groupId={group.groupId} totalSteps={group.rules.length} 
                        onProgress={data => setGroupProgressMap(p => ({ ...p, [`${group.targetType}_${group.campaignName}_${group.groupId}`]: data }))} 
                      />
                    )}
                    <div style={{ height: 12 }} />

                    {group.rules.map((rule, i) => {
                      const groupKey = `${group.targetType}_${group.campaignName}_${group.groupId}`;
                      const gProgress = groupProgressMap[groupKey];
                      const stepIndex = i + 1;
                      const totalCount = gProgress?.total || 0;
                      const completedCount = Math.min(gProgress?.stepCounts?.[stepIndex] || 0, totalCount);
                      const isComplete = totalCount > 0 && completedCount >= totalCount;

                      return (
                      <div key={rule.id} style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
                        {/* Timeline dot */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: isComplete ? '#22c55e' : rule.isActive ? '#3b82f6' : '#cbd5e1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {isComplete ? <CheckCircle size={12} /> : i + 1}
                          </div>
                          {i < group.rules.length - 1 && <div style={{ width: 2, flex: 1, background: '#e2e8f0', margin: '2px 0' }} />}
                        </div>

                        {/* Step card */}
                        <div style={{
                          flex: 1, border: `1px solid ${rule.id === newRuleId ? '#25D366' : isComplete ? '#bbf7d0' : '#e2e8f0'}`,
                          borderRadius: 8, padding: '9px 12px',
                          background: rule.id === newRuleId ? '#f0fdf4' : isComplete ? '#f0fdf4' : rule.isActive ? '#fff' : '#f8fafc',
                          opacity: rule.isActive ? 1 : 0.6,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          marginBottom: i < group.rules.length - 1 ? 8 : 0,
                          transition: 'border-color 0.4s, background 0.4s',
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {rule.templateName}
                              {totalCount > 0 && (
                                <span style={{ fontSize: 11, color: isComplete ? '#16a34a' : '#64748b', fontWeight: 500, background: isComplete ? '#dcfce7' : '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                                  {completedCount}/{totalCount}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Clock size={11} />
                              Sends {delayLabel(rule.delayValue || rule.delayMinutes, rule.delayUnit || 'minutes')}
                              {!rule.isActive && <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: 4 }}>• Paused</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <label className="toggle-switch" title={rule.isActive ? 'Pause this step' : 'Resume this step'} style={{ transform: 'scale(0.8)' }}>
                              <input type="checkbox" checked={rule.isActive} onChange={() => toggleStatus(rule)} />
                              <span className="toggle-slider" />
                            </label>
                            <div style={{ width: 1, height: 18, background: '#e2e8f0' }} />
                            <button
                              onClick={() => setDeletingRuleId(rule.id)}
                              title="Delete step"
                              style={{ padding: 5, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                              onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirm Modal ── */}
      {deletingRuleId && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ maxWidth: 380, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <AlertTriangle size={28} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>Remove this step?</h3>
              <p style={{ color: '#64748b', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                This message step will be permanently removed from the sequence. Contacts who already received this step are not affected.
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '14px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => setDeletingRuleId(null)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Keep Step</button>
              <button onClick={confirmDelete} style={{ padding: '9px 16px', borderRadius: 8, background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Yes, Remove Step</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Help Modal ── */}
      {showHelpModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }} onClick={() => setShowHelpModal(false)}>
          <div className="modal-content" style={{ maxWidth: 480, padding: 28 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HelpCircle size={22} />
                </div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>How Automations Work</h3>
              </div>
              <button onClick={() => setShowHelpModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14, color: '#475569', lineHeight: 1.7 }}>
              {[
                [<RefreshCw size={14} />, 'Background Execution', 'Automations run every minute in the background. You do not need to keep this page open.'],
                [<Timer size={14} />, 'Relative Wait Times', 'Each step\'s wait time is counted from when the previous step was sent — not from when the contact was created. If Step 1 is "5 min" and Step 2 is "5 min", the second message sends 5 minutes after Step 1 is delivered.'],
                [<ClipboardList size={14} />, 'Viewing Logs', 'Check the Run Automation Logs page to see delivery status, failures, and which contacts received each step.'],
                [<ShieldAlert size={14} />, 'Failed Sends', 'If a message fails to send (e.g. invalid number or template error), the contact stays at that step and the system retries automatically on the next cron tick.'],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>{icon}{title}</div>
                  <div>{desc}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowHelpModal(false)} style={{ width: '100%', padding: 12, marginTop: 20, borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* ── Live Activity Modal ── */}
      {showActivityModal && (
        <LiveActivityModal onClose={() => setShowActivityModal(false)} />
      )}

      <style>{`@keyframes slideIn { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
};

export default MetaLeadsAutomation;
