import { API_BASE_URL } from './config';

export const checkSessionStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/user/me`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to check session');
  }

  return await response.json();
};