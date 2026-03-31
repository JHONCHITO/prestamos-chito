// src/services/cartera.js
import api from './api';

export const carteraAPI = {
  // Obtener resumen para las tarjetas
  getResumen: () => api.get('/cartera'),
  
  // Obtener lista detallada para la tabla
  getPrestamos: () => api.get('/cartera/prestamos'),
  
  // Obtener cartera por cobrador
  getPorCobrador: () => api.get('/cartera/cobradores'),
  
  // Obtener estadísticas para gráficos
  getEstadisticas: () => api.get('/cartera/estadisticas')
};