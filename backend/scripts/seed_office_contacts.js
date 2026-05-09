require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('../src/models/Tenant');

async function main() {
  const tenantId = 'oficina_norte_jd8';
  const contacts = ['3187092130', '3009013672'];

  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const result = await Tenant.updateOne(
      { tenantId },
      {
        $set: {
          telefono: contacts.join(' / '),
          telefonos: contacts,
        },
      },
    );

    console.log(
      JSON.stringify(
        {
          tenantId,
          acknowledged: Boolean(result.acknowledged),
          matched: result.matchedCount || 0,
          modified: result.modifiedCount || 0,
          telefono: contacts.join(' / '),
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
