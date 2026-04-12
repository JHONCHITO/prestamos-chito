const mongoose = require('mongoose');

const prestamoSchema = new mongoose.Schema({
  cliente: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cliente', 
    required: true 
  },
  cobrador: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Cobrador', 
    required: true 
  },
  capital: { 
    type: Number, 
    required: true,
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },
  interes: { 
    type: Number, 
    required: true, 
    default: 20,
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },
  totalAPagar: { 
    type: Number,
    default: 0,
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },
  totalPagado: { 
    type: Number, 
    default: 0,
    get: v => Math.round(v * 100) / 100,
    set: v => Math.round(v * 100) / 100
  },
  numeroCuotas: { 
    type: Number, 
    required: true, 
    default: 30 
  },
  frecuencia: { 
    type: String, 
    enum: ['diario', 'semanal', 'quincenal', 'mensual'], 
    default: 'diario' 
  },
  fechaInicio: { 
    type: Date, 
    default: Date.now 
  },
  fechaVencimiento: { 
    type: Date 
  },
  estado: { 
    type: String, 
    enum: ['activo', 'pagado', 'vencido', 'cancelado'], 
    default: 'activo' 
  },
  notas: { 
    type: String, 
    default: '' 
  },
  tenantId: { 
    type: String, 
    required: true, 
    index: true 
  }
}, { 
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});


// =========================
// VIRTUALES
// =========================


// Calcular restante virtualmente
prestamoSchema.virtual('restante').get(function() {
  const restante = this.totalAPagar - this.totalPagado;
  return Math.round(restante * 100) / 100;
});


// Calcular porcentaje pagado
prestamoSchema.virtual('porcentajePagado').get(function() {
  if (this.totalAPagar === 0) return 0;
  const porcentaje = (this.totalPagado / this.totalAPagar) * 100;
  return Math.round(porcentaje * 100) / 100;
});


// =========================
// NUEVO: CALCULAR CUOTA DIARIA
// =========================
prestamoSchema.virtual('cuotaDiaria').get(function() {
  if (!this.numeroCuotas || this.numeroCuotas === 0) return 0;
  const cuota = this.totalAPagar / this.numeroCuotas;
  return Math.round(cuota * 100) / 100;
});


// =========================
// MÉTODOS
// =========================


// Método para obtener saldo pendiente con precisión
prestamoSchema.methods.getSaldoPendiente = function() {
  const saldo = this.totalAPagar - this.totalPagado;
  return Math.round(saldo * 100) / 100;
};


// Método para verificar si está pagado
prestamoSchema.methods.estaPagado = function() {
  return this.getSaldoPendiente() <= 0.01;
};


// NUEVO: Método para obtener la cuota diaria
prestamoSchema.methods.getCuotaDiaria = function() {
  if (!this.numeroCuotas || this.numeroCuotas === 0) return 0;
  const cuota = this.totalAPagar / this.numeroCuotas;
  return Math.round(cuota * 100) / 100;
};


// NUEVO: Método para calcular cuánto debería haberse pagado hasta la fecha
prestamoSchema.methods.getPagoEsperadoHastaFecha = function() {
  if (!this.fechaInicio || !this.numeroCuotas) return 0;
  
  const hoy = new Date();
  const fechaInicio = new Date(this.fechaInicio);
  const diffTime = Math.abs(hoy - fechaInicio);
  const diasTranscurridos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const cuotaDiaria = this.getCuotaDiaria();
  const esperado = cuotaDiaria * Math.min(diasTranscurridos, this.numeroCuotas);
  
  return Math.round(esperado * 100) / 100;
};


// NUEVO: Método para calcular días de atraso
prestamoSchema.methods.getDiasAtraso = function() {
  const esperado = this.getPagoEsperadoHastaFecha();
  const pagado = this.totalPagado || 0;
  const cuotaDiaria = this.getCuotaDiaria();
  
  if (cuotaDiaria === 0) return 0;
  
  const atraso = Math.max(0, Math.ceil((esperado - pagado) / cuotaDiaria));
  return atraso;
};


// =========================
// NUEVO: PRE-VALIDATE
// =========================


// Calcular totalAPagar y fechaVencimiento antes de validar
prestamoSchema.pre('validate', function(next) {
  // Calcular totalAPagar si no existe
  if ((!this.totalAPagar || this.totalAPagar === 0) && this.capital && this.interes) {
    this.totalAPagar = Math.round(this.capital * (1 + this.interes / 100) * 100) / 100;
  }
  
  // Calcular fecha de vencimiento si no existe
  if (!this.fechaVencimiento && this.fechaInicio && this.numeroCuotas) {
    const fecha = new Date(this.fechaInicio);
    switch(this.frecuencia) {
      case 'diario':
        fecha.setDate(fecha.getDate() + this.numeroCuotas);
        break;
      case 'semanal':
        fecha.setDate(fecha.getDate() + (this.numeroCuotas * 7));
        break;
      case 'quincenal':
        fecha.setDate(fecha.getDate() + (this.numeroCuotas * 15));
        break;
      case 'mensual':
        fecha.setMonth(fecha.getMonth() + this.numeroCuotas);
        break;
    }
    this.fechaVencimiento = fecha;
  }
  
  next();
});


// =========================
// MIDDLEWARE PRE-SAVE
// =========================


// Calcular totalAPagar antes de guardar si no se proporciona
prestamoSchema.pre('save', function(next) {
  // Calcular totalAPagar si no existe
  if (!this.totalAPagar && this.capital && this.interes) {
    this.totalAPagar = Math.round(this.capital * (1 + this.interes / 100) * 100) / 100;
  }
  
  // Calcular fecha de vencimiento si no existe
  if (!this.fechaVencimiento && this.fechaInicio && this.numeroCuotas) {
    const fecha = new Date(this.fechaInicio);
    switch(this.frecuencia) {
      case 'diario':
        fecha.setDate(fecha.getDate() + this.numeroCuotas);
        break;
      case 'semanal':
        fecha.setDate(fecha.getDate() + (this.numeroCuotas * 7));
        break;
      case 'quincenal':
        fecha.setDate(fecha.getDate() + (this.numeroCuotas * 15));
        break;
      case 'mensual':
        fecha.setMonth(fecha.getMonth() + this.numeroCuotas);
        break;
    }
    this.fechaVencimiento = fecha;
  }
  
  // Redondear todos los números a 2 decimales
  if (this.capital) this.capital = Math.round(this.capital * 100) / 100;
  if (this.interes) this.interes = Math.round(this.interes * 100) / 100;
  if (this.totalAPagar) this.totalAPagar = Math.round(this.totalAPagar * 100) / 100;
  if (this.totalPagado) this.totalPagado = Math.round(this.totalPagado * 100) / 100;
  
  // Actualizar estado si está pagado
  if (this.getSaldoPendiente() <= 0.01) {
    this.estado = 'pagado';
    this.totalPagado = this.totalAPagar;
  }
  
  next();
});


prestamoSchema.set('toJSON', { virtuals: true });
prestamoSchema.set('toObject', { virtuals: true });


const Prestamo = mongoose.models.Prestamo || mongoose.model('Prestamo', prestamoSchema);


module.exports = Prestamo;