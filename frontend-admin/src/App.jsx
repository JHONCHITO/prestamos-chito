import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, message } from 'antd';
import esES from 'antd/locale/es_ES';

import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';  // ← Esto debe apuntar a pages/Dashboard.jsx
import Cobradores from './pages/Cobradores';
import Clientes from './pages/Clientes';
import Cartera from './pages/Cartera';
import Calendario from './pages/Calendario';


import Prestamos from './pages/Prestamos';

import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import Perfil from './pages/Perfil';

message.config({
  top: 100,
  duration: 3,
  maxCount: 3,
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    const storedUser = localStorage.getItem('admin_user');
    const storedTenantId = localStorage.getItem('tenantId');
    
    if (storedToken && storedUser && storedTenantId) {
      try {
        const userData = JSON.parse(storedUser);
        if (!userData.tenantId && storedTenantId) {
          userData.tenantId = storedTenantId;
        }
        setUser(userData);
      } catch (e) {
        console.error('Error restaurando sesión:', e);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    message.success('Sesión cerrada correctamente');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando...</div>;
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <ConfigProvider locale={esES}>
      <BrowserRouter>
        <Layout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/prestamos" element={<Prestamos />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/cobradores" element={<Cobradores />} />
            <Route path="/cartera" element={<Cartera />} />
            <Route path="/calendario" element={<Calendario />} />



            <Route path="/reportes" element={<Reportes />} />
            <Route path="/configuracion" element={<Configuracion />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
