import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../api/config';
import { getMessages, sendMessage, sendMediaMessage } from '../api/whatsapp';
import '../styles/WhatsAppChat.scss';
 
const WhatsAppChat = () => {
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [chats, setChats] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [readMessages, setReadMessages] = useState(() => {
    const saved = localStorage.getItem('readMessages');
    return saved ? JSON.parse(saved) : {};
  });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
 
  useEffect(() => {
    if (API_BASE_URL) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [readMessages]);

  const fetchMessages = async () => {
    if (!API_BASE_URL) return;
    try {
      const messages = await getMessages();
      console.log('Fetched messages:', messages); // Debug log
      setMessages(messages);
     
      const uniqueChats = {};
      messages.forEach(msg => {
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
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
    }
  };
 
  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !selectedChat) return;

    const mediaType = selectedFile ? 
      (selectedFile.type.startsWith('image') ? 'image' : 
       selectedFile.type.startsWith('video') ? 'video' : 
       selectedFile.type.startsWith('audio') ? 'audio' : 'document') : null;

    const tempMessage = {
      id: Date.now(),
      from: selectedChat,
      message: messageText || (mediaType ? `${mediaType} file` : ''),
      direction: 'outgoing',
      status: 'sent',
      createdAt: new Date().toISOString(),
      mediaType,
      mediaUrl: selectedFile ? URL.createObjectURL(selectedFile) : null
    };

    setMessages(prev => [...prev, tempMessage]);
    const currentMessage = messageText;
    const currentFile = selectedFile;
    setMessageText('');
    setSelectedFile(null);

    if (!API_BASE_URL) return;

    try {
      if (currentFile) {
        await sendMediaMessage(selectedChat, currentFile, currentMessage);
      } else {
        await sendMessage(selectedChat, currentMessage);
      }
      await fetchMessages();
      toast.success('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(`Failed to send message: ${error.message}`);
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
                      <img src={msg.mediaUrl} alt="media" className="message-media" onError={(e) => {
                        console.error('Image load error:', msg.mediaUrl);
                        e.target.style.display = 'none';
                      }} />
                    )}
                    {msg.mediaType === 'video' && msg.mediaUrl && (
                      <video src={msg.mediaUrl} controls className="message-media" onError={(e) => {
                        console.error('Video load error:', msg.mediaUrl);
                        e.target.style.display = 'none';
                      }} />
                    )}
                    {msg.mediaType === 'audio' && msg.mediaUrl && (
                      <audio src={msg.mediaUrl} controls className="message-audio" onError={(e) => {
                        console.error('Audio load error:', msg.mediaUrl);
                      }} />
                    )}
                    {msg.mediaType === 'document' && msg.mediaUrl && (
                      <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="message-document">
                        📄 Document
                      </a>
                    )}
                    {msg.message && !msg.message.endsWith(' file') && <p>{msg.message}</p>}
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
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button className="send-btn" onClick={handleSendMessage}>Send</button>
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