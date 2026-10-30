import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import { getCampaignById, updateCampaign } from '../api/campaign';
import { ArrowLeft, Plus, Trash2, Upload, Search, Users, Phone, User, Check, X, Calendar, Clock, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import '../styles/EditCampaign.scss';

const EditCampaign = ({ campaignId, onBack }) => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    templateName: '',
    contacts: [],
    scheduleType: 'one-time',
    scheduledDays: [],
    scheduledTime: '09:00',
    scheduledDate: '',
  });
  const [quickPick, setQuickPick] = useState('');

  const [newContact, setNewContact] = useState({ phone: '', name: '' });
  const [contactSearch, setContactSearch] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const fileInputRef = useRef(null);

  const daysOfWeek = [
    { value: 'sunday', label: 'Sunday' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' }
  ];

  useEffect(() => {
    fetchCampaignDetails();
  }, [campaignId]);

  const normalizePhone = (phone) => {
    if (!phone) return '';
    const clean = String(phone).replace(/\D/g, '');
    if (clean.length === 10 && /^[6-9]/.test(clean)) {
      return `91${clean}`;
    }
    return clean;
  };

  const fetchCampaignDetails = async () => {
    setLoading(true);
    try {
      const data = await getCampaignById(campaignId);
      
      const loadedContacts = (data.contacts || []).map(c => {
        if (typeof c === 'string') {
          return { phone: normalizePhone(c), name: c };
        }
        return {
          phone: normalizePhone(c.phone),
          name: c.name || c.phone || ''
        };
      }).filter(c => c.phone);

      setEditData({
        name: data.name || '',
        templateName: data.templateName || '',
        contacts: loadedContacts,
        scheduleType: data.scheduleType || 'one-time',
        scheduledDays: data.scheduledDays || [],
        scheduledTime: data.scheduledTime || '09:00',
        // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
        scheduledDate: data.scheduledDate
          ? new Date(data.scheduledDate).toISOString().slice(0, 16)
          : '',
      });
      if (data.scheduledDate) setQuickPick('custom');
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      showError('Failed to load campaign details');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const addContact = () => {
    const rawInput = newContact.phone.trim();
    if (!rawInput) {
      showError('Please enter a phone number');
      return;
    }

    // Support comma, newline, semicolon separated numbers
    const tokens = rawInput.split(/[\r\n,;]+/).map(t => t.trim()).filter(Boolean);
    const existingPhones = new Set(
      (editData.contacts || []).map(c => typeof c === 'string' ? normalizePhone(c) : normalizePhone(c.phone))
    );

    let addedCount = 0;
    const newContactsList = [...(editData.contacts || [])];

    for (const token of tokens) {
      const cleanPhone = normalizePhone(token);
      if (!cleanPhone || cleanPhone.length < 7) {
        continue;
      }
      if (!existingPhones.has(cleanPhone)) {
        existingPhones.add(cleanPhone);
        newContactsList.push({
          phone: cleanPhone,
          name: (tokens.length === 1 && newContact.name.trim()) ? newContact.name.trim() : cleanPhone
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      setEditData(prev => ({
        ...prev,
        contacts: newContactsList
      }));
      setNewContact({ phone: '', name: '' });
      showSuccess(`Added ${addedCount} contact${addedCount > 1 ? 's' : ''}`);
    } else {
      showError('Phone number is already in the list or invalid');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target.result;
        const wb = XLSX.read(buffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!data || data.length === 0) {
          showError('Uploaded file contains no data');
          return;
        }

        const firstRow = data[0] || {};
        const allKeys = Object.keys(firstRow);

        let phoneKey = allKeys.find(k => /^(phone|mobile|whatsapp|wa_number|cell|contact\s*no|contact\s*number)$/i.test(k.trim()));
        if (!phoneKey) {
          phoneKey = allKeys.find(k => /phone|mobile|whatsapp|cell/i.test(k.trim()));
        }
        if (!phoneKey) {
          phoneKey = allKeys.find(k => /contact/i.test(k.trim()));
        }

        let nameKey = allKeys.find(k => k !== phoneKey && /^(name|customer|client|fullname|full\s*name|contact\s*name)$/i.test(k.trim()));
        if (!nameKey) {
          nameKey = allKeys.find(k => k !== phoneKey && /name|customer|client/i.test(k.trim()));
        }

        const existingPhones = new Set(
          (editData.contacts || []).map(c => typeof c === 'string' ? normalizePhone(c) : normalizePhone(c.phone))
        );

        let importedCount = 0;
        const importedList = [...(editData.contacts || [])];

        data.forEach(row => {
          let rawPhone = phoneKey ? row[phoneKey] : '';
          if (typeof rawPhone === 'number') {
            rawPhone = rawPhone.toFixed(0);
          } else {
            rawPhone = String(rawPhone || '').trim();
          }

          const cleanPhone = normalizePhone(rawPhone);
          const rawName = nameKey ? String(row[nameKey] || '').trim() : '';

          if (cleanPhone && cleanPhone.length >= 7 && !existingPhones.has(cleanPhone)) {
            existingPhones.add(cleanPhone);
            importedList.push({
              phone: cleanPhone,
              name: rawName || cleanPhone
            });
            importedCount++;
          }
        });

        if (importedCount > 0) {
          setEditData(prev => ({
            ...prev,
            contacts: importedList
          }));
          showSuccess(`Imported ${importedCount} contact${importedCount > 1 ? 's' : ''} from file!`);
        } else {
          showError('No new valid contacts found in file');
        }
      } catch (err) {
        console.error('Error parsing file:', err);
        showError('Failed to parse Excel/CSV file');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const removeContact = (indexToRemove) => {
    setEditData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== indexToRemove)
    }));
  };

  const clearAllContacts = async () => {
    if (editData.contacts?.length === 0) return;
    const ok = await showConfirm(`Are you sure you want to remove all ${editData.contacts.length} contacts?`);
    if (ok) {
      setEditData(prev => ({ ...prev, contacts: [] }));
      showSuccess('Cleared all contacts');
    }
  };

  const handleDayToggle = (day) => {
    setEditData(prev => ({
      ...prev,
      scheduledDays: prev.scheduledDays?.includes(day) 
        ? prev.scheduledDays.filter(d => d !== day)
        : [...(prev.scheduledDays || []), day]
    }));
  };

  const handleUpdateCampaign = async () => {
    if (!editData.name?.trim()) {
      showError('Please enter a campaign name');
      return;
    }

    if (!editData.templateName?.trim()) {
      showError('Please enter or select a template name');
      return;
    }

    let finalContacts = [...(editData.contacts || [])];

    // Auto-add contact if user typed into the input field but didn't click "Add"
    if (newContact.phone && newContact.phone.trim()) {
      const cleanPhone = normalizePhone(newContact.phone.trim());
      if (cleanPhone && cleanPhone.length >= 7) {
        const exists = finalContacts.some(c => 
          (typeof c === 'string' ? normalizePhone(c) : normalizePhone(c.phone)) === cleanPhone
        );
        if (!exists) {
          finalContacts.push({
            phone: cleanPhone,
            name: newContact.name?.trim() || cleanPhone
          });
        }
      }
    }

    if (finalContacts.length === 0) {
      showError('Please add at least one contact phone number to update the campaign');
      return;
    }

    // Format payload cleanly with normalized phone numbers
    const payload = {
      name: editData.name.trim(),
      templateName: editData.templateName.trim(),
      scheduleType: editData.scheduleType,
      scheduledDays: editData.scheduleType === 'time-based' ? editData.scheduledDays : [],
      scheduledTime: editData.scheduleType === 'time-based' ? editData.scheduledTime : undefined,
      scheduledDate: editData.scheduleType === 'scheduled' && editData.scheduledDate
        ? new Date(editData.scheduledDate).toISOString()
        : undefined,
      contacts: finalContacts.map(c => ({
        phone: typeof c === 'string' ? normalizePhone(c) : normalizePhone(c.phone),
        name: (typeof c === 'string' ? c : (c.name || c.phone || '')).trim()
      }))
    };

    setSaving(true);
    try {
      await updateCampaign(campaignId, payload);
      showSuccess(`Campaign updated successfully with ${payload.contacts.length} contact${payload.contacts.length > 1 ? 's' : ''}!`);
      onBack();
    } catch (error) {
      console.error('Error updating campaign:', error);
      showError(error.message || 'Failed to update campaign');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !editData.name) {
    return (
      <div className="edit-campaign-container">
        <div className="loading">Loading campaign details...</div>
      </div>
    );
  }

  const filteredContacts = (editData.contacts || []).filter(c => {
    if (!contactSearch.trim()) return true;
    const term = contactSearch.toLowerCase();
    const phone = typeof c === 'string' ? c : c.phone;
    const name = typeof c === 'string' ? c : c.name;
    return String(phone || '').toLowerCase().includes(term) || String(name || '').toLowerCase().includes(term);
  });

  return (
    <div className="edit-campaign-container">
      <div className="edit-campaign-header">
        <div className="header-title-area">
          <h2>Edit Campaign</h2>
          <span className="campaign-subtitle">Update campaign parameters and target phone numbers</span>
        </div>
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={16} /> Back to Campaigns
        </button>
      </div>

      <div className="edit-campaign-form">
        <div className="form-group">
          <label>Campaign Name <span className="required">*</span></label>
          <input
            type="text"
            placeholder="Enter campaign name"
            value={editData.name || ''}
            onChange={(e) => setEditData({...editData, name: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>Template Name <span className="required">*</span></label>
          <input
            type="text"
            placeholder="e.g. warm_welcome"
            value={editData.templateName || ''}
            onChange={(e) => setEditData({...editData, templateName: e.target.value})}
          />
        </div>

        <div className="form-group">
          <label>When to Send</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {/* Send Now */}
            <div onClick={() => setEditData({...editData, scheduleType: 'one-time'})} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '13px 16px', borderRadius: '12px', cursor: 'pointer',
              border: `2px solid ${editData.scheduleType === 'one-time' ? '#25d366' : '#e5e7eb'}`,
              background: editData.scheduleType === 'one-time' ? '#f0fff7' : '#fff',
              transition: 'all 0.15s',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                background: editData.scheduleType === 'one-time' ? '#25d366' : '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z"
                    fill={editData.scheduleType === 'one-time' ? '#fff' : '#9ca3af'}
                    stroke={editData.scheduleType === 'one-time' ? '#fff' : '#9ca3af'}
                    strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>Send Now</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>Campaign starts immediately in the background</div>
              </div>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${editData.scheduleType === 'one-time' ? '#25d366' : '#d1d5db'}`,
                background: editData.scheduleType === 'one-time' ? '#25d366' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {editData.scheduleType === 'one-time' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
              </div>
            </div>

            {/* Schedule for Later */}
            <div onClick={() => setEditData({...editData, scheduleType: 'scheduled'})} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '13px 16px', borderRadius: '12px', cursor: 'pointer',
              border: `2px solid ${editData.scheduleType === 'scheduled' ? '#1877f2' : '#e5e7eb'}`,
              background: editData.scheduleType === 'scheduled' ? '#eff6ff' : '#fff',
              transition: 'all 0.15s',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                background: editData.scheduleType === 'scheduled' ? '#1877f2' : '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="17" rx="3" stroke={editData.scheduleType === 'scheduled' ? '#fff' : '#9ca3af'} strokeWidth="1.8"/>
                  <path d="M3 9H21" stroke={editData.scheduleType === 'scheduled' ? '#fff' : '#9ca3af'} strokeWidth="1.8"/>
                  <path d="M8 2V5M16 2V5" stroke={editData.scheduleType === 'scheduled' ? '#fff' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="12" cy="15" r="1.2" fill={editData.scheduleType === 'scheduled' ? '#fff' : '#9ca3af'}/>
                  <circle cx="7.5" cy="15" r="1.2" fill={editData.scheduleType === 'scheduled' ? '#fff' : '#9ca3af'}/>
                  <circle cx="16.5" cy="15" r="1.2" fill={editData.scheduleType === 'scheduled' ? '#fff' : '#9ca3af'}/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>Schedule for Later</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>Pick a date &amp; time — sent once automatically</div>
              </div>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${editData.scheduleType === 'scheduled' ? '#1877f2' : '#d1d5db'}`,
                background: editData.scheduleType === 'scheduled' ? '#1877f2' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {editData.scheduleType === 'scheduled' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
              </div>
            </div>

            {/* Weekly Recurring */}
            <div onClick={() => setEditData({...editData, scheduleType: 'time-based'})} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '13px 16px', borderRadius: '12px', cursor: 'pointer',
              border: `2px solid ${editData.scheduleType === 'time-based' ? '#7c3aed' : '#e5e7eb'}`,
              background: editData.scheduleType === 'time-based' ? '#f5f3ff' : '#fff',
              transition: 'all 0.15s',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                background: editData.scheduleType === 'time-based' ? '#7c3aed' : '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12C4 7.58 7.58 4 12 4C14.76 4 17.2 5.36 18.7 7.46" stroke={editData.scheduleType === 'time-based' ? '#fff' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M20 12C20 16.42 16.42 20 12 20C9.24 20 6.8 18.64 5.3 16.54" stroke={editData.scheduleType === 'time-based' ? '#fff' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M16 7L18.7 7.46L19.5 5" stroke={editData.scheduleType === 'time-based' ? '#fff' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 17L5.3 16.54L4.5 19" stroke={editData.scheduleType === 'time-based' ? '#fff' : '#9ca3af'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>Weekly Recurring</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>Repeat every week on selected days at a fixed time</div>
              </div>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${editData.scheduleType === 'time-based' ? '#7c3aed' : '#d1d5db'}`,
                background: editData.scheduleType === 'time-based' ? '#7c3aed' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {editData.scheduleType === 'time-based' && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
              </div>
            </div>
          </div>
        </div>

        {/* Schedule for Later: smart date picker */}
        {editData.scheduleType === 'scheduled' && (
          <div className="form-group">
            <label>Pick a Date &amp; Time</label>
            {/* Quick-pick chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {[
                { id: 'tom-morn', label: 'Tomorrow', sub: '9:00 AM', h: 9 },
                { id: 'tom-noon', label: 'Tomorrow', sub: '2:00 PM', h: 14 },
                { id: 'tom-eve',  label: 'Tomorrow', sub: '6:00 PM', h: 18 },
                { id: 'dayafter', label: 'Day After', sub: '9:00 AM', h: 9, plus: 2 },
              ].map(opt => {
                const isActive = quickPick === opt.id;
                return (
                  <button key={opt.id} type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + (opt.plus || 1));
                      d.setHours(opt.h, 0, 0, 0);
                      setQuickPick(opt.id);
                      setEditData({...editData, scheduledDate: d.toISOString().slice(0, 16)});
                    }}
                    style={{
                      padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', minWidth: '80px',
                      border: `1.5px solid ${isActive ? '#1877f2' : '#e5e7eb'}`,
                      background: isActive ? '#eff6ff' : '#f9fafb',
                      color: isActive ? '#1d4ed8' : '#374151',
                      fontSize: '12px', fontWeight: isActive ? '600' : '500',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                      transition: 'all 0.15s',
                    }}>
                    <span style={{ fontWeight: '600', fontSize: '13px' }}>{opt.label}</span>
                    <span style={{ fontSize: '11px', color: isActive ? '#3b82f6' : '#6b7280' }}>{opt.sub}</span>
                  </button>
                );
              })}
              <button type="button"
                onClick={() => setQuickPick('custom')}
                style={{
                  padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', minWidth: '80px',
                  border: `1.5px solid ${quickPick === 'custom' ? '#1877f2' : '#e5e7eb'}`,
                  background: quickPick === 'custom' ? '#eff6ff' : '#f9fafb',
                  color: quickPick === 'custom' ? '#1d4ed8' : '#374151',
                  fontSize: '12px', fontWeight: quickPick === 'custom' ? '600' : '500',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                  transition: 'all 0.15s',
                }}>
                <span style={{ fontWeight: '600', fontSize: '13px' }}>Custom</span>
                <span style={{ fontSize: '11px', color: quickPick === 'custom' ? '#3b82f6' : '#6b7280' }}>Choose date</span>
              </button>
            </div>
            {(quickPick === 'custom' || (!quickPick && editData.scheduledDate)) && (
              <input
                type="datetime-local"
                value={editData.scheduledDate || ''}
                min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
                onChange={(e) => setEditData({...editData, scheduledDate: e.target.value})}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d1d5db', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', marginBottom: '8px' }}
                autoFocus={quickPick === 'custom'}
              />
            )}
            {editData.scheduledDate && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', borderRadius: '8px',
                background: '#f0f9ff', border: '1px solid #bae6fd',
                fontSize: '13px', color: '#0369a1',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#0369a1" strokeWidth="1.8"/>
                  <path d="M12 7V12L15 15" stroke="#0369a1" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                Sending on <strong style={{ marginLeft: 4 }}>
                  {new Date(editData.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {' at '}
                  {new Date(editData.scheduledDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </strong>
              </div>
            )}
          </div>
        )}

        {editData.scheduleType === 'time-based' && (
          <div className="time-based-panel">
            <div className="form-group">
              <label><Calendar size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Select Days</label>
              <div className="days-selector">
                {daysOfWeek.map(day => (
                  <label key={day.value} className="day-option">
                    <input
                      type="checkbox"
                      checked={editData.scheduledDays?.includes(day.value) || false}
                      onChange={() => handleDayToggle(day.value)}
                    />
                    <span>{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label><Clock size={15} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Time (IST)</label>
              <input
                type="time"
                className="time-input"
                value={editData.scheduledTime || '09:00'}
                onChange={(e) => setEditData({...editData, scheduledTime: e.target.value})}
              />
              <small>Time will be scheduled in Indian Standard Time (IST)</small>
            </div>
          </div>
        )}

        {/* Contacts Section */}
        <div className="form-group contacts-section">
          <div className="contacts-header-row">
            <label>
              <Users size={16} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#2563eb' }} />
              Contacts ({editData.contacts?.length || 0})
            </label>
            {editData.contacts?.length > 0 && (
              <button
                type="button"
                onClick={clearAllContacts}
                className="clear-all-btn"
                title="Remove all contacts"
              >
                <Trash2 size={13} /> Clear All
              </button>
            )}
          </div>

          {/* Quick Input Bar */}
          <div className="contact-input">
            <div className="input-with-icon phone-input-box">
              <Phone size={15} className="field-icon" />
              <input
                type="text"
                placeholder="Phone number (e.g. 919944089576 or paste multiple)"
                value={newContact.phone}
                onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && addContact()}
              />
            </div>
            <div className="input-with-icon name-input-box">
              <User size={15} className="field-icon" />
              <input
                type="text"
                placeholder="Name (optional)"
                value={newContact.name}
                onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && addContact()}
              />
            </div>
            <button
              type="button"
              onClick={addContact}
              className="add-contact-btn"
              title="Add number to campaign"
            >
              <Plus size={16} /> Add
            </button>
          </div>
          <small className="contact-hint">
            Tip: You can enter a 10-digit number (91 is auto-added) or paste multiple comma/line-separated numbers.
          </small>

          {/* Excel / CSV File Import */}
          <div className="excel-import-box">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="excel-upload-btn"
            >
              <FileSpreadsheet size={16} />
              <span>{uploadedFileName ? `Imported: ${uploadedFileName}` : 'Import Contacts from Excel / CSV'}</span>
            </button>
          </div>

          {/* Search bar if multiple contacts */}
          {editData.contacts?.length > 5 && (
            <div className="contact-search-bar">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder={`Search among ${editData.contacts.length} contacts...`}
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
              {contactSearch && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => setContactSearch('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {/* Contacts List */}
          <div className="contacts-list">
            {filteredContacts.length === 0 ? (
              <div className="empty-contacts-state">
                <Users size={32} style={{ color: '#9ca3af', marginBottom: '8px' }} />
                <p>No contacts {contactSearch ? 'matching search' : 'added yet'}.</p>
                <span>Enter a phone number above or upload an Excel file to add recipients.</span>
              </div>
            ) : (
              filteredContacts.map((contact, index) => {
                const displayContact = typeof contact === 'string' 
                  ? { phone: contact, name: contact }
                  : contact;
                
                const originalIndex = editData.contacts.findIndex(c => 
                  (typeof c === 'string' ? c : c.phone) === displayContact.phone
                );
                
                return (
                  <div key={index} className="contact-item">
                    <div className="contact-info">
                      <span className="contact-name">{displayContact.name || displayContact.phone}</span>
                      <span className="contact-phone">{displayContact.phone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContact(originalIndex !== -1 ? originalIndex : index)}
                      className="remove-contact-btn"
                      title="Remove contact"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            onClick={handleUpdateCampaign}
            disabled={saving}
            className="update-btn"
          >
            {saving ? 'Updating Campaign...' : 'Update Campaign'}
          </button>
          <button
            onClick={onBack}
            disabled={saving}
            className="cancel-btn"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCampaign;