require('dotenv').config();

const mongoose = require('mongoose');
const MetaIntegration = require('../src/models/MetaIntegration');

function safeString(value = '') {
  return String(value ?? '').trim();
}

function mask(value) {
  const text = safeString(value);
  if (!text) {
    return '';
  }
  if (text.length <= 8) {
    return `${text.slice(0, 2)}***${text.slice(-2)}`;
  }
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

async function main() {
  const tenantId = safeString(process.env.META_SEED_TENANT_ID || 'oficina_norte_jd8');
  const name = safeString(process.env.META_SEED_NAME || 'Oficina Norte Meta');
  const verifyToken = safeString(process.env.META_SEED_VERIFY_TOKEN || '');
  const appSecret = safeString(process.env.META_SEED_APP_SECRET || '');
  const phoneNumberId = safeString(process.env.META_SEED_PHONE_NUMBER_ID || '');
  const businessAccountId = safeString(process.env.META_SEED_BUSINESS_ACCOUNT_ID || '');
  const accessToken = safeString(process.env.META_SEED_ACCESS_TOKEN || '');
  const graphApiVersion = safeString(process.env.META_SEED_GRAPH_API_VERSION || 'v21.0') || 'v21.0';

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI no esta definido');
  }

  if (!tenantId) {
    throw new Error('META_SEED_TENANT_ID no valido');
  }

  if (!phoneNumberId) {
    throw new Error('META_SEED_PHONE_NUMBER_ID no valido');
  }

  if (!accessToken) {
    throw new Error('META_SEED_ACCESS_TOKEN no valido');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const updated = await MetaIntegration.findOneAndUpdate(
    { tenantId },
    {
      $set: {
        tenantId,
        name,
        active: true,
        autoReplyEnabled: true,
        webhookVerifyToken: verifyToken,
        webhookAppSecret: appSecret,
        graphApiVersion,
        channels: {
          whatsapp: {
            enabled: true,
            senderId: phoneNumberId,
            phoneNumberId,
            businessAccountId,
            accessToken,
            verifyToken,
            appSecret,
            graphApiVersion,
            defaultReplyMode: 'auto',
            welcomeMessage: '',
            fallbackMessage: '',
            notes: '',
          },
          instagram: {
            enabled: false,
            senderId: '',
            accessToken: '',
            verifyToken: '',
            appSecret: '',
            businessAccountId: '',
            pageId: '',
            phoneNumberId: '',
            instagramUserId: '',
            graphApiVersion,
            defaultReplyMode: 'auto',
            welcomeMessage: '',
            fallbackMessage: '',
            notes: '',
          },
          facebook: {
            enabled: false,
            senderId: '',
            accessToken: '',
            verifyToken: '',
            appSecret: '',
            businessAccountId: '',
            pageId: '',
            phoneNumberId: '',
            instagramUserId: '',
            graphApiVersion,
            defaultReplyMode: 'auto',
            welcomeMessage: '',
            fallbackMessage: '',
            notes: '',
          },
        },
        metadata: {},
        updatedBy: 'codex-seed',
      },
      $setOnInsert: {
        createdBy: 'codex-seed',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  console.log(JSON.stringify({
    ok: true,
    tenantId,
    active: updated.active,
    autoReplyEnabled: updated.autoReplyEnabled,
    whatsapp: {
      enabled: updated.channels?.whatsapp?.enabled,
      senderId: mask(updated.channels?.whatsapp?.senderId),
      phoneNumberIdSet: Boolean(updated.channels?.whatsapp?.phoneNumberId),
      businessAccountIdSet: Boolean(updated.channels?.whatsapp?.businessAccountId),
      accessTokenSet: Boolean(updated.channels?.whatsapp?.accessToken),
    },
    webhookVerifyTokenSet: Boolean(updated.webhookVerifyToken),
    webhookAppSecretSet: Boolean(updated.webhookAppSecret),
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
