import { API_BASE_URL } from './config';

export const getAutoReplies = async () => {
  const response = await fetch(`${API_BASE_URL}/auto-reply`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch auto-replies');
  }

  return await response.json();
};

export const updateAutoReplies = async (replies) => {
  const response = await fetch(`${API_BASE_URL}/auto-reply`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(replies),
  });

  if (!response.ok) {
    throw new Error('Failed to update auto-replies');
  }

  return await response.json();
};
