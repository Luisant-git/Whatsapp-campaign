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