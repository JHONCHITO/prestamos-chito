const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const buildMenu = () => ({
  inline_keyboard: [
    [
      { text: '👤 Ver cliente', callback_data: 'ver_cliente' },
      { text: '💳 Ver créditos', callback_data: 'ver_creditos' },
    ],
    [
      { text: '💰 Registrar pago', callback_data: 'registrar_pago' },
      { text: '📍 Mi ruta', callback_data: 'mi_ruta' },
    ],
  ],
});

const sendMessage = async (chatId, text, replyMarkup = null) => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('Falta TELEGRAM_BOT_TOKEN en variables de entorno');
    }

    if (!chatId) {
      throw new Error('chatId es requerido para sendMessage');
    }

    const safeText =
      typeof text === 'string' && text.trim()
        ? text.trim()
        : 'Mensaje vacío';

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    const payload = {
      chat_id: chatId,
      text: safeText,
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    console.log('📤 Enviando mensaje a Telegram:', {
      chat_id: payload.chat_id,
      text: payload.text,
      reply_markup: payload.reply_markup || null,
    });

    const response = await axios.post(url, payload);

    console.log('✅ Respuesta sendMessage:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sendMessage:', error.response?.data || error.message);
    throw error;
  }
};

const answerCallbackQuery = async (callbackQueryId, text = 'Procesado correctamente') => {
  try {
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('Falta TELEGRAM_BOT_TOKEN en variables de entorno');
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;

    const payload = {
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    };

    const response = await axios.post(url, payload);
    console.log('✅ answerCallbackQuery OK:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error answerCallbackQuery:', error.response?.data || error.message);
    throw error;
  }
};

const handleMessage = async (message) => {
  try {
    const chatId = message?.chat?.id;
    const text = message?.text?.trim();
    const lowerText = text?.toLowerCase();

    console.log('🧾 handleMessage chatId:', chatId);
    console.log('🧾 handleMessage text:', text);

    if (!chatId) {
      console.log('⚠️ handleMessage sin chatId');
      return;
    }

    if (!text) {
      await sendMessage(chatId, 'Solo puedo procesar mensajes de texto por ahora.');
      return;
    }

    if (text === '/start') {
      await sendMessage(
        chatId,
        '¡Hola! Soy el bot de Préstamos Chito.\n\nPuedes usar /menu para ver las opciones disponibles.'
      );
      return;
    }

    if (text === '/menu' || lowerText === 'menu' || lowerText === 'menú') {
      await sendMessage(chatId, 'Selecciona una opción del menú:', buildMenu());
      return;
    }

    if (lowerText === 'hola') {
      await sendMessage(
        chatId,
        '¡Hola! 👋 Estoy activo. Escribe /menu para abrir el menú.'
      );
      return;
    }

    await sendMessage(
      chatId,
      `Recibí tu mensaje: "${text}".\n\nEscribe /menu para ver opciones.`
    );
  } catch (error) {
    console.error('❌ Error handleMessage:', error.response?.data || error.message);
    throw error;
  }
};

const handleCallbackQuery = async (callbackQuery) => {
  try {
    const callbackQueryId = callbackQuery?.id;
    const data = callbackQuery?.data;
    const chatId = callbackQuery?.message?.chat?.id;

    console.log('🧾 handleCallbackQuery chatId:', chatId);
    console.log('🧾 handleCallbackQuery data:', data);

    if (callbackQueryId) {
      await answerCallbackQuery(callbackQueryId, 'Opción recibida');
    }

    if (!chatId || !data) {
      console.log('⚠️ callbackQuery sin chatId o data');
      return;
    }

    switch (data) {
      case 'ver_cliente':
        await sendMessage(chatId, 'Función "Ver cliente" en construcción.');
        break;

      case 'ver_creditos':
        await sendMessage(chatId, 'Función "Ver créditos" en construcción.');
        break;

      case 'registrar_pago':
        await sendMessage(chatId, 'Función "Registrar pago" en construcción.');
        break;

      case 'mi_ruta':
        await sendMessage(chatId, 'Función "Mi ruta" en construcción.');
        break;

      default:
        await sendMessage(chatId, 'No reconocí esa opción.');
        break;
    }
  } catch (error) {
    console.error('❌ Error handleCallbackQuery:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  sendMessage,
  handleMessage,
  handleCallbackQuery,
  answerCallbackQuery,
};