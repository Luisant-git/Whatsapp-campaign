import React, { useState, useEffect } from 'react';
import { Send, Plus, X } from 'lucide-react';
import flowAPI from '../api/flow';
import '../styles/FlowManager.css';

const FlowManager = () => {
  const [flows, setFlows] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState(['']);
  const [selectedFlow, setSelectedFlow] = useState('');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      const flowsData = await flowAPI.getFlows();
      setFlows(flowsData);
      if (flowsData.length > 0) {
        setSelectedFlow(flowsData[0].id);
      }
    } catch (error) {
      console.error('Error loading flows:', error);
    }
  };

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, '']);
  };

  const removePhoneNumber = (index) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index));
    }
  };

  const updatePhoneNumber = (index, value) => {
    const updated = [...phoneNumbers];
    updated[index] = value;
    setPhoneNumbers(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);

    const validPhoneNumbers = phoneNumbers.filter(phone => phone.trim());
    
    if (validPhoneNumbers.length === 0) {
      alert('Please enter at least one phone number');
      setLoading(false);
      return;
    }

    const selectedFlowData = flows.find(f => f.id === selectedFlow);

    try {
      const result = await flowAPI.sendFlow({
        phoneNumbers: validPhoneNumbers,
        flowId: selectedFlow,
        headerText,
        bodyText,
        footerText,
        ctaText,
        screenName: selectedFlowData?.firstScreen || 'APPOINTMENT',
        screenData: {}
      });

      setResults(result);
    } catch (error) {
      console.error('Error sending flow:', error);
      setResults({ error: error.message });
    }

    setLoading(false);
  };

  return (
    <div className="flow-manager">
      <div className="page-header">
        <div className="page-title">
          <h1>Flow Manager</h1>
          <p className="page-subtitle">Send interactive Flow messages to multiple phone numbers</p>
        </div>
      </div>

      <div className="content-grid">
        <div className="form-section">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                Flow Selection <span className="required">*</span>
              </label>
              <select 
                className="form-input"
                value={selectedFlow} 
                onChange={(e) => setSelectedFlow(e.target.value)}
                required
              >
                <option value="">Select a Flow...</option>
                {flows.map(flow => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name} - {flow.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Phone Numbers <span className="required">*</span>
              </label>
              {phoneNumbers.map((phone, index) => (
                <div key={index} className="phone-input-row">
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="Enter phone number (e.g., 919360999351)"
                    value={phone}
                    onChange={(e) => updatePhoneNumber(index, e.target.value)}
                    required={index === 0}
                  />
                  {phoneNumbers.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removePhoneNumber(index)}
                      className="remove-phone-btn"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addPhoneNumber} className="add-phone-btn">
                <Plus size={16} />
                <span>Add Phone Number</span>
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Header Text</label>
              <input
                type="text"
                className="form-input"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                maxLength={60}
                placeholder="Enter header text"
              />
              <span className="form-hint">{headerText.length}/60 characters</span>
            </div>

            <div className="form-group">
              <label className="form-label">Body Text</label>
              <textarea
                className="form-textarea"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={3}
                maxLength={1024}
                placeholder="Enter body text"
              />
              <span className="form-hint">{bodyText.length}/1024 characters</span>
            </div>

            <div className="form-group">
              <label className="form-label">Footer Text</label>
              <input
                type="text"
                className="form-input"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                maxLength={60}
                placeholder="Enter footer text"
              />
              <span className="form-hint">{footerText.length}/60 characters</span>
            </div>

            <div className="form-group">
              <label className="form-label">Button Text</label>
              <input
                type="text"
                className="form-input"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                maxLength={20}
                placeholder="Enter button text"
              />
              <span className="form-hint">{ctaText.length}/20 characters</span>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="send-btn">
                {loading ? (
                  <>
                    <div className="loading-spinner" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} className="send-icon" />
                    <span>Send Flow Messages</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {results && (
          <div className="results-section">
            <div className="results-header">
              <h2>Results</h2>
              <div className="results-summary">
                <span className="success-count">✓ {results.totalSent} Sent</span>
                <span className="failed-count">✗ {results.totalFailed} Failed</span>
              </div>
            </div>
            
            <div className="results-list">
              {results.results?.map((result, index) => (
                <div key={index} className={`result-item ${result.status === 'success' ? 'success' : 'error'}`}>
                  <div className="result-info">
                    <div className="result-phone">{result.phoneNumber}</div>
                    {result.status === 'failed' && (
                      <div className="result-error-msg">{result.error}</div>
                    )}
                    {result.status === 'success' && result.messageId && (
                      <div className="result-error-msg">ID: {result.messageId}</div>
                    )}
                  </div>
                  <div className="result-status">
                    <span className={`status-icon ${result.status === 'success' ? 'success' : 'error'}`}>
                      {result.status === 'success' ? '✓' : '✗'}
                    </span>
                    <span className="status-text">{result.status}</span>
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

export default FlowManager;