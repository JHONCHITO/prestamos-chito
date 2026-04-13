const mongoose = require('mongoose');

const pagoSchema = new mongoose.Schema({
  // Para pagos de préstamos (cobrador)
  prestamoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prestamo'
  },
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente'
  },
  
  // Para pagos de empresa (admin)
  tenantId: {
    type: String,
    index: true
  },
  tenantNombre: {
    type: String
  },
  
  // Datos comunes
  monto: {
    type: Number,
    required: true
  },
  metodoPago: {
    type: String,
    enum: ['efectivo', 'transferencia', 'tarjeta'],
    default: 'efectivo'
  },
  referencia: {
    type: String,
    default: ''
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  fechaVencimiento: {
    type: Date
  },
  mes: {
    type: Number,
    min: 1,
    max: 12
  },
  año: {
    type: Number
  },
  estado: {
    type: String,
    enum: ['pendiente', 'pagado', 'vencido'],
    default: 'pagado'
  },
  registradoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  registradoPorTipo: {
    type: String,
    enum: ['admin', 'cobrador', 'superadmin'],
    default: 'cobrador'
  }
}, {
  timestamps: true
});

// Índices para búsquedas rápidas
pagoSchema.index({ prestamoId: 1 });
pagoSchema.index({ clienteId: 1 });
// Este índice único solo aplica a pagos mensuales de oficina.
// Los pagos de préstamos no incluyen año/mes y no deben chocar entre sí.
pagoSchema.index(
  { tenantId: 1, año: 1, mes: 1 },
  {
    unique: true,
    partialFilterExpression: {
      año: { $exists: true },
      mes: { $exists: true }
    }
  }
);
pagoSchema.index({ fecha: -1 });

module.exports = mongoose.model('Pago', pagoSchema);
