import React, { useState, useEffect } from 'react';
import { Send, Plus, Eye, Trash2, RefreshCw } from 'lucide-react';
import '../styles/FlowManager.css';

const FlowManager = () => {
  const [flows, setFlows] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({
    to: '',
    flowName: '',
    flowCta: 'Open Flow',
    header: '',
    body: '',
    footer: '',
    flowAction: 'data_exchange'
  });

  useEffect(() => {
    fetchPhoneNumbers();
  }, []);

  const fetchPhoneNumbers = async () => {
    try {
      const response = await fetch('/api/settings/all');
      const data = await response.json();
      setPhoneNumbers(data);
      if (data.length > 0) {
        setSelectedPhone(data[0].phoneNumberId);
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
    }
  };

  const handleSendFlow = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/flow-message/send/${selectedPhone}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendForm)
      });

      if (response.ok) {
        alert('Flow message sent successfully!');
        setShowSendModal(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(`Failed to send: ${error.message}`);
      }
    } catch (error) {
      alert('Error sending flow message');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAppointmentFlow = async (recipient) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/flow-message/send-appointment/${selectedPhone}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipient })
      });

      if (response.ok) {
        alert('Appointment flow sent successfully!');
      } else {
        alert('Failed to send appointment flow');
      }
    } catch (error) {
      alert('Error sending appointment flow');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSendForm({
      to: '',
      flowName: '',
      flowCta: 'Open Flow',
      header: '',
      body: '',
      footer: '',
      flowAction: 'data_exchange'
    });
  };

  return (
    <div className="flow-manager">
      <div className="flow-header">
        <h1>WhatsApp Flows Manager</h1>
        <div className="flow-actions">
          <select 
            value={selectedPhone} 
            onChange={(e) => setSelectedPhone(e.target.value)}
            className="phone-select"
          >
            {phoneNumbers.map(phone => (
              <option key={phone.phoneNumberId} value={phone.phoneNumberId}>
                {phone.name} ({phone.phoneNumberId})
              </option>
            ))}
          </select>
          <button 
            className="btn-primary"
            onClick={() => setShowSendModal(true)}
          >
            <Send size={18} />
            Send Flow
          </button>
        </div>
      </div>

      <div className="flow-grid">
        {/* Quick Actions */}
        <div className="flow-card quick-actions">
          <h3>Quick Actions</h3>
          <div className="quick-action-buttons">
            <button 
              className="quick-btn appointment"
              onClick={() => {
                const recipient = prompt('Enter recipient phone number:');
                if (recipient) handleSendAppointmentFlow(recipient);
              }}
            >
              <Plus size={20} />
              Send Appointment Flow
            </button>
            <button 
              className="quick-btn custom"
              onClick={() => setShowSendModal(true)}
            >
              <Send size={20} />
              Send Custom Flow
            </button>
          </div>
        </div>

        {/* Flow Templates */}
        <div className="flow-card templates">
          <h3>Flow Templates</h3>
          <div className="template-list">
            <div className="template-item">
              <div className="template-info">
                <h4>📅 Appointment Booking</h4>
                <p>Book appointments with department, location, date & time selection</p>
              </div>
              <button 
                className="btn-secondary"
                onClick={() => {
                  setSendForm({
                    ...sendForm,
                    flowName: 'appointment_booking_v1',
                    flowCta: 'Book Appointment',
                    header: '📅 Book Your Appointment',
                    body: 'Click the button below to book your appointment with us.',
                    footer: 'Powered by WhatsApp Flows'
                  });
                  setShowSendModal(true);
                }}
              >
                Use Template
              </button>
            </div>
          </div>
        </div>

        {/* Flow Statistics */}
        <div className="flow-card stats">
          <h3>Flow Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Flows Sent Today</span>
              <span className="stat-value">0</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Completed Flows</span>
              <span className="stat-value">0</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active Flows</span>
              <span className="stat-value">1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Send Flow Modal */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Send Flow Message</h2>
              <button 
                className="close-btn"
                onClick={() => setShowSendModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSendFlow} className="flow-form">
              <div className="form-group">
                <label>Recipient Phone Number *</label>
                <input
                  type="text"
                  placeholder="1234567890"
                  value={sendForm.to}
                  onChange={(e) => setSendForm({...sendForm, to: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Flow Name *</label>
                <input
                  type="text"
                  placeholder="appointment_booking_v1"
                  value={sendForm.flowName}
                  onChange={(e) => setSendForm({...sendForm, flowName: e.target.value})}
                  required
                />
                <small>The name of your Flow in Meta Business Manager</small>
              </div>

              <div className="form-group">
                <label>Button Text (CTA) *</label>
                <input
                  type="text"
                  placeholder="Open Flow"
                  value={sendForm.flowCta}
                  onChange={(e) => setSendForm({...sendForm, flowCta: e.target.value})}
                  required
                  maxLength={30}
                />
              </div>

              <div className="form-group">
                <label>Header</label>
                <input
                  type="text"
                  placeholder="Flow message header"
                  value={sendForm.header}
                  onChange={(e) => setSendForm({...sendForm, header: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Body *</label>
                <textarea
                  placeholder="Flow message body"
                  value={sendForm.body}
                  onChange={(e) => setSendForm({...sendForm, body: e.target.value})}
                  required
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Footer</label>
                <input
                  type="text"
                  placeholder="Flow message footer"
                  value={sendForm.footer}
                  onChange={(e) => setSendForm({...sendForm, footer: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Flow Action</label>
                <select
                  value={sendForm.flowAction}
                  onChange={(e) => setSendForm({...sendForm, flowAction: e.target.value})}
                >
                  <option value="navigate">Navigate</option>
                  <option value="data_exchange">Data Exchange</option>
                </select>
                <small>Use "data_exchange" to call your endpoint</small>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowSendModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Flow'}
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