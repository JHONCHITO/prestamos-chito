const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Cobrador = require('../models/Cobrador');
const Cliente = require('../models/Cliente');
const Prestamo = require('../models/Prestamo');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use((req, res, next) => {
  if (!req.tenantId && req.user?.rol !== 'superadmin') {
    return res.status(400).json({ error: 'Tenant no definido' });
  }
  next();
});

async function getCobradorStats(tenantId, cobradorId) {
  const clientesCount = await Cliente.countDocuments({
    cobrador: cobradorId,
    tenantId,
    estado: { $ne: 'inactivo' },
  });

  const prestamos = await Prestamo.find({
    cobrador: cobradorId,
    tenantId,
  }).select('totalAPagar totalPagado estado');

  const prestamosCount = prestamos.length;
  const prestamosActivos = prestamos.filter((item) => item.estado === 'activo').length;
  const prestamosPagados = prestamos.filter((item) => item.estado === 'pagado').length;
  const cartera = prestamos.reduce(
    (sum, item) => sum + ((item.totalAPagar || 0) - (item.totalPagado || 0)),
    0,
  );
  const totalRecaudado = prestamos.reduce((sum, item) => sum + (item.totalPagado || 0), 0);

  return {
    clientesCount,
    prestamosCount,
    prestamosActivos,
    prestamosPagados,
    cartera,
    totalRecaudado,
  };
}

router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { search } = req.query;
    const tenantId = req.tenantId;

    const query = { tenantId };

    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { cedula: { $regex: search, $options: 'i' } },
        { telefono: { $regex: search, $options: 'i' } },
      ];
    }

    const cobradores = await Cobrador.find(query).select('-password');

    const cobradoresConStats = await Promise.all(
      cobradores.map(async (cobrador) => {
        const stats = await getCobradorStats(tenantId, cobrador._id);
        return {
          ...cobrador.toObject(),
          ...stats,
        };
      }),
    );

    res.json(cobradoresConStats);
  } catch (err) {
    console.error('Error en GET /cobradores:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const cobrador = await Cobrador.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).select('-password');

    if (!cobrador) {
      return res.status(404).json({ error: 'Cobrador no encontrado' });
    }

    const [clientes, prestamos, stats] = await Promise.all([
      Cliente.find({
        cobrador: req.params.id,
        tenantId: req.tenantId,
        estado: { $ne: 'inactivo' },
      })
        .populate('cobrador', 'nombre cedula')
        .sort({ createdAt: -1 }),
      Prestamo.find({
        cobrador: req.params.id,
        tenantId: req.tenantId,
      })
        .populate('cliente', 'nombre cedula celular direccion estado')
        .sort({ createdAt: -1 }),
      getCobradorStats(req.tenantId, req.params.id),
    ]);

    const prestamosEnriquecidos = prestamos.map((prestamo) => {
      const totalAPagar = Number(prestamo.totalAPagar || 0);
      const totalPagado = Number(prestamo.totalPagado || 0);

      return {
        ...prestamo.toObject(),
        saldoPendiente: Math.max(0, totalAPagar - totalPagado),
        porcentajePagado: totalAPagar > 0 ? Number(((totalPagado / totalAPagar) * 100).toFixed(2)) : 0,
      };
    });

    res.json({
      cobrador,
      stats,
      clientes,
      prestamos: prestamosEnriquecidos,
    });
  } catch (err) {
    console.error('Error en GET /cobradores/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const data = { ...req.body, tenantId: req.tenantId };

    const existe = await Cobrador.findOne({
      $or: [{ email: data.email }, { cedula: data.cedula }],
      tenantId: req.tenantId,
    });

    if (existe) {
      return res.status(400).json({ error: 'Ya existe un cobrador con ese email o cedula' });
    }

    const cobrador = new Cobrador(data);
    await cobrador.save();
    const { password, ...cobradorData } = cobrador.toObject();
    res.status(201).json(cobradorData);
  } catch (err) {
    console.error('Error en POST /cobradores:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { password, ...data } = req.body;
    const update = { ...data };

    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }

    const cobrador = await Cobrador.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      update,
      { new: true },
    ).select('-password');

    if (!cobrador) {
      return res.status(404).json({ error: 'Cobrador no encontrado' });
    }

    res.json(cobrador);
  } catch (err) {
    console.error('Error en PUT /cobradores/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const cobrador = await Cobrador.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { estado: 'inactivo' },
      { new: true },
    );

    if (!cobrador) {
      return res.status(404).json({ error: 'Cobrador no encontrado' });
    }

    res.json({ message: 'Cobrador desactivado' });
  } catch (err) {
    console.error('Error en DELETE /cobradores/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
