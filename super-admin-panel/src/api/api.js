import axios from "axios";
import { API_URL } from "./baseUrl";

console.log('🌐 Super Admin API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token
api.interceptors.request.use(config => {
  const token = localStorage.getItem("super_token");

  console.log(`📤 Request a ${config.method?.toUpperCase()} ${config.url}`);
  console.log('🔑 Token presente:', !!token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Interceptor para manejar errores - NO redirigir automaticamente
api.interceptors.response.use(
  response => {
    console.log(`✅ Respuesta ${response.status} de ${response.config.url}`);
    return response;
  },
  error => {
    console.error(`❌ Error en ${error.config?.url}:`);
    console.error(' Status:', error.response?.status);
    console.error(' Data:', error.response?.data);

    // Solo redirigir si el token es invalido (401) y NO estamos en la ruta de login
    const url = error.config?.url || "";
    const esLoginRoute = url.includes('/auth/login');

    if (error.response?.status === 401 && !esLoginRoute) {
      console.log('🚫 Token invalido, limpiando sesion');
      localStorage.removeItem("super_token");
      localStorage.removeItem("userRole");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      // No redirigir aqui - dejar que React Router maneje
    }

    return Promise.reject(error);
  }
);

export const ragAPI = {
  chat: async (data) => {
    const response = await api.post('/rag/chat', data);
    return response.data;
  },
  health: async () => {
    const response = await api.get('/rag/health');
    return response.data;
  },
  uploadKnowledge: async (data) => {
    const response = await api.post('/rag/knowledge', data);
    return response.data;
  },
  uploadPdf: async (data) => {
    const response = await api.post('/rag/pdf', data);
    return response.data;
  },
  documents: async (params) => {
    const response = await api.get('/rag/documents', { params });
    return response.data;
  },
  archiveDocument: async (sourceId, data) => {
    const response = await api.patch(`/rag/documents/${sourceId}/archive`, data);
    return response.data;
  },
  restoreDocument: async (sourceId, data) => {
    const response = await api.patch(`/rag/documents/${sourceId}/restore`, data);
    return response.data;
  },
  deleteDocument: async (sourceId, data) => {
    const response = await api.delete(`/rag/documents/${sourceId}`, { data });
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
  transcribeAudio: async (data) => {
    const response = await api.post('/rag/audio/transcribe', data);
    return response.data;
  },
  speakText: async (data) => {
    const response = await api.post('/rag/audio/speech', data);
    return response.data;
  },
};

export default api;
