import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './WhatsAppChat.scss';
 
const WhatsAppChat = () => {
  const [messages, setMessages] = useState([
    { id: 1, from: '+1234567890', message: 'Hello! How are you?', direction: 'incoming', status: 'read', createdAt: '2024-01-15T10:30:00Z', mediaType: null },
    { id: 2, from: '+1234567890', message: 'I am doing great, thanks!', direction: 'outgoing', status: 'read', createdAt: '2024-01-15T10:31:00Z', mediaType: null },
    { id: 3, from: '+1234567890', message: 'Can we schedule a meeting?', direction: 'incoming', status: 'read', createdAt: '2024-01-15T10:32:00Z', mediaType: null },
    { id: 4, from: '+9876543210', message: 'Hi there!', direction: 'incoming', status: 'delivered', createdAt: '2024-01-15T11:00:00Z', mediaType: null },
    { id: 5, from: '+9876543210', message: 'Hey! What\'s up?', direction: 'outgoing', status: 'delivered', createdAt: '2024-01-15T11:01:00Z', mediaType: null },
    { id: 6, from: '+5555555555', message: 'Good morning!', direction: 'incoming', status: 'sent', createdAt: '2024-01-15T09:00:00Z', mediaType: null }
  ]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [chats, setChats] = useState([
    { phone: '+1234567890', lastMessage: 'Can we schedule a meeting?', lastTime: '2024-01-15T10:32:00Z', unreadCount: 0 },
    { phone: '+9876543210', lastMessage: 'Hey! What\'s up?', lastTime: '2024-01-15T11:01:00Z', unreadCount: 1 },
    { phone: '+5555555555', lastMessage: 'Good morning!', lastTime: '2024-01-15T09:00:00Z', unreadCount: 1 }
  ]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [readMessages, setReadMessages] = useState(() => {
    const saved = localStorage.getItem('readMessages');
    return saved ? JSON.parse(saved) : {};
  });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
 
  useEffect(() => {
    if (import.meta.env.VITE_API_BASE_URL) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [readMessages]);

  const fetchMessages = async () => {
    if (!import.meta.env.VITE_API_BASE_URL) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/whatsapp/messages`);
      setMessages(response.data);
     
      const uniqueChats = {};
      response.data.forEach(msg => {
        if (!uniqueChats[msg.from]) {
          uniqueChats[msg.from] = {
            phone: msg.from,
            lastMessage: msg.message || 'Media',
            lastTime: msg.createdAt,
            unreadCount: 0
          };
        }
        if (new Date(msg.createdAt) > new Date(uniqueChats[msg.from].lastTime)) {
          uniqueChats[msg.from].lastMessage = msg.message || 'Media';
          uniqueChats[msg.from].lastTime = msg.createdAt;
        }
        if (msg.direction === 'incoming' && (!readMessages[msg.from] || new Date(msg.createdAt) > new Date(readMessages[msg.from]))) {
          uniqueChats[msg.from].unreadCount++;
        }
      });
      setChats(Object.values(uniqueChats).sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime)));
      setChats(Object.values(uniqueChats));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
 
  const sendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !selectedChat) return;

    const tempMessage = {
      id: Date.now(),
      from: selectedChat,
      message: messageText,
      direction: 'outgoing',
      status: 'sent',
      createdAt: new Date().toISOString(),
      mediaType: selectedFile ? (selectedFile.type.startsWith('image') ? 'image' : selectedFile.type.startsWith('video') ? 'video' : 'document') : null
    };

    setMessages(prev => [...prev, tempMessage]);
    const currentMessage = messageText;
    const currentFile = selectedFile;
    setMessageText('');
    setSelectedFile(null);

    if (!import.meta.env.VITE_API_BASE_URL) return;

    try {
      if (currentFile) {
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('to', selectedChat);
        if (messageText.trim()) formData.append('caption', messageText);
       
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/whatsapp/send-media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL}/whatsapp/send-message`, {
          to: selectedChat,
          message: currentMessage
        });
      }
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    }
  };
 
  const filteredMessages = selectedChat
    ? messages.filter(m => m.from === selectedChat)
    : [];
 
  return (
    <div className="whatsapp-chat">
      <div className="chat-sidebar">
        <h2>WhatsApp Chats</h2>
        {chats.map(chat => (
          <div
            key={chat.phone}
            className={`chat-item ${selectedChat === chat.phone ? 'active' : ''} ${chat.unreadCount > 0 ? 'unread' : ''}`}
            onClick={() => {
              setSelectedChat(chat.phone);
              if (chat.unreadCount > 0) {
                const newReadMessages = { ...readMessages, [chat.phone]: new Date().toISOString() };
                setReadMessages(newReadMessages);
                localStorage.setItem('readMessages', JSON.stringify(newReadMessages));
              }
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
            }}
          >
            <div className="chat-avatar">{chat.phone.slice(-4)}</div>
            <div className="chat-info">
              <div className="chat-phone">
                {chat.phone}
                {chat.unreadCount > 0 && <span className="unread-badge">{chat.unreadCount}</span>}
              </div>
              <div className="chat-last-msg">{chat.lastMessage}</div>
            </div>
          </div>
        ))}
      </div>
 
      <div className="chat-main">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <h3>{selectedChat}</h3>
            </div>
            <div className="chat-messages">
              {filteredMessages.map(msg => (
                <div key={msg.id} className={`message ${msg.direction}`}>
                  <div className="message-bubble">
                    {msg.mediaType === 'image' && msg.mediaUrl && (
                      <img src={msg.mediaUrl} alt="media" className="message-media" />
                    )}
                    {msg.mediaType === 'video' && msg.mediaUrl && (
                      <video src={msg.mediaUrl} controls className="message-media" />
                    )}
                    {msg.mediaType === 'audio' && msg.mediaUrl && (
                      <audio src={msg.mediaUrl} controls className="message-audio" />
                    )}
                    {msg.mediaType === 'document' && msg.mediaUrl && (
                      <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="message-document">
                        📄 Document
                      </a>
                    )}
                    {msg.message && msg.message !== 'image file' && msg.message !== 'video file' && msg.message !== 'audio file' && msg.message !== 'document file' && <p>{msg.message}</p>}
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                      {msg.direction === 'outgoing' && (
                        <span className={`tick-mark ${msg.status}`}>
                          {msg.status === 'sent' && '✓'}
                          {msg.status === 'delivered' && '✓✓'}
                          {msg.status === 'read' && '✓✓'}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => setSelectedFile(e.target.files[0])}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              />
              {selectedFile && (
                <div className="file-preview">
                  <span>{selectedFile.name}</span>
                  <button className="remove-file" onClick={() => setSelectedFile(null)}>×</button>
                </div>
              )}
              <div className="input-wrapper">
                <button className="attach-btn" onClick={() => fileInputRef.current?.click()}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button className="send-btn" onClick={sendMessage}>Send</button>
              </div>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
};
 
export default WhatsAppChat;