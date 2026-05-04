import axios from 'axios';

const LOCAL_API_URL = 'http://localhost:5000/api';
const DEFAULT_API_URL = 'https://prestamos-chito-backend.onrender.com/api';

function readEnv(name) {
  if (typeof process !== 'undefined' && process.env && typeof process.env[name] === 'string') {
    return process.env[name].trim();
  }

  return '';
}

function readWindow(name) {
  if (typeof window !== 'undefined' && typeof window[name] === 'string') {
    return window[name].trim();
  }

  return '';
}

function isLocalHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function normalizeUrl(rawUrl) {
  const value = String(rawUrl || '').trim();

  if (!value || value === '/api' || value === 'api') {
    return '';
  }

  if (!/^https?:\/\//i.test(value)) {
    return '';
  }

  try {
    const parsed = new URL(value);

    if (typeof window !== 'undefined' && parsed.hostname === window.location.hostname && !isLocalHost(parsed.hostname)) {
      return '';
    }
  } catch (error) {
    return '';
  }

  return value.replace(/\/+$/, '');
}

function resolveApiUrl() {
  const candidates = [
    readEnv('REACT_APP_API_URL'),
    readWindow('__API_URL__'),
    readWindow('__REACT_APP_API_URL__')
  ];

  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  if (typeof window !== 'undefined' && isLocalHost(window.location.hostname)) {
    return LOCAL_API_URL;
  }

  return DEFAULT_API_URL;
}

export const API_URL = resolveApiUrl();
export const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

console.log('[api] API URL:', API_URL);
console.log('[api] Socket URL:', SOCKET_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    const tenantId = localStorage.getItem('tenantId');
    const requestUrl = config.url || '';
    const isAuthRoute = requestUrl.includes('/auth/');

    console.log(`[api] ${config.method?.toUpperCase()} ${requestUrl}`);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (tenantId && !isAuthRoute) {
      config.headers['x-tenant-id'] = tenantId;
    }

    return config;
  },
  (error) => {
    console.error('[api] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (err) => {
    console.error(`[api] Error ${err.response?.status || 'no-status'}`, err.response?.config?.url);

    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('tenantId');
      window.location.href = '/';
    }

    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/admin/login', { email, password }),
  logout: () => api.post('/auth/logout')
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
  getStats: () => api.get('/dashboard/stats'),
  getCharts: () => api.get('/dashboard/charts')
};

export const cobradoresAPI = {
  getAll: (search) => api.get('/cobradores', { params: { search } }),
  getById: (id) => api.get(`/cobradores/${id}`),
  create: (data) => api.post('/cobradores', data),
  update: (id, data) => api.put(`/cobradores/${id}`, data),
  delete: (id) => api.delete(`/cobradores/${id}`)
};

export const clientesAPI = {
  getAll: (search) => api.get('/clientes', { params: { search } }),
  getById: (id) => api.get(`/clientes/${id}`),
  create: (data) => api.post('/clientes', data),
  update: (id, data) => api.put(`/clientes/${id}`, data),
  delete: (id) => api.delete(`/clientes/${id}`)
};

export const prestamosAPI = {
  getAll: (params) => api.get('/prestamos', { params }),
  getById: (id) => api.get(`/prestamos/${id}`),
  create: (data) => api.post('/prestamos', data),
  update: (id, data) => api.put(`/prestamos/${id}`, data),
  delete: (id) => api.delete(`/prestamos/${id}`),
  getByCliente: (clienteId) => api.get(`/prestamos/cliente/${clienteId}`),
  registrarPago: (data) => api.post('/pagos', data)
};

export const inventarioAPI = {
  getAll: (params) => api.get('/inventario', { params }),
  getById: (id) => api.get(`/inventario/${id}`),
  create: (data) => api.post('/inventario', data),
  update: (id, data) => api.put(`/inventario/${id}`, data),
  delete: (id) => api.delete(`/inventario/${id}`),
  getStats: () => api.get('/inventario/stats/resumen')
};

export const pagosAPI = {
  create: (prestamoId, data) => api.post(`/pagos/${prestamoId}`, data),
  getByPrestamo: (prestamoId) => api.get(`/pagos/prestamo/${prestamoId}`)
};

export const carteraAPI = {
  getResumen: () => api.get('/cartera'),
  getPrestamos: () => api.get('/cartera/prestamos'),
  getPorCobrador: () => api.get('/cartera/cobradores'),
  getEstadisticas: () => api.get('/cartera/estadisticas'),
  getPagosResumen: () => api.get('/cartera/pagos/resumen')
};

export const reportesAPI = {
  getDiario: (fecha) => api.get(`/reportes/diario?fecha=${fecha}`),
  getMensual: (mes, ano) => api.get(`/reportes/mensual?mes=${mes}&año=${ano}`)
};

export default api;
