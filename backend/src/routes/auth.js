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

function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function escapeRegex(value = '') {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DEFAULT_SUPERADMIN_EMAIL = normalizeEmail(
  process.env.SUPERADMIN_EMAIL || 'superadmin@prestamos-chito.com',
);
const SUPERADMIN_EMAIL_ALIASES = [
  DEFAULT_SUPERADMIN_EMAIL,
  'superadmin@gotaagota.com',
];
const DEFAULT_SUPERADMIN_PASSWORD = String(
  process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123',
).trim();
const SUPERADMIN_BOOTSTRAP_PASSWORDS = [
  DEFAULT_SUPERADMIN_PASSWORD,
  'SuperAdmin123*',
  '123456',
];

async function reconcileBootstrapSuperAdmin(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || '').trim();

  if (
    !SUPERADMIN_EMAIL_ALIASES.includes(normalizedEmail) ||
    !SUPERADMIN_BOOTSTRAP_PASSWORDS.includes(normalizedPassword)
  ) {
    return null;
  }

  let user = await Admin.findOne({
    email: {
      $in: SUPERADMIN_EMAIL_ALIASES,
    },
  });

  if (!user) {
    for (const alias of SUPERADMIN_EMAIL_ALIASES) {
      user = await Admin.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(alias)}$`, 'i') },
      });

      if (user) {
        break;
      }
    }
  }

  if (!user) {
    user = await Admin.findOne({
      rol: { $in: ['superadmin', 'superadministrador'] },
    });
  }

  if (!user) {
    user = new Admin({
      nombre: 'Super Admin',
      email: DEFAULT_SUPERADMIN_EMAIL,
      password: DEFAULT_SUPERADMIN_PASSWORD,
      rol: 'superadmin',
      tenantId: null,
    });
    await user.save();
    return user;
  }

  let changed = false;

  if (normalizeEmail(user.email) !== DEFAULT_SUPERADMIN_EMAIL) {
    user.email = DEFAULT_SUPERADMIN_EMAIL;
    changed = true;
  }

  if (user.rol !== 'superadmin') {
    user.rol = 'superadmin';
    changed = true;
  }

  if (user.tenantId !== null) {
    user.tenantId = null;
    changed = true;
  }

  const passwordMatchesPreferred = await bcrypt.compare(
    DEFAULT_SUPERADMIN_PASSWORD,
    user.password,
  );

  if (!passwordMatchesPreferred) {
    user.password = DEFAULT_SUPERADMIN_PASSWORD;
    changed = true;
  }

  if (changed) {
    await user.save();
  }

  return user;
}

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
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = String(password || '').trim();
    
    console.log('🔐 Intento de login superadmin:', normalizedEmail);
    
    if (!normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    
    let user = await Admin.findOne({ email: normalizedEmail });
    let isValidPassword = false;

    if (!user) {
      user = await Admin.findOne({
        email: { $regex: new RegExp(`^${escapeRegex(normalizedEmail)}$`, 'i') },
      });
    }
    
    if (!user) {
      user = await reconcileBootstrapSuperAdmin(normalizedEmail, normalizedPassword);
    }

    if (user) {
      isValidPassword = await bcrypt.compare(normalizedPassword, user.password);
    }

    if (!user || !isValidPassword) {
      const bootstrapUser = await reconcileBootstrapSuperAdmin(normalizedEmail, normalizedPassword);
      if (bootstrapUser) {
        user = bootstrapUser;
        isValidPassword = true;
      }
    }
    
    if (!isValidPassword) {
      console.log('❌ Usuario o contraseña incorrectos:', normalizedEmail);
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
    
    console.log('✅ Login exitoso:', normalizedEmail, 'Rol:', user.rol);
    
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
