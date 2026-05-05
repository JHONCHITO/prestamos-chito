const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');
const Cobrador = require('../models/Cobrador');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use((req, res, next) => {
  if (!req.tenantId && req.user?.rol !== 'superadmin') {
    return res.status(400).json({ error: 'Tenant no definido' });
  }
  next();
});

function normalizeClientePayload(payload = {}) {
  const data = { ...payload };

  if (data.cobradorId && !data.cobrador) {
    data.cobrador = data.cobradorId;
  }

  if (!data.celular && data.telefono) {
    data.celular = data.telefono;
  }

  if (!data.telefono && data.celular) {
    data.telefono = data.celular;
  }

  ['nombre', 'cedula', 'celular', 'telefono', 'direccion', 'email', 'tipoCliente', 'estado'].forEach((field) => {
    if (typeof data[field] === 'string') {
      data[field] = data[field].trim();
    }
  });

  return data;
}

async function resolveActiveCobrador(tenantId, cobradorId) {
  if (!tenantId || !cobradorId) {
    return null;
  }

  return Cobrador.findOne({
    _id: cobradorId,
    tenantId,
    estado: 'activo'
  }).select('_id nombre cedula');
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    const tenantId = req.tenantId;

    let query = { tenantId };

    if (req.user.rol === 'cobrador') {
      query.cobrador = req.user.id;
    }

    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { cedula: { $regex: search, $options: 'i' } },
        { celular: { $regex: search, $options: 'i' } }
      ];
    }

    const clientes = await Cliente.find(query).populate('cobrador', 'nombre cedula');
    res.json(clientes);
  } catch (err) {
    console.error('Error en GET /clientes:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    }).populate('cobrador', 'nombre cedula');

    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (err) {
    console.error('Error en GET /clientes/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenantId || req.body?.tenantId || req.user?.tenantId || '';
    const data = normalizeClientePayload({ ...req.body, tenantId });

    if (req.user.rol === 'cobrador') {
      data.cobrador = req.user.id;
    }

    if (!data.cobrador) {
      return res.status(400).json({ error: 'Debe seleccionar un cobrador' });
    }

    const requiredFields = ['nombre', 'cedula', 'celular', 'direccion'];
    const missingFields = requiredFields.filter((field) => !String(data[field] || '').trim());
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Faltan campos obligatorios: ${missingFields.join(', ')}`
      });
    }

    const cobrador = await resolveActiveCobrador(tenantId, data.cobrador);
    if (!cobrador) {
      return res.status(400).json({ error: 'Cobrador invalido o inactivo' });
    }

    const existe = await Cliente.findOne({
      cedula: data.cedula,
      tenantId
    });

    if (existe) {
      return res.status(400).json({ error: 'Ya existe un cliente con esta cedula' });
    }

    const cliente = new Cliente({
      ...data,
      tenantId,
      cobrador: cobrador._id
    });
    await cliente.save();

    const populated = await cliente.populate('cobrador', 'nombre cedula');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Error en POST /clientes:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: Object.values(err.errors).map((item) => item.message).join(', ')
      });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Ya existe un cliente con esta cedula' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const clienteActual = await Cliente.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!clienteActual) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const data = normalizeClientePayload({
      ...clienteActual.toObject(),
      ...req.body,
      tenantId: req.tenantId,
    });

    if (req.user.rol === 'cobrador') {
      data.cobrador = req.user.id;
    } else if (!data.cobrador && clienteActual.cobrador) {
      data.cobrador = clienteActual.cobrador;
    }

    const requiredFields = ['nombre', 'cedula', 'celular', 'direccion'];
    const missingFields = requiredFields.filter((field) => !String(data[field] || '').trim());
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Faltan campos obligatorios: ${missingFields.join(', ')}`
      });
    }

    const cobrador = await resolveActiveCobrador(req.tenantId, data.cobrador);
    if (!cobrador) {
      return res.status(400).json({ error: 'Cobrador invalido o inactivo' });
    }

    clienteActual.set({
      ...data,
      cobrador: cobrador._id,
    });
    await clienteActual.save();

    const populated = await clienteActual.populate('cobrador', 'nombre cedula');
    res.json(populated);
  } catch (err) {
    console.error('Error en PUT /clientes/:id:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: Object.values(err.errors).map((item) => item.message).join(', ')
      });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Ya existe un cliente con esta cedula' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const cliente = await Cliente.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { estado: 'inactivo' },
      { new: true }
    );

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json({ message: 'Cliente desactivado' });
  } catch (err) {
    console.error('Error en DELETE /clientes/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
