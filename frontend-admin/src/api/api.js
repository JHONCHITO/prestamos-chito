import api, { authAPI } from '../services/api';

export * from '../services/api';
export default api;

export const login = (email, password) => authAPI.login(email, password);
export const logout = (...args) => authAPI.logout(...args);
