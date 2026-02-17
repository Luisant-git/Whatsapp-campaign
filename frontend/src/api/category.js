import axios from 'axios';
import { API_BASE_URL } from './config';

export const categoryAPI = {
  /* -------------------- CATEGORY -------------------- */

  // Get all active categories
  getAll: () =>
    axios.get(`${API_BASE_URL}/category`, {
      withCredentials: true,
    }),

  // Get single category
  getOne: (id) =>
    axios.get(`${API_BASE_URL}/category/${id}`, {
      withCredentials: true,
    }),

  // Create category
  create: (data) =>
    axios.post(`${API_BASE_URL}/category`, data, {
      withCredentials: true,
    }),

  // Update category
  update: (id, data) =>
    axios.patch(`${API_BASE_URL}/category/${id}`, data, {
      withCredentials: true,
    }),

  // Soft delete (isactive = false)
  delete: (id) =>
    axios.patch(`${API_BASE_URL}/category/${id}/soft-delete`, {}, {
      withCredentials: true,
    }),
};
