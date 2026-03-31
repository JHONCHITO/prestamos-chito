import os

login = """import React, { useState } from 'react';
import { authAPI } from '../services/api';

export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!usuario || !password) { setError('Ingrese todos los campos'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.cobradorLogin(usuario, password);
      localStorage.setItem('cobrador_token', res.data.token);
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
    wrap: { width: '100%', maxWidth: '380px' },
    logoBox: { width: '72px', height: '72px', margin: '0 auto 16px', background: 'linear-gradient(135deg,#14b8a6,#0d9488)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', boxShadow: '0 8px 32px rgba(20,184,166,0.4)' },
    title: { color: '#f8fafc', fontSize: '26px', fontWeight: '800', margin: '0 0 4px', textAlign: 'center' },
    sub: { color: '#94a3b8', fontSize: '14px', margin: 0, textAlign: 'center' },
    card: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '32px', marginTop: '32px' },
    h2: { color: '#f8fafc', fontSize: '20px', fontWeight: '700', margin: '0 0 24px', textAlign: 'center' },
    errBox: { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' },
    label: { color: '#94a3b8', fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '8px' },
    input: { width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc', fontSize: '15px', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' },
    btn: { width: '100%', padding: '16px', background: 'linear-gradient(135deg,#14b8a6,#0d9488)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '16px', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', marginTop: '8px' },
    foot: { color: '#475569', fontSize: '12px', textAlign: 'center', marginTop: '24px' },
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.logoBox}>
          <span>G</span>
        </div>
        <h1 style={s.title}>Gota a Gota</h1>
        <p style={s.sub}>Panel del Cobrador</p>
        <div style={s.card}>
          <h2 style={s.h2}>Iniciar Sesion</h2>
          {error && <div style={s.errBox}>{error}</div>}
          abel style={s.label}>CORREO</label>
          <input
            style={s.input}
            type='text'
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder='correo@ejemplo.com'
          />
          abel style={s.label}>CONTRASENA</label>
          <input
            style={s.input}
            type='password'
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            placeholder='Contrasena'
          />
          <button style={{...s.btn, opacity: loading ? 0.6 : 1}} onClick={handleSubmit} disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>
        <p style={s.foot}>Gota a Gota - Sistema de Cobro 2025</p>
      </div>
    </div>
  );
}
"""

with open('src/pages/Login.js', 'w', encoding='utf-8') as f:
    f.write(login)
print('OK Login.js escrito')
