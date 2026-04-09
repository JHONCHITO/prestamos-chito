require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');

const telegramRoutes = require('./src/telegram/telegram.routes');

const app = express();
const server = http.createServer(app);

// ✅ LISTA COMPLETA DE ORÍGENES PERMITIDOS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5000',
  'https://super-admin-panel-amber.vercel.app',
  'https://prestamos-admin-5vuebxorl-jhon3.vercel.app',
  'https://prestamos-chito.vercel.app',
  'https://frontend-admin-git-main-jhon3.vercel.app',
];

// ✅ FUNCIÓN DE CORS PERSONALIZADA
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const isLocalAllowed = allowedOrigins.includes(origin);
    const isVercelAllowed = origin.endsWith('.vercel.app');
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');

    if (isLocalAllowed || isVercelAllowed || isLocalhost) {
      console.log(`✅ CORS permitido para: ${origin}`);
      return callback(null, true);
    }

    console.log(`❌ CORS bloqueado para: ${origin}`);
    return callback(new Error(`CORS no permitido para origen: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'admin-secret'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// ✅ APLICAR CORS ANTES QUE CUALQUIER OTRA COSA
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ✅ Middleware para asegurar headers CORS en TODAS las respuestas
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost'))
  ) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-tenant-id, admin-secret'
    );
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

app.use(
  express.json({
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        res.status(400).json({ error: 'JSON inválido' });
        throw new Error('Invalid JSON');
      }
    }
  })
);

app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path} - Origen: ${req.headers.origin || 'desconocido'}`);
  next();
});

/* RUTAS BÁSICAS */
app.get('/', (req, res) =>
  res.json({
    message: 'API funcionando',
    timestamp: new Date().toISOString(),
    cors_enabled: true,
    allowed_origins: allowedOrigins
  })
);

app.get('/api/test', (req, res) =>
  res.json({
    message: 'API funcionando correctamente',
    cors_origin: req.headers.origin || 'sin origen'
  })
);

/* AUTH SIN TENANT */
app.use('/api/auth', require('./routes/auth'));

/* WEBHOOK TELEGRAM */
app.use('/api/telegram', telegramRoutes);

/* DECODIFICAR TOKEN GLOBAL */
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'tu_secreto_temporal'
      );
      req.user = decoded;
    } catch (err) {
      console.log('⚠️ Token inválido:', err.message);
    }
  }

  next();
});

/* RUTAS DE SUPERADMIN */
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/pagos', require('./routes/pagos'));

/* TENANT MIDDLEWARE */
const tenantMiddleware = require('./middleware/tenant.middleware');

// ✅ PRIMERO aplicar tenant middleware, DESPUÉS las rutas
const tenantRoutes = [
  '/api/dashboard',
  '/api/cobradores',
  '/api/clientes',
  '/api/prestamos',
  '/api/inventario',
  '/api/sedes',
  '/api/dashboard-charts',
  '/api/cobrador',
  '/api/calendario',
  '/api/cartera'
];

// Aplicar tenant middleware a las rutas específicas
app.use(tenantRoutes, tenantMiddleware);

/* RUTAS DE OFICINA */
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/cobradores', require('./routes/cobradores'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/prestamos', require('./routes/prestamos'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/sedes', require('./routes/sedes'));
app.use('/api/dashboard-charts', require('./routes/dashboardCharts'));
app.use('/api/cobrador', require('./routes/cobrador.routes'));
app.use('/api/calendario', require('./routes/calendario'));
app.use('/api/cartera', require('./routes/cartera'));

/* CONFIGURACIÓN DE SOCKET.IO DESPUÉS DE LAS RUTAS */
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['polling', 'websocket']
});

app.set('io', io);

/* SOCKET.IO - COMUNICACIÓN EN TIEMPO REAL */
io.on('connection', (socket) => {
  console.log('🔌 Nuevo cliente conectado:', socket.id);

  socket.on('join-tenant', (tenantId) => {
    socket.join(`tenant-${tenantId}`);
    console.log(`📡 Cliente ${socket.id} unido a sala tenant-${tenantId}`);
    socket.emit('joined', {
      tenantId,
      message: 'Conectado al canal de notificaciones'
    });
  });

  socket.on('join-superadmin', () => {
    socket.join('superadmin-room');
    console.log(`👑 Cliente ${socket.id} unido a sala superadmin`);
    socket.emit('joined', { message: 'Conectado como Super Admin' });
  });

  socket.on('pago-registrado', (data) => {
    console.log('💰 Pago registrado:', data);
    io.to('superadmin-room').emit('nueva-notificacion', {
      type: 'pago',
      empresa: data.empresa,
      mensaje: `${data.empresa} ha realizado un pago de $${data.monto.toLocaleString()}`,
      fecha: new Date()
    });
  });

  socket.on('enviar-recordatorio', (data) => {
    console.log('🔔 Recordatorio enviado a:', data.empresa);
    io.to(`tenant-${data.tenantId}`).emit('recibido-recordatorio', {
      type: 'recordatorio-pago',
      empresa: data.empresa,
      mensaje: `⚠️ RECORDATORIO: Tienes un pago pendiente de $${data.monto.toLocaleString()} con ${data.diasAtraso} días de atraso.`,
      fechaVencimiento: data.fechaVencimiento,
      diasAtraso: data.diasAtraso,
      monto: data.monto,
      fecha: new Date()
    });
    socket.emit('recordatorio-enviado', {
      success: true,
      empresa: data.empresa,
      mensaje: `Recordatorio enviado a ${data.empresa}`
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Cliente desconectado:', socket.id);
  });
});

/* DEBUG Y 404 */
app.get('/api/debug/db', (req, res) => {
  res.json({
    ok: true,
    dbName: mongoose.connection.name,
    readyState: mongoose.connection.readyState,
    cors_origins_allowed: allowedOrigins
  });
});

app.get('/api/debug/cors-test', (req, res) => {
  res.json({
    message: 'CORS está funcionando correctamente',
    your_origin: req.headers.origin || 'sin origen',
    allowed_origins: allowedOrigins
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

/* MONGO CONNECT */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
  })
  .catch((err) => {
    console.log('❌ Error MongoDB:', err.message);
    process.exit(1);
  });

const PORT = process.env.PORT || 5000;

// Solo iniciar el servidor si no estamos en producción (Vercel)
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
}

// Exporta app y server para Vercel (usará serverless)
module.exports = app;
module.exports.server = server;
