import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, message } from 'antd';
import esES from 'antd/locale/es_ES';

import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
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
        console.log('✅ Sesión restaurada desde localStorage');
      } catch (e) {
        console.error('Error restaurando sesión:', e);
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    console.log('🔐 handleLogin llamado con:', { userData, token });
    
    if (!userData || !token) {
      console.error('❌ Error: Faltan datos en handleLogin');
      return;
    }
    
    // Guardar en localStorage
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_user', JSON.stringify(userData));
    if (userData.tenantId) {
      localStorage.setItem('tenantId', userData.tenantId);
    }
    
    // Guardar en estado
    setUser(userData);
    
    console.log('✅ Datos guardados correctamente');
    console.log('   - Token:', token.substring(0, 50) + '...');
    console.log('   - TenantId:', userData.tenantId);
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