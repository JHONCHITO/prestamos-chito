import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🔧 API URL configurada:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log(`📤 ${config.method.toUpperCase()} ${config.url}`, token ? '✅ Con token' : '❌ Sin token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    console.log(`✅ Respuesta ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('❌ Error respuesta:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      console.log('🔐 Token expirado');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Autenticación
export const login = async (email, password) => {
  console.log('🔑 Intentando login:', email);
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

// Dashboard y estadísticas
export const getSuperAdminStats = async () => {
  console.log('📊 Solicitando estadísticas...');
  const response = await api.get('/superadmin/stats');
  return response.data;
};

// Gestión de oficinas
export const getOficinas = async () => {
  console.log('🏢 Solicitando oficinas...');
  const response = await api.get('/superadmin/oficinas');
  return response.data;
};

export const crearOficina = async (data) => {
  console.log('🏗 Creando oficina:', data);
  const response = await api.post('/superadmin/crear-oficina', data);
  return response.data;
};

export const cambiarEstadoOficina = async (id, estado) => {
  console.log('🔄 Cambiando estado:', id, estado);
  const response = await api.put(`/superadmin/oficinas/${id}`, { estado });
  return response.data;
};

export const eliminarOficina = async (id) => {
  console.log('🗑 Eliminando oficina:', id);
  const response = await api.delete(`/superadmin/oficinas/${id}`);
  return response.data;
};

export const getDetalleOficina = async (id) => {
  console.log('🔍 Detalle oficina:', id);
  const response = await api.get(`/superadmin/oficinas/${id}/detalle`);
  return response.data;
};

// Obtener empresas con pagos pendientes
export const getEmpresasMorosas = async () => {
  console.log('💰 Solicitando empresas con pagos pendientes...');
  const response = await api.get('/pagos/pendientes');
  return response.data;
};

export default api;