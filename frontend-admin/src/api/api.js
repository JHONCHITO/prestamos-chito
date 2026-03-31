import axios from 'axios';

// 👉 Base URL del backend en producción
const API_URL = process.env.REACT_APP_API_URL || 'https://prestamos-chito.vercel.app/api';

console.log('📡 API URL Configurada:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token y tenantId (CORREGIDO)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    const tenantId = localStorage.getItem('tenantId');
    
    console.log(`🚀 Petición: ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`📡 Token: ${token ? '✅ Presente' : '❌ No'}`);
    console.log(`📡 TenantId desde localStorage: "${tenantId}"`);
    
    // Siempre agregar el token si existe
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // IMPORTANTE: Agregar tenantId para TODAS las rutas excepto auth
    if (tenantId && !config.url.includes('/auth/')) {
      config.headers['x-tenant-id'] = tenantId;
      console.log(`✅ Header x-tenant-id agregado: ${tenantId}`);
    } else if (!tenantId && !config.url.includes('/auth/')) {
      console.warn('⚠️ No hay tenantId en localStorage');
    }
    
    // Debug: Mostrar headers finales
    console.log('📋 Headers enviados:', {
      Authorization: config.headers.Authorization ? 'Bearer ***' : 'No',
      'x-tenant-id': config.headers['x-tenant-id'] || 'No',
      'Content-Type': config.headers['Content-Type']
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Error en request interceptor:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Respuesta: ${response.status} ${response.config.url}`);
    return response;
  },
  (err) => {
    console.error(`❌ Error: ${err.response?.status}`, err.response?.config?.url);
    console.error('Detalle:', err.response?.data);
    
    if (err.response?.status === 401) {
      console.log('🔐 Sesión expirada, redirigiendo al login...');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('tenantId');
      window.location.href = '/';
    }
    
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

// ===== SERVICIOS DE INVENTARIO =====
export const inventarioAPI = {
  getAll: (params) => api.get('/inventario', { params }),
  getById: (id) => api.get(`/inventario/${id}`),
  create: (data) => api.post('/inventario', data),
  update: (id, data) => api.put(`/inventario/${id}`, data),
  delete: (id) => api.delete(`/inventario/${id}`),
  getStats: () => api.get('/inventario/stats/resumen')
};

// ===== SERVICIOS DE PAGOS =====
export const pagosAPI = {
  create: (prestamoId, data) => api.post(`/pagos/${prestamoId}`, data),
  getByPrestamo: (prestamoId) => api.get(`/pagos/prestamo/${prestamoId}`)
};

// ===== SERVICIOS DE CARTERA =====
export const carteraAPI = {
  getResumen: () => api.get('/cartera'),
  getPrestamos: () => api.get('/cartera/prestamos'),
  getPorCobrador: () => api.get('/cartera/cobradores'),
  getEstadisticas: () => api.get('/cartera/estadisticas'),
  getPagosResumen: () => api.get('/cartera/pagos/resumen')
};

// ===== SERVICIOS DE REPORTES =====
export const reportesAPI = {
  getDiario: (fecha) => api.get(`/reportes/diario?fecha=${fecha}`),
  getMensual: (mes, año) => api.get(`/reportes/mensual?mes=${mes}&año=${año}`)
};

export default api;