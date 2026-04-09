const {
  handleMessage,
  handleCallbackQuery,
} = require('./telegram.service');

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

const processUpdate = async (update) => {
  try {
    if (!update || typeof update !== 'object') {
      console.log('⚠️ Update inválido o vacío');
      return;
    }

    if (update.message) {
      const chatId = update.message?.chat?.id;
      const text = update.message?.text;
      const from = update.message?.from?.username || update.message?.from?.first_name || 'sin_username';

      console.log('📨 Procesando message');
      console.log('🧾 chatId:', chatId);
      console.log('🧾 from:', from);
      console.log('🧾 text:', text);

      if (!chatId) {
        console.log('⚠️ Message sin chatId');
        return;
      }

      if (!text) {
        console.log('⚠️ Message sin text, posiblemente sticker/foto/archivo');
        return;
      }

      await handleMessage(update.message);
      console.log('✅ handleMessage ejecutado correctamente');
      return;
    }

    if (update.callback_query) {
      const callbackData = update.callback_query?.data;
      const chatId = update.callback_query?.message?.chat?.id;
      const from = update.callback_query?.from?.username || update.callback_query?.from?.first_name || 'sin_username';

      console.log('🖱️ Procesando callback_query');
      console.log('🧾 chatId callback:', chatId);
      console.log('🧾 from callback:', from);
      console.log('🧾 data callback:', callbackData);

      await handleCallbackQuery(update.callback_query);
      console.log('✅ handleCallbackQuery ejecutado correctamente');
      return;
    }

    console.log('ℹ️ Update sin message ni callback_query:', JSON.stringify(update));
  } catch (error) {
    console.error('❌ Error procesando update:', error.response?.data || error.message);
  }
};

const telegramWebhook = async (req, res) => {
  try {
    console.log('📩 Headers webhook:', req.headers);
    console.log('📩 Body webhook:', JSON.stringify(req.body));

    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];

    if (!TELEGRAM_WEBHOOK_SECRET) {
      console.log('❌ TELEGRAM_WEBHOOK_SECRET no está definido en variables de entorno');
      return res.status(500).json({
        ok: false,
        error: 'Missing TELEGRAM_WEBHOOK_SECRET',
      });
    }

    if (!secretHeader) {
      console.log('❌ Header x-telegram-bot-api-secret-token ausente');
      return res.status(401).json({
        ok: false,
        error: 'Missing webhook secret header',
      });
    }

    if (secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
      console.log('❌ Secret inválido:', secretHeader);
      return res.status(401).json({
        ok: false,
        error: 'Unauthorized webhook',
      });
    }

    const update = req.body;

    res.status(200).send('OK');

    setImmediate(async () => {
      await processUpdate(update);
    });
  } catch (error) {
    console.error('❌ Error en telegramWebhook:', error.response?.data || error.message);

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        error: 'Internal server error',
      });
    }
  }
};

module.exports = {
  telegramWebhook,
};