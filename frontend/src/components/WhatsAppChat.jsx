import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../api/config';
import { getMessages, sendMessage, sendMediaMessage, getLabels, updateLabels, getCustomLabels, addCustomLabel as addCustomLabelAPI, deleteCustomLabel as deleteCustomLabelAPI } from '../api/whatsapp';
import { useLabelsSocket } from '../hooks/useLabelsSocket';
import { MoreVertical } from 'lucide-react';
import '../styles/WhatsAppChat.scss';

// Simple play/pause icons
const PlayIcon = () => (
  <span style={{ fontSize: '16px', color: 'inherit' }}>▶</span>
);

const PauseIcon = () => (
  <span style={{ fontSize: '16px', color: 'inherit' }}>⏸</span>
);

const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="12" x2="12" y1="19" y2="23" stroke="currentColor" strokeWidth="2" />
    <line x1="8" x2="16" y1="23" y2="23" stroke="currentColor" strokeWidth="2" />
  </svg>
);

// Document icons
const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10,9 9,9 8,9"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
 
const WhatsAppChat = () => {
  const [messages, setMessages] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [chats, setChats] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [readMessages, setReadMessages] = useState(() => {
    const saved = localStorage.getItem('readMessages');
    return saved ? JSON.parse(saved) : {};
  });
  const [playingAudio, setPlayingAudio] = useState(null);
  const [audioDurations, setAudioDurations] = useState({});
  const [audioProgress, setAudioProgress] = useState({});
  const [audioCurrentTime, setAudioCurrentTime] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [chatLabels, setChatLabels] = useState({});
  const [selectedLabel, setSelectedLabel] = useState('all');
  const [showLabelMenu, setShowLabelMenu] = useState(null);
  const [customLabels, setCustomLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [showNewLabelInput, setShowNewLabelInput] = useState(null);
  const [showMobileSearchModal, setShowMobileSearchModal] = useState(false);
  const [showMobileDateModal, setShowMobileDateModal] = useState(false);
  const [showMobileCalendarModal, setShowMobileCalendarModal] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRefs = useRef({});
  const mobileCalendarRef = useRef(null);
  const [labelColors, setLabelColors] = useState({});
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [manuallyEditedPhones, setManuallyEditedPhones] = useState({});
  const [userId, setUserId] = useState(null);

  useLabelsSocket(
    userId,
    (phone, labels) => setChatLabels(prev => ({ ...prev, [phone]: labels })),
    (phone) => setManuallyEditedPhones(prev => ({ ...prev, [phone]: true }))
  );


  

 
  useEffect(() => {
    if (!API_BASE_URL) return;
  
    fetchUserId();
    const init = async () => {
      await fetchManuallyEdited();
      await fetchLabels();
      fetchMessages(true); // Skip auto-labeling on initial load
    };
    init();
    fetchCustomLabels();
  
    // Optional polling every 15 seconds (adjust as needed)
    const interval = setInterval(() => {
      fetchManuallyEdited();
      fetchMessages(true);
      fetchCustomLabels();
    }, 30000);
  
    return () => clearInterval(interval);
  }, []); 

  const fetchUserId = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, { credentials: 'include' });
      const data = await res.json();
      setUserId(data.user?.id);
    } catch (err) {
      console.error('Failed to fetch user ID', err);
    }
  };

  const fetchManuallyEdited = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/contact/manually-edited`, { credentials: 'include' });
      const phones = await res.json();
      const map = {};
      phones.forEach(p => map[p] = true);
      setManuallyEditedPhones(map);
    } catch (err) {
      console.error('Failed to fetch manually edited phones', err);
    }
  };
  
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLabelMenu && !event.target.closest('.label-menu') && !event.target.closest('.label-menu-btn')) {
        setShowLabelMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLabelMenu]);

  // Mark chat as read whenever it is opened
useEffect(() => {
  if (!selectedChat) return;

  // All messages for this chat
  const currentMessages = messages.filter((m) => m.from === selectedChat);
  if (currentMessages.length === 0) return;

  // Time of last message
  const lastMsgTime = new Date(
    currentMessages[currentMessages.length - 1].createdAt
  ).toISOString();

  const prevRead = readMessages[selectedChat];

  // Only update if this last message is newer than what we stored
  if (!prevRead || new Date(lastMsgTime) > new Date(prevRead)) {
    const newReadMessages = {
      ...readMessages,
      [selectedChat]: lastMsgTime,
    };
    setReadMessages(newReadMessages);
    localStorage.setItem('readMessages', JSON.stringify(newReadMessages));
  }
}, [selectedChat, messages]);

  
  const fetchMessages = async (skipAutoLabeling = false) => {
    if (!API_BASE_URL) return;
    try {
      const messages = await getMessages();
      console.log('Fetched messages:', messages);
      setMessages(messages);
  
      const lastIncomingByPhone = {};
      messages.forEach((msg) => {
        if (msg.direction !== 'incoming') return;
        const phone = msg.from;
        const current = lastIncomingByPhone[phone];
        if (!current || new Date(msg.createdAt) > new Date(current.createdAt)) {
          lastIncomingByPhone[phone] = msg;
        }
      });
  
      // ONLY auto-manage if NOT skipping and manuallyEditedPhones is loaded
      if (!skipAutoLabeling && (Object.keys(manuallyEditedPhones).length > 0 || manuallyEditedPhones.constructor === Object)) {
        Object.entries(lastIncomingByPhone).forEach(([phone, msg]) => {
          if (manuallyEditedPhones[phone]) return;

          const text = (msg.message || '').trim().toLowerCase();
          const existing = chatLabels[phone] || [];

          let newLabels = existing.filter(
            (l) => l.toLowerCase() !== 'yes' && l.toLowerCase() !== 'stop'
          );

          if (text === 'yes') {
            newLabels.push('Yes');
          } else if (text === 'stop') {
            newLabels.push('Stop');
          } else {
            const hadStop = existing.some(l => l.toLowerCase() === 'stop');
            const hadYes = existing.some(l => l.toLowerCase() === 'yes');
            if (hadStop) newLabels.push('Stop');
            if (hadYes) newLabels.push('Yes');
          }

          const same =
            existing.length === newLabels.length &&
            existing.every((l) => newLabels.includes(l));

          if (!same) {
            const updated = { ...chatLabels, [phone]: newLabels };
            setChatLabels(updated);
            updateLabels(phone, newLabels).catch((err) => {
              console.error('Error updating labels for', phone, err);
            });
          }
        });
      }

      const uniqueChats = {};
      messages.forEach((msg) => {
        if (!uniqueChats[msg.from]) {
          uniqueChats[msg.from] = {
            phone: msg.from,
            lastMessage: msg.message || 'Media',
            lastTime: msg.createdAt,
            unreadCount: 0,
          };
        }
        if (new Date(msg.createdAt) > new Date(uniqueChats[msg.from].lastTime)) {
          uniqueChats[msg.from].lastMessage = msg.message || 'Media';
          uniqueChats[msg.from].lastTime = msg.createdAt;
        }
        if (
          msg.direction === 'incoming' &&
          (!readMessages[msg.from] ||
            new Date(msg.createdAt) > new Date(readMessages[msg.from]))
        ) {
          uniqueChats[msg.from].unreadCount++;
        }
      });
  
      setChats(
        Object.values(uniqueChats).sort(
          (a, b) => new Date(b.lastTime) - new Date(a.lastTime),
        ),
      );
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
    }
  };
  const fetchLabels = async () => {
    if (!API_BASE_URL) return;
    try {
      const labels = await getLabels();
      console.log('Fetched labels from server:', labels);
      setChatLabels(labels);
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  };

  const fetchCustomLabels = async () => {
    if (!API_BASE_URL) return;
    try {
      const labels = await getCustomLabels();
      setCustomLabels(labels);
    } catch (error) {
      console.error('Error fetching custom labels:', error);
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
 
  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach(msg => {
      const date = new Date(msg.createdAt).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const handleDateFilter = (date) => {
    setSelectedDate(date);
    setDateFilter('custom');
    setShowDatePicker(false);
  };
  useEffect(() => {
    if (!customLabels.length) return;
  
    // Load colors from localStorage (same as Labels.jsx)
    const savedColors = JSON.parse(localStorage.getItem('label_colors') || '{}');
    
    setLabelColors(prev => {
      const updated = { ...prev };
      customLabels.forEach((label, index) => {
        if (!updated[label]) {
          // Use saved color from localStorage, or fallback to palette
          updated[label] = savedColors[label] || LABEL_COLOR_PALETTE[index % LABEL_COLOR_PALETTE.length];
        }
      });
      return updated;
    });
  }, [customLabels]);
  
  const filterMessagesByDate = (messages) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    return messages.filter(msg => {
      const msgDate = new Date(msg.createdAt);
      if (dateFilter === 'today') return msgDate >= today;
      if (dateFilter === 'yesterday') return msgDate >= yesterday && msgDate < today;
      if (dateFilter === 'week') return msgDate >= lastWeek;
      if (dateFilter === 'month') return msgDate >= lastMonth;
      if (dateFilter === 'custom' && selectedDate) {
        const selected = new Date(selectedDate);
        const selectedStart = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
        const selectedEnd = new Date(selectedStart);
        selectedEnd.setDate(selectedEnd.getDate() + 1);
        return msgDate >= selectedStart && msgDate < selectedEnd;
      }
      return true;
    });
  };

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    
    if (ext === 'pdf') return (
      <div className="file-type-icon pdf">
        <span className="file-text">PDF</span>
      </div>
    );
    
    if (['doc', 'docx'].includes(ext)) return (
      <div className="file-type-icon doc">
        <span className="file-text">DOC</span>
      </div>
    );
    
    if (['xls', 'xlsx'].includes(ext)) return (
      <div className="file-type-icon xls">
        <span className="file-text">XLS</span>
      </div>
    );
    
    if (['ppt', 'pptx'].includes(ext)) return (
      <div className="file-type-icon ppt">
        <span className="file-text">PPT</span>
      </div>
    );
    
    return (
      <div className="file-type-icon default">
        <span className="file-text">FILE</span>
      </div>
    );
  };

  const getFileTypeInfo = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    
    if (ext === 'pdf') return { type: 'PDF', pages: '30 pages' };
    if (['doc', 'docx'].includes(ext)) return { type: 'DOC', pages: '15 pages' };
    if (['xls', 'xlsx'].includes(ext)) return { type: 'XLS', pages: '5 sheets' };
    if (['ppt', 'pptx'].includes(ext)) return { type: 'PPT', pages: '20 slides' };
    
    return { type: 'FILE', pages: '1 file' };
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleAudioPlay = (audioId, audioElement) => {
    if (playingAudio && playingAudio !== audioId) {
      const prevAudio = audioRefs.current[playingAudio];
      if (prevAudio) {
        prevAudio.pause();
        prevAudio.currentTime = 0;
      }
    }

    if (playingAudio === audioId) {
      audioElement.pause();
      setPlayingAudio(null);
    } else {
      audioElement.play();
      setPlayingAudio(audioId);
    }
  };

  const handleAudioLoadedMetadata = (audioId, audioElement) => {
    const duration = audioElement.duration;
    if (!isNaN(duration)) {
      setAudioDurations(prev => ({ ...prev, [audioId]: duration }));
    }
  };

  const handleAudioTimeUpdate = (audioId, audioElement) => {
    const currentTime = audioElement.currentTime;
    const duration = audioElement.duration;
    if (!isNaN(currentTime) && !isNaN(duration)) {
      setAudioProgress(prev => ({ ...prev, [audioId]: (currentTime / duration) * 100 }));
      setAudioCurrentTime(prev => ({ ...prev, [audioId]: currentTime }));
    }
  };

  const handleAudioEnded = (audioId) => {
    setPlayingAudio(null);
    setAudioProgress(prev => ({ ...prev, [audioId]: 0 }));
    setAudioCurrentTime(prev => ({ ...prev, [audioId]: 0 }));
  };

  const formatAudioTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileSize = (fileName) => {
    // Mock file size - in real app, get from file metadata
    return '171 kB';
  };

  const filteredMessages = selectedChat
    ? filterMessagesByDate(messages.filter(m => m.from === selectedChat))
        .filter(msg => 
          messageSearchQuery === '' || 
          (msg.message && msg.message.toLowerCase().includes(messageSearchQuery.toLowerCase()))
        )
    : [];

  const groupedMessages = groupMessagesByDate(filteredMessages);

  const LABEL_COLOR_PALETTE = [
    '#1e88e5', // blue
    '#43a047', // green
    '#e53935', // red
    '#fb8c00', // orange
    '#8e24aa', // purple
    '#00897b', // teal
    '#6d4c41', // brown
  ];

  const availableLabels = customLabels; // ONLY DB labels
  const MAX_VISIBLE = 2;

const visibleLabels = customLabels.slice(0, MAX_VISIBLE);
const hiddenLabels = customLabels.slice(MAX_VISIBLE);




  

  // Load from localStorage for any missing colors
  const savedColors = JSON.parse(localStorage.getItem('label_colors') || '{}');
  customLabels.forEach((label, index) => {
    if (!labelColors[label]) {
      labelColors[label] = savedColors[label] || LABEL_COLOR_PALETTE[index % LABEL_COLOR_PALETTE.length];
    }
  });

  const handleAddCustomLabel = async (phone) => {
    if (newLabelName.trim() && !availableLabels.includes(newLabelName.trim())) {
      const newLabel = newLabelName.trim();
      try {
        await addCustomLabelAPI(newLabel);
        const labels = await getCustomLabels();
        setCustomLabels(labels);
        await toggleLabel(phone, newLabel);
        setNewLabelName('');
        setShowNewLabelInput(null);
      } catch (error) {
        console.error('Error adding custom label:', error);
        toast.error('Failed to add custom label');
      }
    }
  };

  const addLabelForPhone = async (phone, label) => {
    const existing = chatLabels[phone] || [];
    if (existing.includes(label)) return; // already has it
  
    const updated = { ...chatLabels, [phone]: [...existing, label] };
    setChatLabels(updated);
  
    try {
      await updateLabels(phone, updated[phone]);
    } catch (error) {
      console.error('Error adding label:', error);
      toast.error('Failed to update labels');
    }
  };

  const toggleLabel = async (phone, label) => {
    const currentLabels = chatLabels[phone] || [];
    const newLabels = currentLabels.includes(label)
      ? currentLabels.filter((l) => l !== label)
      : [...currentLabels, label];
  
    // Optimistically update UI
    setChatLabels(prev => ({ ...prev, [phone]: newLabels }));
  
    try {
      const response = await updateLabels(phone, newLabels);
      console.log('✅ Label saved to database:', phone, newLabels, response);
    } catch (error) {
      console.error('❌ Error saving label:', error);
      toast.error('Failed to save label');
      // Revert on error
      setChatLabels(prev => ({ ...prev, [phone]: currentLabels }));
    }
  };
  const filteredChats = chats
    .filter(chat => chat.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(chat => {
      if (selectedLabel === 'all') return true;
      return chatLabels[chat.phone]?.includes(selectedLabel);
    });
 
  return (
    <div className="whatsapp-chat">
      <div className={`chat-sidebar ${selectedChat ? 'hide-mobile' : ''}`}>
        <div className="sidebar-header">
          
         
          <div className="search-box">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                ×
              </button>
            )}
          </div>
          <div className="wa-label-tabs">

{/* ALL */}
<button
  className={`wa-tab ${selectedLabel === 'all' ? 'active' : ''}`}
  onClick={() => setSelectedLabel('all')}
>
  All
</button>

{/* FIRST 3 LABELS */}
{visibleLabels.map(label => (
  <button
    key={label}
    className={`wa-tab ${selectedLabel === label ? 'active' : ''}`}
    onClick={() => setSelectedLabel(label)}
  >
    {label}
  </button>
))}

{/* DROPDOWN */}
{hiddenLabels.length > 0 && (
  <div className="wa-dropdown">
    <button
      className="wa-tab more-btn"
      onClick={() => setShowMoreMenu(prev => !prev)}
    >
      ⋯
    </button>

    {showMoreMenu && (
      <div className="wa-dropdown-menu">
        {hiddenLabels.map(label => (
          <div
            key={label}
            className={`wa-dropdown-item ${selectedLabel === label ? 'active' : ''}`}
            onClick={() => {
              setSelectedLabel(label);
              setShowMoreMenu(false);
            }}
          >
            {label}
          </div>
        ))}
      </div>
    )}
  </div>
)}
</div>


 


        </div>
        {filteredChats.map(chat => (
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
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
            }}
          >
            <div className="chat-avatar">{chat.phone.slice(-4)}</div>
            <div className="chat-info">
              <div className="chat-phone">
                {chat.phone}
                {chat.unreadCount > 0 && <span className="unread-badge">{chat.unreadCount}</span>}
              </div>
              <div className="chat-last-msg">{chat.lastMessage}</div>
              {chatLabels[chat.phone]?.length > 0 && (
                <div className="chat-labels">
                 {chatLabels[chat.phone].map(label => (
  <span
    key={label}
    className="label-tag"
    style={{ backgroundColor: labelColors[label] || '#9e9e9e' }}
  >
    {label}
  </span>
))}

                </div>
              )}
            </div>
            <button 
              className="label-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowLabelMenu(showLabelMenu === chat.phone ? null : chat.phone);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
              </svg>
            </button>
            {showLabelMenu === chat.phone && (
              <div className="label-menu" onClick={(e) => e.stopPropagation()}>
                {availableLabels.map(label => {
                  const isCustom = customLabels.includes(label);
                  return (
                    <div 
                      key={label}
                      className="label-option"
                    >
                      <input 
                        type="checkbox" 
                        checked={chatLabels[chat.phone]?.includes(label) || false}
                        onChange={() => toggleLabel(chat.phone, label)}
                      />
                      <span style={{ color: labelColors[label] || '#9e9e9e' }}>{label}</span>
                      
                    </div>
                  );
                })}
               
              </div>
            )}
          </div>
        ))}
      </div>
 
      <div className={`chat-main ${selectedChat ? 'show-mobile' : ''}`}>
        {selectedChat ? (
          <>
            <div className="chat-header">
              <button className="back-btn" onClick={() => setSelectedChat(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <h3>{selectedChat}</h3>
              <div className="header-actions">
                <button className="icon-btn search-btn" onClick={() => setShowMobileSearchModal(true)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                </button>
                <button className="icon-btn filter-btn" onClick={() => setShowMobileDateModal(true)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                </button>
                <button className="icon-btn calendar-btn" onClick={() => setShowMobileCalendarModal(true)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                  </svg>
                </button>
                <div className="message-search desktop-only">
                  <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                  />
                  {messageSearchQuery && (
                    <button className="clear-search" onClick={() => setMessageSearchQuery('')}>
                      ×
                    </button>
                  )}
                </div>
                <div className="date-filter desktop-only">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                  <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                    <option value="all">All Messages</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    {selectedDate && <option value="custom">Selected Date</option>}
                  </select>
                </div>
                <div className="calendar-picker desktop-only">
                  <button 
                    className="calendar-btn"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                    </svg>
                  </button>
                  {showDatePicker && (
                    <div className="date-picker-dropdown">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => handleDateFilter(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {showMobileSearchModal && (
              <div className="mobile-fullscreen-search">
                <div className="search-header">
                  <button className="back-btn" onClick={() => setShowMobileSearchModal(false)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <div className="search-input-wrapper">
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                      type="text"
                      placeholder="Search messages..."
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      autoFocus
                    />
                    {messageSearchQuery && (
                      <button className="clear-btn" onClick={() => setMessageSearchQuery('')}>×</button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {showMobileDateModal && (
              <div className="mobile-fullscreen-filter">
                <div className="filter-header">
                  <button className="back-btn" onClick={() => setShowMobileDateModal(false)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <h3>Filter by Date</h3>
                </div>
                <div className="filter-options">
                  {['all', 'today', 'yesterday', 'week', 'month'].map(filter => (
                    <div 
                      key={filter}
                      className={`filter-option ${dateFilter === filter ? 'active' : ''}`}
                      onClick={() => { setDateFilter(filter); setShowMobileDateModal(false); }}
                    >
                      <span>{filter === 'all' ? 'All Messages' : filter === 'today' ? 'Today' : filter === 'yesterday' ? 'Yesterday' : filter === 'week' ? 'Last 7 Days' : 'Last 30 Days'}</span>
                      {dateFilter === filter && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00a884" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {showMobileCalendarModal && (
              <div className="mobile-calendar-modal" onClick={() => setShowMobileCalendarModal(false)}>
                <div className="calendar-modal-content" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="date"
                    value={selectedDate || ''}
                    onChange={(e) => { handleDateFilter(e.target.value); setShowMobileCalendarModal(false); }}
                    max={new Date().toISOString().split('T')[0]}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  />
                </div>
              </div>
            )}
            <div className="chat-messages">
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <React.Fragment key={date}>
                  <div className="date-divider">
                    <span>{getDateLabel(date)}</span>
                  </div>
                  {msgs.map(msg => (
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
                        {msg.mediaType === 'audio' && msg.mediaUrl && (() => {
                          const audioId = `audio-${msg.id}`;
                          const isPlaying = playingAudio === audioId;
                          const progress = audioProgress[audioId] || 0;
                          const duration = audioDurations[audioId] || 0;
                          const currentTime = audioCurrentTime[audioId] || 0;
                          
                          return (
                            <div className="whatsapp-audio-message">
                              <div className="audio-icon">
                                <MicIcon />
                              </div>
                              <div 
                                className="audio-play-icon"
                                onClick={() => {
                                  const audioElement = audioRefs.current[audioId];
                                  if (audioElement) {
                                    handleAudioPlay(audioId, audioElement);
                                  }
                                }}
                              >
                                {isPlaying ? <PauseIcon /> : <PlayIcon />}
                              </div>
                              <div className="audio-progress-container">
                                <div className="audio-progress-bar">
                                  <div 
                                    className="audio-progress-fill" 
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                  <div className="audio-progress-dot" style={{ left: `${progress}%` }}></div>
                                </div>
                              </div>
                              <span className="audio-time">
                                {isPlaying ? formatAudioTime(currentTime) : formatAudioTime(duration)}
                              </span>
                              <audio 
                                ref={(el) => {
                                  if (el) {
                                    audioRefs.current[audioId] = el;
                                  }
                                }}
                                src={msg.mediaUrl}
                                onLoadedMetadata={(e) => handleAudioLoadedMetadata(audioId, e.target)}
                                onTimeUpdate={(e) => handleAudioTimeUpdate(audioId, e.target)}
                                onEnded={() => handleAudioEnded(audioId)}
                                style={{display: 'none'}} 
                              />
                            </div>
                          );
                        })()}
                        {msg.mediaType === 'document' && msg.mediaUrl && (
                          <div className="whatsapp-document-message">
                            <div className="document-content">
                              <div className="document-header">
                                {getFileIcon(msg.mediaUrl)}
                                <div className="document-title">
                                  {msg.mediaUrl ? (msg.mediaUrl.split('/').pop()?.replace(/\.[^/.]+$/, '') || msg.fileName || 'Document') : (msg.fileName || 'Document')}
                                </div>
                                <a 
                                  href={msg.mediaUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="document-download-btn"
                                >
                                  <DownloadIcon />
                                </a>
                              </div>
                              <div className="document-footer">
                                <span className="document-pages">{getFileTypeInfo(msg.mediaUrl).pages}</span>
                                <span className="document-type">{getFileTypeInfo(msg.mediaUrl).type}</span>
                                <span className="document-size">{getFileSize(msg.mediaUrl)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {msg.message && !msg.message.endsWith(' file') && <p>{msg.message}</p>}
                        <span className="message-time">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                </React.Fragment>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => setSelectedFile(e.target.files[0])}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
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