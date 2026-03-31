const jwt = require('jsonwebtoken');

const tenantMiddleware = async (req, res, next) => {
  try {
    // ✅ AGREGAR HEADERS CORS PARA TODAS LAS RESPUESTAS
    const origin = req.headers.origin;
    if (origin && (origin.includes('.vercel.app') || origin.includes('localhost'))) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id, admin-secret');
    }
    
    // ✅ MANEJAR SOLICITUDES OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
      console.log('📡 OPTIONS request recibida, respondiendo OK');
      return res.status(200).end();
    }
    
    console.log("🔍 Tenant Middleware - Path:", req.path);
    console.log("🔍 Método:", req.method);
    console.log("🔍 Headers:", {
      origin: req.headers.origin,
      'x-tenant-id': req.headers['x-tenant-id'],
      authorization: req.headers.authorization ? 'Presente' : 'No'
    });

    const rutasPublicas = [
      '/api/auth/',
      '/api/superadmin/',
      '/api/test',
      '/api/pagos/pendientes',
      '/api/pagos/recordatorio',
      '/api/debug/'
    ];

    const esRutaPublica = rutasPublicas.some(ruta =>
      req.path.startsWith(ruta)
    );

    const token = req.headers.authorization?.split(' ')[1];

    /* =========================
       RUTAS PUBLICAS
    ========================= */
    if (esRutaPublica) {
      console.log(`🔓 Ruta pública: ${req.path}`);

      if (token) {
        try {
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'tu_secreto_temporal'
          );
          req.user = decoded;

          if (decoded.tenantId) {
            req.tenantId = decoded.tenantId.toLowerCase().trim();
          }

          console.log(
            "👤 Usuario en ruta pública:",
            decoded.email,
            "Rol:",
            decoded.rol,
            "TenantId:",
            req.tenantId
          );
        } catch (err) {
          console.log("⚠️ Token inválido en ruta pública");
        }
      }

      return next();
    }

    /* =========================
       RUTAS PRIVADAS
    ========================= */
    if (!token) {
      console.log("❌ Token no proporcionado");
      return res.status(401).json({
        error: "Token no proporcionado"
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'tu_secreto_temporal'
      );
    } catch (err) {
      console.log("❌ Token inválido:", err.message);
      return res.status(401).json({
        error: 'Token inválido o expirado'
      });
    }

    req.user = decoded;

    console.log(
      "✅ Token verificado:",
      decoded.email,
      "Rol:",
      decoded.rol,
      "TenantId:",
      decoded.tenantId
    );

    // Super Admin puede pasar sin tenantId
    if (
      decoded.rol === 'superadmin' ||
      decoded.rol === 'superadministrador'
    ) {
      console.log('👑 Super Admin detectado');
      // Si Super Admin envía tenantId en header, usarlo
      const headerTenantId = req.headers['x-tenant-id'];
      if (headerTenantId) {
        req.tenantId = headerTenantId.toLowerCase().trim();
        console.log(`📡 Tenant ID para Super Admin: ${req.tenantId}`);
      }
      return next();
    }

    // Para usuarios normales (admin de oficina), verificar tenantId
    if (!decoded.tenantId) {
      console.log("❌ TenantId no presente en el token");
      return res.status(400).json({
        error: 'TenantId no presente en el token'
      });
    }

    // Verificar tenantId desde el header (debe coincidir)
    const headerTenantId = req.headers['x-tenant-id'];
    
    if (!headerTenantId) {
      console.log("❌ Header x-tenant-id no proporcionado");
      return res.status(400).json({
        error: 'Header x-tenant-id es requerido'
      });
    }
    
    if (headerTenantId !== decoded.tenantId) {
      console.log(`⚠️ Tenant mismatch: header=${headerTenantId}, token=${decoded.tenantId}`);
      return res.status(403).json({
        error: 'Tenant ID no coincide con el token'
      });
    }

    /* NORMALIZAR TENANT */
    req.tenantId = decoded.tenantId.toLowerCase().trim();

    console.log(
      `✅ Tenant ID establecido: ${req.tenantId} para usuario: ${decoded.email}`
    );

    next();

  } catch (error) {
    console.error('❌ Error en tenant middleware:', error);
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

module.exports = tenantMiddleware;