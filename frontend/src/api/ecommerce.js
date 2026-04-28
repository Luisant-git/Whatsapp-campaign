import axios from 'axios';
import { API_BASE_URL } from './config';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let metaCatalogConfig = null;

const getMetaCatalogConfig = async () => {
  if (!metaCatalogConfig) {
    const response = await fetch(`${API_BASE_URL}/settings/meta-catalog`, {
      credentials: 'include'
    });
    if (response.ok) {
      metaCatalogConfig = await response.json();
    }
  }
  return metaCatalogConfig;
};

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

  getProduct: (id) => api.get(`/ecommerce/products/${id}`),  
  createProduct: (formData) => api.post('/ecommerce/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  updateProduct: (id, data) => api.put(`/ecommerce/products/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteProduct: (id) => api.delete(`/ecommerce/products/${id}`),
  syncProductToMeta: (id, payload = {}) =>
    api.post(`/ecommerce/products/${id}/sync-meta`, payload),
  syncFromMeta: () => api.post('/ecommerce/sync-from-meta'),


   // Variants - ✅ ALL NEW
   getVariants: (productId) => api.get(`/ecommerce/products/${productId}/variants`),
   createVariant: (productId, formData) =>
     api.post(`/ecommerce/products/${productId}/variants`, formData, {
       headers: { 'Content-Type': 'multipart/form-data' },
     }),
   updateVariant: (id, formData) =>
     api.put(`/ecommerce/variants/${id}`, formData, {
       headers: { 'Content-Type': 'multipart/form-data' },
     }),
   deleteVariant: (id) => api.delete(`/ecommerce/variants/${id}`),
   syncVariantToMeta: (id, payload = {}) => api.post(`/ecommerce/variants/${id}/sync-meta`, payload),
  // Orders
  getOrders: () => api.get('/ecommerce/orders'),
  updateOrderStatus: (id, status) => api.put(`/ecommerce/orders/${id}/status`, { status }),

  // Customers
  getCustomers: () => api.get('/ecommerce/customers'),

  //shipping zones
  
  getShippingRates: () => api.get('/ecommerce/shipping-rates'),
  createShippingRate: (data) => api.post('/ecommerce/shipping-rates', data),
  updateShippingRate: (id, data) => api.put(`/ecommerce/shipping-rates/${id}`, data),
  deleteShippingRate: (id) => api.delete(`/ecommerce/shipping-rates/${id}`),
};