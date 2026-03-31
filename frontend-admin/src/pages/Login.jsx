import React, { useState } from 'react';
import { login } from '../api/api';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Complete todos los campos');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      console.log('========================================');
      console.log('🔐 1. Intentando login con:', email);
      
      const response = await login(email, password);
      
      console.log('🔐 2. Respuesta recibida:', response);
      console.log('🔐 3. user object:', response.user);
      console.log('🔐 4. tenantId en response.user:', response.user?.tenantId);
      
      if (!response.token) {
        throw new Error('No se recibió token');
      }
      
      if (!response.user) {
        throw new Error('No se recibieron datos de usuario');
      }
      
      if (!response.user.tenantId) {
        console.error('❌ ERROR CRÍTICO: No hay tenantId en la respuesta');
        setError('Error: Usuario sin ID de empresa. Contacte al administrador.');
        setLoading(false);
        return;
      }
      
      // LIMPIAR localStorage ANTES DE GUARDAR
      localStorage.clear();
      
      // GUARDAR DATOS
      localStorage.setItem('admin_token', response.token);
      localStorage.setItem('admin_user', JSON.stringify(response.user));
      localStorage.setItem('tenantId', response.user.tenantId);
      
      console.log('✅ 5. Datos guardados:');
      console.log('   - tenantId:', localStorage.getItem('tenantId'));
      console.log('   - admin_token:', response.token.substring(0, 50) + '...');
      console.log('   - admin_user:', localStorage.getItem('admin_user'));
      
      // VERIFICAR QUE SE GUARDARON
      const verifyTenantId = localStorage.getItem('tenantId');
      const verifyToken = localStorage.getItem('admin_token');
      const verifyUser = localStorage.getItem('admin_user');
      
      console.log('✅ 6. Verificación post-guardado:');
      console.log('   - tenantId:', verifyTenantId);
      console.log('   - token:', verifyToken ? '✅ Presente' : '❌ No');
      console.log('   - user:', verifyUser ? '✅ Presente' : '❌ No');
      
      if (!verifyTenantId) {
        console.error('❌ ERROR: tenantId no se guardó en localStorage');
        setError('Error al guardar la sesión');
        setLoading(false);
        return;
      }
      
      console.log('========================================');
      console.log('✅ Login exitoso! Redirigiendo...');
      
      // Llamar al callback del padre
      onLogin(response.user, response.token);
      
    } catch (err) {
      console.error('❌ Error en login:', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#0a0f2a'
    }}>
      <div style={{
        width: 380,
        padding: 40,
        background: '#071a14',
        borderRadius: 16,
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ color: '#00ff88', fontSize: 32, marginBottom: 8 }}>Gota a Gota</h1>
        <p style={{ color: '#8c8c8c', marginBottom: 30 }}>Panel de Administración</p>
        
        {error && (
          <div style={{
            background: 'rgba(255,77,79,0.2)',
            border: '1px solid #ff4d4f',
            borderRadius: 8,
            padding: 10,
            marginBottom: 20,
            color: '#ff4d4f'
          }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              marginBottom: 16,
              background: '#0a1f1a',
              border: '1px solid #00ff88',
              borderRadius: 8,
              color: 'white',
              fontSize: 16
            }}
          />
          
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              marginBottom: 24,
              background: '#0a1f1a',
              border: '1px solid #00ff88',
              borderRadius: 8,
              color: 'white',
              fontSize: 16
            }}
          />
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              background: '#00ff88',
              border: 'none',
              borderRadius: 8,
              color: '#0a0f2a',
              fontWeight: 'bold',
              fontSize: 16,
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;