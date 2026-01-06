const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010';

export const getAllSubscriptions = async () => {
  const response = await fetch(`${API_BASE_URL}/subscription`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch subscriptions');
  return await response.json();
};

export const getUserSubscriptions = async () => {
  const response = await fetch(`${API_BASE_URL}/subscription/users`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch user subscriptions');
  return await response.json();
};

export const getSubscriptionOrders = async () => {
  const response = await fetch(`${API_BASE_URL}/subscription/orders/all`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch subscription orders');
  return await response.json();
};

export const updateOrderStatus = async (orderId, status) => {
  const response = await fetch(`${API_BASE_URL}/subscription/orders/${orderId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Failed to update order status');
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
