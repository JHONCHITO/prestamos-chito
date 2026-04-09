const telegramService = require('./telegram.service');

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

const telegramWebhook = async (req, res) => {
  try {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];

    console.log('📩 Headers webhook:', req.headers);
    console.log('📩 Body webhook:', JSON.stringify(req.body));

    if (!TELEGRAM_WEBHOOK_SECRET) {
      return res.status(500).json({ ok: false, error: 'Missing secret' });
    }

    if (secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
      console.log('❌ Secret inválido:', secretHeader);
      return res.status(401).json({ ok: false, error: 'Unauthorized webhook' });
    }

    const update = req.body;

    if (update.message) {
      console.log('Procesando message', update.message.text);
      await telegramService.handleMessage(update.message);
    } else if (update.callback_query) {
      console.log('Procesando callback', update.callback_query.data);
      await telegramService.handleCallbackQuery(update.callback_query);
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error en telegramWebhook', error.message);
    return res.status(200).send('OK');
  }
};

module.exports = {
  telegramWebhook,
};