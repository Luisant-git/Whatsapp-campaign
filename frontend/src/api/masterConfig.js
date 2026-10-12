import { API_BASE_URL } from './config';

export const getMasterConfigs = async () => {
  const response = await fetch(`${API_BASE_URL}/master-config`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch master configs');
  }

  return await response.json();
};

export const createMasterConfig = async (data) => {
  const response = await fetch(`${API_BASE_URL}/master-config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create master config');
  }

  return await response.json();
};

export const updateMasterConfig = async (id, data) => {
  const response = await fetch(`${API_BASE_URL}/master-config/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update master config');
  }

  return await response.json();
};

export const deleteMasterConfig = async (id) => {
  const response = await fetch(`${API_BASE_URL}/master-config/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete master config');
  }

  return await response.json();
};

export const subscribeToWABA = async (id) => {
  const response = await fetch(`${API_BASE_URL}/master-config/${id}/subscribe-waba`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to subscribe to WABA');
  }

  return await response.json();
};

export const setAppWebhook = async (id, callbackUrl) => {
  const response = await fetch(`${API_BASE_URL}/master-config/${id}/set-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ callbackUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to set app webhook');
  }

  return await response.json();
};

export const getCentralConnectionAnalytics = async (start, end) => {
  let url = `${API_BASE_URL}/master-config/central-connection/analytics`;
  const params = [];
  if (start) params.push(`start=${encodeURIComponent(start)}`);
  if (end) params.push(`end=${encodeURIComponent(end)}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch connection analytics');
  }

  return await response.json();
};