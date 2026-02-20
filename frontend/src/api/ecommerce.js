import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export const ecommerceApi = {
  // Categories
  getCategories: () => api.get('/ecommerce/categories'),
  createCategory: (data) => api.post('/ecommerce/categories', data),
  updateCategory: (id, data) => api.put(`/ecommerce/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/ecommerce/categories/${id}`),

  // SubCategories
  getSubCategories: (categoryId) => 
    api.get(`/ecommerce/subcategories${categoryId ? `?categoryId=${categoryId}` : ''}`),
  createSubCategory: (data) => api.post('/ecommerce/subcategories', data),
  updateSubCategory: (id, data) => api.put(`/ecommerce/subcategories/${id}`, data),
  deleteSubCategory: (id) => api.delete(`/ecommerce/subcategories/${id}`),

  // Products
  getProducts: (subCategoryId) => 
    api.get(`/ecommerce/products${subCategoryId ? `?subCategoryId=${subCategoryId}` : ''}`),
  createProduct: (formData) => api.post('/ecommerce/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateProduct: (id, data) => api.put(`/ecommerce/products/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteProduct: (id) => api.delete(`/ecommerce/products/${id}`),
  syncProductToMeta: (id) => api.post(`/ecommerce/products/${id}/sync-meta`),

  // Orders
  getOrders: () => api.get('/ecommerce/orders'),
  updateOrderStatus: (id, status) => api.put(`/ecommerce/orders/${id}/status`, { status }),
};