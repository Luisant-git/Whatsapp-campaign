import { API_BASE_URL } from './config';

const flowAPI = {
  // Get available flows
  getFlows: async () => {
    const response = await fetch(`${API_BASE_URL}/flow-messages/flows`);
    return response.json();
  },

  // Send flow to multiple numbers
  sendFlow: async (data) => {
    const response = await fetch(`${API_BASE_URL}/flow-messages/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Get sending history
  getHistory: async () => {
    const response = await fetch(`${API_BASE_URL}/flow-messages/sent-history`);
    return response.json();
  },
};

export default flowAPI;