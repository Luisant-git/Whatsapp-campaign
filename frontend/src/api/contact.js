import axios from 'axios';
import { API_BASE_URL } from './config';

export const contactAPI = {
  /* -------------------- CONTACTS -------------------- */
  getAll: (page = 1, limit = 10, search = '') =>
    axios.get(`${API_BASE_URL}/contact`, {
      params: { page, limit, search },
      withCredentials: true,
    }),
    getContacts: (id) =>
      axios.get(`${API_BASE_URL}/group/${id}/contacts`, { withCredentials: true }),
    
  getOne: (id) =>
    axios.get(`${API_BASE_URL}/contact/${id}`, { withCredentials: true }),

  create: (data) =>
    axios.post(`${API_BASE_URL}/contact`, data, { withCredentials: true }),

  update: (id, data) =>
    axios.patch(`${API_BASE_URL}/contact/${id}`, data, { withCredentials: true }),

  delete: (id) =>
    axios.delete(`${API_BASE_URL}/contact/${id}`, { withCredentials: true }),
  
  getTrash: () =>
    axios.get(`${API_BASE_URL}/contact/trash`, { withCredentials: true }),
  
  restore: (id) =>
    axios.patch(`${API_BASE_URL}/contact/${id}/restore`, {}, { withCredentials: true }),
  /* -------------------- DELIVERY -------------------- */
  getDeliveryStats: () =>
    axios.get(`${API_BASE_URL}/contact/delivery-stats`, { withCredentials: true }),

  updateDeliveryStatus: ({ phone, status, campaignName, name }) =>
    axios.patch(
      `${API_BASE_URL}/contact/delivery-status`,
      { phone, status, campaignName, name },
      { withCredentials: true }
    ),

  /* -------------------- GROUPS -------------------- */
  getGroups: () =>
    axios.get(`${API_BASE_URL}/contact/groups/all`, { withCredentials: true }),

  /* -------------------- LABELS -------------------- */
  getLabels: () =>
    axios.get(`${API_BASE_URL}/contact/labels/all`, { withCredentials: true }),

  getCustomLabels: () =>
    axios.get(`${API_BASE_URL}/contact/labels/custom`, { withCredentials: true }),

  addCustomLabel: (label) =>
    axios.post(
      `${API_BASE_URL}/contact/labels/custom`,
      { label },
      { withCredentials: true }
    ),

  deleteCustomLabel: (label) =>
    axios.delete(`${API_BASE_URL}/contact/labels/custom/${label}`, {
      withCredentials: true,
    }),

  updateLabels: (phone, labels) =>
    axios.post(
      `${API_BASE_URL}/contact/labels/${phone}`,
      { labels },
      { withCredentials: true }
    ),

  /* -------------------- BLOCKLIST -------------------- */
getBlocked: () =>
  axios.get(`${API_BASE_URL}/contact/blocklist`, { withCredentials: true }),

removeLabel: (phone, label) =>
  axios.post(
    `${API_BASE_URL}/contact/remove-label`,
    { phone, label },
    { withCredentials: true }
  ),
};

