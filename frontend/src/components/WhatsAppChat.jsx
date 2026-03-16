import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../api/config';
import { getMessages, sendMessage, sendMediaMessage, getLabels, updateLabels, getCustomLabels, addCustomLabel as addCustomLabelAPI, deleteCustomLabel as deleteCustomLabelAPI, getChatAssignment, removeChatAssignment, assignChatToSubUser } from '../api/whatsapp';
import '../styles/WhatsAppChat.scss';
import { contactAPI } from '../api/contact';
import { groupAPI } from '../api/group';
import { Users, UserCheck, MoreVertical } from 'lucide-react';
import { getTenantSubUsers } from "../api/subuser";

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
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10,9 9,9 8,9" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
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
  const [businessNumbers, setBusinessNumbers] = useState({}); // Store business number per chat
  const [selectedBusinessNumber, setSelectedBusinessNumber] = useState('all'); // Filter by business number
  
  // Delete message states
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  
  const [showGroupMenu, setShowGroupMenu] = useState(null); // which phone's group menu is open
  const [groups, setGroups] = useState([]);                 // all contact groups
  const [phoneGroupId, setPhoneGroupId] = useState({});     // phone -> current groupId


  const [showNotesModal, setShowNotesModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDescription, setNoteDescription] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [currentChatNotes, setCurrentChatNotes] = useState([]);

  const [showUserMenu, setShowUserMenu] = useState(null);  //subuser assign
  const [subUsers, setSubUsers] = useState([]);
  const [phoneUserId, setPhoneUserId] = useState({});
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  const UNREAD_TAB = "__unread__";

  const fetchGroups = async () => {
    if (!API_BASE_URL) return;
    try {
      const resp = await groupAPI.getAll();
      const arr = Array.isArray(resp.data) ? resp.data : resp.data.data || [];
      setGroups(arr.map((g) => ({ id: g.id, name: g.name })));
    } catch (err) {
      console.error('Failed to fetch groups', err);
    }
  };


  //chat notif count
  useEffect(() => {
    const loadNotesCount = async () => {
      if (!selectedChat) {
        setCurrentChatNotes([]);
        return;
      }

      try {
        const resp = await contactAPI.getNotes(selectedChat);
        setCurrentChatNotes(resp.data || []);
      } catch (err) {
        console.error("Failed to load note count", err);
      }
    };

    loadNotesCount();
  }, [selectedChat]);

  useEffect(() => {
    if (!API_BASE_URL) return;

    fetchUserId();
    const init = async () => {
      await fetchManuallyEdited();
      await fetchLabels();
      fetchMessages(true);
      // Skip auto-labeling on initial load
    };
    init();
    fetchCustomLabels();
    fetchGroups();

    // Optional polling every 15 seconds (adjust as needed)
    const interval = setInterval(() => {
      fetchManuallyEdited();
      fetchMessages();
      fetchCustomLabels();
    }, 30000);

    return () => clearInterval(interval);
  }, []);


  // Find existing contact by phone or create if missing
  const getOrCreateContactByPhone = async (phone) => {
    if (!API_BASE_URL || !phone) return null;

    try {
      const resp = await contactAPI.getAll(1, 1, phone, "");
      let list = resp?.data?.data || resp?.data || [];
      if (!Array.isArray(list)) list = [list].filter(Boolean);

      if (list.length > 0) return list[0];

      const createResp = await contactAPI.create({ name: phone, phone });
      return createResp.data?.data || createResp.data;
    } catch (err) {
      console.error("Error getOrCreateContactByPhone", err);
      throw err;
    }
  };

  // Load current groupId for this phone
  const preloadGroupForPhone = async (phone) => {
    try {
      const contact = await getOrCreateContactByPhone(phone);
      if (!contact) return;
      const currentGroupId = contact.group?.id || contact.groupId || "";
      setPhoneGroupId((prev) => ({
        ...prev,
        [phone]: currentGroupId || "",
      }));
    } catch (err) {
      console.error("Failed to preload group for phone", phone, err);
    }
  };

  // Toggle group checkbox: assign / unassign group
  const handleToggleGroupForPhone = async (phone, groupId) => {
    try {
      const contact = await getOrCreateContactByPhone(phone);
      if (!contact) {
        toast.error("Unable to find or create contact for this number");
        return;
      }

      const current =
        phoneGroupId[phone] || contact.group?.id || contact.groupId || "";
      const newGroupId = current === groupId ? null : groupId;

      await contactAPI.update(contact.id, {
        name: contact.name || phone,
        phone: contact.phone || phone,
        groupId: newGroupId,
      });

      setPhoneGroupId((prev) => ({
        ...prev,
        [phone]: newGroupId || "",
      }));
    } catch (err) {
      console.error("Failed to update group", err);
      toast.error("Failed to update group");
    }
  };
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
      if (
        showLabelMenu &&
        !event.target.closest('.label-menu') &&
        !event.target.closest('.label-menu-btn')
      ) {
        setShowLabelMenu(null);
      }

      if (
        showGroupMenu &&
        !event.target.closest('.group-menu') &&
        !event.target.closest('.group-menu-btn')
      ) {
        setShowGroupMenu(null);
      }

      if (
        showUserMenu &&
        !event.target.closest('.user-menu') &&
        !event.target.closest('.user-menu-btn')
      ) {
        setShowUserMenu(null);
      }

      if (
        showMessageMenu &&
        !event.target.closest('.message-dropdown-menu') &&
        !event.target.closest('.message-menu-btn')
      ) {
        setShowMessageMenu(null);
      }

      if (
        showHeaderMenu &&
        !event.target.closest('.header-dropdown-menu') &&
        !event.target.closest('.icon-btn') &&
        !event.target.closest('.date-filter-submenu')
      ) {
        setShowHeaderMenu(false);
        setShowDatePicker(false);
      }

      if (
        showDatePicker &&
        !event.target.closest('.date-filter-submenu') &&
        !event.target.closest('.header-dropdown-item')
      ) {
        setShowDatePicker(false);
      }

      if (
        showCustomCalendar &&
        !event.target.closest('[style*="position: fixed"]') &&
        !event.target.closest('.icon-btn')
      ) {
        setShowCustomCalendar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLabelMenu, showGroupMenu, showUserMenu, showMessageMenu, showHeaderMenu, showDatePicker, showCustomCalendar]);

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
      setMessages(messages);

      // Extract business numbers from messages
      const businessNumbersMap = {};
      messages.forEach((msg) => {
        if (msg.displayPhoneNumber && msg.from) {
          businessNumbersMap[msg.from] = msg.displayPhoneNumber;
        }
      });
      setBusinessNumbers(businessNumbersMap);

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

      // Build chats grouped by phone + business number combination
      const uniqueChats = {};
      messages.forEach((msg) => {
        const chatKey = `${msg.from}_${msg.displayPhoneNumber || 'unknown'}`;
        if (!uniqueChats[chatKey]) {
          uniqueChats[chatKey] = {
            phone: msg.from,
            businessNumber: msg.displayPhoneNumber,
            lastMessage: msg.message || 'Media',
            lastTime: msg.createdAt,
            unreadCount: 0,
          };
        }
        if (new Date(msg.createdAt) > new Date(uniqueChats[chatKey].lastTime)) {
          uniqueChats[chatKey].lastMessage = msg.message || 'Media';
          uniqueChats[chatKey].lastTime = msg.createdAt;
        }
        if (
          msg.direction === 'incoming' &&
          (!readMessages[chatKey] ||
            new Date(msg.createdAt) > new Date(readMessages[chatKey]))
        ) {
          uniqueChats[chatKey].unreadCount++;
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
    setShowCustomCalendar(false);
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
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    return messages.filter(msg => {
      const msgDate = new Date(msg.createdAt);
      
      switch(dateFilter) {
        case 'today':
          return msgDate >= today && msgDate < tomorrow;
        case 'yesterday':
          return msgDate >= yesterday && msgDate < today;
        case 'week':
          return msgDate >= lastWeek && msgDate < tomorrow;
        case 'month':
          return msgDate >= lastMonth && msgDate < tomorrow;
        case 'custom':
          if (selectedDate) {
            const selected = new Date(selectedDate + 'T00:00:00');
            const selectedStart = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
            const selectedEnd = new Date(selectedStart);
            selectedEnd.setDate(selectedEnd.getDate() + 1);
            return msgDate >= selectedStart && msgDate < selectedEnd;
          }
          return true;
        case 'all':
        default:
          return true;
      }
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
    ? filterMessagesByDate(messages.filter(m => {
      if (m.from !== selectedChat) return false;
      if (selectedBusinessNumber === 'all') return true;
      return m.displayPhoneNumber === selectedBusinessNumber;
    }))
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
    .filter((chat) => chat.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((chat) => {
      if (selectedLabel === "all") return true;

      // UNREAD filter
      if (selectedLabel === UNREAD_TAB) return chat.unreadCount > 0;

      // normal label filter (DB labels)
      return chatLabels[chat.phone]?.includes(selectedLabel);
    })
    .filter((chat) => {
      // Filter by business number
      if (selectedBusinessNumber === 'all') return true;
      return chat.businessNumber === selectedBusinessNumber;
    });

  // Delete message functions
  const toggleMessageSelection = (messageId) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const selectAllMessages = () => {
    const allMessageIds = new Set(filteredMessages.map(msg => msg.id));
    setSelectedMessages(allMessageIds);
  };

  const deselectAllMessages = () => {
    setSelectedMessages(new Set());
  };

  const handleDeleteMessages = async () => {
    if (selectedMessages.size === 0) return;

    try {
      const messageIds = Array.from(selectedMessages);
      
      // Call API to delete messages
      const response = await fetch(`${API_BASE_URL}/whatsapp/messages/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageIds })
      });

      if (response.ok) {
        // Remove deleted messages from state
        setMessages(prev => prev.filter(msg => !selectedMessages.has(msg.id)));
        toast.success(`${selectedMessages.size} message(s) deleted successfully`);
        setSelectedMessages(new Set());
        setIsSelectionMode(false);
        setShowDeleteConfirm(false);
      } else {
        throw new Error('Failed to delete messages');
      }
    } catch (error) {
      console.error('Error deleting messages:', error);
      toast.error('Failed to delete messages');
    }
  };

  const handleSingleDelete = async (messageId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/whatsapp/messages/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageIds: [messageId] })
      });

      if (response.ok) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        toast.success('Message deleted successfully');
      } else {
        throw new Error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const resolveMediaUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
  };


  //chatnote function

  const openNotesModal = async () => {
    if (!selectedChat) return;

    try {
      const resp = await contactAPI.getNotes(selectedChat);
      setCurrentChatNotes(resp.data || []);
      setNoteTitle("");
      setNoteDescription("");
      setEditingNoteId(null);
      setShowNotesModal(true);
    } catch (err) {
      console.error("Failed to load notes", err);
      toast.error("Failed to load notes");
    }
  };

  const handleAddOrUpdateNote = async () => {
    if (!selectedChat || !noteTitle.trim() || !noteDescription.trim()) {
      toast.error("Please enter title and description");
      return;
    }

    try {
      if (editingNoteId) {
        const resp = await contactAPI.updateNote(editingNoteId, {
          title: noteTitle.trim(),
          description: noteDescription.trim(),
        });

        setCurrentChatNotes((prev) =>
          prev.map((note) => (note.id === editingNoteId ? resp.data : note))
        );

        toast.success("Note updated");
      } else {
        const resp = await contactAPI.createNote(selectedChat, {
          title: noteTitle.trim(),
          description: noteDescription.trim(),
        });

        setCurrentChatNotes((prev) => [resp.data, ...prev]);
        toast.success("Note added");
      }

      setNoteTitle("");
      setNoteDescription("");
      setEditingNoteId(null);
    } catch (err) {
      console.error("Failed to save note", err);
      toast.error("Failed to save note");
    }
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title || "");
    setNoteDescription(note.description || "");
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await contactAPI.deleteNote(noteId);
      setCurrentChatNotes((prev) => prev.filter((note) => note.id !== noteId));
      toast.success("Note deleted");
    } catch (err) {
      console.error("Failed to delete note", err);
      toast.error("Failed to delete note");
    }
  };

  const formatNoteDate = (date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };
  const notesCount = currentChatNotes.length;

  //subuser assign
  const fetchSubUsersForAssignment = async () => {
    try {
      const tenantId = Number(localStorage.getItem("tenantId"));
      if (!tenantId) return;

      const list = await getTenantSubUsers(tenantId);
      setSubUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch subusers", err);
      toast.error("Failed to load users");
    }
  };

  const preloadAssignedUser = async (phone) => {
    try {
      const assigned = await getChatAssignment(phone);
      setPhoneUserId((prev) => ({
        ...prev,
        [phone]: assigned?.subUserId || "",
      }));
    } catch (err) {
      console.error("Failed to load assigned user", err);
    }
  };

  const handleToggleUserForPhone = async (phone, userId) => {
    try {
      const current = phoneUserId[phone] || "";
      const newUserId = current === userId ? "" : userId;

      if (!newUserId) {
        await removeChatAssignment(phone);
      } else {
        await assignChatToSubUser(phone, newUserId);
      }

      setPhoneUserId((prev) => ({
        ...prev,
        [phone]: newUserId,
      }));

      toast.success(newUserId ? "User assigned" : "User unassigned");
    } catch (err) {
      console.error("Failed to assign user", err);
      toast.error("Failed to assign user");
    }
  };

  return (
    <div className="whatsapp-chat">
      <div className={`chat-sidebar ${selectedChat ? 'hide-mobile' : ''}`}>
        <div className="sidebar-header">
          {/* Business Number Filter Dropdown */}
          <div style={{ padding: '10px 15px', borderBottom: '1px solid #e9edef' }}>
            <select
              value={selectedBusinessNumber}
              onChange={(e) => setSelectedBusinessNumber(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d7db',
                backgroundColor: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Business Numbers ({chats.length})</option>
              {[...new Set(chats.map(c => c.businessNumber).filter(Boolean))].sort().map(num => {
                const count = chats.filter(chat => chat.businessNumber === num).length;
                return <option key={num} value={num}>{num} ({count})</option>;
              })}
            </select>
          </div>

          <div className="search-box">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
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
            <button
              className={`wa-tab ${selectedLabel === UNREAD_TAB ? "active" : ""}`}
              onClick={() => setSelectedLabel(UNREAD_TAB)}
            >
              Unread
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
        {filteredChats.map(chat => {
          const chatKey = `${chat.phone}_${chat.businessNumber || 'unknown'}`;
          return (
            <div
              key={chatKey}
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
                {chat.businessNumber && (
                  <div style={{
                    fontSize: '11px',
                    color: '#00a884',
                    fontWeight: '500',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <span>{chat.businessNumber}</span>
                  </div>
                )}
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


              {/* ACTIONS (Group + Label on same row, top-right) */}
              <div
                style={{
                  position: "absolute",
                  top: 15,
                  right: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ position: "relative" }}>
                  <button
                    className="label-menu-btn user-menu-btn"
                    title="Assign User"
                    style={{ top: -5, right: 60 }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const phone = chat.phone;
                      if (showUserMenu === phone) {
                        setShowUserMenu(null);
                        return;
                      }
                      setShowUserMenu(phone);
                      if (subUsers.length === 0) {
                        await fetchSubUsersForAssignment();
                      }
                      await preloadAssignedUser(phone);
                    }}
                  >
                    <UserCheck size={18} />
                  </button>

                  {showUserMenu === chat.phone && (
                    <div className="label-menu user-menu" onClick={(e) => e.stopPropagation()}>
                      {subUsers.length === 0 ? (
                        <div className="label-option" style={{ fontSize: 13, color: "#6b7280" }}>
                          No users
                        </div>
                      ) : (
                        subUsers.map((u) => (
                          <div key={u.id} className="label-option">
                            <input
                              type="checkbox"
                              checked={(phoneUserId[chat.phone] || "") === u.id}
                              onChange={() => handleToggleUserForPhone(chat.phone, u.id)}
                            />
                            <span>{u.email}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {/* GROUP BUTTON + DROPDOWN */}
                <div style={{ position: "relative" }}>

                  <button
                    className="group-menu-btn label-menu-btn"
                    title="Set group"
                    style={{ right: 35, top: -5 }}  // test overrides
                    onClick={async (e) => {
                      e.stopPropagation();
                      const phone = chat.phone;
                      if (showGroupMenu === phone) {
                        setShowGroupMenu(null);
                        return;
                      }
                      setShowGroupMenu(phone);
                      await preloadGroupForPhone(phone);
                    }}
                  >
                    <Users size={18} />
                  </button>


                  {showGroupMenu === chat.phone && (
                    <div
                      className="group-menu label-menu"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {groups.length === 0 ? (
                        <div className="label-option" style={{ fontSize: 13, color: "#6b7280" }}>
                          No groups
                        </div>
                      ) : (
                        groups.map((g) => (
                          <div key={g.id} className="label-option">
                            <input
                              type="checkbox"
                              checked={(phoneGroupId[chat.phone] || "") === g.id}
                              onChange={() => handleToggleGroupForPhone(chat.phone, g.id)}
                            />
                            <span>{g.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* LABEL BUTTON + DROPDOWN */}
                <div style={{ position: "relative" }}>
                  <button
                    className="label-menu-btn"
                    style={{ top: -5 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowLabelMenu(showLabelMenu === chat.phone ? null : chat.phone);
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                    </svg>
                  </button>

                  {showLabelMenu === chat.phone && (
                    <div className="label-menu" onClick={(e) => e.stopPropagation()}>
                      {availableLabels.map(label => (
                        <div key={label} className="label-option">
                          <input
                            type="checkbox"
                            checked={chatLabels[chat.phone]?.includes(label) || false}
                            onChange={() => toggleLabel(chat.phone, label)}
                          />
                          <span style={{ color: labelColors[label] || '#9e9e9e' }}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>



            </div>
          );
        })}
      </div>

      <div className={`chat-main ${selectedChat ? 'show-mobile' : ''}`}>
        {selectedChat ? (
          <>
            <div className="chat-header">
              <div className="header-actions" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button className="back-btn" onClick={() => setSelectedChat(null)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                {!isSelectionMode ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111b21', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedChat}</h3>
                      {businessNumbers[selectedChat] && (
                        <div style={{
                          fontSize: '12px',
                          color: '#00a884',
                          fontWeight: '500',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <span>via {businessNumbers[selectedChat]}</span>
                        </div>
                      )}
                    </div>
                    <div className="message-search" style={{ flex: 1, maxWidth: '300px' }}>
                      <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
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
                    <div style={{ position: 'relative' }}>
                      <button 
                        className="icon-btn" 
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        title="Filter by date"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                        </svg>
                      </button>
                      {showDatePicker && (
                        <div
                          className="date-filter-dropdown"
                          style={{
                            position: 'absolute',
                            top: '45px',
                            right: '0',
                            background: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                            minWidth: '180px',
                            zIndex: 2000,
                            overflow: 'hidden',
                            border: '1px solid #e9edef'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            onClick={() => {
                              setDateFilter('all');
                              setShowDatePicker(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: dateFilter === 'all' ? '#00a884' : '#111b21',
                              fontWeight: dateFilter === 'all' ? '600' : '400',
                              background: dateFilter === 'all' ? '#f0f2f5' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.background = dateFilter === 'all' ? '#f0f2f5' : 'transparent'}
                          >
                            All Messages
                          </div>
                          <div
                            onClick={() => {
                              setDateFilter('today');
                              setShowDatePicker(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: dateFilter === 'today' ? '#00a884' : '#111b21',
                              fontWeight: dateFilter === 'today' ? '600' : '400',
                              background: dateFilter === 'today' ? '#f0f2f5' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.background = dateFilter === 'today' ? '#f0f2f5' : 'transparent'}
                          >
                            Today
                          </div>
                          <div
                            onClick={() => {
                              setDateFilter('yesterday');
                              setShowDatePicker(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: dateFilter === 'yesterday' ? '#00a884' : '#111b21',
                              fontWeight: dateFilter === 'yesterday' ? '600' : '400',
                              background: dateFilter === 'yesterday' ? '#f0f2f5' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.background = dateFilter === 'yesterday' ? '#f0f2f5' : 'transparent'}
                          >
                            Yesterday
                          </div>
                          <div
                            onClick={() => {
                              setDateFilter('week');
                              setShowDatePicker(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: dateFilter === 'week' ? '#00a884' : '#111b21',
                              fontWeight: dateFilter === 'week' ? '600' : '400',
                              background: dateFilter === 'week' ? '#f0f2f5' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.background = dateFilter === 'week' ? '#f0f2f5' : 'transparent'}
                          >
                            Last 7 Days
                          </div>
                          <div
                            onClick={() => {
                              setDateFilter('month');
                              setShowDatePicker(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: dateFilter === 'month' ? '#00a884' : '#111b21',
                              fontWeight: dateFilter === 'month' ? '600' : '400',
                              background: dateFilter === 'month' ? '#f0f2f5' : 'transparent',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.background = dateFilter === 'month' ? '#f0f2f5' : 'transparent'}
                          >
                            Last 30 Days
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button 
                        className="icon-btn" 
                        onClick={() => setShowCustomCalendar(!showCustomCalendar)}
                        title="Custom date picker"
                        style={{
                          color: dateFilter === 'custom' ? '#00a884' : '#54656f'
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                        </svg>
                      </button>
                      {showCustomCalendar && (
                        <div
                          style={{
                            position: 'fixed',
                            top: '80px',
                            right: '20px',
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                            padding: '20px',
                            zIndex: 2000,
                            border: '1px solid #e9edef',
                            minWidth: '280px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="date"
                            value={selectedDate || ''}
                            onChange={(e) => {
                              handleDateFilter(e.target.value);
                              setShowCustomCalendar(false);
                            }}
                            max={new Date().toISOString().split('T')[0]}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #d1d7db',
                              borderRadius: '8px',
                              fontSize: '14px',
                              outline: 'none',
                              cursor: 'pointer'
                            }}
                          />
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginTop: '12px',
                            gap: '8px'
                          }}>
                            <button
                              onClick={() => {
                                setDateFilter('all');
                                setSelectedDate('');
                                setShowCustomCalendar(false);
                              }}
                              style={{
                                padding: '8px 16px',
                                border: '1px solid #d1d7db',
                                borderRadius: '6px',
                                background: 'white',
                                color: '#54656f',
                                fontSize: '13px',
                                cursor: 'pointer',
                                flex: 1
                              }}
                            >
                              Clear
                            </button>
                            <button
                              onClick={() => {
                                const today = new Date().toISOString().split('T')[0];
                                handleDateFilter(today);
                                setShowCustomCalendar(false);
                              }}
                              style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                background: '#00a884',
                                color: 'white',
                                fontSize: '13px',
                                cursor: 'pointer',
                                flex: 1
                              }}
                            >
                              Today
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                          <button 
                            className="icon-btn" 
                            onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                            title="Menu"
                          >
                            <MoreVertical size={20} />
                          </button>
                          {showHeaderMenu && (
                            <div className="header-dropdown-menu"
                              style={{
                                position: 'absolute',
                                top: '45px',
                                right: '0',
                                background: 'white',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                minWidth: '200px',
                                zIndex: 1000,
                                overflow: 'visible'
                              }}
                            >
                              <div
                                className="header-dropdown-item"
                                onClick={() => {
                                  setShowHeaderMenu(false);
                                  setIsSelectionMode(true);
                                }}
                                style={{
                                  padding: '12px 16px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  fontSize: '14px',
                                  color: '#111b21',
                                  transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Select messages
                              </div>
                              <div
                                className="header-dropdown-item"
                                onClick={() => {
                                  setShowHeaderMenu(false);
                                  openNotesModal();
                                }}
                                style={{
                                  padding: '12px 16px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  fontSize: '14px',
                                  color: '#111b21',
                                  transition: 'background 0.2s',
                                  position: 'relative'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M4 4h16v12H8l-4 4V4z" />
                                  <path d="M8 8h8" />
                                  <path d="M8 12h5" />
                                </svg>
                                Notes
                                {notesCount > 0 && (
                                  <span style={{
                                    marginLeft: 'auto',
                                    background: '#ef4444',
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    minWidth: '18px',
                                    textAlign: 'center'
                                  }}>
                                    {notesCount > 99 ? '99+' : notesCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '14px', fontWeight: '600', marginRight: '10px', color: '#111b21' }}>
                      {selectedMessages.size} selected
                    </span>
                    <button 
                      className="icon-btn" 
                      onClick={selectedMessages.size === filteredMessages.length ? deselectAllMessages : selectAllMessages}
                      title={selectedMessages.size === filteredMessages.length ? "Deselect all" : "Select all"}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </button>
                    <button 
                      className="icon-btn delete-btn-active" 
                      onClick={() => {
                        if (selectedMessages.size === 0) {
                          toast.error('Please select at least one message');
                          return;
                        }
                        setShowDeleteConfirm(true);
                      }}
                      disabled={selectedMessages.size === 0}
                      title={`Delete ${selectedMessages.size} message(s)`}
                      style={{
                        background: selectedMessages.size > 0 ? '#ea4335' : '#f5f5f5',
                        color: selectedMessages.size > 0 ? 'white' : '#54656f'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                    <button 
                      className="icon-btn" 
                      onClick={() => {
                        setIsSelectionMode(false);
                        setSelectedMessages(new Set());
                      }}
                      title="Cancel"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            {showMobileSearchModal && (
              <div className="mobile-fullscreen-search">
                <div className="search-header">
                  <button className="back-btn" onClick={() => setShowMobileSearchModal(false)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="search-input-wrapper">
                    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
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
                      <path d="M19 12H5M12 19l-7-7 7-7" />
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
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showNotesModal && (
              <div className="notes-drawer-overlay" onClick={() => setShowNotesModal(false)}>
                <div className="notes-drawer" onClick={(e) => e.stopPropagation()}>
                  <div className="notes-drawer-header">
                    <div>
                      <h3>Notes</h3>
                      <p>{selectedChat}</p>
                    </div>
                    <button
                      type="button"
                      className="notes-drawer-close"
                      onClick={() => setShowNotesModal(false)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="notes-drawer-add">
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Title"
                    />
                    <textarea
                      value={noteDescription}
                      onChange={(e) => setNoteDescription(e.target.value)}
                      placeholder="Take a note..."
                      rows={3}
                    />
                    <button type="button" onClick={handleAddOrUpdateNote}>
                      {editingNoteId ? "Update" : "Add Note"}
                    </button>
                  </div>

                  <div className="notes-drawer-list">
                    {currentChatNotes.length === 0 ? (
                      <div className="notes-empty">No notes yet</div>
                    ) : (
                      currentChatNotes.map((note) => (
                        <div key={note.id} className="note-card">
                          <div className="note-card-date">
                            {formatNoteDate(note.createdAt)}
                          </div>

                          {note.title && <div className="note-card-title">{note.title}</div>}
                          <div className="note-card-text">{note.description}</div>

                          <div className="note-card-actions">
                            <button type="button" onClick={() => handleEditNote(note)}>
                              Edit
                            </button>
                            <button type="button" onClick={() => handleDeleteNote(note.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
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
            <div className="chat-messages"
              onClick={(e) => {
                // If clicking on the messages container (not on a message), exit selection mode
                if (isSelectionMode && e.target.classList.contains('chat-messages')) {
                  setIsSelectionMode(false);
                  setSelectedMessages(new Set());
                }
              }}
            >
              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <React.Fragment key={date}>
                  <div className="date-divider">
                    <span>{getDateLabel(date)}</span>
                  </div>
                  {msgs.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`message ${msg.direction} ${isSelectionMode ? 'selection-mode' : ''} ${selectedMessages.has(msg.id) ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isSelectionMode) {
                          toggleMessageSelection(msg.id);
                        }
                      }}
                      onMouseEnter={() => !isSelectionMode && setHoveredMessage(msg.id)}
                      onMouseLeave={() => !isSelectionMode && setHoveredMessage(null)}
                      style={{ cursor: isSelectionMode ? 'pointer' : 'default', position: 'relative' }}
                    >
                      {isSelectionMode && (
                        <div className="message-checkbox" style={{
                          position: 'absolute',
                          left: msg.direction === 'incoming' ? '-30px' : 'auto',
                          right: msg.direction === 'outgoing' ? '-30px' : 'auto',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 10
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedMessages.has(msg.id)}
                            onChange={() => toggleMessageSelection(msg.id)}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: '#00a884'
                            }}
                          />
                        </div>
                      )}
                      <div className="message-bubble">
                        {msg.mediaType === 'image' && msg.mediaUrl && (
                          <img
                            src={resolveMediaUrl(msg.mediaUrl)}
                            alt="media"
                            className="message-media"
                            onError={(e) => {
                              console.error('Image load error:', resolveMediaUrl(msg.mediaUrl));
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        {msg.mediaType === 'video' && msg.mediaUrl && (
                          <video
                            src={resolveMediaUrl(msg.mediaUrl)}
                            controls
                            className="message-media"
                            onError={(e) => {
                              console.error('Video load error:', resolveMediaUrl(msg.mediaUrl));
                              e.target.style.display = 'none';
                            }}
                          />
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
                                src={resolveMediaUrl(msg.mediaUrl)}
                                onLoadedMetadata={(e) => handleAudioLoadedMetadata(audioId, e.target)}
                                onTimeUpdate={(e) => handleAudioTimeUpdate(audioId, e.target)}
                                onEnded={() => handleAudioEnded(audioId)}
                                style={{ display: 'none' }}
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
                                  href={resolveMediaUrl(msg.mediaUrl)}
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
            
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="delete-confirm-overlay" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
              }}>
                <div className="delete-confirm-modal" style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '24px',
                  maxWidth: '400px',
                  width: '90%',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                    Delete Messages
                  </h3>
                  <p style={{ margin: '0 0 24px 0', color: '#667781', fontSize: '14px' }}>
                    Are you sure you want to delete {selectedMessages.size} message(s)? This action cannot be undone.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: '1px solid #d1d7db',
                        background: 'white',
                        color: '#3b4a54',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteMessages}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#ea4335',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="chat-input">
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => setSelectedFile(e.target.files[0])}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              />
              <input
                type="date"
                id="custom-date-picker"
                style={{ display: 'none' }}
                value={selectedDate || ''}
                onChange={(e) => handleDateFilter(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
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