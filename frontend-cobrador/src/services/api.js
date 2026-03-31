import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ 
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// =========================
// INTERCEPTOR REQUEST
// =========================
api.interceptors.request.use((config) => {

  const token =
    localStorage.getItem('cobrador_token') ||
    localStorage.getItem('admin_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// =========================
// INTERCEPTOR RESPONSE
// =========================
api.interceptors.response.use(
  (response) => response,
  (error) => {

    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

// =========================
// AUTH
// =========================
export const authAPI = {
  cobradorLogin: (email, password) =>
    api.post('/auth/cobrador/login', { email, password }),

  adminLogin: (email, password) =>
    api.post('/auth/admin/login', { email, password }),

  logout: () => api.post('/auth/logout')
};

// =========================
// CLIENTES
// =========================
export const clientesAPI = {
  getAll: () => api.get('/clientes'),
  getById: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  delete: (id) => api.delete(`/clientes/${id}`)
};

// =========================
// PRÉSTAMOS
// =========================
export const prestamosAPI = {
  getAll: () => api.get('/prestamos'),
  getById: (id) => api.get(`/prestamos/${id}`),
  getByCliente: (clienteId) => api.get(`/prestamos/cliente/${clienteId}`),
  create: (data) => api.post('/prestamos', data),
  update: (id, data) => api.put(`/prestamos/${id}`, data),
  delete: (id) => api.delete(`/prestamos/${id}`),
  registrarPago: (prestamoId, data) => api.post(`/prestamos/${prestamoId}/pagos`, data),
  getPagos: (prestamoId) => api.get(`/prestamos/${prestamoId}/pagos`)
};

// =========================
// PAGOS - COMPLETO CON TODOS LOS MÉTODOS
// =========================
export const pagosAPI = {
  // Registrar un nuevo pago
  registrar: (data) => api.post('/pagos', data),
  
  // Crear pago (alias)
  create: (data) => api.post('/pagos', data),
  
  // Obtener todos los pagos
  getAll: () => api.get('/pagos'),
  
  // Obtener pagos por préstamo
  getByPrestamo: (prestamoId) => api.get(`/pagos/prestamo/${prestamoId}`),
  
  // Obtener pagos por cobrador
  getByCobrador: (cobradorId) => api.get(`/pagos/cobrador/${cobradorId}`),
  
  // Obtener resumen de pagos del día
  getResumenDia: () => api.get('/pagos/resumen/dia'),
  
  // Obtener resumen general
  getResumen: () => api.get('/pagos/resumen')
};

export default api;