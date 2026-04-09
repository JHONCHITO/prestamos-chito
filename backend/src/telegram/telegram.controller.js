const {
  handleMessage,
  handleCallbackQuery,
} = require('./telegram.service');

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

const telegramWebhook = async (req, res) => {
  try {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];

    if (secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
      return res.status(401).json({
        ok: false,
        error: 'Unauthorized webhook',
      });
    }

    const update = req.body;

    res.status(200).send('OK');

    if (update.message) {
      await handleMessage(update.message);
      return;
    }

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return;
    }
  } catch (error) {
    console.error('Error en telegramWebhook:', error);

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
