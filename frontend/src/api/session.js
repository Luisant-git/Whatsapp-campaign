import { API_BASE_URL } from './config';

export const checkSessionStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/user/me`, {
      credentials: 'include',
    });

    if (!response.ok) return { isLoggedIn: false };
    const data = await response.json();
    return { isLoggedIn: true, user: data };
  } catch (err) {
    console.error('Session check failed', err);
    return { isLoggedIn: false };
  }
};