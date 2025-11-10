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

export const getAnalytics = async () => {
  const response = await fetch(`${API_BASE_URL}/analytics`, {
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

export const updateSettings = async (settings) => {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    throw new Error('Failed to update settings');
  }

  return await response.json();
};