const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI;

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const Cobrador = mongoose.model(
      'Cobrador',
      new mongoose.Schema({}, { strict: false }),
      'cobradors'
    );

    const result = await Cobrador.updateOne(
      { tenantId: 'oficina_norte_jd8' },
      { $set: { telegramId: '1622867852' } }
    );

    console.log('✅ Cobrador actualizado:', result);

    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

main();