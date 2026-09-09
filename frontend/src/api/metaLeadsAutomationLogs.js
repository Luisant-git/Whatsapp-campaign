import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010';
const getHeaders = () => {
  const t = localStorage.getItem('token');
  const tid = localStorage.getItem('tenantId');
  return { Authorization: `Bearer ${t}`, 'x-tenant-id': tid, 'Content-Type': 'application/json' };
};
export const getMetaLeadsAutomationLogs = async (params) => {
  const res = await axios.get(`${API_BASE_URL}/meta-leads/automation-logs`, { params, headers: getHeaders(), withCredentials: true, signal: params?.signal });
  return res.data;
};
export const getMetaLeadsAutomationLogsTotal = async (params) => {
  const res = await axios.get(`${API_BASE_URL}/meta-leads/automation-logs/total`, { params, headers: getHeaders(), withCredentials: true, signal: params?.signal });
  return res.data;
};
