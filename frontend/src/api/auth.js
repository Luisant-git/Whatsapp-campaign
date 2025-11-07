import { API_BASE_URL } from './config';

export const loginUser = async (email, password) => {
  const response = await fetch(`${API_BASE_URL}/user/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return await response.json();
};

export const getProfile = async () => {
  const token = localStorage.getItem('token');
  // Decode token to get user ID (simple decode for demo)
  const payload = JSON.parse(atob(token.split('.')[1]));
  const userId = payload.userId;
  
  const response = await fetch(`${API_BASE_URL}/user/profile/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return await response.json();
};

export const getAnalytics = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/whatsapp/analytics`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }

  return await response.json();
};

export const getSettings = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/whatsapp/settings`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }

  return await response.json();
};