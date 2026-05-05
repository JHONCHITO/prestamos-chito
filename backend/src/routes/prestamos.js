const express = require('express');
const router = express.Router();
const Prestamo = require('../models/Prestamo');
const Cliente = require('../models/Cliente');
const Cobrador = require('../models/Cobrador');
const Pago = require('../models/Pago');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use((req, res, next) => {
  if (!req.tenantId && req.user?.rol !== 'superadmin') {
    return res.status(400).json({ error: 'Tenant no definido' });
  }
  next();
});

function parseMoney(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = Number(
    String(value)
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/\$/g, '')
      .trim()
  );

  return Number.isFinite(normalized) ? normalized : fallback;
}

function parseInteger(value, fallback = null) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDate(value, fallback = null) {
  if (!value) {
    return fallback;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function calculateFechaVencimiento(fechaInicio, numeroCuotas, frecuencia = 'diario') {
  if (!fechaInicio || !numeroCuotas) {
    return null;
  }

  const fecha = new Date(fechaInicio);

  switch (frecuencia) {
    case 'semanal':
      fecha.setDate(fecha.getDate() + (numeroCuotas * 7));
      break;
    case 'quincenal':
      fecha.setDate(fecha.getDate() + (numeroCuotas * 15));
      break;
    case 'mensual':
      fecha.setMonth(fecha.getMonth() + numeroCuotas);
      break;
    default:
      fecha.setDate(fecha.getDate() + numeroCuotas);
      break;
  }

  return fecha;
}

function buildPrestamoPayload(body = {}, existing = null) {
  const source = {
    ...(existing && typeof existing.toObject === 'function' ? existing.toObject() : existing || {}),
    ...body
  };

  const clienteId = source.clienteId || source.cliente;
  const cobradorId = source.cobradorId || source.cobrador;
  const capital = parseMoney(source.capital ?? source.monto ?? source.amount, existing?.capital ?? null);
  const interes = parseMoney(source.interes, existing?.interes ?? 20);
  const numeroCuotas = parseInteger(source.numeroCuotas ?? source.plazo, existing?.numeroCuotas ?? 30);
  const frecuencia = source.frecuencia || existing?.frecuencia || 'diario';
  const fechaInicio = parseDate(source.fechaInicio, existing?.fechaInicio || new Date());
  const fechaVencimiento = parseDate(
    source.fechaVencimiento,
    calculateFechaVencimiento(fechaInicio, numeroCuotas, frecuencia)
  );
  const notas = typeof source.notas === 'string' ? source.notas.trim() : (source.notas || '');

  return {
    ...source,
    clienteId,
    cobradorId,
    capital,
    interes,
    numeroCuotas,
    frecuencia,
    fechaInicio,
    fechaVencimiento,
    notas
  };
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, cobrador: cobradorFilter } = req.query;
    let query = { tenantId: req.tenantId };

    if (req.user.rol === 'cobrador') {
      query.cobrador = req.user.id;
    } else if (cobradorFilter) {
      query.cobrador = cobradorFilter;
    }

    const prestamos = await Prestamo.find(query)
      .populate('cliente', 'nombre cedula')
      .populate('cobrador', 'nombre cedula')
      .sort({ createdAt: -1 });

    const result = prestamos.map((p) => ({
      ...p.toObject(),
      saldoPendiente: p.totalAPagar - (p.totalPagado || 0),
      porcentajePagado: ((p.totalPagado || 0) / p.totalAPagar * 100).toFixed(2)
    }));

    if (search) {
      return res.json(result.filter((p) =>
        p.cliente?.nombre?.toLowerCase().includes(search.toLowerCase())
      ));
    }

    res.json(result);
  } catch (err) {
    console.error('Error en GET /prestamos:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/cliente/:clienteId', authMiddleware, async (req, res) => {
  try {
    const prestamos = await Prestamo.find({
      cliente: req.params.clienteId,
      tenantId: req.tenantId
    })
      .populate('cliente', 'nombre cedula')
      .populate('cobrador', 'nombre cedula')
      .sort({ createdAt: -1 });

    const result = prestamos.map((p) => ({
      ...p.toObject(),
      saldoPendiente: p.totalAPagar - (p.totalPagado || 0),
      porcentajePagado: ((p.totalPagado || 0) / p.totalAPagar * 100).toFixed(2)
    }));

    res.json(result);
  } catch (err) {
    console.error('Error en GET /cliente/:clienteId:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const prestamo = await Prestamo.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    })
      .populate('cliente', 'nombre cedula celular direccion')
      .populate('cobrador', 'nombre cedula');

    if (!prestamo) return res.status(404).json({ error: 'Prestamo no encontrado' });

    const pagos = await Pago.find({
      prestamoId: req.params.id,
      tenantId: req.tenantId
    }).sort({ fecha: -1 });

    res.json({
      ...prestamo.toObject(),
      saldoPendiente: prestamo.totalAPagar - (prestamo.totalPagado || 0),
      porcentajePagado: ((prestamo.totalPagado || 0) / prestamo.totalAPagar * 100).toFixed(2),
      pagos
    });
  } catch (err) {
    console.error('Error en GET /prestamos/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/pagos', authMiddleware, async (req, res) => {
  try {
    const pagos = await Pago.find({
      prestamoId: req.params.id,
      tenantId: req.tenantId
    })
      .populate('cobradorId', 'nombre')
      .sort({ fecha: -1 });

    res.json(pagos);
  } catch (err) {
    console.error('Error en GET /prestamos/:id/pagos:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/pagos/resumen', authMiddleware, async (req, res) => {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const pagosHoy = await Pago.find({
      tenantId: req.tenantId,
      fecha: { $gte: hoy, $lt: manana }
    });

    const totalHoy = pagosHoy.reduce((sum, p) => sum + p.monto, 0);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    finMes.setHours(23, 59, 59, 999);

    const pagosMes = await Pago.find({
      tenantId: req.tenantId,
      fecha: { $gte: inicioMes, $lt: finMes }
    });

    const totalMes = pagosMes.reduce((sum, p) => sum + p.monto, 0);

    res.json({
      pagosHoy: pagosHoy.length,
      totalHoy,
      pagosMes: pagosMes.length,
      totalMes,
      ultimosPagos: await Pago.find({ tenantId: req.tenantId })
        .populate({
          path: 'prestamoId',
          populate: { path: 'cliente', select: 'nombre' }
        })
        .populate('cobradorId', 'nombre')
        .sort({ fecha: -1 })
        .limit(10)
    });
  } catch (err) {
    console.error('Error en GET /pagos/resumen:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('BODY QUE LLEGA A /prestamos:', req.body);

    const tenantId = req.tenantId || req.body?.tenantId || req.user?.tenantId || '';
    const payload = buildPrestamoPayload(req.body);

    const clienteId = payload.clienteId;
    if (!clienteId) {
      return res.status(400).json({ error: 'clienteId es obligatorio' });
    }

    if (payload.capital === null || payload.capital === undefined || payload.capital === '' || Number.isNaN(payload.capital)) {
      return res.status(400).json({ error: 'capital es obligatorio' });
    }

    if (!payload.capital || isNaN(payload.capital)) {
      return res.status(400).json({ error: 'capital invalido' });
    }

    const interesNumber = payload.interes ?? 20;
    const cuotasNumber = payload.numeroCuotas ?? 30;
    const fechaInicio = payload.fechaInicio || new Date();
    const fechaVencimiento = payload.fechaVencimiento || calculateFechaVencimiento(fechaInicio, cuotasNumber, payload.frecuencia);
    const totalAPagar = Math.round(payload.capital * (1 + interesNumber / 100) * 100) / 100;

    const cliente = await Cliente.findOne({
      _id: clienteId,
      tenantId
    });

    if (!cliente) {
      return res.status(400).json({ error: 'Cliente no valido' });
    }

    let cobradorId = payload.cobradorId;
    if (req.user.rol === 'cobrador') {
      cobradorId = req.user.id;
    }

    if (!cobradorId) {
      return res.status(400).json({ error: 'Debe seleccionar un cobrador' });
    }

    const cobrador = await Cobrador.findOne({
      _id: cobradorId,
      tenantId,
      estado: 'activo'
    }).select('_id');

    if (!cobrador) {
      return res.status(400).json({ error: 'Cobrador invalido o inactivo' });
    }

    if (req.user.rol === 'cobrador') {
      if (!cliente.cobrador || cliente.cobrador.toString() !== req.user.id) {
        return res.status(403).json({ error: 'No autorizado' });
      }
    }

    const prestamo = new Prestamo({
      cliente: clienteId,
      cobrador: cobrador._id,
      capital: payload.capital,
      interes: interesNumber,
      totalAPagar,
      numeroCuotas: cuotasNumber,
      frecuencia: payload.frecuencia || 'diario',
      fechaInicio,
      fechaVencimiento,
      notas: payload.notas || '',
      tenantId,
      totalPagado: 0,
      estado: 'activo'
    });

    await prestamo.save();

    const populated = await prestamo.populate([
      { path: 'cliente', select: 'nombre cedula' },
      { path: 'cobrador', select: 'nombre cedula' }
    ]);

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error en POST /prestamos:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: Object.values(err.errors).map((item) => item.message).join(', ')
      });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const existing = await Prestamo.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!existing) {
      return res.status(404).json({ error: 'Prestamo no encontrado' });
    }

    const payload = buildPrestamoPayload(req.body, existing);

    const clienteId = payload.clienteId || existing.cliente?.toString?.() || existing.cliente;
    if (!clienteId) {
      return res.status(400).json({ error: 'clienteId es obligatorio' });
    }

    const cliente = await Cliente.findOne({
      _id: clienteId,
      tenantId: req.tenantId
    });

    if (!cliente) {
      return res.status(400).json({ error: 'Cliente no valido' });
    }

    const cobradorId = payload.cobradorId || existing.cobrador?.toString?.() || existing.cobrador;
    if (!cobradorId) {
      return res.status(400).json({ error: 'Debe seleccionar un cobrador' });
    }

    const cobrador = await Cobrador.findOne({
      _id: cobradorId,
      tenantId: req.tenantId,
      estado: 'activo'
    }).select('_id');

    if (!cobrador) {
      return res.status(400).json({ error: 'Cobrador invalido o inactivo' });
    }

    const capital = payload.capital ?? existing.capital;
    const interes = payload.interes ?? existing.interes;
    const numeroCuotas = payload.numeroCuotas ?? existing.numeroCuotas;
    const frecuencia = payload.frecuencia || existing.frecuencia || 'diario';
    const fechaInicio = Object.prototype.hasOwnProperty.call(req.body, 'fechaInicio')
      ? parseDate(req.body.fechaInicio, existing.fechaInicio || new Date())
      : (existing.fechaInicio || new Date());
    const fechaVencimiento = Object.prototype.hasOwnProperty.call(req.body, 'fechaVencimiento')
      ? parseDate(req.body.fechaVencimiento, calculateFechaVencimiento(fechaInicio, numeroCuotas, frecuencia))
      : calculateFechaVencimiento(fechaInicio, numeroCuotas, frecuencia);
    const totalAPagar = Math.round(capital * (1 + interes / 100) * 100) / 100;

    const updateData = {
      ...payload,
      cliente: clienteId,
      cobrador: cobrador._id,
      capital,
      interes,
      totalAPagar,
      numeroCuotas,
      frecuencia,
      fechaInicio,
      fechaVencimiento,
      notas: payload.notas || existing.notas || '',
      tenantId: req.tenantId
    };

    delete updateData.clienteId;
    delete updateData.cobradorId;
    delete updateData.plazo;
    delete updateData.monto;
    delete updateData.amount;

    existing.set(updateData);
    await existing.save();

    const populated = await existing.populate([
      { path: 'cliente', select: 'nombre cedula' },
      { path: 'cobrador', select: 'nombre cedula' }
    ]);

    res.json(populated);
  } catch (err) {
    console.error('Error en PUT /prestamos/:id:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: Object.values(err.errors).map((item) => item.message).join(', ')
      });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
