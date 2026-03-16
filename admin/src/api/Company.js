// src/api/Company.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010';

// Get all companies (tenants) for admin list
export const getAdminUsers = async () => {
  const res = await fetch(`${API_URL}/admin/users/all`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load companies: ${res.status} ${text}`);
  }

  return res.json();
};

// Get active subscription plans for the dropdown
export const getActiveSubscriptions = async () => {
  const res = await fetch(`${API_URL}/subscription/active`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to load subscriptions: ${res.status} ${text}`);
  }

  return res.json();
};

// Create a new company (tenant) from admin
export const createAdminUser = async (formData) => {
  const payload = {
    ...formData,
    subscriptionId: formData.subscriptionId
      ? Number(formData.subscriptionId)
      : null,
  };

  const res = await fetch(`${API_URL}/admin/users/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  if (!res.ok) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    throw new Error(data.message || 'Failed to create company');
  }

  return JSON.parse(text); // { message, user: {...} }
};

// Toggle active/inactive status of a company (admin)
export const toggleCompanyStatus = async (id, isActive) => {
  const res = await fetch(`${API_URL}/admin/users/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });

  const text = await res.text();

  if (!res.ok) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    throw new Error(data.message || 'Failed to update status');
  }

  return JSON.parse(text);
};


export const updateAdminUser = async (id, formData) => {
  const payload = {
    ...formData,
    subscriptionId: formData.subscriptionId
      ? Number(formData.subscriptionId)
      : null,
  };

  // if password empty, don't send it
  if (!payload.password) {
    delete payload.password;
  }

  const res = await fetch(`${API_URL}/admin/users/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  if (!res.ok) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    throw new Error(data.message || 'Failed to update company');
  }

  return JSON.parse(text);
};