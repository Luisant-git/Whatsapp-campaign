import React, { useState, useEffect } from 'react';
import { Upload, FileText, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatbotAPI } from '../api/chatbot';
import '../styles/Chatbot.css';

const Chatbot = () => {
  const [documents, setDocuments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

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
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        toast.error('Please select a PDF, Word document, or text file');
      }
    }
  };

  const handleDeleteDocument = async (id, filename) => {
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      try {
        await chatbotAPI.deleteDocument(id);
        toast.success('Document deleted successfully!');
        fetchDocuments();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Error deleting document');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);

    try {
      await chatbotAPI.uploadDocument(selectedFile);
      toast.success('Document uploaded successfully!');
      setSelectedFile(null);
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error uploading document');
    } finally {
      setUploading(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testPhone || !testMessage) {
      toast.error('Please enter both phone number and message');
      return;
    }

    try {
      const data = await chatbotAPI.sendMessage(testPhone, testMessage);
      toast.success('Message processed successfully!');
      setTestMessage('');
      
      setChatHistory(prev => [
        ...prev,
        { message: testMessage, isFromUser: true, createdAt: new Date() },
        { message: data.response, isFromUser: false, createdAt: new Date() }
      ]);
    } catch (error) {
      console.error('Message error:', error);
      toast.error('Error processing message');
    }
  };

  const fetchChatHistory = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }

    try {
      const data = await chatbotAPI.getChatHistory(testPhone);
      setChatHistory(data);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  return (
    <div className="chatbot-container">
      <div className="chatbot-header">
        <div className="header-title">
          <MessageCircle className="header-icon" />
          <div>
            <h1>Document-Based Chatbot</h1>
            <p>Upload documents and test AI-powered responses</p>
          </div>
        </div>
      </div>

      <div className="chatbot-content">
        <div className="upload-section">
          <div className="section-header">
            <FileText className="section-icon" />
            <h2>Document Management</h2>
          </div>
          
          <div className="upload-card">
            <div className="upload-area">
              <input
                type="file"
                id="file-input"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-input" className="upload-button">
                <Upload className="upload-icon" />
                Choose Document
              </label>
              
              {selectedFile && (
                <div className="selected-file">
                  <FileText className="file-icon" />
                  <span className="file-name">{selectedFile.name}</span>
                  <button 
                    onClick={handleUpload} 
                    disabled={uploading}
                    className="btn-primary"
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="documents-card">
            <div className="documents-header">
              <h3>Uploaded Documents</h3>
              <span className="document-count">{documents.length} files</span>
            </div>
            <div className="documents-list">
              {documents.length === 0 ? (
                <div className="empty-state">
                  <FileText className="empty-icon" />
                  <p>No documents uploaded yet</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="document-item">
                    <FileText className="doc-icon" />
                    <div className="doc-info">
                      <span className="doc-name">{doc.filename}</span>
                      <small className="doc-date">{new Date(doc.createdAt).toLocaleDateString()}</small>
                    </div>
                    <button 
                      onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                      className="btn-danger-small"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="test-section">
          <div className="section-header">
            <MessageCircle className="section-icon" />
            <h2>Test Chatbot</h2>
          </div>
          
          <div className="test-card">
            <div className="test-inputs">
              <div className="input-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g., 1234567890"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="form-input"
                />
              </div>
              
              <div className="input-group">
                <label>Test Message</label>
                <div className="message-input-area">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTestMessage()}
                    className="form-input"
                  />
                  <button onClick={handleTestMessage} className="btn-primary">
                    <Send size={16} />
                    Send
                  </button>
                </div>
              </div>

              <button onClick={fetchChatHistory} className="btn-secondary">
                Load Chat History
              </button>
            </div>
          </div>

          {chatHistory.length > 0 && (
            <div className="chat-history-card">
              <div className="chat-header">
                <h3>Chat History</h3>
                <span className="message-count">{chatHistory.length} messages</span>
              </div>
              <div className="messages-container">
                {chatHistory.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`message ${msg.isFromUser ? 'user-message' : 'bot-message'}`}
                  >
                    <div className="message-content">{msg.message}</div>
                    <div className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chatbot;