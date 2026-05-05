import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Menu from './pages/Menu';
import Clientes from './pages/Clientes';
import Creditos from './pages/Creditos';
import Asistente from './pages/Asistente';
import ProtectedRoute from './routes/ProtectedRoute';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cobrador_token');
    const storedUser = localStorage.getItem('cobrador_user');
    const storedTenantId = localStorage.getItem('tenantId');

    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (!userData.tenantId && storedTenantId) {
          userData.tenantId = storedTenantId;
        }
        setUser(userData);
      } catch (error) {
        console.error('Error restaurando sesion de cobrador:', error);
      }
    }

    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    if (!userData || !token) {
      return;
    }

    localStorage.setItem('cobrador_token', token);
    localStorage.setItem('cobrador_user', JSON.stringify(userData));
    if (userData.tenantId) {
      localStorage.setItem('tenantId', userData.tenantId);
    }
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('cobrador_token');
    localStorage.removeItem('cobrador_user');
    localStorage.removeItem('tenantId');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Cargando...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/cobrador/menu" /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/cobrador/menu"
          element={
            <ProtectedRoute>
              <Menu user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute>
              <Clientes user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/creditos"
          element={
            <ProtectedRoute>
              <Creditos user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/asistente"
          element={
            <ProtectedRoute>
              <Asistente user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
