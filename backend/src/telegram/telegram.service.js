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

  const response = await axios.post(`${TELEGRAM_API}/sendMessage`, payload);
  return response.data;
};

const sendMainMenu = async (chatId) => {
  return sendMessage(
    chatId,
    'Bienvenido a Prestamos Chito Cobrador.\nSelecciona una opción:',
    {
      inline_keyboard: [
        [{ text: 'Consultar cliente', callback_data: 'MENU_CLIENTE' }],
        [{ text: 'Ver créditos', callback_data: 'MENU_CREDITOS' }],
        [{ text: 'Registrar pago', callback_data: 'MENU_PAGO' }],
        [{ text: 'Crear crédito', callback_data: 'MENU_NUEVO_CREDITO' }],
      ],
    }
  );
};

const handleMessage = async (message) => {
  const chatId = message.chat.id;
  const text = (message.text || '').trim();

  if (text === '/start') {
    return sendMessage(
      chatId,
      'Hola. Soy el bot del cobrador de Prestamos Chito.\nUsa /menu para ver las opciones.'
    );
  }

  if (text === '/menu') {
    return sendMainMenu(chatId);
  }

  if (text === '/ayuda') {
    return sendMessage(
      chatId,
      'Comandos disponibles:\n/start\n/menu\n/ayuda\n/cancelar'
    );
  }

  if (text === '/cancelar') {
    return sendMessage(chatId, 'Operación cancelada.');
  }

  return sendMessage(
    chatId,
    'No entendí ese mensaje todavía.\nUsa /menu para ver las opciones.'
  );
};

const handleCallbackQuery = async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const action = callbackQuery.data;

  if (action === 'MENU_CLIENTE') {
    return sendMessage(chatId, 'Escríbeme la cédula o teléfono del cliente.');
  }

  if (action === 'MENU_CREDITOS') {
    return sendMessage(chatId, 'Pronto te mostraré los créditos activos.');
  }

  if (action === 'MENU_PAGO') {
    return sendMessage(chatId, 'Escríbeme la cédula del cliente para registrar un pago.');
  }

  if (action === 'MENU_NUEVO_CREDITO') {
    return sendMessage(chatId, 'Escríbeme la cédula del cliente para crear un nuevo crédito.');
  }

  return sendMessage(chatId, 'Acción no reconocida.');
};

module.exports = {
  sendMessage,
  sendMainMenu,
  handleMessage,
  handleCallbackQuery,
};
