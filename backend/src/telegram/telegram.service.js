const axios = require('axios');
const Cliente = require('../models/Cliente');
const Cobrador = require('../models/Cobrador');
const Prestamo = require('../models/Prestamo');
const Pago = require('../models/Pago');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// ─── SESIONES EN MEMORIA ──────────────────────────────────────────
const sesiones = {};

const getSesion = (chatId) => {
  if (!sesiones[chatId]) sesiones[chatId] = { paso: null, data: {} };
  return sesiones[chatId];
};

const resetSesion = (chatId) => {
  sesiones[chatId] = { paso: null, data: {} };
};

// ─── API TELEGRAM ─────────────────────────────────────────────────
const getTelegramApiUrl = (method) => {
  if (!TELEGRAM_BOT_TOKEN) throw new Error('Falta TELEGRAM_BOT_TOKEN');
  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
};

const sendMessage = async (chatId, text, replyMarkup = null) => {
  try {
    const payload = {
      chat_id: chatId,
      text: text?.trim() || 'Mensaje vacío',
      parse_mode: 'HTML',
    };

    if (replyMarkup) payload.reply_markup = replyMarkup;

    console.log('📤 Enviando mensaje a Telegram:', payload);

    const response = await axios.post(getTelegramApiUrl('sendMessage'), payload);
    console.log('✅ sendMessage OK chatId:', chatId);
    return response.data;
  } catch (error) {
    console.error('❌ sendMessage ERROR:', error.response?.data || error.message);
    throw error;
  }
};

const answerCallbackQuery = async (id, text = 'OK') => {
  try {
    await axios.post(getTelegramApiUrl('answerCallbackQuery'), {
      callback_query_id: id,
      text,
      show_alert: false,
    });
  } catch (e) {
    console.error('❌ answerCallbackQuery ERROR:', e.response?.data || e.message);
  }
};

// ─── BUSCAR COBRADOR ──────────────────────────────────────────────
const buscarCobrador = async (telegramId) => {
  try {
    return await Cobrador.findOne({ telegramId: String(telegramId) });
  } catch (e) {
    console.error('❌ buscarCobrador ERROR:', e.message);
    return null;
  }
};

// ─── MENÚS ────────────────────────────────────────────────────────
const menuPrincipal = () => ({
  inline_keyboard: [
    [
      { text: '👥 Mis Clientes', callback_data: 'menu_clientes' },
      { text: '💳 Mis Créditos', callback_data: 'menu_creditos' },
    ],
    [
      { text: '💰 Registrar Pago', callback_data: 'menu_pago' },
      { text: '🔍 Consultar Cliente', callback_data: 'menu_consultar' },
    ],
    [
      { text: '➕ Crear Cliente', callback_data: 'crear_cliente' },
      { text: '📋 Nuevo Crédito', callback_data: 'crear_credito' },
    ],
  ],
});

const menuCancelar = () => ({
  inline_keyboard: [[{ text: '❌ Cancelar y volver al menú', callback_data: 'cancelar' }]],
});

// ─── MENÚ PRINCIPAL ───────────────────────────────────────────────
const enviarMenuPrincipal = async (chatId, nombre = 'Cobrador') => {
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  await sendMessage(
    chatId,
    `🏦 <b>Préstamos Chito</b>\n${saludo}, <b>${nombre}</b>\n\n<b>📋 Menú Principal</b>\n\nSelecciona una opción:`,
    menuPrincipal()
  );
};

// ════════════════════════════════════════════════════════════════════
// FLUJO 1: CREAR CLIENTE
// ════════════════════════════════════════════════════════════════════
const iniciarCrearCliente = async (chatId) => {
  resetSesion(chatId);
  getSesion(chatId).paso = 'cliente_nombre';

  await sendMessage(
    chatId,
    '➕ <b>Crear Cliente</b>\n\n📝 Paso 1/4 - Escribe el <b>nombre completo</b> del cliente:',
    menuCancelar()
  );
};

