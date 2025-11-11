import React, { useState, useEffect } from 'react';
import { CheckCircle, Plus, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../api/config';
import '../styles/AutoReply.css';

const AutoReply = () => {
  const [replies, setReplies] = useState([]);
  const [newTrigger, setNewTrigger] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    fetchReplies();
  }, []);

  const fetchReplies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auto-reply`);
      if (response.ok) {
        const data = await response.json();
        setReplies(Array.isArray(data) ? data : []);
      } else {
        setReplies([]);
      }
    } catch (error) {
      console.error('Failed to fetch auto-replies:', error);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newTrigger.trim() || !newResponse.trim()) return;
    
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auto-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: newTrigger, response: newResponse })
      });
      
      if (response.ok) {
        setNewTrigger('');
        setNewResponse('');
        fetchReplies();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to add auto-reply:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (trigger) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auto-reply/${trigger}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchReplies();
      }
    } catch (error) {
      console.error('Failed to delete auto-reply:', error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="auto-reply-container">
      <div className="page-header">
        <div className="page-title">
          <h1>Auto-Reply Messages</h1>
          <span className="page-subtitle">Manage automated responses for your WhatsApp bot</span>
        </div>
      </div>

      <div className="reply-form">
        <div className="add-reply-section">
          <h3>Add New Auto-Reply</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Trigger Word</label>
              <input
                type="text"
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                placeholder="e.g., hello, help, info"
              />
            </div>
            <div className="form-group">
              <label>Response Message</label>
              <textarea
                rows="3"
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                placeholder="Enter the response message..."
              />
            </div>
          </div>
          <button className="btn-add" onClick={handleAdd} disabled={saving || !newTrigger.trim() || !newResponse.trim()}>
            <Plus size={16} />
            {saving ? 'Adding...' : 'Add Reply'}
          </button>
        </div>

        <div className="replies-list">
          <h3>Current Auto-Replies</h3>
          {!Array.isArray(replies) || replies.length === 0 ? (
            <p className="no-replies">No auto-replies configured yet.</p>
          ) : (
            <div className="replies-grid">
              {replies.map((reply, index) => (
                <div key={index} className="reply-item">
                  <div className="reply-content">
                    <div className="trigger-text">
                      <strong>Trigger:</strong> {reply.trigger}
                    </div>
                    <div className="response-text">
                      <strong>Response:</strong> {reply.response}
                    </div>
                  </div>
                  <button 
                    className="btn-delete" 
                    onClick={() => handleDelete(reply.trigger)}
                    title="Delete this auto-reply"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showSuccess && (
        <div className="success-message">
          <CheckCircle size={20} />
          Auto-reply updated successfully!
        </div>
      )}
    </div>
  );
};

export default AutoReply;
