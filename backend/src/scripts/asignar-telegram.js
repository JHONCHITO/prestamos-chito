require('dotenv').config();
const mongoose = require('mongoose');

const TELEGRAM_USER_ID = '1622867852'; // Tu ID de Telegram de los logs
const CEDULA_COBRADOR = 'TEMP-1774671331402'; // Cambia esto por tu cédula real

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    
    const Cobrador = mongoose.model('Cobrador', new mongoose.Schema({}, { strict: false }));
    
    // Buscar por cédula
    const cobrador = await Cobrador.findOne({ cedula: CEDULA_COBRADOR });
    
    if (!cobrador) {
      console.log('❌ No se encontró el cobrador con esa cédula');
      await mongoose.disconnect();
      return;
    }
    
    console.log(`📋 Cobrador encontrado: ${cobrador.nombre}`);
    
    // Actualizar el telegramId
    cobrador.telegramId = TELEGRAM_USER_ID;
    await cobrador.save();
    
    console.log(`✅ Telegram ID vinculado: ${TELEGRAM_USER_ID}`);
    console.log(`👤 Cobrador: ${cobrador.nombre}`);
    
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });