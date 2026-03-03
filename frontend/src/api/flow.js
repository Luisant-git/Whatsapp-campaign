import { API_BASE_URL } from './config';

const flowAPI = {
  // Get available flows
  getFlows: async () => {
    const response = await fetch(`${API_BASE_URL}/flow-messages/flows`, {
      credentials: 'include',
    });
    if (!response.ok) return [];
    return response.json();
  },

  // Send flow to multiple numbers
  sendFlow: async (data) => {
    const response = await fetch(`${API_BASE_URL}/flow-messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Get sending history
  getHistory: async () => {
    const response = await fetch(`${API_BASE_URL}/flow-messages/sent-history`, {
      credentials: 'include',
    });
    return response.json();
  },
};

export default flowAPI;