const continuarCrearCliente = async (chatId, texto, cobrador) => {
  const sesion = getSesion(chatId);

  if (sesion.paso === 'cliente_nombre') {
    sesion.data.nombre = texto;
    sesion.paso = 'cliente_cedula';
    await sendMessage(chatId, `✅ Nombre: <b>${texto}</b>\n\n📝 Paso 2/4 - Escribe la <b>cédula</b>:`, menuCancelar());
    return true;
  }

  if (sesion.paso === 'cliente_cedula') {
    const existe = await Cliente.findOne({ cedula: texto, tenantId: cobrador.tenantId });
    if (existe) {
      await sendMessage(chatId, `⚠️ Ya existe un cliente con la cédula <b>${texto}</b>.\n\nEscribe otra cédula:`);
      return true;
    }
    sesion.data.cedula = texto;
    sesion.paso = 'cliente_celular';
    await sendMessage(chatId, `✅ Cédula: <b>${texto}</b>\n\n📝 Paso 3/4 - Escribe el <b>celular</b>:`, menuCancelar());
    return true;
  }

  if (sesion.paso === 'cliente_celular') {
    sesion.data.celular = texto;
    sesion.paso = 'cliente_direccion';
    await sendMessage(chatId, `✅ Celular: <b>${texto}</b>\n\n📝 Paso 4/4 - Escribe la <b>dirección</b>:`, menuCancelar());
    return true;
  }

  if (sesion.paso === 'cliente_direccion') {
    sesion.data.direccion = texto;
    sesion.paso = 'cliente_confirmar';

    const d = sesion.data;

    await sendMessage(
      chatId,
      `✅ Dirección: <b>${texto}</b>\n\n━━━━━━━━━━━━━━━━━━━━\n📋 <b>Resumen del cliente:</b>\n\n` +
        `👤 Nombre: <b>${d.nombre}</b>\n` +
        `🪪 Cédula: <b>${d.cedula}</b>\n` +
        `📱 Celular: <b>${d.celular}</b>\n` +
        `🏠 Dirección: <b>${d.direccion}</b>\n━━━━━━━━━━━━━━━━━━━━\n\n¿Confirmar creación del cliente?`,
      {
        inline_keyboard: [[
          { text: '✅ Sí, crear cliente', callback_data: 'cliente_confirmar' },
          { text: '❌ Cancelar', callback_data: 'cancelar' },
        ]],
      }
    );
    return true;
  }

  return false;
};

const confirmarCrearCliente = async (chatId, cobrador) => {
  const sesion = getSesion(chatId);
  const d = sesion.data;

  try {
    const cliente = new Cliente({
      nombre: d.nombre,
      cedula: d.cedula,
      celular: d.celular,
      direccion: d.direccion,
      cobrador: cobrador._id,
      tenantId: cobrador.tenantId,
      tipoCliente: 'nuevo',
      estado: 'activo',
    });

    await cliente.save();
    resetSesion(chatId);

    await sendMessage(
      chatId,
      `✅ <b>¡Cliente creado exitosamente!</b>\n\n👤 ${d.nombre}\n🪪 ${d.cedula}\n📱 ${d.celular}\n🏠 ${d.direccion}`
    );

    await enviarMenuPrincipal(chatId, cobrador.nombre);
  } catch (e) {
    await sendMessage(chatId, `❌ Error al crear el cliente:\n<code>${e.message}</code>`);
    resetSesion(chatId);
    await enviarMenuPrincipal(chatId, cobrador.nombre);
  }
};

// ════════════════════════════════════════════════════════════════════
// FLUJO 2: CREAR CRÉDITO
// ════════════════════════════════════════════════════════════════════
const iniciarCrearCredito = async (chatId) => {
  resetSesion(chatId);
  getSesion(chatId).paso = 'credito_cedula';

  await sendMessage(
    chatId,
    '📋 <b>Nuevo Crédito</b>\n\n📝 Paso 1/4 - Escribe la <b>cédula del cliente</b>:',
    menuCancelar()
  );
};

