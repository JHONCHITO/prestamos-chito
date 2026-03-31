import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

console.log('📡 API URL Configurada:', API_URL);
console.log('🌐 Conectando a:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token y tenantId
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    const tenantId = localStorage.getItem('tenantId');
    
    console.log(`🚀 Petición: ${config.method.toUpperCase()} ${config.url}`);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (tenantId && !config.url.includes('/auth/')) {
      config.headers['x-tenant-id'] = tenantId;
      console.log('📡 Tenant ID:', tenantId);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Error en request:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Respuesta: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(`❌ Error: ${error.response?.status}`, error.response?.data);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('tenantId');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Funciones de autenticación
export const login = async (email, password) => {
  console.log('🔑 Intentando login:', email);
  const response = await api.post('/auth/admin/login', { email, password });
  return response.data;
};

// Dashboard charts
export const getDashboardCharts = async () => {
  const response = await api.get('/dashboard-charts');
  return response.data;
};

// Dashboard stats (nueva función)
export const getDashboardStats = async () => {
  console.log('📊 Solicitando estadísticas del dashboard...');
  const response = await api.get('/dashboard');
  return response.data;
};

export default api;