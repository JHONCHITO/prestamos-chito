const {
  handleMessage,
  handleCallbackQuery,
} = require('./telegram.service');

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

const telegramWebhook = async (req, res) => {
  try {
    console.log('📩 Headers webhook:', req.headers);
    console.log('📩 Body webhook:', JSON.stringify(req.body));

    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];

    if (secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
      console.log('❌ Secret inválido:', secretHeader);
      return res.status(401).json({
        ok: false,
        error: 'Unauthorized webhook',
      });
    }

    const update = req.body;
    res.status(200).send('OK');

    if (update.message) {
      console.log('📨 Procesando message:', update.message.text);
      await handleMessage(update.message);
      return;
    }

    if (update.callback_query) {
      console.log('🖱️ Procesando callback:', update.callback_query.data);
      await handleCallbackQuery(update.callback_query);
      return;
    }

    console.log('ℹ️ Update sin message ni callback_query');
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
