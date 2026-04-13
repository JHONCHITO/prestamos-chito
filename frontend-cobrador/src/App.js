import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Menu from './pages/Menu';
import Clientes from './pages/Clientes';
import ClienteDetalle from './pages/ClienteDetalle';
import Creditos from './pages/Creditos';
import NuevoCredito from './pages/NuevoCredito';
import PagarCredito from './pages/PagarCredito';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('cobrador_user');
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);

        if (parsedUser?.tenantId && !localStorage.getItem('tenantId')) {
          localStorage.setItem('tenantId', parsedUser.tenantId);
        }
      } catch (error) {
        console.error('Error restaurando sesion del cobrador:', error);
        localStorage.removeItem('cobrador_user');
      }
    }
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('cobrador_token', token);
    localStorage.setItem('cobrador_user', JSON.stringify(userData));
    if (userData?.tenantId) {
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/menu" />} />
        <Route path="/menu" element={user ? <Menu user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/clientes" element={user ? <Clientes user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/clientes/:id" element={user ? <ClienteDetalle user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/creditos" element={user ? <Creditos user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/nuevo-credito/:clienteId" element={user ? <NuevoCredito user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
        <Route path="/pagar/:prestamoId" element={user ? <PagarCredito user={user} onLogout={handleLogout} /> : <Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
