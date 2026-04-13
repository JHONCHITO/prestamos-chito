import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://prestamos-chito-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem('cobrador_token') ||
    localStorage.getItem('admin_token') ||
    localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }

  return config;
});

export default api;
