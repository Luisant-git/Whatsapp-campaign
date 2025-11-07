import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { IoSettingsOutline, IoCloseOutline, IoCheckmarkOutline, IoCloseSharp, IoCloudUploadOutline, IoSendSharp } from 'react-icons/io5';
import { FaWhatsapp } from 'react-icons/fa';
import { API_BASE_URL } from '../api/config';
import { sendBulkMessages } from '../api/whatsapp';
import '../styles/BulkWhatsApps.scss';

const BulkWhatsApp = () => {
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [templateName, setTemplateName] = useState('luisant_diwali_website50_v1');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [uploadedData, setUploadedData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    templateName: 'luisant_diwali_website50_v1',
    phoneNumberId: '803957376127788',
    accessToken: 'EAAcMSpblosgBPTKtrvvphW8d8LeaTmookQekua5EzRtuMdOXZC7C7PMZCjeK740u6AaquUYUf7JBtFa0h0y8dXnCdShKlCkG9otefSx1xGNCOG1aCZBIzNI5STmlMYuFu9LrWRIPZCXSQDvdQxrp0V4dJRYuIylhas1VO14OZAbYHzAgrH2WjhqcJcPNSWwOyEwZDZD'
  });

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

  const handleSendBulkMessages = async () => {
    let dataToSend = [];

    if (uploadedData.length > 0) {
      dataToSend = uploadedData;
    } else if (phoneNumbers.trim()) {
      const numbers = phoneNumbers.split('\n').map(n => n.trim()).filter(n => n);
      dataToSend = numbers.map(phone => ({
        name: customerName,
        phone
      }));
    } else {
      toast.error('Please upload a file or enter phone numbers');
      return;
    }

    setLoading(true);
    try {
      const response = await sendBulkMessages(dataToSend, templateName);
      
      if (!response || !Array.isArray(response)) {
        throw new Error('Invalid response from server');
      }
      
      setResults(response);
      const successCount = response.filter(r => r.success).length;
      const failedCount = response.filter(r => !r.success).length;
      
      if (failedCount > 0) {
        toast.success(`Sent: ${successCount} | Failed: ${failedCount}`, {
          duration: 4000
        });
        toast.error('Some numbers may not be registered on WhatsApp or are invalid.');
      } else {
        toast.success(`Successfully sent to all ${successCount} contacts!`);
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
        <button className="settings-btn" onClick={() => setShowSettings(true)} title="Settings">
          <IoSettingsOutline size={20} />
        </button>
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
              <label className="form-label">Customer Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Numbers (one per line)</label>
              <textarea
                rows="8"
                className="form-textarea"
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder="919876543210&#10;919876543211&#10;919876543212"
              />
              <small className="form-hint">Enter phone numbers with country code (e.g., 919876543210)</small>
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

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <FaWhatsapp size={24} />
                <h2>WhatsApp Configuration</h2>
              </div>
              <button className="close-btn" onClick={() => setShowSettings(false)}>
                <IoCloseOutline size={22} />
              </button>
            </div>
            <div className="modal-body">
              <div className="settings-form">
                <div className="form-group">
                  <label className="form-label">
                    Template Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.templateName}
                    onChange={(e) => setSettings({...settings, templateName: e.target.value})}
                    placeholder="e.g., luisant_diwali_website50_v1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.phoneNumberId}
                    onChange={(e) => setSettings({...settings, phoneNumberId: e.target.value})}
                    placeholder="Enter WhatsApp Phone Number ID"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    WhatsApp Access Token
                  </label>
                  <textarea
                    rows="4"
                    className="form-textarea"
                    value={settings.accessToken}
                    onChange={(e) => setSettings({...settings, accessToken: e.target.value})}
                    placeholder="Paste your WhatsApp Business API access token"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowSettings(false)}>
                <IoCloseOutline size={18} />
                Cancel
              </button>
              <button className="save-btn" onClick={() => {
                setTemplateName(settings.templateName);
                setShowSettings(false);
                toast.success('Settings saved successfully!');
              }}>
                <IoCheckmarkOutline size={18} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkWhatsApp;
