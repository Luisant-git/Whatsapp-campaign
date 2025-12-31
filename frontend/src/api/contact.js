import axios from 'axios';
import { API_BASE_URL } from './config';

export const contactAPI = {
  getAll: (page = 1, limit = 10, search = '') => 
    axios.get(`${API_BASE_URL}/contact?page=${page}&limit=${limit}&search=${search}`, { withCredentials: true }),
  getOne: (id) => axios.get(`${API_BASE_URL}/contact/${id}`, { withCredentials: true }),
  create: (data) => axios.post(`${API_BASE_URL}/contact`, data, { withCredentials: true }),
  update: (id, data) => axios.patch(`${API_BASE_URL}/contact/${id}`, data, { withCredentials: true }),
  delete: (id) => axios.delete(`${API_BASE_URL}/contact/${id}`, { withCredentials: true }),
  getDeliveryStats: () => axios.get(`${API_BASE_URL}/contact/delivery-stats`, { withCredentials: true }),
  updateDeliveryStatus: (phone, status, campaignName, name) => 
    axios.patch(`${API_BASE_URL}/contact/delivery-status`, { phone, status, campaignName, name }, { withCredentials: true })
};
