import { API_BASE_URL } from './config';

export const getAllCampaigns = async (settingsName = null) => {
  const url = settingsName 
    ? `${API_BASE_URL}/whatsapp/campaigns?settingsName=${settingsName}`
    : `${API_BASE_URL}/whatsapp/campaigns`;
    
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch campaigns');
  }

  return await response.json();
};

export const getCampaignById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/campaigns/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch campaign details');
  }

  return await response.json();
};

export const updateCampaign = async (id, data) => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/campaigns/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update campaign');
  }

  return await response.json();
};

export const deleteCampaign = async (id) => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/campaigns/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete campaign');
  }

  return await response.json();
};

export const rerunCampaign = async (id) => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/campaigns/${id}/run`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to rerun campaign');
  }

  return await response.json();
};

export const getCampaignResults = async (id) => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/campaigns/${id}/results`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch campaign results');
  }

  return await response.json();
};

export const downloadCampaignResults = async (id, format) => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/campaigns/${id}/results/download?format=${format}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to download campaign results');
  }

  return await response.blob();
};

export const createCampaign = async (data) => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to create campaign');
  }

  return await response.json();
};