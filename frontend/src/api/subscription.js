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

export const getCurrentPlan = async () => {
  const response = await fetch(`${API_BASE_URL}/subscription/current`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch current plan');
  return await response.json();
};

export const getUserOrders = async () => {
  const response = await fetch(`${API_BASE_URL}/subscription/my-orders`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch orders');
  return await response.json();
};

export const subscribeToPlan = async (planId) => {
  const response = await fetch(`${API_BASE_URL}/subscription/subscribe/${planId}`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to subscribe');
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

export const setCurrentPlan = async (orderId) => {
  console.log('API Call: PUT', `${API_BASE_URL}/subscription/set-current/${orderId}`);
  const response = await fetch(`${API_BASE_URL}/subscription/set-current/${orderId}`, {
    method: 'PUT',
    credentials: 'include',
  });
  console.log('Response status:', response.status, response.statusText);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error response:', errorText);
    throw new Error('Failed to set current plan');
  }
  const data = await response.json();
  console.log('Response data:', data);
  return data;
};
