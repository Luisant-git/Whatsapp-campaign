import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const contactAPI = {
  getAll: () => axios.get(`${API_URL}/contact`, { withCredentials: true }),
  getOne: (id) => axios.get(`${API_URL}/contact/${id}`, { withCredentials: true }),
  create: (data) => axios.post(`${API_URL}/contact`, data, { withCredentials: true }),
  update: (id, data) => axios.patch(`${API_URL}/contact/${id}`, data, { withCredentials: true }),
  delete: (id) => axios.delete(`${API_URL}/contact/${id}`, { withCredentials: true })
};
