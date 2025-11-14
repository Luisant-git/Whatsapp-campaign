import { API_BASE_URL } from './config';

export const getAllCampaigns = async () => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/campaigns`, {
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