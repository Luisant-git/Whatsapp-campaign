import { API_BASE_URL } from './config';

export const loginUser = async (email, password, role = 'tenant') => {
  const response = await fetch(`${API_BASE_URL}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password, role }),
  });

  if (!response.ok) {
    const data = await response.json();
    const error = new Error(data.message || "Login failed");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return await response.json();
};

export const logoutUser = async () => {
  const response = await fetch(`${API_BASE_URL}/user/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  // Clear all stored data on logout
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userType');
  localStorage.removeItem('menuPermission');

  if (!response.ok) {
    throw new Error('Logout failed');
  }

  return await response.json();
};

export const getProfile = async () => {
  const response = await fetch(`${API_BASE_URL}/user/me`, {
    credentials: "include",
  });

  if (!response.ok) throw new Error("Failed to fetch profile");

  const data = await response.json();

  if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
  if (data.userType) localStorage.setItem("userType", data.userType);
  if (data.role) localStorage.setItem("userRole", data.role);
  if (data.menuPermission) {
    localStorage.setItem("menuPermission", JSON.stringify(data.menuPermission));
  }

  // ✅ tenantId from session-based profile response
  let tenantId = null;

  if (data.userType === "tenant") {
    // tenant login => tenantId is tenant's own id
    tenantId = data?.user?.id;
  } else if (data.userType === "subuser") {
    // subuser login => tenantId is foreign key
    tenantId = data?.user?.tenantId;
  }

  if (tenantId) localStorage.setItem("tenantId", String(tenantId));
  else localStorage.removeItem("tenantId");

  return data;
};
// ... rest of your exports remain the same
export const getAnalytics = async (settingsName = null) => {
  const url = settingsName
    ? `${API_BASE_URL}/analytics?settingsName=${settingsName}`
    : `${API_BASE_URL}/analytics`;

  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }

  return await response.json();
};

export const getSettings = async () => {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }

  return await response.json();
};

export const getAllSettings = async () => {
  const response = await fetch(`${API_BASE_URL}/settings/all`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch all settings');
  }

  return await response.json();
};

export const getSettingsById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/settings/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }

  return await response.json();
};

export const createSettings = async (settings) => {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create settings');
  }

  return await response.json();
};

export const updateSettings = async (id, settings) => {
  const response = await fetch(`${API_BASE_URL}/settings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update settings');
  }

  return await response.json();
};

export const deleteSettings = async (id) => {
  const response = await fetch(`${API_BASE_URL}/settings/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete settings');
  }
};

export const setDefaultSettings = async (id) => {
  const response = await fetch(`${API_BASE_URL}/settings/${id}/default`, {
    method: 'PUT',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to set default settings');
  }

  return await response.json();
};

export const uploadHeaderImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/settings/upload-image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  return await response.json();
};

export const updateUserPreference = async (preference) => {
  const response = await fetch(`${API_BASE_URL}/user/preference`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(preference),
  });

  if (!response.ok) {
    throw new Error('Failed to update preference');
  }

  return await response.json();
};