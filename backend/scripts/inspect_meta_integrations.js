require('dotenv').config();
const mongoose = require('mongoose');
const MetaIntegration = require('../src/models/MetaIntegration');
const Tenant = require('../src/models/Tenant');

function mask(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  if (text.length <= 8) {
    return `${text.slice(0, 2)}***${text.slice(-2)}`;
  }
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

async function main() {
  const tenantIds = ['oficina_norte_jd8', 'jamund_l6r'];

  await mongoose.connect(process.env.MONGODB_URI);

  for (const tenantId of tenantIds) {
    const tenant = await Tenant.findOne({ tenantId }).lean();
    const integration = await MetaIntegration.findOne({ tenantId }).lean();

    console.log(`\n=== ${tenantId} ===`);
    console.log(JSON.stringify({
      tenant: tenant
        ? {
            nombre: tenant.nombre || '',
            telefono: tenant.telefono || '',
            telefonos: tenant.telefonos || [],
          }
        : null,
      integration: integration
        ? {
            active: integration.active,
            autoReplyEnabled: integration.autoReplyEnabled,
            webhookVerifyTokenSet: Boolean(integration.webhookVerifyToken),
            webhookAppSecretSet: Boolean(integration.webhookAppSecret),
            whatsapp: {
              enabled: integration.channels?.whatsapp?.enabled,
              senderId: mask(integration.channels?.whatsapp?.senderId || integration.channels?.whatsapp?.phoneNumberId),
              phoneNumberIdSet: Boolean(integration.channels?.whatsapp?.phoneNumberId),
              businessAccountIdSet: Boolean(integration.channels?.whatsapp?.businessAccountId),
              accessTokenSet: Boolean(integration.channels?.whatsapp?.accessToken),
              defaultReplyMode: integration.channels?.whatsapp?.defaultReplyMode || '',
            },
            instagram: {
              enabled: integration.channels?.instagram?.enabled,
              senderId: mask(integration.channels?.instagram?.senderId || integration.channels?.instagram?.instagramUserId),
              accessTokenSet: Boolean(integration.channels?.instagram?.accessToken),
            },
            facebook: {
              enabled: integration.channels?.facebook?.enabled,
              senderId: mask(integration.channels?.facebook?.senderId || integration.channels?.facebook?.pageId),
              accessTokenSet: Boolean(integration.channels?.facebook?.accessToken),
            },
          }
        : null,
    }, null, 2));
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
