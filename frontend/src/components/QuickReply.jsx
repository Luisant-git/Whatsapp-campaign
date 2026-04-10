import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../api/config';
import { useToast } from '../contexts/ToastContext';
import { getProfile } from '../api/auth';
import '../styles/QuickReply.css';

const QuickReply = () => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [quickReplies, setQuickReplies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    response: '',
    triggersText: '',
    buttons: [{ type: 'normal', text: '' }],
    sendSeparately: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useQuickReply, setUseQuickReply] = useState(true);
  const responseTextareaRef = useRef(null);

  const insertText = (before, after) => {
    const textarea = responseTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.response;
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    setFormData({...formData, response: newText});
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const insertEmoji = (emoji) => {
    const textarea = responseTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const text = formData.response;
    const newText = text.substring(0, start) + emoji + text.substring(start);
    setFormData({...formData, response: newText});
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  useEffect(() => {
    fetchQuickReplies();
    fetchUserProfile();
  }, []);

  const fetchQuickReplies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/quick-reply`, {
        credentials: 'include'
      });
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

  const fetchUserProfile = async () => {
    try {
      const data = await getProfile();
      setUseQuickReply(data.user?.useQuickReply !== false);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      response: '',
      triggersText: '',
      buttons: [{ type: 'normal', text: '' }],
      sendSeparately: false
    });
    setEditingId(null);
    setShowForm(false);
  };

  const addTrigger = () => {
    setFormData({
      ...formData,
      triggers: [...formData.triggers, '']
    });
  };

  const removeTrigger = (index) => {
    const newTriggers = formData.triggers.filter((_, i) => i !== index);
    setFormData({ ...formData, triggers: newTriggers });
  };

  const updateTrigger = (index, value) => {
    const newTriggers = [...formData.triggers];
    newTriggers[index] = value;
    setFormData({ ...formData, triggers: newTriggers });
  };

  const addButton = () => {
    setFormData({
      ...formData,
      buttons: [...formData.buttons, { type: 'normal', text: '' }]
    });
  };

  const removeButton = (index) => {
    const newButtons = formData.buttons.filter((_, i) => i !== index);
    setFormData({ ...formData, buttons: newButtons });
  };

  const updateButton = (index, field, value) => {
    const newButtons = [...formData.buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setFormData({ ...formData, buttons: newButtons });
  };

  const addMenuItem = (buttonIndex) => {
    const newButtons = [...formData.buttons];
    if (!newButtons[buttonIndex].menuItems) {
      newButtons[buttonIndex].menuItems = [];
    }
    newButtons[buttonIndex].menuItems.push('');
    setFormData({ ...formData, buttons: newButtons });
  };

  const updateMenuItem = (buttonIndex, menuIndex, value) => {
    const newButtons = [...formData.buttons];
    newButtons[buttonIndex].menuItems[menuIndex] = value;
    setFormData({ ...formData, buttons: newButtons });
  };

  const removeMenuItem = (buttonIndex, menuIndex) => {
    const newButtons = [...formData.buttons];
    newButtons[buttonIndex].menuItems = newButtons[buttonIndex].menuItems.filter((_, i) => i !== menuIndex);
    setFormData({ ...formData, buttons: newButtons });
  };

  const handleSave = async () => {
    const triggers = formData.triggersText.split(',').map(t => t.trim()).filter(t => t);
    if (!triggers.length) {
      showError('Please provide at least one trigger');
      return;
    }
    
    // Filter out empty buttons
    const validButtons = formData.buttons.filter(b => b.text?.trim()).map(b => ({
      type: b.type || 'normal',
      text: b.text.trim(),
      ...(b.type === 'menu' && b.menuItems ? { menuItems: b.menuItems.filter(m => m.trim()) } : {})
    }));

    setSaving(true);
    try {
      const url = editingId ? `${API_BASE_URL}/quick-reply/${editingId}` : `${API_BASE_URL}/quick-reply`;
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title.trim() || '',
          response: formData.response.trim() || '',
          triggers,
          buttons: validButtons.length > 0 ? validButtons : [],
          sendSeparately: formData.sendSeparately,
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
    // Handle both old format (string[]) and new format (object[])
    const buttons = quickReply.buttons.map(btn => {
      if (typeof btn === 'string') {
        return { type: 'normal', text: btn };
      }
      return { type: btn.type || 'normal', text: btn.text || '', menuItems: btn.menuItems || [] };
    });

    setFormData({
      title: quickReply.title || '',
      response: quickReply.response || '',
      triggersText: quickReply.triggers.join(', '),
      buttons: buttons,
      sendSeparately: quickReply.sendSeparately || false
    });
    setEditingId(quickReply.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Delete this quick reply?');
    if (confirmed) {
      try {
        const response = await fetch(`${API_BASE_URL}/quick-reply/${id}`, {
          method: 'DELETE',
          credentials: 'include'
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
    <div className="settings-container">
      <div className="settings-header">
        <div>
          <h1>Quick Reply Buttons</h1>
          <p>Create interactive button menus for WhatsApp</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add Quick Reply
        </button>
      </div>

      <div className="replies-list">
        <h2>Quick Replies</h2>
        
        {quickReplies.length === 0 ? (
          <p className="no-replies">No quick replies configured yet.</p>
        ) : (
          <div className="replies-grid">
            {quickReplies.map((reply) => (
              <div key={reply.id} className="reply-item">
                <div className="reply-content">
                  {reply.title && (
                    <div className="reply-title">
                      <strong>{reply.title}</strong>
                    </div>
                  )}
                  {reply.response && (
                    <div className="reply-body" style={{ whiteSpace: 'pre-wrap' }}>
                      {reply.response}
                    </div>
                  )}
                  <div className="trigger-text">
                    <strong>Triggers:</strong> {reply.triggers.join(', ')}
                  </div>
                  <div className="buttons-preview">
                    <strong>Buttons:</strong>
                    {reply.sendSeparately && <span className="separate-badge">📤 Sent separately</span>}
                    <div className="button-list">
                      {reply.buttons.map((button, i) => {
                        const btn = typeof button === 'string' ? { type: 'normal', text: button } : button;
                        return (
                          <div key={i} className="button-item">
                            <span className="button-type-badge">{btn.type === 'menu' ? '📋' : '💬'}</span>
                            {btn.text}
                            {btn.type === 'menu' && btn.menuItems?.length > 0 && (
                              <span className="menu-count">({btn.menuItems.length} items)</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="reply-actions">
                  <button onClick={() => handleEdit(reply)} className="btn-icon-action">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(reply.id)} className="btn-icon-action danger">
                    <Trash2 size={18} />
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
                <label>Title (Header) - Optional</label>
                <input
                  type="text"
                  placeholder="e.g., Our Features"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Response (Body Message) - Optional</label>
                <div className="text-editor">
                  <div className="editor-toolbar">
                    <button type="button" className="toolbar-btn" onClick={() => insertText('*', '*')} title="Bold">
                      <strong>B</strong>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertText('_', '_')} title="Italic">
                      <em>I</em>
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertText('~', '~')} title="Strikethrough">
                      <s>S</s>
                    </button>
                    <div className="toolbar-divider"></div>
                    <button type="button" className="toolbar-btn" onClick={() => insertText('\n• ', '')} title="Bullet Point">
                      •
                    </button>
                    <button type="button" className="toolbar-btn" onClick={() => insertText('\n', '')} title="New Line">
                      ↵
                    </button>
                    <div className="toolbar-divider"></div>
                    <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('✅')} title="Check">✅</button>
                    <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('❌')} title="Cross">❌</button>
                    <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('👉')} title="Point">👉</button>
                    <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('⭐')} title="Star">⭐</button>
                    <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('🎯')} title="Target">🎯</button>
                    <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('💡')} title="Idea">💡</button>
                    <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('🔥')} title="Fire">🔥</button>
                    <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('💰')} title="Money">💰</button>
                    <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('📞')} title="Phone">📞</button>
                    <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('📧')} title="Email">📧</button>
                  </div>
                  <textarea
                    ref={responseTextareaRef}
                    placeholder="e.g., We offer AI chatbot, bulk messaging, automation, and more!"
                    value={formData.response}
                    onChange={(e) => setFormData({...formData, response: e.target.value})}
                    rows={6}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Trigger Words (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g., hi, hello, help, info"
                  value={formData.triggersText}
                  onChange={(e) => setFormData({...formData, triggersText: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.sendSeparately}
                    onChange={(e) => setFormData({...formData, sendSeparately: e.target.checked})}
                    style={{ marginRight: '8px' }}
                  />
                  Send greeting text and buttons as separate messages
                </label>
                <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                  When enabled, the text message will be sent first, followed by the buttons in a second message
                </small>
              </div>

              <div className="form-group">
                <label>Buttons - Optional</label>
                {formData.buttons.map((button, index) => (
                  <div key={index} className="button-config">
                    <div className="button-fields">
                      <select
                        value={button.type || 'normal'}
                        onChange={(e) => updateButton(index, 'type', e.target.value)}
                        style={{ width: '120px', marginRight: '8px' }}
                      >
                        <option value="normal">Normal</option>
                        <option value="menu">Menu</option>
                      </select>
                      <input
                        type="text"
                        placeholder={button.type === 'menu' ? 'Menu title' : 'Button text'}
                        value={button.text || ''}
                        onChange={(e) => updateButton(index, 'text', e.target.value)}
                        style={{ flex: 1 }}
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
                    {button.type === 'menu' && (
                      <div className="menu-items" style={{ marginLeft: '20px', marginTop: '8px' }}>
                        {button.menuItems?.map((item, menuIndex) => (
                          <div key={menuIndex} className="button-fields" style={{ marginBottom: '4px' }}>
                            <input
                              type="text"
                              placeholder="Menu item text"
                              value={item}
                              onChange={(e) => updateMenuItem(index, menuIndex, e.target.value)}
                              style={{ flex: 1 }}
                            />
                            <button 
                              type="button" 
                              onClick={() => removeMenuItem(index, menuIndex)}
                              className="btn-danger-small"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => addMenuItem(index)} 
                          className="btn-secondary"
                          style={{ marginTop: '4px', fontSize: '12px', padding: '4px 8px' }}
                        >
                          <Plus size={12} /> Add Menu Item
                        </button>
                      </div>
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