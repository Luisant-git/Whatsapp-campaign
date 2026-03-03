import { API_BASE_URL } from './config';

const flowTriggerAPI = {
  // Get all triggers
  getTriggers: async () => {
    const response = await fetch(`${API_BASE_URL}/flow-messages/triggers`, {
      credentials: 'include',
    });
    if (!response.ok) return [];
    return response.json();
  },

  // Create trigger
  createTrigger: async (data) => {
    const response = await fetch(`${API_BASE_URL}/flow-messages/triggers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Update trigger
  updateTrigger: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/flow-messages/triggers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Delete trigger
  deleteTrigger: async (id) => {
    const response = await fetch(`${API_BASE_URL}/flow-messages/triggers/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return response.json();
  },

  // Get trigger logs
  getTriggerLogs: async (id) => {
    const response = await fetch(`${API_BASE_URL}/flow-messages/triggers/${id}/logs`, {
      credentials: 'include',
    });
    return response.json();
  },
};

export default flowTriggerAPI;
