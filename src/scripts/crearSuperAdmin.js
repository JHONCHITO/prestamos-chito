const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function crearSuperAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado');

  const email = 'superadmin@prestamos-chito.com';
  const password = 'SuperAdmin123';

  const existe = await Admin.findOne({ email });
  if (existe) {
    console.log('⚠️ Ya existe');
    process.exit();
  }

  const admin = new Admin({
    nombre: 'Super Admin',
    email,
    password,
    rol: 'superadmin',
    tenantId: null
  });

  await admin.save();
  console.log('✅ SuperAdmin creado');
  console.log('📧 Email:', email);
  console.log('🔑 Password: SuperAdmin123');
  process.exit();
}

crearSuperAdmin().catch(console.error);
