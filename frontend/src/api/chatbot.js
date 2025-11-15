import { API_BASE_URL } from './config';
export const chatbotAPI = {
  uploadDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/chatbot/upload-document`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to upload document');
    }

    return response.json();
  },

  getDocuments: async () => {
    const response = await fetch(`${API_BASE_URL}/chatbot/documents`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    return response.json();
  },

  sendMessage: async (phone, message) => {
    const response = await fetch(`${API_BASE_URL}/chatbot/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone,
        message
      }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  },

  getChatHistory: async (phone) => {
    const response = await fetch(`${API_BASE_URL}/chatbot/history?phone=${phone}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chat history');
    }

    return response.json();
  },

  deleteDocument: async (id) => {
    const response = await fetch(`${API_BASE_URL}/chatbot/documents/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }

    return response.json();
  }
};