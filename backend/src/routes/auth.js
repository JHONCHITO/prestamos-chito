const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Cobrador = require('../models/Cobrador');

const authRequired = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_temporal');
    req.authUser = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Ruta de login para admin de oficina
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Intento de login admin:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    // Buscar en Admin (excluye superadmin)
    const user = await Admin.findOne({ 
      email: email.toLowerCase(),
      rol: { $in: ['admin', 'administrador'] }
    });
    
    if (!user) {
      console.log('❌ Admin no encontrado:', email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    console.log('📦 Usuario encontrado:', {
      id: user._id,
      email: user.email,
      rol: user.rol,
      tenantId: user.tenantId
    });
    
    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ Contraseña incorrecta para admin:', email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        rol: user.rol,
        tenantId: user.tenantId
      },
      process.env.JWT_SECRET || 'tu_secreto_temporal',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Login admin exitoso:', email, 'Tenant:', user.tenantId);
    
    res.json({
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        tenantId: user.tenantId  // ← Asegurar que está aquí
      }
    });
    
  } catch (error) {
    console.error('❌ Error en login admin:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta de login para superadmin
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Intento de login superadmin:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    const user = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ Usuario no encontrado:', email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ Contraseña incorrecta:', email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        rol: user.rol,
        tenantId: user.tenantId || 'system'
      },
      process.env.JWT_SECRET || 'tu_secreto_temporal',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Login exitoso:', email, 'Rol:', user.rol);
    
    res.json({
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        tenantId: user.tenantId || 'system'
      }
    });
    
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ruta de login para cobrador
router.post('/cobrador/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Intento de login cobrador:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    const user = await Cobrador.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ Cobrador no encontrado:', email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ Contraseña incorrecta:', email);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        rol: 'cobrador',
        tenantId: user.tenantId
      },
      process.env.JWT_SECRET || 'tu_secreto_temporal',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Login cobrador exitoso:', email, 'Tenant:', user.tenantId);
    
    res.json({
      token,
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: 'cobrador',
        tenantId: user.tenantId,
        cedula: user.cedula,
        telefono: user.telefono,
        zona: user.zona
      }
    });
    
  } catch (error) {
    console.error('❌ Error en login cobrador:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', authRequired, async (req, res) => {
  try {
    if (req.authUser.rol === 'cobrador') {
      const user = await Cobrador.findById(req.authUser.id).select('-password');

      if (!user) {
        return res.status(404).json({ error: 'Cobrador no encontrado' });
      }

      return res.json({
        user: {
          id: user._id,
          nombre: user.nombre,
          email: user.email,
          rol: 'cobrador',
          tenantId: user.tenantId,
          cedula: user.cedula,
          telefono: user.telefono,
          zona: user.zona
        }
      });
    }

    const user = await Admin.findById(req.authUser.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({
      user: {
        id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        tenantId: user.tenantId
      }
    });
  } catch (error) {
    console.error('❌ Error en GET /auth/me:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
