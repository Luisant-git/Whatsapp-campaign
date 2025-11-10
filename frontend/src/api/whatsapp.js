import { API_BASE_URL } from './config';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
  };
};

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/whatsapp/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload file');
  }

  return await response.json();
};

export const sendMessage = async (to, message) => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/send-message`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({ to, message }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send message');
  }

  return await response.json();
};

export const sendBulkMessages = async (contacts, templateName) => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/send-bulk`, {
    method: 'POST',
    headers: getHeaders(),
    credentials: 'include',
    body: JSON.stringify({ contacts, templateName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send bulk messages');
  }

  return await response.json();
};

export const sendMediaMessage = async (to, file, caption) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('to', to);
  if (caption) formData.append('caption', caption);

  const response = await fetch(`${API_BASE_URL}/whatsapp/send-media`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send media message');
  }

  return await response.json();
};

export const getMessages = async (phone) => {
  const url = phone 
    ? `${API_BASE_URL}/whatsapp/messages?phone=${phone}`
    : `${API_BASE_URL}/whatsapp/messages`;
    
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch messages');
  }

  return await response.json();
};