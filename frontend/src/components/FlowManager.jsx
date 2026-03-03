import React, { useState, useEffect } from 'react';
import { Send, Plus, X, Zap, Edit, Trash2, BarChart3 } from 'lucide-react';
import flowAPI from '../api/flow';
import flowTriggerAPI from '../api/flowTrigger';
import '../styles/FlowManager.css';

const FlowManager = () => {
  const [flows, setFlows] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    triggerWord: '',
    flowId: '',
    headerText: '',
    bodyText: '',
    footerText: '',
    ctaText: '',
    isActive: true,
  });

  useEffect(() => {
    loadFlows();
    loadTriggers();
  }, []);

  const loadFlows = async () => {
    try {
      const flowsData = await flowAPI.getFlows();
      setFlows(flowsData);
    } catch (error) {
      console.error('Error loading flows:', error);
    }
  };

  const loadTriggers = async () => {
    try {
      const triggersData = await flowTriggerAPI.getTriggers();
      setTriggers(triggersData);
    } catch (error) {
      console.error('Error loading triggers:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      triggerWord: '',
      flowId: '',
      headerText: '',
      bodyText: '',
      footerText: '',
      ctaText: '',
      isActive: true,
    });
    setEditingTrigger(null);
    setShowModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTrigger) {
        await flowTriggerAPI.updateTrigger(editingTrigger.id, formData);
      } else {
        await flowTriggerAPI.createTrigger(formData);
      }
      await loadTriggers();
      resetForm();
    } catch (error) {
      console.error('Error saving trigger:', error);
      alert('Failed to save trigger');
    }
  };

  const handleEdit = (trigger) => {
    setFormData({
      name: trigger.name,
      triggerWord: trigger.triggerWord,
      flowId: trigger.flowId,
      headerText: trigger.headerText || '',
      bodyText: trigger.bodyText || '',
      footerText: trigger.footerText || '',
      ctaText: trigger.ctaText,
      isActive: trigger.isActive,
    });
    setEditingTrigger(trigger);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this trigger?')) return;
    try {
      await flowTriggerAPI.deleteTrigger(id);
      await loadTriggers();
    } catch (error) {
      console.error('Error deleting trigger:', error);
    }
  };

  return (
    <div className="flow-manager">
      <div className="page-header">
        <div className="page-title">
          <h1>Flow Manager</h1>
          <p className="page-subtitle">Create trigger-based flows that automatically respond to keywords</p>
        </div>
        <button className="add-trigger-btn" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          <span>Create Trigger</span>
        </button>
      </div>

      <div className="triggers-grid">
        {triggers.map((trigger) => (
          <div key={trigger.id} className="trigger-card">
            <div className="trigger-header">
              <div className="trigger-info">
                <h3>{trigger.name}</h3>
                <div className="trigger-word">
                  <Zap size={14} />
                  <span>{trigger.triggerWord}</span>
                </div>
              </div>
              <div className="trigger-status">
                <span className={`status-badge ${trigger.isActive ? 'active' : 'inactive'}`}>
                  {trigger.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="trigger-content">
              <div className="trigger-detail">
                <strong>Flow:</strong> {flows.find(f => f.id === trigger.flowId)?.name || trigger.flowId}
              </div>
              <div className="trigger-detail">
                <strong>Button:</strong> {trigger.ctaText}
              </div>
              {trigger.bodyText && (
                <div className="trigger-detail">
                  <strong>Message:</strong> {trigger.bodyText.substring(0, 50)}{trigger.bodyText.length > 50 ? '...' : ''}
                </div>
              )}
            </div>

            <div className="trigger-actions">
              <button className="btn-icon" onClick={() => handleEdit(trigger)}>
                <Edit size={16} />
              </button>
              <button className="btn-icon btn-danger" onClick={() => handleDelete(trigger.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {triggers.length === 0 && (
          <div className="empty-state">
            <Zap size={48} />
            <h3>No triggers yet</h3>
            <p>Create your first trigger to automatically send flows when users send specific keywords</p>
            <button className="add-trigger-btn" onClick={() => setShowModal(true)}>
              <Plus size={18} />
              <span>Create First Trigger</span>
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTrigger ? 'Edit Trigger' : 'Create New Trigger'}</h2>
              <button className="close-btn" onClick={resetForm}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="trigger-form">
              <div className="form-group">
                <label className="form-label">
                  Trigger Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Appointment Booking"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Trigger Word <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.triggerWord}
                  onChange={(e) => setFormData({ ...formData, triggerWord: e.target.value })}
                  placeholder="e.g., book, appointment, help"
                  required
                />
                <span className="form-hint">When user sends this word, the flow will be triggered</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Flow <span className="required">*</span>
                </label>
                <select
                  className="form-input"
                  value={formData.flowId}
                  onChange={(e) => {
                    const selectedFlow = flows.find(f => f.id === e.target.value);
                    setFormData({ 
                      ...formData, 
                      flowId: e.target.value,
                      screenName: selectedFlow?.firstScreen || 'SIGN_IN'
                    });
                  }}
                  required
                >
                  <option value="">Select a flow...</option>
                  {flows.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name} - {flow.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Header Text</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.headerText}
                  onChange={(e) => setFormData({ ...formData, headerText: e.target.value })}
                  maxLength={60}
                  placeholder="Optional header text"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Body Text</label>
                <textarea
                  className="form-textarea"
                  value={formData.bodyText}
                  onChange={(e) => setFormData({ ...formData, bodyText: e.target.value })}
                  rows={3}
                  maxLength={1024}
                  placeholder="Message to show with the flow"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Footer Text</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.footerText}
                  onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                  maxLength={60}
                  placeholder="Optional footer text"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Button Text <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.ctaText}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                  maxLength={20}
                  placeholder="e.g., Start Booking"
                  required
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>Active (trigger will respond to messages)</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTrigger ? 'Update Trigger' : 'Create Trigger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowManager;