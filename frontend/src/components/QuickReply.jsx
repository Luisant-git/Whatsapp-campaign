import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, ChevronDown, Upload, Loader, MessageSquare, Link, MousePointer2, Settings, Zap } from 'lucide-react';
import { uploadFile } from '../api/whatsapp';
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
    buttonType: 'normal',
    menuName: '',
    menuButtonText: '',
    buttons: [''],
    mediaUrls: [''],
    sendSeparately: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingMediaIndex, setUploadingMediaIndex] = useState(null);
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
      buttonType: 'normal',
      menuName: '',
      menuButtonText: '',
      buttons: [''],
      mediaUrls: [''],
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
      buttons: [...formData.buttons, '']
    });
  };

  const removeButton = (index) => {
    const newButtons = formData.buttons.filter((_, i) => i !== index);
    setFormData({ ...formData, buttons: newButtons });
  };

  const updateButton = (index, value) => {
    const newButtons = [...formData.buttons];
    newButtons[index] = value;
    setFormData({ ...formData, buttons: newButtons });
  };

  const addMediaUrl = () => {
    setFormData({
      ...formData,
      mediaUrls: [...formData.mediaUrls, '']
    });
  };

  const removeMediaUrl = (index) => {
    const newUrls = formData.mediaUrls.filter((_, i) => i !== index);
    setFormData({ ...formData, mediaUrls: newUrls });
  };

  
  const handleFileUpload = async (index, event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      setUploadingMediaIndex(index);
      const response = await uploadFile(file);
      if (response && response.mediaUrl) {
        updateMediaUrl(index, response.mediaUrl);
        showSuccess('File uploaded successfully');
      }
    } catch (error) {
      showError(error.message || 'Failed to upload file');
    } finally {
      setUploadingMediaIndex(null);
      event.target.value = null;
    }
  };

  const updateMediaUrl = (index, value) => {
    const newUrls = [...formData.mediaUrls];
    newUrls[index] = value;
    setFormData({ ...formData, mediaUrls: newUrls });
  };

  const handleSave = async () => {
    const triggers = formData.triggersText.split(',').map(t => t.trim()).filter(t => t);
    if (!triggers.length) {
      showError('Please provide at least one trigger');
      return;
    }
    
    // Filter out empty buttons
    const validButtons = formData.buttons.filter(b => b.trim());
    
    // Prepare button data based on type
    
    let buttonData;
    if (formData.buttonType === 'menu') {
      if (!formData.menuButtonText.trim()) {
        showError('Please provide a button text for the menu');
        return;
      }
      if (validButtons.length === 0) {
        showError('Please add at least one menu item');
        return;
      }
      buttonData = [{ type: 'menu', text: formData.menuButtonText.trim(), menuItems: validButtons }];
    } else if (formData.buttonType === 'url') {
      if (!formData.urlButtonText.trim() || !formData.urlButtonLink.trim()) {
        showError('Please provide both text and URL for the redirect button');
        return;
      }
      buttonData = [{ type: 'url', text: formData.urlButtonText.trim(), url: formData.urlButtonLink.trim() }];
    } else {

      buttonData = validButtons.map(b => ({ type: 'normal', text: b }));
    }

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
          buttons: buttonData,
          mediaUrls: formData.mediaUrls.filter(url => url.trim()),
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
    // Check if it's a menu type
    const firstBtn = quickReply.buttons[0];
    const isMenu = firstBtn && typeof firstBtn === 'object' && firstBtn.type === 'menu';
    const isUrl = firstBtn && typeof firstBtn === 'object' && firstBtn.type === 'url';
    
    
    if (isMenu) {
      setFormData({
        title: quickReply.title || '',
        response: quickReply.response || '',
        triggersText: quickReply.triggers.join(', '),
        buttonType: 'menu',
        menuName: '',
        menuButtonText: firstBtn.text || '',
        urlButtonText: '',
        urlButtonLink: '',
        buttons: firstBtn.menuItems || [''],
        mediaUrls: quickReply.mediaUrls?.length ? quickReply.mediaUrls : [''],
        sendSeparately: quickReply.sendSeparately || false
      });
    } else if (isUrl) {
      setFormData({
        title: quickReply.title || '',
        response: quickReply.response || '',
        triggersText: quickReply.triggers.join(', '),
        buttonType: 'url',
        menuName: '',
        menuButtonText: '',
        urlButtonText: firstBtn.text || '',
        urlButtonLink: firstBtn.url || '',
        buttons: [''],
        mediaUrls: quickReply.mediaUrls?.length ? quickReply.mediaUrls : [''],
        sendSeparately: quickReply.sendSeparately || false
      });
    } else {

      // Normal buttons
      const buttons = quickReply.buttons.map(btn => 
        typeof btn === 'string' ? btn : btn.text || ''
      );
      setFormData({
        title: quickReply.title || '',
        response: quickReply.response || '',
        triggersText: quickReply.triggers.join(', '),
        buttonType: 'normal',
        menuName: '',
        menuButtonText: '',
        buttons: buttons.length > 0 ? buttons : [''],
        mediaUrls: quickReply.mediaUrls?.length ? quickReply.mediaUrls : [''],
        sendSeparately: quickReply.sendSeparately || false
      });
    }
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
              <div key={reply.id} className="wa-reply-card">
                <div className="wa-card-header">
                  <div className="wa-triggers">
                    <Zap size={14} style={{ color: '#f5a623' }} />
                    <span style={{ marginRight: '6px' }}>Triggers:</span>
                    <div className="wa-triggers-badges">
                      {reply.triggers.map((t, i) => <span key={i} className="wa-trigger-badge">{t}</span>)}
                    </div>
                  </div>
                  <div className="wa-actions">
                    <button onClick={() => handleEdit(reply)} className="btn-icon-action" title="Edit">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(reply.id)} className="btn-icon-action danger" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="wa-card-body">
                  <div className="wa-bubble">
                    {reply.title && <div className="wa-bubble-title">{reply.title}</div>}
                    
                    {reply.mediaUrls && reply.mediaUrls.length > 0 && (
                      <div className="wa-attachment">
                        <Link size={14} />
                        {reply.mediaUrls.length} Media Attached
                      </div>
                    )}

                    {reply.response && <div className="wa-bubble-body">{reply.response}</div>}
                  </div>

                  {reply.sendSeparately && <div className="wa-separate-indicator">Sent Separately</div>}

                  {reply.buttons && reply.buttons.length > 0 && (
                    <div className="wa-interactive-container">
                      {reply.buttons.map((button, i) => {
                        const btn = typeof button === 'string' ? { type: 'normal', text: button } : button;
                        
                        if (btn.type === 'menu') {
                          return (
                            <div key={i} className="wa-btn wa-btn-menu">
                              <span>📋</span> {btn.text} ({btn.menuItems?.length || 0})
                            </div>
                          );
                        } else if (btn.type === 'url') {
                          return (
                            <div key={i} className="wa-btn wa-btn-url">
                              <Link size={16} /> {btn.text}
                            </div>
                          );
                        } else {
                          return (
                            <div key={i} className="wa-btn">
                              <span>💬</span> {btn.text}
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content meta-modal">
            <div className="meta-modal-header">
              <h2>{editingId ? 'Edit Interactive Message' : 'Create Interactive Message'}</h2>
              <button onClick={resetForm} className="close-btn">×</button>
            </div>
            
            <div className="meta-modal-body">
              <div className="settings-form">
                
                {/* SECTION 1: TRIGGERS */}
                <div className="meta-section">
                  <div className="meta-section-header">
                    <div className="meta-section-icon"><Zap size={18} /></div>
                    <h3 className="meta-section-title">Message Triggers</h3>
                  </div>
                  <p className="meta-helper-text">When a customer sends any of these keywords, this interactive message will be sent automatically.</p>
                  <div className="meta-input-group">
                    <label className="meta-label">Trigger Words (comma separated)</label>
                    <input
                      type="text"
                      className="meta-input"
                      placeholder="e.g., hi, hello, pricing, help"
                      value={formData.triggersText}
                      onChange={(e) => setFormData({...formData, triggersText: e.target.value})}
                    />
                  </div>
                </div>

                {/* SECTION 2: HEADER & BODY */}
                <div className="meta-section">
                  <div className="meta-section-header">
                    <div className="meta-section-icon"><MessageSquare size={18} /></div>
                    <h3 className="meta-section-title">Message Content</h3>
                  </div>
                  
                  <div className="meta-input-group">
                    <label className="meta-label">Title / Header (Optional)</label>
                    <p className="meta-helper-text">Short title displayed at the top of the message in bold.</p>
                    <input
                      type="text"
                      className="meta-input"
                      placeholder="e.g., Welcome to Our Store!"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      maxLength={60}
                    />
                  </div>

                  <div className="meta-input-group">
                    <label className="meta-label">Media Header (Optional)</label>
                    <p className="meta-helper-text">Add a document or image to be sent along with this message.</p>
                    {formData.mediaUrls.map((url, index) => (
                      <div key={index} className="button-fields" style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          className="meta-input"
                          placeholder="e.g., https://example.com/brochure.pdf"
                          value={url}
                          onChange={(e) => updateMediaUrl(index, e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <input
                          type="file"
                          id={`qr-upload-${index}`}
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileUpload(index, e)}
                        />
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ padding: '0 12px', height: '44px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => document.getElementById(`qr-upload-${index}`).click()}
                          disabled={uploadingMediaIndex === index}
                        >
                          {uploadingMediaIndex === index ? <Loader size={16} className="spinner" /> : <Upload size={16} />} 
                          {uploadingMediaIndex === index ? 'Uploading...' : 'Upload File'}
                        </button>
                        {formData.mediaUrls.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeMediaUrl(index)}
                            className="btn-danger-small"
                            style={{ height: '44px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="meta-input-group" style={{ marginTop: '20px' }}>
                    <label className="meta-label">Body Text</label>
                    <div className="text-editor" style={{ borderColor: '#d1d7db', borderRadius: '8px' }}>
                      <div className="editor-toolbar" style={{ background: '#f0f2f5', borderBottom: '1px solid #d1d7db' }}>
                        <button type="button" className="toolbar-btn" onClick={() => insertText('*', '*')} title="Bold"><strong>B</strong></button>
                        <button type="button" className="toolbar-btn" onClick={() => insertText('_', '_')} title="Italic"><em>I</em></button>
                        <button type="button" className="toolbar-btn" onClick={() => insertText('~', '~')} title="Strikethrough"><s>S</s></button>
                        <div className="toolbar-divider"></div>
                        <button type="button" className="toolbar-btn" onClick={() => insertText('\n• ', '')} title="Bullet Point">•</button>
                        <button type="button" className="toolbar-btn" onClick={() => insertText('\n', '')} title="New Line">↵</button>
                        <div className="toolbar-divider"></div>
                        <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('✅')}>✅</button>
                        <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('❌')}>❌</button>
                        <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('👉')}>👉</button>
                        <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('⭐')}>⭐</button>
                        <button type="button" className="toolbar-btn emoji-btn" onClick={() => insertEmoji('💡')}>💡</button>
                      </div>
                      <textarea
                        ref={responseTextareaRef}
                        className="meta-input"
                        style={{ border: 'none', background: 'white', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
                        placeholder="Type your message here... e.g., We offer AI chatbot, bulk messaging, automation, and more!"
                        value={formData.response}
                        onChange={(e) => setFormData({...formData, response: e.target.value})}
                        rows={5}
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: INTERACTIVE BUTTONS */}
                <div className="meta-section">
                  <div className="meta-section-header">
                    <div className="meta-section-icon"><MousePointer2 size={18} /></div>
                    <h3 className="meta-section-title">Interactive Actions</h3>
                  </div>
                  <p className="meta-helper-text">Add buttons for the user to click. Meta allows up to 3 Quick Reply buttons, 1 Redirect URL button, or a Menu List.</p>
                  
                  <div className="meta-input-group">
                    <label className="meta-label">Action Type</label>
                    <select
                      className="meta-input"
                      value={formData.buttonType}
                      onChange={(e) => setFormData({...formData, buttonType: e.target.value})}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="normal">Quick Reply Buttons (Max 3)</option>
                      <option value="menu">List Menu (Dropdown with up to 10 items)</option>
                      <option value="url">Redirect URL Button</option>
                    </select>
                  </div>

                  <div style={{ marginTop: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e1e8ed' }}>
                    {formData.buttonType === 'url' ? (
                      <>
                        <div className="meta-input-group">
                          <label className="meta-label">Button Text</label>
                          <input
                            type="text"
                            className="meta-input"
                            placeholder="e.g., Visit Website"
                            value={formData.urlButtonText}
                            onChange={(e) => setFormData({...formData, urlButtonText: e.target.value})}
                          />
                        </div>
                        <div className="meta-input-group">
                          <label className="meta-label">Redirect URL</label>
                          <input
                            type="url"
                            className="meta-input"
                            placeholder="e.g., https://example.com"
                            value={formData.urlButtonLink}
                            onChange={(e) => setFormData({...formData, urlButtonLink: e.target.value})}
                          />
                        </div>
                      </>
                    ) : formData.buttonType === 'menu' ? (
                      <>
                        <div className="meta-input-group">
                          <label className="meta-label">Menu Button Name</label>
                          <input
                            type="text"
                            className="meta-input"
                            placeholder="e.g., View Options"
                            value={formData.menuButtonText}
                            onChange={(e) => setFormData({...formData, menuButtonText: e.target.value})}
                          />
                        </div>
                        <label className="meta-label" style={{ marginTop: '16px' }}>List Items</label>
                        {formData.buttons.map((button, index) => (
                          <div key={index} className="button-fields" style={{ marginBottom: '8px' }}>
                            <input
                              type="text"
                              className="meta-input"
                              placeholder={`Item ${index + 1}`}
                              value={button}
                              onChange={(e) => updateButton(index, e.target.value)}
                            />
                            {formData.buttons.length > 1 && (
                              <button type="button" onClick={() => removeButton(index)} className="btn-danger-small" style={{ height: '44px' }}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        {formData.buttons.length < 10 && (
                          <button type="button" onClick={addButton} className="btn-secondary" style={{ marginTop: '8px' }}>
                            <Plus size={16} /> Add List Item
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <label className="meta-label">Quick Reply Buttons</label>
                        {formData.buttons.map((button, index) => (
                          <div key={index} className="button-fields" style={{ marginBottom: '8px' }}>
                            <input
                              type="text"
                              className="meta-input"
                              placeholder={`Button ${index + 1} text`}
                              value={button}
                              onChange={(e) => updateButton(index, e.target.value)}
                            />
                            {formData.buttons.length > 1 && (
                              <button type="button" onClick={() => removeButton(index)} className="btn-danger-small" style={{ height: '44px' }}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        {formData.buttons.length < 3 && (
                          <button type="button" onClick={addButton} className="btn-secondary" style={{ marginTop: '8px' }}>
                            <Plus size={16} /> Add Button
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* SECTION 4: ADVANCED */}
                <div className="meta-section" style={{ marginBottom: 0 }}>
                  <div className="meta-section-header">
                    <div className="meta-section-icon" style={{ background: '#f0f2f5', color: '#667781' }}><Settings size={18} /></div>
                    <h3 className="meta-section-title">Advanced Settings</h3>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.sendSeparately}
                      onChange={(e) => setFormData({...formData, sendSeparately: e.target.checked})}
                      style={{ width: '18px', height: '18px', accentColor: '#00a884' }}
                    />
                    <span className="meta-label" style={{ margin: 0 }}>Send media and buttons as separate messages</span>
                  </label>
                  <p className="meta-helper-text" style={{ paddingLeft: '28px', marginTop: '4px' }}>
                    Useful if you have a very long caption or want the document to appear above the interactive buttons.
                  </p>
                </div>
                
              </div>
            </div>
            
            <div className="meta-modal-footer">
              <button onClick={resetForm} className="btn-secondary" style={{ padding: '10px 24px', fontSize: '15px' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ background: '#00a884', borderColor: '#00a884', padding: '10px 24px', fontSize: '15px' }}>
                {saving ? 'Saving...' : editingId ? 'Update Message' : 'Create Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickReply;