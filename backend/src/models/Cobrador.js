const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const cobradorSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  nombre: {
    type: String,
    required: true,
    trim: true
  },

  cedula: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  telefono: {
    type: String,
    required: true,
    trim: true
  },

  zona: {
    type: String,
    default: '',
    trim: true
  },

  telegramId: {
    type: String,
    default: '',
    trim: true
  },

  sedeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sede",
    default: null
  },

  password: {
    type: String,
    required: true
  },

  estado: {
    type: String,
    enum: ['activo', 'inactivo'],
    default: 'activo'
  }

}, { timestamps: true });

/*
==============================
MIDDLEWARE PARA NORMALIZAR DATOS
==============================
*/
cobradorSchema.pre('save', async function(next) {

  // Normalizar email
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }

  // Normalizar tenantId
  if (this.tenantId) {
    this.tenantId = this.tenantId.toLowerCase().trim();
  }

  // Si la contraseña no fue modificada no se vuelve a encriptar
  if (!this.isModified('password')) return next();

  try {

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();

  } catch (error) {

    console.error("Error encriptando password:", error);
    next(error);

  }

});

/*
==============================
COMPARAR CONTRASEÑA
==============================
*/
cobradorSchema.methods.comparePassword = async function(passwordPlano) {

  try {

    return await bcrypt.compare(passwordPlano, this.password);

  } catch (error) {

    console.error("Error comparando password:", error);
    return false;

  }

};

/*
==============================
ÍNDICES ADICIONALES (MEJOR PERFORMANCE)
==============================
*/

// Índice por tenant
cobradorSchema.index({ tenantId: 1 });

// Índice por email
cobradorSchema.index({ email: 1 });

// Índice por cédula
cobradorSchema.index({ cedula: 1 });

/*
==============================
🧠 VALIDACIÓN EXTRA ANTES DE GUARDAR
(esto ayuda a evitar datos corruptos)
==============================
*/
cobradorSchema.pre('validate', function(next) {

  if (!this.email || !this.password || !this.tenantId) {
    console.log("⚠️ Datos incompletos en cobrador");
  }

  next();
});

/*
==============================
📌 MÉTODO PARA OCULTAR PASSWORD
==============================
*/
cobradorSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

/*
==============================
EVITA ERROR DE MODELO DUPLICADO
==============================
*/

const Cobrador =
  mongoose.models.Cobrador ||
  mongoose.model('Cobrador', cobradorSchema);

module.exports = Cobrador;
