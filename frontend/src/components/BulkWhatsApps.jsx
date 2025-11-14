import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { IoCheckmarkOutline, IoCloseSharp, IoCloudUploadOutline, IoSendSharp, IoCloseOutline } from 'react-icons/io5';
import { sendBulkMessages } from '../api/whatsapp';
import '../styles/BulkWhatsApps.scss';

const BulkWhatsApp = () => {
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [templateName, setTemplateName] = useState('luisant_diwali_website50_v1');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [uploadedData, setUploadedData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [scheduleType, setScheduleType] = useState('one-time');
  const [scheduledDays, setScheduledDays] = useState([]);
  const [scheduledTime, setScheduledTime] = useState('09:00');

  const daysOfWeek = [
    { value: 'sunday', label: 'Sunday' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' }
  ];


  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const formatted = jsonData.map(row => ({
          name: row['Customer Name'] || row['Name'] || row['name'] || '',
          phone: String(row['Phone Number'] || row['Phone'] || row['phone'] || '').trim()
        })).filter(item => item.phone);

        setUploadedData(formatted);
        toast.success(`Loaded ${formatted.length} contacts from file`);
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error('Error reading file. Please check format.');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDayToggle = (day) => {
    setScheduledDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSendBulkMessages = async () => {
    let dataToSend = [];

    if (uploadedData.length > 0) {
      dataToSend = uploadedData;
    } else if (phoneNumbers.trim()) {
      const lines = phoneNumbers.split('\n').map(n => n.trim()).filter(n => n);
      dataToSend = lines.map(line => {
        const [phone, name] = line.split(',').map(s => s.trim());
        return {
          name: name || '',
          phone: phone || ''
        };
      }).filter(item => item.phone);
    } else {
      toast.error('Please upload a file or enter phone numbers');
      return;
    }

    if (scheduleType === 'time-based' && scheduledDays.length === 0) {
      toast.error('Please select at least one day for time-based scheduling');
      return;
    }

    const campaignData = {
      contacts: dataToSend,
      templateName,
      scheduleType,
      ...(scheduleType === 'time-based' && {
        scheduledDays,
        scheduledTime
      })
    };

    setLoading(true);
    try {
      const response = await sendBulkMessages(campaignData);
      
      if (!response || !Array.isArray(response)) {
        throw new Error('Invalid response from server');
      }
      
      setResults(response);
      const successCount = response.filter(r => r.success).length;
      const failedCount = response.filter(r => !r.success).length;
      
      if (scheduleType === 'time-based') {
        toast.success(`Campaign scheduled successfully for ${scheduledDays.join(', ')} at ${scheduledTime}`);
      } else {
        if (failedCount > 0) {
          toast.success(`Sent: ${successCount} | Failed: ${failedCount}`, {
            duration: 4000
          });
          toast.error('Some numbers may not be registered on WhatsApp or are invalid.');
        } else {
          toast.success(`Successfully sent to all ${successCount} contacts!`);
        }
      }
    } catch (error) {
      console.error('Error sending bulk messages:', error);
      toast.error(`Failed to send messages: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bulk-whatsapp">
      <div className="page-header">
        <div className="page-title">
          <h1>Bulk WhatsApp Messages</h1>
          <span className="page-subtitle">Send promotional messages to multiple customers</span>
        </div>
      </div>
      
      <div className="content-grid">
        <div className="form-section">
          <div className="form-group">
            <label className="form-label">
              Template Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="luisant_diwali_website50_v1"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Scheduling Type</label>
            <div className="schedule-type-selector">
              <label className="radio-option">
                <input
                  type="radio"
                  value="one-time"
                  checked={scheduleType === 'one-time'}
                  onChange={(e) => setScheduleType(e.target.value)}
                />
                <span>Send Now (One Time)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="time-based"
                  checked={scheduleType === 'time-based'}
                  onChange={(e) => setScheduleType(e.target.value)}
                />
                <span>Time-Based Scheduling</span>
              </label>
            </div>
          </div>

          {scheduleType === 'time-based' && (
            <>
              <div className="form-group">
                <label className="form-label">Select Days</label>
                <div className="days-selector">
                  {daysOfWeek.map(day => (
                    <label key={day.value} className="day-option">
                      <input
                        type="checkbox"
                        checked={scheduledDays.includes(day.value)}
                        onChange={() => handleDayToggle(day.value)}
                      />
                      <span>{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Time (IST)</label>
                <input
                  type="time"
                  className="form-input time-input"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
                <small className="form-hint">Time will be in Indian Standard Time (IST)</small>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Upload Excel/CSV File</label>
            <div className="file-upload-container">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                id="file-input"
                className="file-input"
              />
              <label htmlFor="file-input" className="file-upload-btn">
                <span className="upload-icon">
                  <IoCloudUploadOutline size={24} />
                </span>
                <span className="upload-text">
                  {fileName || 'Choose File (Excel/CSV)'}
                </span>
              </label>
              {uploadedData.length > 0 && (
                <div className="file-success">
                  <span className="success-icon">
                    <IoCheckmarkOutline size={18} />
                  </span>
                  <span className="success-text">{uploadedData.length} contacts loaded</span>
                  <button className="remove-file-btn" onClick={() => {
                    setUploadedData([]);
                    setFileName('');
                  }}>
                    <IoCloseOutline size={18} />
                  </button>
                </div>
              )}
            </div>
            <small className="form-hint">File should have columns: "Customer Name" and "Phone Number"</small>
          </div>

          <div className="divider">
            <span className="divider-text">OR</span>
          </div>

          <div className="manual-input-section">
            <div className="form-group">
              <label className="form-label">Phone Numbers with Customer Names (one per line)</label>
              <textarea
                rows="8"
                className="form-textarea"
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder="919876543210,John Doe&#10;919876543211,Jane Smith&#10;919876543212,Mike Johnson"
              />
              <small className="form-hint">Format: PhoneNumber,CustomerName (e.g., 919876543210,John Doe)</small>
            </div>
          </div>

          <div className="form-actions">
            <button 
              className={`send-btn ${loading ? 'loading' : ''}`}
              onClick={handleSendBulkMessages} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Sending Messages...
                </>
              ) : (
                <>
                  <span className="send-icon">
                    <IoSendSharp size={20} />
                  </span>
                  Send Bulk Messages
                </>
              )}
            </button>
          </div>
        </div>

        {results && (
          <div className="results-section">
            <div className="results-header">
              <h2>Delivery Results</h2>
              <div className="results-summary">
                <span className="success-count">
                  {results.filter(r => r.success).length} Sent
                </span>
                <span className="failed-count">
                  {results.filter(r => !r.success).length} Failed
                </span>
              </div>
            </div>
            <div className="results-list">
              {results.map((result, index) => (
                <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
                  <div className="result-info">
                    <div className="result-phone">{result.phoneNumber}</div>
                    {!result.success && result.error && (
                      <div className="result-error-msg">{result.error}</div>
                    )}
                  </div>
                  <div className="result-status">
                    <span className={`status-icon ${result.success ? 'success' : 'error'}`}>
                      {result.success ? <IoCheckmarkOutline size={16} /> : <IoCloseSharp size={16} />}
                    </span>
                    <span className="status-text">
                      {result.success ? 'Delivered' : 'Failed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

export default BulkWhatsApp;
