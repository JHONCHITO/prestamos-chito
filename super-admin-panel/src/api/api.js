import axios from "axios";

// Usar import.meta.env para Vite
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

console.log('🌐 Super Admin API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token y debug
api.interceptors.request.use(config => {
  const token = localStorage.getItem("super_token");
  
  console.log(`📤 Request a ${config.method?.toUpperCase()} ${config.url}`);
  console.log('🔑 Token presente:', !!token);
  
  if (token) {
    console.log('🔐 Token (primeros 20 chars):', token.substring(0, 20) + '...');
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
  response => {
    console.log(`✅ Respuesta ${response.status} de ${response.config.url}`);
    return response;
  },
  error => {
    console.error(`❌ Error en ${error.config?.url}:`);
    console.error('   Status:', error.response?.status);
    console.error('   Data:', error.response?.data);
    console.error('   Message:', error.message);
    
    const url = error.config?.url || "";
    const esLogin = url.includes('/auth/admin/login');
    
    if (error.response?.status === 401 && !esLogin) {
      console.log('🚫 Token inválido o sesión expirada, redirigiendo a login');
      localStorage.removeItem("super_token");
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;