const continuarCrearCredito = async (chatId, texto, cobrador) => {
  const sesion = getSesion(chatId);

  if (sesion.paso === 'credito_cedula') {
    const cliente = await Cliente.findOne({ cedula: texto, tenantId: cobrador.tenantId });
    if (!cliente) {
      await sendMessage(chatId, `⚠️ No encontré un cliente con cédula <b>${texto}</b>.\n\nVerifica e intenta de nuevo:`);
      return true;
    }

    sesion.data.clienteId = cliente._id;
    sesion.data.clienteNombre = cliente.nombre;
    sesion.paso = 'credito_capital';

    await sendMessage(
      chatId,
      `✅ Cliente: <b>${cliente.nombre}</b>\n\n📝 Paso 2/4 - Escribe el <b>valor del préstamo</b> (ej: 500000):`,
      menuCancelar()
    );
    return true;
  }

  if (sesion.paso === 'credito_capital') {
    const capital = parseFloat(texto.replace(/[^0-9.]/g, ''));
    if (isNaN(capital) || capital <= 0) {
      await sendMessage(chatId, '⚠️ Escribe un monto válido (ej: 500000):');
      return true;
    }

    sesion.data.capital = capital;
    sesion.paso = 'credito_interes';

    await sendMessage(
      chatId,
      `✅ Capital: <b>$${capital.toLocaleString('es-CO')}</b>\n\n📝 Paso 3/4 - Escribe el <b>interés %</b> (ej: 20):`,
      menuCancelar()
    );
    return true;
  }

  if (sesion.paso === 'credito_interes') {
    const interes = parseFloat(texto.replace(/[^0-9.]/g, ''));
    if (isNaN(interes) || interes < 0) {
      await sendMessage(chatId, '⚠️ Escribe un porcentaje válido (ej: 20):');
      return true;
    }

    sesion.data.interes = interes;
    sesion.paso = 'credito_cuotas';

    await sendMessage(
      chatId,
      `✅ Interés: <b>${interes}%</b>\n\n📝 Paso 4/4 - Escribe el <b>número de cuotas</b> (ej: 30):`,
      menuCancelar()
    );
    return true;
  }

  if (sesion.paso === 'credito_cuotas') {
    const cuotas = parseInt(texto.replace(/[^0-9]/g, ''));
    if (isNaN(cuotas) || cuotas <= 0) {
      await sendMessage(chatId, '⚠️ Escribe un número de cuotas válido (ej: 30):');
      return true;
    }

    sesion.data.cuotas = cuotas;
    const d = sesion.data;
    const totalAPagar = Math.round(d.capital + (d.capital * d.interes / 100));
    const cuotaValor = Math.round(totalAPagar / cuotas);

    sesion.data.totalAPagar = totalAPagar;
    sesion.data.cuotaValor = cuotaValor;
    sesion.paso = 'credito_confirmar';

    await sendMessage(
      chatId,
      `━━━━━━━━━━━━━━━━━━━━\n📋 <b>Resumen del Crédito:</b>\n\n` +
        `👤 Cliente: <b>${d.clienteNombre}</b>\n` +
        `💵 Capital: <b>$${d.capital.toLocaleString('es-CO')}</b>\n` +
        `📈 Interés: <b>${d.interes}%</b>\n` +
        `🔢 Cuotas: <b>${cuotas}</b>\n` +
        `💰 Total a pagar: <b>$${totalAPagar.toLocaleString('es-CO')}</b>\n` +
        `📆 Valor cuota aprox: <b>$${cuotaValor.toLocaleString('es-CO')}</b>\n━━━━━━━━━━━━━━━━━━━━\n\n¿Confirmar creación del crédito?`,
      {
        inline_keyboard: [[
          { text: '✅ Sí, crear crédito', callback_data: 'credito_confirmar' },
          { text: '❌ Cancelar', callback_data: 'cancelar' },
        ]],
      }
    );
    return true;
  }

  return false;
};

