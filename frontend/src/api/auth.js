import { API_BASE_URL } from './config';

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/user/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    
    throw new Error(error.message || 'Login failed');
  }

  return await response.json();
};

export const logoutUser = async () => {
  const response = await fetch(`${API_BASE_URL}/user/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Logout failed');
  }

  return await response.json();
};

export const getProfile = async () => {
  const response = await fetch(`${API_BASE_URL}/user/me`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return await response.json();
};

export const getAnalytics = async (settingsName = null) => {
  const url = settingsName 
    ? `${API_BASE_URL}/analytics?settingsName=${settingsName}`
    : `${API_BASE_URL}/analytics`;
    
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }

  return await response.json();
};

export const getSettings = async () => {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }

  return await response.json();
};

export const getAllSettings = async () => {
  const response = await fetch(`${API_BASE_URL}/settings/all`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch all settings');
  }

  return await response.json();
};

export const getSettingsById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/settings/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }

  return await response.json();
};

export const createSettings = async (settings) => {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create settings');
  }

  return await response.json();
};

export const updateSettings = async (id, settings) => {
  const response = await fetch(`${API_BASE_URL}/settings/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update settings');
  }

  return await response.json();
};

export const deleteSettings = async (id) => {
  const response = await fetch(`${API_BASE_URL}/settings/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete settings');
  }
};

export const setDefaultSettings = async (id) => {
  const response = await fetch(`${API_BASE_URL}/settings/${id}/default`, {
    method: 'PUT',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to set default settings');
  }

  return await response.json();
};

export const uploadHeaderImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/settings/upload-image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  return await response.json();
};