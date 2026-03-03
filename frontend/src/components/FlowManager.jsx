import React, { useState, useEffect } from 'react';
import flowAPI from '../api/flow';
import '../styles/FlowManager.css';

const FlowManager = () => {
  const [flows, setFlows] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState(['']);
  const [selectedFlow, setSelectedFlow] = useState('');
  const [headerText, setHeaderText] = useState('Welcome to Flow Sample');
  const [bodyText, setBodyText] = useState('Click the button below to start the Flow experience!');
  const [footerText, setFooterText] = useState('Powered by Meta Flow');
  const [ctaText, setCtaText] = useState('Start Flow');
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
      <div className="flow-header">
        <h1>📱 WhatsApp Flow Manager</h1>
        <p>Send interactive Flow messages to multiple phone numbers</p>
      </div>

      <div className="flow-card">
        <h2>Send Flow Message</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Flow Selection:</label>
            <select 
              value={selectedFlow} 
              onChange={(e) => setSelectedFlow(e.target.value)}
              required
            >
              <option value="">Select a Flow...</option>
              {flows.map(flow => (
                <option key={flow.id} value={flow.id}>
                  {flow.name} ({flow.description})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Phone Numbers:</label>
            {phoneNumbers.map((phone, index) => (
              <div key={index} className="phone-input">
                <input
                  type="tel"
                  placeholder="Enter phone number (e.g., 919360999351)"
                  value={phone}
                  onChange={(e) => updatePhoneNumber(index, e.target.value)}
                  required={index === 0}
                />
                {phoneNumbers.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removePhoneNumber(index)}
                    className="remove-btn"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addPhoneNumber} className="add-btn">
              + Add Phone Number
            </button>
          </div>

          <div className="form-group">
            <label>Header Text:</label>
            <input
              type="text"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              maxLength="60"
            />
          </div>

          <div className="form-group">
            <label>Body Text:</label>
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows="3"
              maxLength="1024"
            />
          </div>

          <div className="form-group">
            <label>Footer Text:</label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              maxLength="60"
            />
          </div>

          <div className="form-group">
            <label>Button Text:</label>
            <input
              type="text"
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              maxLength="20"
            />
          </div>

          <button type="submit" disabled={loading} className="send-btn">
            {loading ? 'Sending...' : '🚀 Send Flow Messages'}
          </button>
        </form>

        {loading && (
          <div className="loading">
            <p>Sending messages... Please wait</p>
          </div>
        )}

        {results && (
          <div className="results">
            {results.error ? (
              <p className="error">❌ Error: {results.error}</p>
            ) : (
              <>
                <h3>Results:</h3>
                <p className="success">✅ Successfully sent: {results.totalSent}</p>
                <p className="error">❌ Failed: {results.totalFailed}</p>
                <div className="result-details">
                  {results.results?.map((result, index) => (
                    <p key={index} className={result.status === 'success' ? 'success' : 'error'}>
                      {result.status === 'success' ? '✅' : '❌'} {result.phoneNumber} - 
                      {result.status === 'success' 
                        ? ` Message ID: ${result.messageId}` 
                        : ` Error: ${result.error}`
                      }
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowManager;