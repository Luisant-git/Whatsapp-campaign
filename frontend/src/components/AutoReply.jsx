import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../api/config';
import { useToast } from '../contexts/ToastContext';
import '../styles/AutoReply.css';

const AutoReply = () => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [replies, setReplies] = useState([]);
  const [newTriggers, setNewTriggers] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchReplies();
  }, []);

  const fetchReplies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auto-reply`, {
        credentials: 'include'
      });
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
    if (!newTriggers.trim() || !newResponse.trim()) return;
    
    setSaving(true);
    try {
      const triggersArray = newTriggers.split(',').map(t => t.trim()).filter(t => t);
      const response = await fetch(`${API_BASE_URL}/auto-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ triggers: triggersArray, response: newResponse })
      });
      
      if (response.ok) {
        setNewTriggers('');
        setNewResponse('');
        fetchReplies();
        showSuccess('Auto-reply added successfully!');
      } else {
        showError('Failed to add auto-reply');
      }
    } catch (error) {
      console.error('Failed to add auto-reply:', error);
      showError('Failed to add auto-reply');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this auto-reply?');
    if (confirmed) {
      try {
        const response = await fetch(`${API_BASE_URL}/auto-reply/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (response.ok) {
          fetchReplies();
          showSuccess('Auto-reply deleted successfully!');
        } else {
          showError('Failed to delete auto-reply');
        }
      } catch (error) {
        console.error('Failed to delete auto-reply:', error);
        showError('Failed to delete auto-reply');
      }
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
              <label>Trigger Words (comma-separated)</label>
              <input
                type="text"
                value={newTriggers}
                onChange={(e) => setNewTriggers(e.target.value)}
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
          <button className="btn-add" onClick={handleAdd} disabled={saving || !newTriggers.trim() || !newResponse.trim()}>
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
                      <strong>Triggers:</strong> {Array.isArray(reply.triggers) ? reply.triggers.join(', ') : reply.triggers}
                    </div>
                    <div className="response-text">
                      <strong>Response:</strong> {reply.response}
                    </div>
                  </div>
                  <button 
                    className="btn-icon danger" 
                    onClick={() => handleDelete(reply.id)}
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


    </div>
  );
};

export default AutoReply;
