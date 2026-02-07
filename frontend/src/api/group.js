import axios from 'axios';
import { API_BASE_URL } from './config';

export const groupAPI = {
  /* -------------------- GROUPS -------------------- */

  // Get all groups for the logged-in user
  getAll: () =>
    axios.get(`${API_BASE_URL}/group`, { withCredentials: true }),

  getContacts: (id) =>
    axios.get(`${API_BASE_URL}/contact/group/${id}/contacts`, { withCredentials: true }),

  // Get single group by ID
  getOne: (id) =>
    axios.get(`${API_BASE_URL}/group/${id}`, { withCredentials: true }),

  // Create new group
  create: (data) =>
    axios.post(`${API_BASE_URL}/group`, data, { withCredentials: true }),

  // Update existing group
  update: (id, data) =>
    axios.patch(`${API_BASE_URL}/group/${id}`, data, { withCredentials: true }),

  // Delete group
  delete: (id) =>
    axios.delete(`${API_BASE_URL}/group/${id}`, { withCredentials: true }),
};