const confirmarCrearCredito = async (chatId, cobrador) => {
  const sesion = getSesion(chatId);
  const d = sesion.data;

  try {
    const prestamo = new Prestamo({
      cliente: d.clienteId,
      cobrador: cobrador._id,
      tenantId: cobrador.tenantId,
      monto: d.capital,
      capitalInicial: d.capital,
      interes: d.interes,
      totalPagar: d.totalAPagar,
      saldoPendiente: d.totalAPagar,
      numeroCuotas: d.cuotas,
      valorCuota: d.cuotaValor,
      estado: 'activo',
      fechaInicio: new Date(),
    });

    await prestamo.save();
    resetSesion(chatId);

    await sendMessage(
      chatId,
      `✅ <b>¡Crédito creado exitosamente!</b>\n\n👤 ${d.clienteNombre}\n💵 $${d.capital.toLocaleString('es-CO')}\n📈 ${d.interes}%\n🔢 ${d.cuotas} cuotas`
    );

    await enviarMenuPrincipal(chatId, cobrador.nombre);
  } catch (e) {
    await sendMessage(chatId, `❌ Error al crear el crédito:\n<code>${e.message}</code>`);
    resetSesion(chatId);
    await enviarMenuPrincipal(chatId, cobrador.nombre);
  }
};

// ════════════════════════════════════════════════════════════════════
// FLUJO 3: CONSULTAR CLIENTE
// ════════════════════════════════════════════════════════════════════
const iniciarConsultarCliente = async (chatId) => {
  resetSesion(chatId);
  getSesion(chatId).paso = 'consultar_cliente';

  await sendMessage(
    chatId,
    '🔍 <b>Consultar Cliente</b>\n\nEscribe la <b>cédula</b> del cliente:',
    menuCancelar()
  );
};

const consultarCliente = async (chatId, cedula, cobrador) => {
  const cliente = await Cliente.findOne({ cedula, tenantId: cobrador.tenantId });

  if (!cliente) {
    await sendMessage(chatId, `⚠️ No encontré un cliente con cédula <b>${cedula}</b>.`);
    return;
  }

  const prestamos = await Prestamo.find({ cliente: cliente._id }).sort({ createdAt: -1 }).limit(5);

  let texto = `👤 <b>${cliente.nombre}</b>\n🪪 ${cliente.cedula}\n📱 ${cliente.celular || 'Sin celular'}\n🏠 ${cliente.direccion || 'Sin dirección'}\n\n`;

  if (!prestamos.length) {
    texto += '💳 No tiene créditos registrados.';
  } else {
    texto += '<b>Últimos créditos:</b>\n';
    prestamos.forEach((p, i) => {
      texto += `\n${i + 1}. $${Number(p.monto || 0).toLocaleString('es-CO')} - Estado: ${p.estado || 'N/D'}`;
    });
  }

  await sendMessage(chatId, texto);
  resetSesion(chatId);
  await enviarMenuPrincipal(chatId, cobrador.nombre);
};

// ════════════════════════════════════════════════════════════════════
// FLUJO 4: REGISTRAR PAGO
// ════════════════════════════════════════════════════════════════════
const iniciarRegistrarPago = async (chatId) => {
  resetSesion(chatId);
  getSesion(chatId).paso = 'pago_cedula';

  await sendMessage(
    chatId,
    '💰 <b>Registrar Pago</b>\n\nEscribe la <b>cédula del cliente</b>:',
    menuCancelar()
  );
};

