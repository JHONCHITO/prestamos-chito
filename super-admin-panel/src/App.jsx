import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { message } from 'antd';
import Login from './pages/Login';
import SuperAdminLayout from './components/superadmin/SuperAdminLayout';
import './App.css';

// Configurar mensajes globales
message.config({
  top: 100,
  duration: 3,
  maxCount: 3,
});

function App() {
  const isAuthenticated = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  return (
    <div className="app">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/superadmin/*" 
            element={
              isAuthenticated && userRole === 'superadmin' ? 
              <SuperAdminLayout /> : 
              <Navigate to="/login" />
            } 
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;