const axios = require('axios');
const mongoose = require('mongoose');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const getTelegramApiUrl = (method) => {
  if (!TELEGRAM_BOT_TOKEN) throw new Error('Falta TELEGRAM_BOT_TOKEN');
  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
};

// ─── MENÚ PRINCIPAL ───────────────────────────────────────────────
const buildMenuPrincipal = () => ({
  inline_keyboard: [
    [
      { text: '👥 Clientes', callback_data: 'menu_clientes' },
      { text: '💳 Créditos', callback_data: 'menu_creditos' },
    ],
    [
      { text: '💰 Registrar Pago', callback_data: 'menu_pago' },
      { text: '📍 Mi Ruta Hoy', callback_data: 'menu_ruta' },
    ],
    [
      { text: '📊 Mi Resumen', callback_data: 'menu_resumen' },
    ],
  ],
});

// ─── ENVIAR MENSAJE ───────────────────────────────────────────────
const sendMessage = async (chatId, text, replyMarkup = null) => {
  try {
    if (!chatId) throw new Error('chatId requerido');
    const payload = {
      chat_id: chatId,
      text: typeof text === 'string' && text.trim() ? text.trim() : 'Mensaje vacío',
      parse_mode: 'HTML',
    };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    console.log('📤 sendMessage chatId:', chatId);
    const response = await axios.post(getTelegramApiUrl('sendMessage'), payload);
    console.log('✅ sendMessage OK');
    return response.data;
  } catch (error) {
    console.error('❌ sendMessage ERROR:', error.response?.data || error.message);
    throw error;
  }
};

// ─── RESPONDER CALLBACK ───────────────────────────────────────────
const answerCallbackQuery = async (callbackQueryId, text = 'OK') => {
  try {
    await axios.post(getTelegramApiUrl('answerCallbackQuery'), {
      callback_query_id: callbackQueryId,
      text,
      show_alert: false,
    });
  } catch (error) {
    console.error('❌ answerCallbackQuery ERROR:', error.response?.data || error.message);
  }
};

// ─── BUSCAR COBRADOR POR TELEGRAM ID ─────────────────────────────
const buscarCobrador = async (telegramId) => {
  try {
    const Cobrador = mongoose.model('Cobrador');
    const cobrador = await Cobrador.findOne({ telegramId: String(telegramId) });
    return cobrador;
  } catch (error) {
    console.error('❌ buscarCobrador ERROR:', error.message);
    return null;
  }
};

// ─── MENÚ PRINCIPAL TEXTO ─────────────────────────────────────────
const enviarMenuPrincipal = async (chatId, nombreCobrador = 'Cobrador') => {
  const hora = new Date().getHours();
  let saludo = 'Buenas noches';
  if (hora >= 5 && hora < 12) saludo = 'Buenos días';
  else if (hora >= 12 && hora < 18) saludo = 'Buenas tardes';

  const texto =
    `🏦 <b>Préstamos Chito</b>\n` +
    `${saludo}, <b>${nombreCobrador}</b>\n\n` +
    `<b>📋 Menú Principal</b>\n\n` +
    `👥 <b>Clientes</b> - Ver y gestionar tus clientes\n` +
    `💳 <b>Créditos</b> - Ver todos los créditos activos\n` +
    `💰 <b>Registrar Pago</b> - Registrar un cobro\n` +
    `📍 <b>Mi Ruta Hoy</b> - Ver clientes a visitar\n` +
    `📊 <b>Mi Resumen</b> - Estadísticas del día\n\n` +
    `Selecciona una opción:`;

  await sendMessage(chatId, texto, buildMenuPrincipal());
};

// ─── HANDLE MESSAGE ───────────────────────────────────────────────
const handleMessage = async (message) => {
  try {
    const chatId = message?.chat?.id;
    const text = message?.text?.trim() || '';
    const lowerText = text.toLowerCase();
    const telegramId = message?.from?.id;
    const firstName = message?.from?.first_name || 'Cobrador';

    console.log('🧾 handleMessage chatId:', chatId, 'text:', text);

    if (!chatId) return;

    if (text === '/start') {
      const cobrador = await buscarCobrador(telegramId);
      const nombre = cobrador?.nombre || firstName;
      await enviarMenuPrincipal(chatId, nombre);
      return;
    }

    if (text === '/menu' || lowerText === 'menu' || lowerText === 'menú') {
      const cobrador = await buscarCobrador(telegramId);
      const nombre = cobrador?.nombre || firstName;
      await enviarMenuPrincipal(chatId, nombre);
      return;
    }

    if (lowerText === 'hola') {
      await sendMessage(chatId, `¡Hola ${firstName}! 👋 Escribe /menu para ver las opciones.`);
      return;
    }

    await sendMessage(chatId, `No reconocí ese comando.\n\nEscribe /menu para ver las opciones disponibles.`);
  } catch (error) {
    console.error('❌ handleMessage ERROR:', error.response?.data || error.message);
    throw error;
  }
};

// ─── HANDLE CALLBACK ──────────────────────────────────────────────
const handleCallbackQuery = async (callbackQuery) => {
  try {
    const callbackQueryId = callbackQuery?.id;
    const data = callbackQuery?.data;
    const chatId = callbackQuery?.message?.chat?.id;
    const telegramId = callbackQuery?.from?.id;
    const firstName = callbackQuery?.from?.first_name || 'Cobrador';

    console.log('🧾 handleCallbackQuery chatId:', chatId, 'data:', data);

    if (callbackQueryId) await answerCallbackQuery(callbackQueryId, 'Procesando...');
    if (!chatId || !data) return;

    const cobrador = await buscarCobrador(telegramId);
    const nombre = cobrador?.nombre || firstName;

    switch (data) {
      case 'menu_clientes':
        await sendMessage(
          chatId,
          `👥 <b>Clientes</b>\n\nFunción en construcción.\n\nPronto podrás ver y gestionar tus clientes desde aquí.`
        );
        break;

      case 'menu_creditos':
        await sendMessage(
          chatId,
          `💳 <b>Créditos Activos</b>\n\nFunción en construcción.\n\nPronto podrás ver todos los créditos activos.`
        );
        break;

      case 'menu_pago':
        await sendMessage(
          chatId,
          `💰 <b>Registrar Pago</b>\n\nFunción en construcción.\n\nPronto podrás registrar cobros desde aquí.`
        );
        break;

      case 'menu_ruta':
        await sendMessage(
          chatId,
          `📍 <b>Mi Ruta Hoy</b>\n\nFunción en construcción.\n\nPronto verás los clientes a visitar hoy.`
        );
        break;

      case 'menu_resumen':
        await sendMessage(
          chatId,
          `📊 <b>Mi Resumen</b>\n\nFunción en construcción.\n\nPronto verás tus estadísticas del día.`
        );
        break;

      default:
        await enviarMenuPrincipal(chatId, nombre);
        break;
    }
  } catch (error) {
    console.error('❌ handleCallbackQuery ERROR:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  sendMessage,
  handleMessage,
  handleCallbackQuery,
  answerCallbackQuery,
  enviarMenuPrincipal,
};