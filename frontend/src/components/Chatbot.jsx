import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, 
  FileText, 
  MessageCircle, 
  Send, 
  Trash2, 
  File, 
  Clock, 
  History,
  Info,
  Bot,
  User,
  Sparkles
} from 'lucide-react';
import { chatbotAPI } from '../api/chatbot';
import { useToast } from '../contexts/ToastContext';
import '../styles/Chatbot.css';

const PREVIEW_PHONE = '1234567890'; // Hardcoded for simplified sandbox

const Chatbot = () => {
  const { showSuccess, showError, showConfirm } = useToast();
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
    // Pre-load history for the test environment
    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isBotTyping]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchDocuments = async () => {
    try {
      const data = await chatbotAPI.getDocuments();
      setDocuments(data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.type) || file.name.endsWith('.docx')) {
        setSelectedFile(file);
      } else {
        showError('Please select a Word document (.docx)');
      }
    }
  };

  const handleDeleteDocument = async (id, filename) => {
    const confirmed = await showConfirm(`Delete "${filename}"? This cannot be undone.`);
    if (confirmed) {
      try {
        await chatbotAPI.deleteDocument(id);
        showSuccess('Document removed');
        fetchDocuments();
      } catch (error) {
        showError('Error deleting document');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      await chatbotAPI.uploadDocument(selectedFile);
      showSuccess('AI knowledge updated');
      setSelectedFile(null);
      fetchDocuments();
    } catch (error) {
      showError(error.message || 'Error uploading');
    } finally {
      setUploading(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testMessage.trim()) return;
    
    const userMsg = testMessage;
    setTestMessage('');
    
    // Optimistic UI update
    setChatHistory(prev => [
      ...prev,
      { message: userMsg, isFromUser: true, createdAt: new Date() }
    ]);
    
    setIsBotTyping(true);
    
    try {
      const data = await chatbotAPI.sendMessage(PREVIEW_PHONE, userMsg);
      setChatHistory(prev => [
        ...prev,
        { message: data.response, isFromUser: false, createdAt: new Date() }
      ]);
    } catch (error) {
      showError('Agent connection lost');
    } finally {
      setIsBotTyping(false);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const data = await chatbotAPI.getChatHistory(PREVIEW_PHONE);
      setChatHistory(data);
    } catch (error) {
      console.error('Could not load session history');
    }
  };

  const handleReset = async () => {
    try {
      await chatbotAPI.clearChatHistory(PREVIEW_PHONE);
      setChatHistory([]);
      setSelectedFile(null);
      showSuccess('Chat cleared');
    } catch (error) {
      showError('Failed to clear chat');
    }
  };

  return (
    <div className="chatbot-container-wrapper">
      <div className="chatbot-container">
        {/* Header Section */}
        <div className="chatbot-header">
          <div className="header-title-section">
            <h1>Document-Based Chatbot</h1>
            <p className="header-subtitle">Upload documents and test AI-powered responses</p>
          </div>
          <div className="chatbot-actions">
            <button className="btn-reset" onClick={handleReset}>
              <History size={16} />
              Reset Chat
            </button>
          </div>
        </div>

        <div className="chatbot-content">
          {/* Left Column: Management */}
          <div className="management-column">
            <div className="section-box">
              <div className="section-header-modern">
                <FileText className="section-header-icon" size={20} />
                <h2>Document Management</h2>
              </div>
              <div className="section-body">
                <div className="upload-dropzone">
                  <input
                    type="file"
                    id="doc-upload"
                    accept=".docx"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="doc-upload" className="upload-label">
                    <div className="upload-main-icon">
                      <Upload size={24} />
                    </div>
                    <div>
                      <span className="upload-text-primary">Click to upload training data</span>
                      <p className="upload-text-secondary">Only .DOCX files supported</p>
                    </div>
                  </label>
                </div>

                {selectedFile && (
                  <div className="selected-file-banner">
                    <div className="file-info">
                      <File size={16} />
                      <span>{selectedFile.name}</span>
                    </div>
                    <button 
                      onClick={handleUpload} 
                      disabled={uploading}
                      className="btn-meta-primary"
                    >
                      {uploading ? 'Processing...' : 'Train AI'}
                    </button>
                  </div>
                )}

                <div className="document-list-container">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Active Documents</span>
                    <span className="document-count">{documents.length} Files</span>
                  </div>
                  
                  <div className="documents-table-list">
                    {documents.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', background: 'white', color: '#65676B' }}>
                        <Info size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                        <p>No documents uploaded yet</p>
                      </div>
                    ) : (
                      documents.map((doc) => (
                        <div key={doc.id} className="document-row">
                          <div className="doc-type-icon">
                            <FileText size={16} />
                          </div>
                          <div className="doc-main-info">
                            <span className="doc-filename">{doc.filename}</span>
                            <div className="doc-meta">
                              <Clock size={12} />
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                            className="btn-delete-icon"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Testing */}
          <div className="testing-column">
            <div className="section-box">
              <div className="section-header-modern">
                <Bot className="section-header-icon" size={20} />
                <h2>AI Assistant Runtime</h2>
              </div>
              <div className="section-body" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0' }}>
                <div className="chat-window" style={{ borderRadius: '0 0 12px 12px', border: 'none' }}>
                  <div className="chat-messages">
                    {chatHistory.length === 0 ? (
                      <div style={{ margin: 'auto', textAlign: 'center', padding: '40px', color: '#65676B' }}>
                        <div style={{ background: '#e1f9eb', color: '#25D366', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                          <Bot size={32} />
                        </div>
                        <p style={{ fontWeight: 700, fontSize: '18px', color: '#1c1e21', marginBottom: '8px' }}>Chat with Knowledge Base</p>
                        <p style={{ fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}>Ask questions about your uploaded documents. The AI is ready to help.</p>
                      </div>
                    ) : (
                      <>
                        {chatHistory.map((msg, index) => (
                          <div key={index} className={`bubble ${msg.isFromUser ? 'user' : 'bot'}`}>
                            {msg.message}
                            <div className="bubble-time">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ))}
                        {isBotTyping && (
                          <div className="bubble bot typing">
                            <div className="typing-dots">
                              <span></span><span></span><span></span>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </>
                    )}
                  </div>

                  <div className="chat-input-area" style={{ background: '#f0f2f5', padding: '15px 20px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Ask anything..."
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleTestMessage()}
                        className="modern-input"
                        style={{ width: '100%', paddingRight: '45px', borderRadius: '24px' }}
                      />
                    </div>
                    <button onClick={handleTestMessage} disabled={!testMessage.trim() || isBotTyping} className="btn-meta-primary">
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
