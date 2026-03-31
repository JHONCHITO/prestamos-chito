import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { message } from 'antd';
import Login from './pages/Login';
import SuperAdminLayout from './components/superadmin/SuperAdminLayout';
import './App.css';

message.config({
  top: 100,
  duration: 3,
  maxCount: 3,
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem('super_token')
  );
  const [userRole, setUserRole] = useState(
    localStorage.getItem('userRole')
  );

  useEffect(() => {
    const handleStorage = () => {
      setIsAuthenticated(!!localStorage.getItem('super_token'));
      setUserRole(localStorage.getItem('userRole'));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <div className="app">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login onLogin={() => {
            setIsAuthenticated(true);
            setUserRole(localStorage.getItem('userRole'));
          }} />} />
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
