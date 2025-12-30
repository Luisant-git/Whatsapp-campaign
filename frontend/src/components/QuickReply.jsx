import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { API_BASE_URL } from '../api/config';
import { useToast } from '../contexts/ToastContext';

const QuickReply = () => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [quickReplies, setQuickReplies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    trigger: '',
    buttons: [{ title: '', payload: '' }]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchQuickReplies();
  }, []);

  const fetchQuickReplies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/quick-reply`);
      if (response.ok) {
        const data = await response.json();
        setQuickReplies(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch quick replies:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      trigger: '',
      buttons: [{ title: '', payload: '' }]
    });
    setEditingId(null);
    setShowForm(false);
  };

  const addButton = () => {
    setFormData({
      ...formData,
      buttons: [...formData.buttons, { title: '', payload: '' }]
    });
  };

  const removeButton = (index) => {
    const newButtons = formData.buttons.filter((_, i) => i !== index);
    setFormData({ ...formData, buttons: newButtons });
  };

  const updateButton = (index, field, value) => {
    const newButtons = [...formData.buttons];
    newButtons[index][field] = value;
    setFormData({ ...formData, buttons: newButtons });
  };

  const handleSave = async () => {
    if (!formData.trigger.trim() || formData.buttons.some(b => !b.title.trim() || !b.payload.trim())) {
      showError('Please fill all fields');
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `${API_BASE_URL}/quick-reply/${editingId}` : `${API_BASE_URL}/quick-reply`;
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trigger: formData.trigger,
          buttons: formData.buttons,
          isActive: true
        })
      });

      if (response.ok) {
        resetForm();
        fetchQuickReplies();
        showSuccess(editingId ? 'Quick reply updated!' : 'Quick reply created!');
      } else {
        showError('Failed to save quick reply');
      }
    } catch (error) {
      showError('Failed to save quick reply');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (quickReply) => {
    setFormData({
      trigger: quickReply.trigger,
      buttons: quickReply.buttons
    });
    setEditingId(quickReply.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Delete this quick reply?');
    if (confirmed) {
      try {
        const response = await fetch(`${API_BASE_URL}/quick-reply/${id}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchQuickReplies();
          showSuccess('Quick reply deleted!');
        }
      } catch (error) {
        showError('Failed to delete quick reply');
      }
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="auto-reply-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Quick Reply Buttons</h1>
          <span className="page-subtitle">Create interactive button menus for WhatsApp</span>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add Quick Reply
        </button>
      </div>

      <div className="replies-list">
        {quickReplies.length === 0 ? (
          <p className="no-replies">No quick replies configured yet.</p>
        ) : (
          <div className="replies-grid">
            {quickReplies.map((reply) => (
              <div key={reply.id} className="reply-item">
                <div className="reply-content">
                  <div className="trigger-text">
                    <strong>Trigger:</strong> {reply.trigger}
                  </div>
                  <div className="buttons-preview">
                    <strong>Buttons:</strong>
                    <div className="button-list">
                      {reply.buttons.map((btn, i) => (
                        <span key={i} className="button-preview">
                          {btn.title} → {btn.payload}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="reply-actions">
                  <button onClick={() => handleEdit(reply)} className="btn-secondary">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(reply.id)} className="btn-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Quick Reply' : 'Add Quick Reply'}</h2>
              <button onClick={resetForm} className="close-btn">×</button>
            </div>
            
            <div className="settings-form">
              <div className="form-group">
                <label>Trigger Word</label>
                <input
                  type="text"
                  value={formData.trigger}
                  onChange={(e) => setFormData({...formData, trigger: e.target.value})}
                  placeholder="e.g., help, menu"
                />
              </div>

              <div className="form-group">
                <label>Buttons</label>
                {formData.buttons.map((button, index) => (
                  <div key={index} className="button-row">
                    <input
                      type="text"
                      placeholder="Button Title"
                      value={button.title}
                      onChange={(e) => updateButton(index, 'title', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Payload (what gets sent)"
                      value={button.payload}
                      onChange={(e) => updateButton(index, 'payload', e.target.value)}
                    />
                    {formData.buttons.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeButton(index)}
                        className="btn-danger-small"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                
                {formData.buttons.length < 3 && (
                  <button type="button" onClick={addButton} className="btn-secondary">
                    <Plus size={16} /> Add Button
                  </button>
                )}
              </div>

              <div className="form-actions">
                <button onClick={resetForm} className="btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickReply;