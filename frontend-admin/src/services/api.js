import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://prestamos-chito.vercel.app/api';

console.log('📡 API URL Configurada:', API_URL);
console.log('🌐 Conectando a:', process.env.REACT_APP_API_URL);

const api = axios.create({ 
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para token (MEJORADO con logs)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('🚀 Petición:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para respuestas (MEJORADO con logs)
api.interceptors.response.use(
  (response) => {
    console.log('✅ Respuesta:', response.status, response.config.url);
    return response;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/';
    }
    console.error('❌ Error:', err.response?.status, err.config?.url);
    return Promise.reject(err);
  }
);

// ===== SERVICIOS DE AUTENTICACIÓN =====
export const authAPI = {
  login: (email, password) => api.post('/auth/admin/login', { email, password }),
  logout: () => api.post('/auth/logout')
};

// ===== SERVICIOS DE DASHBOARD =====
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
  getStats: () => api.get('/dashboard/stats'),
  getCharts: () => api.get('/dashboard/charts')
};

// ===== SERVICIOS DE COBRADORES =====
export const cobradoresAPI = {
  getAll: (search) => api.get('/cobradores', { params: { search } }),
  getById: (id) => api.get(`/cobradores/${id}`),
  create: (data) => api.post('/cobradores', data),
  update: (id, data) => api.put(`/cobradores/${id}`, data),
  delete: (id) => api.delete(`/cobradores/${id}`)
};

// ===== SERVICIOS DE CLIENTES =====
export const clientesAPI = {
  getAll: (search) => api.get('/clientes', { params: { search } }),
  getById: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  delete: (id) => api.delete(`/clientes/${id}`)
};

// ===== SERVICIOS DE PRÉSTAMOS =====
export const prestamosAPI = {
  getAll: (params) => api.get('/prestamos', { params }),
  getById: (id) => api.get(`/prestamos/${id}`),
  create: (data) => api.post('/prestamos', data),
  update: (id, data) => api.put(`/prestamos/${id}`, data),
  delete: (id) => api.delete(`/prestamos/${id}`),
  getByCliente: (clienteId) => api.get(`/prestamos/cliente/${clienteId}`),
  registrarPago: (data) => api.post('/pagos', data)
};

// ===== SERVICIOS DE INVENTARIO (COMPLETO) =====
export const inventarioAPI = {
  getAll: (params) => api.get('/inventario', { params }),
  getById: (id) => api.get(`/inventario/${id}`),
  create: (data) => api.post('/inventario', data),
  update: (id, data) => api.put(`/inventario/${id}`, data),
  delete: (id) => api.delete(`/inventario/${id}`),
  getStats: () => api.get('/inventario/stats/resumen')  // <--- NUEVO: Método para estadísticas
};

// ===== SERVICIOS DE PAGOS =====
export const pagosAPI = {
  create: (prestamoId, data) => api.post(`/pagos/${prestamoId}`, data),
  getByPrestamo: (prestamoId) => api.get(`/pagos/prestamo/${prestamoId}`)
};

// ===== 🚀 NUEVO: SERVICIOS DE CARTERA =====
export const carteraAPI = {
  // Resumen para tarjetas (cartera total, recaudado, etc.)
  getResumen: () => api.get('/cartera'),
  
  // Lista detallada para la tabla de préstamos
  getPrestamos: () => api.get('/cartera/prestamos'),
  
  // Cartera agrupada por cobrador
  getPorCobrador: () => api.get('/cartera/cobradores'),
  
  // Estadísticas para gráficos
  getEstadisticas: () => api.get('/cartera/estadisticas'),
  
  // Pagos del día/mes
  getPagosResumen: () => api.get('/cartera/pagos/resumen')
};

// ===== SERVICIOS DE REPORTES (opcional) =====
export const reportesAPI = {
  getDiario: (fecha) => api.get(`/reportes/diario?fecha=${fecha}`),
  getMensual: (mes, año) => api.get(`/reportes/mensual?mes=${mes}&año=${año}`)
};

export default api;