const continuarRegistrarPago = async (chatId, texto, cobrador) => {
  const sesion = getSesion(chatId);

  if (sesion.paso === 'pago_cedula') {
    const cliente = await Cliente.findOne({ cedula: texto, tenantId: cobrador.tenantId });
    if (!cliente) {
      await sendMessage(chatId, `⚠️ No encontré un cliente con cédula <b>${texto}</b>.`);
      return true;
    }

    const prestamo = await Prestamo.findOne({
      cliente: cliente._id,
      tenantId: cobrador.tenantId,
      estado: 'activo',
    }).sort({ createdAt: -1 });

    if (!prestamo) {
      await sendMessage(chatId, `⚠️ El cliente <b>${cliente.nombre}</b> no tiene préstamos activos.`);
      return true;
    }

    sesion.data.clienteId = cliente._id;
    sesion.data.clienteNombre = cliente.nombre;
    sesion.data.prestamoId = prestamo._id;
    sesion.paso = 'pago_monto';

    await sendMessage(
      chatId,
      `✅ Cliente: <b>${cliente.nombre}</b>\n💳 Saldo pendiente: <b>$${Number(prestamo.saldoPendiente || 0).toLocaleString('es-CO')}</b>\n\nEscribe el <b>monto del pago</b>:`,
      menuCancelar()
    );
    return true;
  }

  if (sesion.paso === 'pago_monto') {
    const monto = parseFloat(texto.replace(/[^0-9.]/g, ''));
    if (isNaN(monto) || monto <= 0) {
      await sendMessage(chatId, '⚠️ Escribe un monto válido.');
      return true;
    }

    sesion.data.monto = monto;
    sesion.paso = 'pago_confirmar';

    await sendMessage(
      chatId,
      `💰 Pago a registrar\n\n👤 Cliente: <b>${sesion.data.clienteNombre}</b>\n💵 Monto: <b>$${monto.toLocaleString('es-CO')}</b>\n\n¿Confirmar pago?`,
      {
        inline_keyboard: [[
          { text: '✅ Confirmar pago', callback_data: 'pago_confirmar' },
          { text: '❌ Cancelar', callback_data: 'cancelar' },
        ]],
      }
    );
    return true;
  }

  return false;
};

const confirmarPago = async (chatId, cobrador) => {
  const sesion = getSesion(chatId);
  const d = sesion.data;

  try {
    const prestamo = await Prestamo.findById(d.prestamoId);
    if (!prestamo) {
      await sendMessage(chatId, '❌ No encontré el préstamo para registrar el pago.');
      resetSesion(chatId);
      await enviarMenuPrincipal(chatId, cobrador.nombre);
      return;
    }

    const pago = new Pago({
      prestamoId: prestamo._id,
      clienteId: d.clienteId,
      tenantId: cobrador.tenantId,
      tenantNombre: cobrador.tenantNombre || '',
      monto: d.monto,
      metodoPago: 'efectivo',
      fechaPago: new Date(),
      registradoPor: cobrador._id,
    });

    await pago.save();

    prestamo.saldoPendiente = Math.max(0, Number(prestamo.saldoPendiente || 0) - Number(d.monto));
    if (prestamo.saldoPendiente <= 0) prestamo.estado = 'pagado';
    await prestamo.save();

    resetSesion(chatId);

    await sendMessage(
      chatId,
      `✅ <b>Pago registrado correctamente</b>\n\n👤 ${d.clienteNombre}\n💵 $${Number(d.monto).toLocaleString('es-CO')}\n💳 Nuevo saldo: $${Number(prestamo.saldoPendiente).toLocaleString('es-CO')}`
    );

    await enviarMenuPrincipal(chatId, cobrador.nombre);
  } catch (e) {
    await sendMessage(chatId, `❌ Error al registrar pago:\n<code>${e.message}</code>`);
    resetSesion(chatId);
    await enviarMenuPrincipal(chatId, cobrador.nombre);
  }
};

