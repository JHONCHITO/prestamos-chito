const axios = require('axios');

const GRAPH_BASE_URL = process.env.META_GRAPH_API_BASE || 'https://graph.facebook.com';
const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
const DEFAULT_ACCESS_TOKEN = String(process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '').trim();
const DEFAULT_PHONE_NUMBER_ID = String(process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || '').trim();

function safeString(value = '') {
  return String(value ?? '').trim();
}

function normalizeRecipientPhone(value = '') {
  return safeString(value).replace(/[^\d]/g, '');
}

async function enviarMensaje(numero, mensaje, options = {}) {
  const phoneNumberId = safeString(options.phoneNumberId || DEFAULT_PHONE_NUMBER_ID);
  const accessToken = safeString(options.accessToken || DEFAULT_ACCESS_TOKEN);
  const text = safeString(mensaje);
  const recipient = normalizeRecipientPhone(numero);

  if (!phoneNumberId) {
    throw new Error('Falta WHATSAPP_PHONE_NUMBER_ID o META_PHONE_NUMBER_ID');
  }

  if (!accessToken) {
    throw new Error('Falta WHATSAPP_ACCESS_TOKEN o META_ACCESS_TOKEN');
  }

  if (!recipient) {
    throw new Error('Falta el numero destino');
  }

  if (!text) {
    throw new Error('Falta el mensaje');
  }

  const response = await axios.post(
    `${GRAPH_BASE_URL}/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'text',
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    },
  );

  return response.data;
}

module.exports = { enviarMensaje };
