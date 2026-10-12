import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, ChevronDown, Upload, Loader, Zap, Link, FileText, Image, File, ExternalLink, Info, AlertCircle } from 'lucide-react';
import { uploadFile } from '../api/whatsapp';
import { API_BASE_URL } from '../api/config';
import { useToast } from '../contexts/ToastContext';
import { getProfile } from '../api/auth';
import '../styles/QuickReply.css';

const formatFileSize = (bytes) => {
  const num = typeof bytes === 'number' ? bytes : parseFloat(bytes);
  if (!num || isNaN(num) || num <= 0) return '';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(num) / Math.log(k)), sizes.length - 1);
  if (i < 0 || !sizes[i]) return '';
  return parseFloat((num / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileNameFromUrl = (url, meta = {}) => {
  if (!url) return '';
  if (meta[url]?.name) return meta[url].name;
  try {
    const parsed = new URL(url);
    const decoded = decodeURIComponent(parsed.pathname.split('/').pop() || '');
    return decoded || url;
  } catch {
    const parts = url.split('/');
    return decodeURIComponent(parts[parts.length - 1].split('?')[0]) || url;
  }
};

const QuickReply = () => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [quickReplies, setQuickReplies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mediaMeta, setMediaMeta] = useState({});
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

  const fetchFileInfo = async (url) => {
    if (!url || !url.trim() || mediaMeta[url]) return;
    try {
      const res = await fetch(`${API_BASE_URL}/whatsapp/file-info?url=${encodeURIComponent(url.trim())}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const rawSize = data.sizeFormatted || (data.size ? formatFileSize(data.size) : '');
          const cleanSize = (rawSize && !rawSize.includes('NaN') && !rawSize.includes('undefined')) ? rawSize : '';
          setMediaMeta(prev => ({
            ...prev,
            [url]: {
              name: data.name || getFileNameFromUrl(url),
              size: cleanSize,
              type: /\.pdf$/i.test(data.name || url) ? 'pdf' : /\.(png|jpe?g|webp|gif)$/i.test(data.name || url) ? 'image' : 'document'
            }
          }));
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    const urls = new Set();
    quickReplies.forEach(qr => {
      if (Array.isArray(qr.mediaUrls)) {
        qr.mediaUrls.forEach(u => u && urls.add(u.trim()));
      }
    });
    formData.mediaUrls.forEach(u => u && urls.add(u.trim()));
    urls.forEach(u => {
      fetchFileInfo(u);
    });
  }, [quickReplies, formData.mediaUrls]);

  const addMediaUrl = () => {
    setFormData({
      ...formData,
      mediaUrls: [...formData.mediaUrls, '']
    });
  };

  const removeMediaUrl = (index) => {
    const targetUrl = formData.mediaUrls[index];
    if (targetUrl && mediaMeta[targetUrl]) {
      setMediaMeta(prev => {
        const copy = { ...prev };
        delete copy[targetUrl];
        return copy;
      });
    }
    if (formData.mediaUrls.length <= 1) {
      setFormData({ ...formData, mediaUrls: [''] });
    } else {
      const newUrls = formData.mediaUrls.filter((_, i) => i !== index);
      setFormData({ ...formData, mediaUrls: newUrls });
    }
  };

  const handleFileUpload = async (index, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // ── Meta Media Size Limits & Validation ──
    const isPdf = file.type?.includes('pdf') || /\.pdf$/i.test(file.name);
    const isImg = file.type?.startsWith('image') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
    const isVid = file.type?.startsWith('video') || /\.(mp4|avi|mov)$/i.test(file.name);
    const formattedSize = formatFileSize(file.size);

    // Hard ceilings enforced by Meta WhatsApp Cloud API
    if (isImg && file.size > 5 * 1024 * 1024) {
      showError(`Image "${file.name}" is ${formattedSize}. Meta maximum limit for images is 5 MB.`);
      event.target.value = null;
      return;
    }
    if (isVid && file.size > 16 * 1024 * 1024) {
      showError(`Video "${file.name}" is ${formattedSize}. Meta maximum limit for videos is 16 MB.`);
      event.target.value = null;
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      showError(`File "${file.name}" is ${formattedSize}. Meta maximum document limit is 100 MB.`);
      event.target.value = null;
      return;
    }

    try {
      setUploadingMediaIndex(index);
      const response = await uploadFile(file);
      if (response && response.mediaUrl) {
        const cleanSize = (formattedSize && !formattedSize.includes('NaN') && !formattedSize.includes('undefined')) ? formattedSize : '';
        setMediaMeta(prev => ({
          ...prev,
          [response.mediaUrl]: {
            name: file.name,
            size: cleanSize,
            type: isPdf ? 'pdf' : isImg ? 'image' : 'document'
          }
        }));
        updateMediaUrl(index, response.mediaUrl);
        if (file.size > 15 * 1024 * 1024) {
          showSuccess(`"${file.name}" uploaded (${formattedSize}). Note: Files under 15 MB download faster on customer mobile.`);
        } else {
          showSuccess(`"${file.name}" uploaded successfully (${formattedSize})`);
        }
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
    if (value && value.trim()) {
      fetchFileInfo(value.trim());
    }
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
    <div className="settings-container quick-reply-full-width">
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: reply.response ? '8px' : '0' }}>
                        {reply.mediaUrls.filter(Boolean).map((mUrl, mIdx) => {
                          const mName = getFileNameFromUrl(mUrl, mediaMeta);
                          const mMeta = mediaMeta[mUrl] || {};
                          const isPdf = /\.pdf$/i.test(mName || mUrl);
                          const isImage = /\.(png|jpe?g|webp|gif)$/i.test(mName || mUrl);
                          const hasValidSize = Boolean(
                            mMeta.size &&
                            !mMeta.size.includes('NaN') &&
                            !mMeta.size.includes('undefined') &&
                            mMeta.size.trim() !== ''
                          );
                          return (
                            <div key={mIdx} style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              background: isPdf ? '#fee2e2' : isImage ? '#ecfdf5' : '#f1f5f9',
                              border: isPdf ? '1px solid #fecaca' : isImage ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: isPdf ? '#991b1b' : isImage ? '#065f46' : '#1e293b',
                              width: 'fit-content',
                              maxWidth: '100%'
                            }}>
                              {isPdf ? <FileText size={14} color="#dc2626" style={{ flexShrink: 0 }} /> : isImage ? <Image size={14} color="#10b981" style={{ flexShrink: 0 }} /> : <File size={14} color="#0284c7" style={{ flexShrink: 0 }} />}
                              <span style={{ maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={mName}>
                                {mName}
                              </span>
                              {hasValidSize && (
                                <span style={{ color: '#64748b', fontWeight: 600, fontSize: '11px', marginLeft: '2px', flexShrink: 0 }}>
                                  ({mMeta.size})
                                </span>
                              )}
                            </div>
                          );
                        })}
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
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Quick Reply' : 'Add Quick Reply'}</h2>
              <button onClick={resetForm} className="close-btn">×</button>
            </div>
            
            <div className="settings-form">
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Attached Documents / PDFs (Optional)</label>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700 }}>
                    {formData.mediaUrls.filter(u => u && u.trim()).length} File(s)
                  </span>
                </div>
                <small style={{ display: 'block', marginBottom: '10px', color: '#64748b', fontSize: '13px' }}>
                  Upload PDFs, brochures, or images. They will be sent to the user when this quick reply triggers.
                </small>

                {/* ── Recommended File Size, Quantity & Meta Limits Notice ── */}
                <div className="qr-recommended-notice">
                  <div className="qr-notice-header">
                    <Info size={17} color="#16a34a" style={{ flexShrink: 0 }} />
                    <span className="qr-notice-title">Media Best Practices & Meta Limits</span>
                  </div>

                  <div className="qr-notice-grid">
                    <div className="qr-notice-item">
                      <span className="qr-notice-label">Recommended Quantity:</span>
                      <span className="qr-notice-val">
                        <strong>1 – 3 files</strong> per trigger (Optimal customer mobile experience; max safe is <strong>5 files</strong> to avoid chat spam/rate limits).
                      </span>
                    </div>

                    <div className="qr-notice-item">
                      <span className="qr-notice-label">Recommended Size:</span>
                      <span className="qr-notice-val">
                        Under <strong>15 MB</strong> per file for instant mobile downloading.
                      </span>
                    </div>

                    <div className="qr-notice-item">
                      <span className="qr-notice-label">Meta Max Limits:</span>
                      <span className="qr-notice-badges">
                        <span className="qr-limit-pill">📄 <strong>PDF / Doc:</strong> 100 MB</span>
                        <span className="qr-limit-pill">🎬 <strong>Videos:</strong> 16 MB</span>
                        <span className="qr-limit-pill">🖼️ <strong>Images:</strong> 5 MB</span>
                        <span className="qr-limit-pill">🎵 <strong>Audio:</strong> 16 MB</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="qr-media-list">
                  {formData.mediaUrls.map((url, index) => {
                    const hasUrl = Boolean(url && url.trim());
                    const fileName = hasUrl ? getFileNameFromUrl(url, mediaMeta) : '';
                    const meta = mediaMeta[url] || {};
                    const isPdf = /\.pdf$/i.test(fileName || url);
                    const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName || url);
                    const mediaType = isPdf ? 'pdf' : isImg ? 'image' : 'document';
                    const hasValidSize = Boolean(
                      meta.size &&
                      !meta.size.includes('NaN') &&
                      !meta.size.includes('undefined') &&
                      meta.size.trim() !== ''
                    );

                    return (
                      <div key={index} className="qr-media-item">
                        <input
                          type="file"
                          id={`qr-upload-${index}`}
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileUpload(index, e)}
                        />

                        {hasUrl ? (
                          /* ── Clean Responsive Uploaded File Card ── */
                          <div className="qr-media-card">
                            <div className="qr-media-card-info">
                              <div className={`qr-media-icon-badge ${mediaType}`}>
                                {isPdf ? <FileText size={18} /> : isImg ? <Image size={18} /> : <File size={18} />}
                              </div>
                              <div className="qr-media-details">
                                <span className="qr-media-name" title={fileName}>
                                  {fileName}
                                </span>
                                <div className="qr-media-meta-row">
                                  <span className={`qr-media-type-badge ${mediaType}`}>
                                    {mediaType.toUpperCase()}
                                  </span>
                                  {hasValidSize && (
                                    <span className="qr-media-size-text">
                                      • {meta.size}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="qr-media-card-actions">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary qr-action-btn"
                                title="Open file preview"
                              >
                                <ExternalLink size={13} /> View
                              </a>
                              <button
                                type="button"
                                className="btn-secondary qr-action-btn"
                                onClick={() => document.getElementById(`qr-upload-${index}`).click()}
                                disabled={uploadingMediaIndex === index}
                                title="Replace with another file"
                              >
                                {uploadingMediaIndex === index ? <Loader size={13} className="spinner" /> : <Upload size={13} />}
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => removeMediaUrl(index)}
                                className="btn-danger-small qr-media-delete-btn"
                                title="Remove file"
                                aria-label="Remove file"
                              >
                                <Trash2 size={16} color="#ffffff" strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── Responsive Upload / URL Input Box ── */
                          <div className="qr-media-input-box">
                            <button
                              type="button"
                              className="qr-media-input-upload-btn"
                              onClick={() => document.getElementById(`qr-upload-${index}`).click()}
                              disabled={uploadingMediaIndex === index}
                            >
                              {uploadingMediaIndex === index ? <Loader size={15} className="spinner" /> : <Upload size={15} />}
                              {uploadingMediaIndex === index ? 'Uploading...' : 'Upload PDF / File'}
                            </button>

                            <span className="qr-media-divider-text">or paste URL:</span>

                            <div className="qr-media-url-row">
                              <input
                                type="text"
                                className="qr-media-url-input"
                                placeholder="https://example.com/document.pdf"
                                value={url}
                                onChange={(e) => updateMediaUrl(index, e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => removeMediaUrl(index)}
                                className="btn-danger-small qr-media-delete-btn"
                                title="Remove / Clear"
                                aria-label="Remove / Clear"
                              >
                                <Trash2 size={16} color="#ffffff" strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addMediaUrl}
                  className="qr-add-media-btn"
                >
                  <Plus size={16} /> Add Another Document / PDF
                </button>
              </div>


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
                <label>Button Type</label>
                <select
                  value={formData.buttonType}
                  onChange={(e) => setFormData({...formData, buttonType: e.target.value})}
                  style={{ width: '100%', padding: '10px', marginBottom: '16px' }}
                >
                  <option value="normal">Normal Buttons</option>
                  <option value="menu">Menu (Dropdown)</option>
                  <option value="url">Redirect URL Button</option>
                </select>

                                {formData.buttonType === 'url' ? (
                  <>
                    <label>Button Text</label>
                    <input
                      type="text"
                      placeholder="e.g., Visit Website"
                      value={formData.urlButtonText}
                      onChange={(e) => setFormData({...formData, urlButtonText: e.target.value})}
                      style={{ marginBottom: '16px' }}
                    />
                    <label>Redirect URL</label>
                    <input
                      type="text"
                      placeholder="e.g., https://example.com"
                      value={formData.urlButtonLink}
                      onChange={(e) => setFormData({...formData, urlButtonLink: e.target.value})}
                      style={{ marginBottom: '16px' }}
                    />
                  </>
                ) : formData.buttonType === 'menu' ? (
                  <>
                    <label>Button Text (Menu Name)</label>
                    <input
                      type="text"
                      placeholder="e.g., View Options, Select Service"
                      value={formData.menuButtonText}
                      onChange={(e) => setFormData({...formData, menuButtonText: e.target.value})}
                      style={{ marginBottom: '16px' }}
                    />
                    <label>Menu Items</label>
                    {formData.buttons.map((button, index) => (
                      <div key={index} className="button-fields" style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder={`Item ${index + 1}`}
                          value={button}
                          onChange={(e) => updateButton(index, e.target.value)}
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
                    {formData.buttons.length < 10 && (
                      <button type="button" onClick={addButton} className="btn-secondary">
                        <Plus size={16} /> Add Menu Item
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <label>Buttons</label>
                    {formData.buttons.map((button, index) => (
                      <div key={index} className="button-fields" style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Button text"
                          value={button}
                          onChange={(e) => updateButton(index, e.target.value)}
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
                  </>
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