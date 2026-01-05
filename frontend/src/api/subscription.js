import { API_BASE_URL } from './config';

export const getSubscriptions = async () => {
  const response = await fetch(`${API_BASE_URL}/subscription/active`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch subscriptions');
  return await response.json();
};

export const getAllSubscriptions = async () => {
  const response = await fetch(`${API_BASE_URL}/subscription`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch subscriptions');
  return await response.json();
};

export const createSubscription = async (data) => {
  const response = await fetch(`${API_BASE_URL}/subscription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create subscription');
  return await response.json();
};

export const updateSubscription = async (id, data) => {
  const response = await fetch(`${API_BASE_URL}/subscription/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update subscription');
  return await response.json();
};

export const deleteSubscription = async (id) => {
  const response = await fetch(`${API_BASE_URL}/subscription/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to delete subscription');
  return await response.json();
};