// ════════════════════════════════════════════════════════════════════
// HANDLERS PRINCIPALES
// ════════════════════════════════════════════════════════════════════
const handleMessage = async (message) => {
  try {
    const chatId = message?.chat?.id;
    const telegramUserId = message?.from?.id;
    const text = message?.text?.trim();

    console.log('🧾 handleMessage chatId:', chatId);
    console.log('🧾 handleMessage text:', text);

    if (!chatId) return;
    if (!text) {
      await sendMessage(chatId, '⚠️ Solo puedo procesar mensajes de texto.');
      return;
    }

    const cobrador = await buscarCobrador(telegramUserId);

    if (!cobrador) {
      await sendMessage(
        chatId,
        '⚠️ Tu usuario de Telegram no está vinculado a ningún cobrador.\n\nSolicita al administrador que registre tu Telegram ID.'
      );
      return;
    }

    const sesion = getSesion(chatId);
    const lowerText = text.toLowerCase();

    if (text === '/start') {
      resetSesion(chatId);
      await enviarMenuPrincipal(chatId, cobrador.nombre || 'Cobrador');
      return;
    }

    if (text === '/menu' || lowerText === 'menu' || lowerText === 'menú') {
      resetSesion(chatId);
      await enviarMenuPrincipal(chatId, cobrador.nombre || 'Cobrador');
      return;
    }

    if (sesion.paso?.startsWith('cliente_')) {
      const handled = await continuarCrearCliente(chatId, text, cobrador);
      if (handled) return;
    }

    if (sesion.paso?.startsWith('credito_')) {
      const handled = await continuarCrearCredito(chatId, text, cobrador);
      if (handled) return;
    }

    if (sesion.paso === 'consultar_cliente') {
      await consultarCliente(chatId, text, cobrador);
      return;
    }

    if (sesion.paso?.startsWith('pago_')) {
      const handled = await continuarRegistrarPago(chatId, text, cobrador);
      if (handled) return;
    }

    if (lowerText === 'hola') {
      await enviarMenuPrincipal(chatId, cobrador.nombre || 'Cobrador');
      return;
    }

    await sendMessage(
      chatId,
      'No entendí ese mensaje.\n\nUsa /menu para abrir el menú principal.'
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
    const telegramUserId = callbackQuery?.from?.id;

    console.log('🧾 handleCallbackQuery chatId:', chatId);
    console.log('🧾 handleCallbackQuery data:', data);

    if (callbackQueryId) {
      await answerCallbackQuery(callbackQueryId, 'Procesado');
    }

    if (!chatId || !data) return;

    const cobrador = await buscarCobrador(telegramUserId);

    if (!cobrador) {
      await sendMessage(
        chatId,
        '⚠️ Tu usuario de Telegram no está vinculado a ningún cobrador.'
      );
      return;
    }

    if (data === 'cancelar') {
      resetSesion(chatId);
      await enviarMenuPrincipal(chatId, cobrador.nombre || 'Cobrador');
      return;
    }

    if (data === 'crear_cliente') {
      await iniciarCrearCliente(chatId);
      return;
    }

    if (data === 'cliente_confirmar') {
      await confirmarCrearCliente(chatId, cobrador);
      return;
    }

    if (data === 'crear_credito') {
      await iniciarCrearCredito(chatId);
      return;
    }

    if (data === 'credito_confirmar') {
      await confirmarCrearCredito(chatId, cobrador);
      return;
    }

    if (data === 'menu_consultar') {
      await iniciarConsultarCliente(chatId);
      return;
    }

    if (data === 'menu_pago') {
      await iniciarRegistrarPago(chatId);
      return;
    }

    if (data === 'pago_confirmar') {
      await confirmarPago(chatId, cobrador);
      return;
    }

    if (data === 'menu_clientes') {
      const total = await Cliente.countDocuments({ tenantId: cobrador.tenantId });
      await sendMessage(chatId, `👥 Tienes <b>${total}</b> clientes registrados.`);
      return;
    }

    if (data === 'menu_creditos') {
      const total = await Prestamo.countDocuments({ tenantId: cobrador.tenantId });
      await sendMessage(chatId, `💳 Tienes <b>${total}</b> créditos registrados.`);
      return;
    }

    await sendMessage(chatId, '❓ Opción no reconocida. Usa /menu');
  } catch (error) {
    console.error('❌ Error handleCallbackQuery:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  sendMessage,
  answerCallbackQuery,
  handleMessage,
  handleCallbackQuery,
};