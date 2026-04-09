const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const sendMessage = async (chatId, text, replyMarkup = null) => {
  const payload = {
    chat_id: chatId,
    text,
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  try {
    console.log('📤 Enviando mensaje a Telegram:', payload);
    const response = await axios.post(`${TELEGRAM_API}/sendMessage`, payload);
    console.log('✅ Respuesta sendMessage:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sendMessage:', error.response?.data || error.message);
    throw error;
  }
};
