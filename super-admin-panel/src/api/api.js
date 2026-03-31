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

export default api;
