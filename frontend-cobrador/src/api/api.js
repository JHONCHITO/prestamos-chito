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

export const ragAPI = {
  chat: async (data) => {
    const response = await api.post('/rag/chat', data);
    return response.data;
  },
  health: async () => {
    const response = await api.get('/rag/health');
    return response.data;
  },
  transcribeAudio: async (data) => {
    const response = await api.post('/rag/audio/transcribe', data);
    return response.data;
  },
  speakText: async (data) => {
    const response = await api.post('/rag/audio/speech', data);
    return response.data;
  },
  conversations: async (params) => {
    const response = await api.get('/rag/conversations', { params });
    return response.data;
  },
  conversationMessages: async (conversationId, params) => {
    const response = await api.get(`/rag/conversations/${conversationId}/messages`, { params });
    return response.data;
  },
};

export default api;
