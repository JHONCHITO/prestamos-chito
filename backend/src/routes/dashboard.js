const express = require('express');
const router = express.Router();

const Cobrador = require('../models/Cobrador');
const Cliente = require('../models/Cliente');
const Prestamo = require('../models/Prestamo');
const Pago = require('../models/Pago');
const Sede = require('../models/Sede');

const { authMiddleware, adminOnly } = require('../middleware/auth');

// Middleware adicional para asegurar tenantId
router.use((req, res, next) => {
  if (!req.tenantId && req.user?.rol !== 'superadmin') {
    return res.status(400).json({ error: 'Tenant no definido' });
  }
  next();
});

router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const tenantId = req.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant no definido" });
    }

    console.log('📊 Dashboard para tenant:', tenantId);

    const cobradores = await Cobrador.countDocuments({ estado: 'activo', tenantId });
    const clientes = await Cliente.countDocuments({ estado: 'activo', tenantId });

    const prestamos = await Prestamo.find({ tenantId })
      .populate('cliente', 'nombre')
      .populate('cobrador', 'nombre cedula');

    const carteraTotal = prestamos.reduce((sum, p) => sum + p.totalAPagar, 0);
    const totalRecaudado = prestamos.reduce((sum, p) => sum + p.totalPagado, 0);
    const porCobrar = carteraTotal - totalRecaudado;
    const prestamosActivos = prestamos.filter(p => p.estado === 'activo').length;
    
    // =========================
    // 🔥 NUEVO: CÁLCULO DE GANANCIAS TOTALES
    // =========================
    const gananciasTotales = prestamos.reduce((sum, p) => {
      const ganancia = p.totalAPagar - p.capital;
      return sum + ganancia;
    }, 0);
    
    // =========================
    // 🔥 NUEVO: GANANCIAS REALIZADAS (interés cobrado de préstamos pagados)
    // =========================
    const prestamosPagados = prestamos.filter(p => p.estado === 'pagado');
    const gananciasRealizadas = prestamosPagados.reduce((sum, p) => {
      const ganancia = p.totalAPagar - p.capital;
      return sum + ganancia;
    }, 0);
    
    // =========================
    // 🔥 NUEVO: GANANCIAS POR COBRAR (interés de préstamos activos)
    // =========================
    const prestamosActivosList = prestamos.filter(p => p.estado === 'activo');
    const gananciasPorCobrar = prestamosActivosList.reduce((sum, p) => {
      const ganancia = p.totalAPagar - p.capital;
      return sum + ganancia;
    }, 0);
    
    // =========================
    // 🔥 NUEVO: TASA DE GANANCIA (porcentaje de ganancia sobre cartera total)
    // =========================
    const tasaGanancia = carteraTotal > 0 
      ? ((gananciasTotales / carteraTotal) * 100).toFixed(2)
      : 0;

    const ultimosPrestamos = prestamos.slice(-10).reverse().map(p => ({
      _id: p._id,
      cliente: p.cliente?.nombre,
      cobrador: p.cobrador?.nombre,
      capital: p.capital,
      totalAPagar: p.totalAPagar,
      totalPagado: p.totalPagado,
      ganancia: p.totalAPagar - p.capital, // 🔥 NUEVO: ganancia por préstamo
      estado: p.estado,
      createdAt: p.createdAt
    }));

    const cobradoresRecientes = await Cobrador.find({ estado: 'activo', tenantId })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);

    const sedes = await Sede.find({ tenantId });

    const metricasSede = [];

    for (const sede of sedes) {
      const clientesSede = await Cliente.countDocuments({
        tenantId,
        sedeId: sede._id
      });

      const prestamosSede = await Prestamo.countDocuments({
        tenantId,
        sedeId: sede._id,
        estado: 'activo'
      });

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const pagosHoy = await Pago.aggregate([
        {
          $match: {
            tenantId,
            sedeId: sede._id,
            createdAt: { $gte: hoy }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$monto" }
          }
        }
      ]);

      metricasSede.push({
        sede: sede.nombre,
        clientes: clientesSede,
        prestamos: prestamosSede,
        cobrosHoy: pagosHoy[0]?.total || 0
      });
    }

    res.json({
      stats: {
        cobradores,
        clientes,
        carteraTotal,
        totalRecaudado,
        porCobrar,
        prestamosActivos,
        // 🔥 NUEVAS MÉTRICAS DE GANANCIAS
        gananciasTotales,
        gananciasRealizadas,
        gananciasPorCobrar,
        tasaGanancia
      },
      ultimosPrestamos,
      cobradoresRecientes,
      metricasSede
    });

  } catch (err) {
    console.error('❌ Error en dashboard:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;