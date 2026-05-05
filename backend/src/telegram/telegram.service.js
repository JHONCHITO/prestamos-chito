const axios = require('axios');
const Cliente = require('../models/Cliente');
const Cobrador = require('../models/Cobrador');
const Prestamo = require('../models/Prestamo');
const Pago = require('../models/Pago');
const OpenAI = require("openai");
const { answerRagQuestion } = require('../services/rag.service');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// ─── SESIONES EN MEMORIA ──────────────────────────────────────────
const sesiones = {};
const autenticaciones = {};

const getSesion = (chatId) => {
  if (!sesiones[chatId]) sesiones[chatId] = { paso: null, data: {} };
  return sesiones[chatId];
};

const resetSesion = (chatId) => {
  sesiones[chatId] = { paso: null, data: {} };
};

const setAutenticacion = (chatId, cobrador) => {
  autenticaciones[chatId] = cobrador._id.toString();
};

const clearAutenticacion = (chatId) => {
  delete autenticaciones[chatId];
};

const getAutenticacion = (chatId) => autenticaciones[chatId] || null;

const ZONA_HORARIA = 'America/Bogota';
const DIA_MS = 24 * 60 * 60 * 1000;

const normalizarTexto = (texto = '') =>
  String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extraerFechaZonaHoraria = (fecha) => {
  if (!fecha) return null;

  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return null;

  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const mapa = Object.fromEntries(
    partes
      .filter((parte) => parte.type !== 'literal')
      .map((parte) => [parte.type, parte.value])
  );

  return new Date(`${mapa.year}-${mapa.month}-${mapa.day}T00:00:00-05:00`);
};

const calcularDiasEntreFechas = (fechaInicio, fechaFin = new Date()) => {
  const inicio = extraerFechaZonaHoraria(fechaInicio);
  const fin = extraerFechaZonaHoraria(fechaFin);

  if (!inicio || !fin) return null;

  return Math.max(0, Math.floor((fin.getTime() - inicio.getTime()) / DIA_MS));
};

const formatearFechaBogota = (fecha) => {
  if (!fecha) return 'sin fecha';

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(fecha));
};

const formatearMonto = (valor) => `$${Number(valor || 0).toLocaleString('es-CO')}`;

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const construirMapaUltimosPagos = async (prestamos = []) => {
  const ids = prestamos
    .map((prestamo) => prestamo?._id)
    .filter(Boolean)
    .map((id) => String(id));

  if (!ids.length) return new Map();

  const pagos = await Pago.find({ prestamoId: { $in: ids } })
    .sort({ fecha: -1 })
    .select('prestamoId fecha')
    .lean();

  const mapa = new Map();

  pagos.forEach((pago) => {
    const clave = String(pago.prestamoId);
    if (!mapa.has(clave) && pago.fecha) {
      mapa.set(clave, new Date(pago.fecha));
    }
  });

  return mapa;
};

const obtenerFechaMovimientoPrestamo = async (prestamo, mapaUltimosPagos = null) => {
  if (!prestamo?._id) return null;

  const clave = String(prestamo._id);
  const fechaUltimoPago = mapaUltimosPagos?.get(clave);

  if (fechaUltimoPago) {
    return { fecha: fechaUltimoPago, origen: 'último pago registrado' };
  }

  if (prestamo.ultimoPago) {
    return { fecha: new Date(prestamo.ultimoPago), origen: 'último pago registrado' };
  }

  if (prestamo.fechaInicio) {
    return { fecha: new Date(prestamo.fechaInicio), origen: 'fecha del préstamo' };
  }

  if (prestamo.createdAt) {
    return { fecha: new Date(prestamo.createdAt), origen: 'creación del préstamo' };
  }

  return null;
};

const resumirPrestamo = async (prestamo, mapaUltimosPagos = null) => {
  const saldoPendiente = Math.max(
    0,
    Number(prestamo.totalAPagar || 0) - Number(prestamo.totalPagado || 0)
  );
  const movimiento = await obtenerFechaMovimientoPrestamo(prestamo, mapaUltimosPagos);
  const fechaPrestamo = prestamo.fechaInicio || prestamo.createdAt || null;
  const fechaReferencia = movimiento?.fecha || fechaPrestamo;
  const diasDesdePrestamo = calcularDiasEntreFechas(fechaPrestamo);
  const diasDesdeMovimiento = calcularDiasEntreFechas(fechaReferencia);

  return {
    saldoPendiente,
    fechaPrestamo,
    fechaReferencia,
    diasDesdePrestamo,
    diasDesdeMovimiento,
    origenMovimiento: movimiento?.origen || 'fecha del préstamo',
  };
};

const resumirPrestamos = async (prestamos = []) => {
  const mapaUltimosPagos = await construirMapaUltimosPagos(prestamos);

  return Promise.all(
    prestamos.map(async (prestamo) => {
      const resumen = await resumirPrestamo(prestamo, mapaUltimosPagos);
      return {
        prestamo,
        ...resumen,
      };
    })
  );
};

const buscarClienteMencionado = (texto, clientes = []) => {
  const consulta = normalizarTexto(texto);
  if (!consulta) return null;

  const candidatos = [];

  clientes.forEach((cliente) => {
    const nombre = normalizarTexto(cliente.nombre);
    const cedula = normalizarTexto(cliente.cedula);
    let puntaje = 0;

    if (nombre && consulta.includes(nombre)) puntaje += 100;
    if (cedula && consulta.includes(cedula)) puntaje += 80;

    nombre
      .split(' ')
      .filter((parte) => parte.length >= 3)
      .forEach((parte) => {
        if (consulta.includes(parte)) puntaje += 10;
      });

    if (puntaje > 0) {
      candidatos.push({ cliente, puntaje });
    }
  });

  candidatos.sort((a, b) => b.puntaje - a.puntaje);
  return candidatos[0]?.cliente || null;
};

const construirMensajeClientes = async (cobrador) => {
  const clientes = await Cliente.find({
    tenantId: cobrador.tenantId,
    cobrador: cobrador._id,
  })
    .sort({ createdAt: -1 })
    .limit(50);

  const prestamos = await Prestamo.find({
    tenantId: cobrador.tenantId,
    cobrador: cobrador._id,
    estado: { $ne: 'pagado' },
  })
    .populate('cliente')
    .sort({ createdAt: -1 })
    .limit(100);

  const resumenPrestamos = await resumirPrestamos(prestamos);
  const activosPorCliente = new Map();

  resumenPrestamos.forEach((item) => {
    const clienteId = String(item.prestamo.cliente?._id || '');
    const nombre = item.prestamo.cliente?.nombre;
    if (!clienteId || !nombre || item.saldoPendiente <= 0) return;

    const actual = activosPorCliente.get(clienteId) || {
      nombre,
      saldoPendiente: 0,
      diasDesdeMovimiento: null,
      origenMovimiento: item.origenMovimiento,
      fechaReferencia: item.fechaReferencia,
      fechaPrestamo: item.fechaPrestamo,
    };

    actual.saldoPendiente += item.saldoPendiente;

    if (
      actual.diasDesdeMovimiento === null ||
      (item.diasDesdeMovimiento ?? -1) > actual.diasDesdeMovimiento
    ) {
      actual.diasDesdeMovimiento = item.diasDesdeMovimiento;
      actual.origenMovimiento = item.origenMovimiento;
      actual.fechaReferencia = item.fechaReferencia;
      actual.fechaPrestamo = item.fechaPrestamo;
    }

    activosPorCliente.set(clienteId, actual);
  });

  let msg = `👥 Tienes <b>${clientes.length}</b> clientes registrados.\n`;

  if (activosPorCliente.size) {
    msg += `💳 <b>Clientes con deuda activa:</b>\n`;
    [...activosPorCliente.values()]
      .sort((a, b) => {
        if (b.saldoPendiente !== a.saldoPendiente) {
          return b.saldoPendiente - a.saldoPendiente;
        }
        return (b.diasDesdeMovimiento ?? -1) - (a.diasDesdeMovimiento ?? -1);
      })
      .slice(0, 5)
      .forEach((item, i) => {
        msg += `\n${i + 1}. ${escapeHtml(item.nombre)} - ${formatearMonto(item.saldoPendiente)} - ${item.diasDesdeMovimiento ?? 'sin dato'} días desde ${item.origenMovimiento}`;
      });
  }

  if (clientes.length) {
    msg += `\n\n📋 <b>Algunos clientes recientes:</b>\n`;
    clientes.slice(0, 10).forEach((cliente, i) => {
      msg += `\n${i + 1}. ${escapeHtml(cliente.nombre)}`;
    });
  }

  return msg;
};

const construirMensajeCreditos = async (cobrador, texto = '') => {
  const prestamos = await Prestamo.find({
    tenantId: cobrador.tenantId,
    cobrador: cobrador._id,
    estado: { $ne: 'pagado' },
  })
    .populate('cliente')
    .sort({ createdAt: -1 })
    .limit(100);

  const resumenPrestamos = await resumirPrestamos(prestamos);
  const activos = resumenPrestamos
    .filter((item) => item.saldoPendiente > 0)
    .sort((a, b) => {
      const da = a.diasDesdeMovimiento ?? -1;
      const db = b.diasDesdeMovimiento ?? -1;
      if (db !== da) return db - da;
      return b.saldoPendiente - a.saldoPendiente;
    });

  if (!activos.length) {
    return '💳 No tienes créditos activos por el momento.';
  }

  const totalSaldo = activos.reduce((acc, item) => acc + item.saldoPendiente, 0);
  const quierePrioridad = normalizarTexto(texto).includes('prioridad') || normalizarTexto(texto).includes('quien debe') || normalizarTexto(texto).includes('quien me debe');
  const limite = quierePrioridad ? 5 : 8;

  let msg = `💳 <b>Tienes ${activos.length} créditos activos</b> y un saldo por cobrar de <b>${formatearMonto(totalSaldo)}</b>.\n`;

  if (quierePrioridad) {
    msg += `\n🏁 <b>Prioridad de cobro</b>:\n`;
  } else {
    msg += `\n📌 <b>Detalle de créditos</b>:\n`;
  }

  activos.slice(0, limite).forEach((item, i) => {
    const nombre = escapeHtml(item.prestamo.cliente?.nombre || 'Sin cliente');
    const fechaPrestamo = formatearFechaBogota(item.fechaPrestamo);
    const fechaMovimiento = formatearFechaBogota(item.fechaReferencia);
    const diasPrestamo = item.diasDesdePrestamo ?? 'sin dato';
    const diasMovimiento = item.diasDesdeMovimiento ?? 'sin dato';

    msg += `\n${i + 1}. ${nombre} - ${formatearMonto(item.saldoPendiente)} - ${diasMovimiento} días desde ${item.origenMovimiento} (${fechaMovimiento})`;
    msg += `\n   Inicio: ${fechaPrestamo} | Tiempo desde el préstamo: ${diasPrestamo} días`;
  });

  return msg;
};

const construirMensajeClienteEspecifico = async (cliente, cobrador) => {
  const prestamos = await Prestamo.find({
    cliente: cliente._id,
    tenantId: cobrador.tenantId,
    cobrador: cobrador._id,
  })
    .sort({ createdAt: -1 })
    .limit(50);

  if (!prestamos.length) {
    return `👤 <b>${escapeHtml(cliente.nombre)}</b>\n🪪 ${escapeHtml(cliente.cedula)}\n📱 ${escapeHtml(cliente.celular || 'Sin celular')}\n🏠 ${escapeHtml(cliente.direccion || 'Sin dirección')}\n\n💳 No tiene créditos registrados.`;
  }

  const resumenPrestamos = await resumirPrestamos(prestamos);
  const totalSaldo = resumenPrestamos.reduce((acc, item) => acc + item.saldoPendiente, 0);
  const masAntiguo = [...resumenPrestamos].sort((a, b) => (b.diasDesdeMovimiento ?? -1) - (a.diasDesdeMovimiento ?? -1))[0];

  let texto = `👤 <b>${escapeHtml(cliente.nombre)}</b>\n`;
  texto += `🪪 ${escapeHtml(cliente.cedula)}\n`;
  texto += `📱 ${escapeHtml(cliente.celular || 'Sin celular')}\n`;
  texto += `🏠 ${escapeHtml(cliente.direccion || 'Sin dirección')}\n`;
  texto += `\n💳 <b>Saldo total pendiente:</b> ${formatearMonto(totalSaldo)}\n`;
  texto += `📊 <b>Créditos registrados:</b> ${prestamos.length}\n`;

  if (masAntiguo) {
    texto += `\n🏁 <b>Dato clave:</b> ${escapeHtml(masAntiguo.prestamo.cliente?.nombre || cliente.nombre)} lleva ${masAntiguo.diasDesdeMovimiento ?? 'sin dato'} días desde ${masAntiguo.origenMovimiento}.`;
    texto += `\n📅 Fecha de referencia: ${formatearFechaBogota(masAntiguo.fechaReferencia)}`;
    texto += `\n📅 Inicio del préstamo: ${formatearFechaBogota(masAntiguo.fechaPrestamo)}`;
  }

  texto += `\n\n<b>Créditos:</b>`;
  const visibles = resumenPrestamos.slice(0, 8);
  visibles.forEach((item, i) => {
    texto += `\n${i + 1}. ${formatearMonto(item.prestamo.capital)} | Saldo ${formatearMonto(item.saldoPendiente)} | Inicio ${formatearFechaBogota(item.fechaPrestamo)} | Último movimiento ${formatearFechaBogota(item.fechaReferencia)} (${item.diasDesdeMovimiento ?? 'sin dato'} días)`;
  });

  if (resumenPrestamos.length > visibles.length) {
    texto += `\n... y ${resumenPrestamos.length - visibles.length} crédito(s) más.`;
  }

  return texto;
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

const obtenerCobrador = async (chatId, telegramId) => {
  try {
    const autenticadoId = getAutenticacion(chatId);

    if (autenticadoId) {
      const cobradorAutenticado = await Cobrador.findById(autenticadoId);
      if (cobradorAutenticado) return cobradorAutenticado;
      clearAutenticacion(chatId);
    }

    return await buscarCobrador(telegramId);
  } catch (e) {
    console.error('❌ obtenerCobrador ERROR:', e.message);
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

const iniciarLoginCobrador = async (chatId) => {
  resetSesion(chatId);
  getSesion(chatId).paso = 'login_email';

  await sendMessage(
    chatId,
    '🔐 <b>Ingreso de Cobrador</b>\n\nEscribe el <b>correo</b> del cobrador con el que quieres entrar:',
    menuCancelar()
  );
};

const continuarLoginCobrador = async (chatId, texto) => {
  const sesion = getSesion(chatId);

  if (sesion.paso === 'login_email') {
    const email = String(texto || '').trim().toLowerCase();

    if (!email.includes('@')) {
      await sendMessage(chatId, '⚠️ Escribe un correo válido del cobrador:');
      return true;
    }

    sesion.data.email = email;
    sesion.paso = 'login_password';
    await sendMessage(chatId, '🔑 Ahora escribe la <b>contraseña</b> del cobrador:', menuCancelar());
    return true;
  }

  if (sesion.paso === 'login_password') {
    const email = sesion.data.email;
    const password = String(texto || '').trim();

    const cobrador = await Cobrador.findOne({ email });

    if (!cobrador) {
      await sendMessage(chatId, '❌ No encontré un cobrador con ese correo.\n\nIntenta de nuevo con /login');
      resetSesion(chatId);
      return true;
    }

    const passwordValida = await cobrador.comparePassword(password);

    if (!passwordValida) {
      await sendMessage(chatId, '❌ Contraseña incorrecta.\n\nIntenta de nuevo con /login');
      resetSesion(chatId);
      return true;
    }

    if (cobrador.estado?.toLowerCase() !== 'activo') {
      await sendMessage(chatId, '❌ Ese cobrador está inactivo.');
      resetSesion(chatId);
      return true;
    }

    setAutenticacion(chatId, cobrador);
    resetSesion(chatId);

    await sendMessage(
      chatId,
      `✅ <b>Sesión iniciada</b>\n\n👤 ${cobrador.nombre}\n🏢 ${cobrador.tenantId}\n📧 ${cobrador.email}`
    );

    await enviarMenuPrincipal(chatId, cobrador.nombre || 'Cobrador');
    return true;
  }

  return false;
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
    const cliente = await Cliente.findOne({
      cedula: texto,
      tenantId: cobrador.tenantId,
      cobrador: cobrador._id,
    });
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
      capital: d.capital,
      interes: d.interes,
      totalAPagar: d.totalAPagar,
      totalPagado: 0,
      numeroCuotas: d.cuotas,
      frecuencia: 'diario',
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
  const cliente = await Cliente.findOne({
    cedula,
    tenantId: cobrador.tenantId,
    cobrador: cobrador._id,
  });

  if (!cliente) {
    await sendMessage(chatId, `⚠️ No encontré un cliente con cédula <b>${cedula}</b>.`);
    return;
  }

  const texto = await construirMensajeClienteEspecifico(cliente, cobrador);
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
    const cliente = await Cliente.findOne({
      cedula: texto,
      tenantId: cobrador.tenantId,
      cobrador: cobrador._id,
    });
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

    const saldoPendiente = Math.max(0, Number(prestamo.totalAPagar || 0) - Number(prestamo.totalPagado || 0));

    await sendMessage(
      chatId,
      `✅ Cliente: <b>${cliente.nombre}</b>\n💳 Saldo pendiente: <b>$${saldoPendiente.toLocaleString('es-CO')}</b>\n\nEscribe el <b>monto del pago</b>:`,
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
// aqui empiesan los datos mdb
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

    const saldoPendienteAnterior = Math.max(
      0,
      Number(prestamo.totalAPagar || 0) - Number(prestamo.totalPagado || 0)
    );

    if (Number(d.monto) > saldoPendienteAnterior) {
      await sendMessage(
        chatId,
        `⚠️ El pago supera el saldo pendiente actual ($${saldoPendienteAnterior.toLocaleString('es-CO')}).`
      );
      resetSesion(chatId);
      await enviarMenuPrincipal(chatId, cobrador.nombre);
      return;
    }
      //aqui se guardan los datos bd
    const pago = new Pago({
      prestamoId: prestamo._id,
      clienteId: d.clienteId,
      tenantId: cobrador.tenantId,
      monto: d.monto,
      metodoPago: 'efectivo',
      fecha: new Date(),
      registradoPor: cobrador._id,
      registradoPorTipo: 'cobrador',
    });

    await pago.save();

    prestamo.totalPagado = Math.max(0, Number(prestamo.totalPagado || 0) + Number(d.monto));
    prestamo.ultimoPago = new Date();
    if (prestamo.totalPagado >= Number(prestamo.totalAPagar || 0)) prestamo.estado = 'pagado';
    await prestamo.save();

    const saldoPendienteNuevo = Math.max(
      0,
      Number(prestamo.totalAPagar || 0) - Number(prestamo.totalPagado || 0)
    );

    resetSesion(chatId);

    await sendMessage(
      chatId,
      `✅ <b>Pago registrado correctamente</b>\n\n👤 ${d.clienteNombre}\n💵 $${Number(d.monto).toLocaleString('es-CO')}\n💳 Nuevo saldo: $${saldoPendienteNuevo.toLocaleString('es-CO')}`
    );

    await enviarMenuPrincipal(chatId, cobrador.nombre);
  } catch (e) {
    await sendMessage(chatId, `❌ Error al registrar pago:\n<code>${e.message}</code>`);
    resetSesion(chatId);
    await enviarMenuPrincipal(chatId, cobrador.nombre);
  }
};

// ════════════════════════════════════════════════════════════════════
// HANDLERS PRINCIPALES resive el mensaje entrante y las aciones del menu 
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

    const sesion = getSesion(chatId);

    if (text === '/login') {
      await iniciarLoginCobrador(chatId);
      return;
    }

    const lowerText = text.toLowerCase();

    if (text === '/logout' || text === '/salir') {
      clearAutenticacion(chatId);
      resetSesion(chatId);
      await sendMessage(chatId, '🔒 Sesión cerrada.\n\nUsa /login para entrar con otro cobrador.');
      return;
    }

    if (sesion.paso?.startsWith('login_')) {
      const handled = await continuarLoginCobrador(chatId, text);
      if (handled) return;
    }
//busca las aciones del menu y las ejecuta 
    const cobrador = await obtenerCobrador(chatId, telegramUserId);

    if (text === '/start') {
      resetSesion(chatId);
      if (!cobrador) {
        await iniciarLoginCobrador(chatId);
        return;
      }
      await enviarMenuPrincipal(chatId, cobrador.nombre || 'Cobrador');
      return;
    }

    if (text === '/menu' || lowerText === 'menu' || lowerText === 'menú') {
      if (!cobrador) {
        await iniciarLoginCobrador(chatId);
        return;
      }
      resetSesion(chatId);
      await enviarMenuPrincipal(chatId, cobrador.nombre || 'Cobrador');
      return;
    }

    if (!cobrador) {
      await sendMessage(
        chatId,
        '⚠️ Este chat no tiene un cobrador activo.\n\nUsa /login para entrar con el correo y la contraseña del cobrador, o vincula tu Telegram ID.'
      );
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

    const respondidoNatural = await manejarConsultaNatural({
      chatId,
      text,
      cobrador,
    });

    if (respondidoNatural) return;

    // Fallback IA: solo para preguntas libres que no encajan en los flujos.
    try {
      console.log('🔥 IA ACTIVADA');

      const clientes = await Cliente.find({
        tenantId: cobrador.tenantId,
        cobrador: cobrador._id,
      })
        .sort({ createdAt: -1 })
        .limit(50);

      const creditos = await Prestamo.find({
        tenantId: cobrador.tenantId,
        cobrador: cobrador._id,
        estado: { $ne: 'pagado' },
      })
        .populate('cliente')
        .sort({ createdAt: -1 })
        .limit(50);

      const resumenPrestamos = await resumirPrestamos(creditos);
      const clienteMencionado = buscarClienteMencionado(text, clientes);

      let datos = `Fecha de referencia: ${formatearFechaBogota(new Date())}\n`;
      datos += `Clientes registrados: ${clientes.length}\n`;
      datos += `Créditos con saldo: ${resumenPrestamos.filter((item) => item.saldoPendiente > 0).length}\n`;

      if (clienteMencionado) {
        datos += `\nCliente mencionado por el usuario: ${clienteMencionado.nombre}\n`;
        const prestamosCliente = creditos.filter(
          (prestamo) => String(prestamo.cliente?._id) === String(clienteMencionado._id)
        );

        if (prestamosCliente.length) {
          const resumenCliente = await resumirPrestamos(prestamosCliente);
          datos += `Datos reales del cliente:\n`;
          resumenCliente.forEach((item, i) => {
            datos += `- Crédito ${i + 1}: saldo ${formatearMonto(item.saldoPendiente)}, inicio ${formatearFechaBogota(item.fechaPrestamo)}, último movimiento ${formatearFechaBogota(item.fechaReferencia)} (${item.diasDesdeMovimiento ?? 'sin dato'} días)\n`;
          });
        }
      } else {
        const ranking = [...resumenPrestamos]
          .filter((item) => item.saldoPendiente > 0)
          .sort((a, b) => {
            const da = a.diasDesdeMovimiento ?? -1;
            const db = b.diasDesdeMovimiento ?? -1;
            if (db !== da) return db - da;
            return b.saldoPendiente - a.saldoPendiente;
          })
          .slice(0, 5);

        if (ranking.length) {
          datos += `\nTop de cartera real:\n`;
          ranking.forEach((item, i) => {
            datos += `- ${i + 1}. ${item.prestamo.cliente?.nombre || 'Sin cliente'}: ${formatearMonto(item.saldoPendiente)} | ${item.diasDesdeMovimiento ?? 'sin dato'} días desde ${item.origenMovimiento}\n`;
          });
        }
      }

      datos += '\nReglas: responde solo lo que el usuario preguntó. Si pregunta por un cliente, no hagas un resumen de toda la cartera. Si falta una fecha, dilo y explica de dónde sale el dato.';

      const respuesta = await responderIA_RAG(text, datos, {
        tenantId: cobrador.tenantId,
        userId: cobrador._id?.toString?.() || String(cobrador._id),
        userName: cobrador.nombre || '',
        role: 'cobrador',
        conversationId: String(chatId),
        channel: 'telegram',
      });
      await sendMessage(chatId, respuesta);
      return;
    } catch (error) {
      console.error('❌ ERROR IA:', error.message);
      await sendMessage(chatId, '❌ Error con la IA');
      return;
    }
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

    const cobrador = await obtenerCobrador(chatId, telegramUserId);

    if (!cobrador) {
      await iniciarLoginCobrador(chatId);
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
      const mensajeClientes = await construirMensajeClientes(cobrador);
      await sendMessage(chatId, mensajeClientes);
      return;
    }

    if (data === 'menu_creditos') {
      const mensajeCreditos = await construirMensajeCreditos(cobrador, 'prioridad');
      await sendMessage(chatId, mensajeCreditos);
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

async function manejarConsultaNatural({ chatId, text, cobrador }) {
  const consulta = normalizarTexto(text);

  if (!consulta) return false;

  if (consulta.includes('crear cliente') || consulta.includes('nuevo cliente')) {
    await iniciarCrearCliente(chatId);
    return true;
  }

  if (
    consulta.includes('crear credito') ||
    consulta.includes('nuevo credito') ||
    consulta.includes('crear prestamo') ||
    consulta.includes('nuevo prestamo')
  ) {
    await iniciarCrearCredito(chatId);
    return true;
  }

  if (
    consulta.includes('registrar pago') ||
    consulta.includes('registrar abono') ||
    consulta.includes('nuevo pago') ||
    consulta.includes('hacer un pago') ||
    consulta.includes('abonar')
  ) {
    await iniciarRegistrarPago(chatId);
    return true;
  }

  const clientes = await Cliente.find({
    tenantId: cobrador.tenantId,
    cobrador: cobrador._id,
  })
    .select('nombre cedula celular direccion estado createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const clienteMencionado = buscarClienteMencionado(text, clientes);

  if (clienteMencionado) {
    const mensajeCliente = await construirMensajeClienteEspecifico(clienteMencionado, cobrador);
    await sendMessage(chatId, mensajeCliente);
    return true;
  }

  if (
    consulta.includes('consultar cliente') ||
    consulta.includes('buscar cliente') ||
    consulta.includes('ver cliente')
  ) {
    await iniciarConsultarCliente(chatId);
    return true;
  }

  if (
    consulta.includes('mis clientes') ||
    consulta === 'clientes' ||
    consulta.includes('lista de clientes') ||
    consulta.includes('ver clientes')
  ) {
    const mensajeClientes = await construirMensajeClientes(cobrador);
    await sendMessage(chatId, mensajeClientes);
    return true;
  }

  if (
    consulta.includes('mis creditos') ||
    consulta === 'creditos' ||
    consulta.includes('lista de creditos') ||
    consulta.includes('cartera') ||
    consulta.includes('deuda') ||
    consulta.includes('debe') ||
    consulta.includes('morosos') ||
    consulta.includes('mora') ||
    consulta.includes('atraso') ||
    consulta.includes('prioridad') ||
    consulta.includes('cuanto debe') ||
    consulta.includes('quien debe') ||
    consulta.includes('a quien cobrar') ||
    consulta.includes('cobrar') ||
    consulta.includes('cobro') ||
    consulta.includes('saldo')
  ) {
    const mensajeCreditos = await construirMensajeCreditos(cobrador, consulta);
    await sendMessage(chatId, mensajeCreditos);
    return true;
  }

  if (consulta === 'si' || consulta === 'claro' || consulta === 'ok') {
    await sendMessage(
      chatId,
      'Dime exactamente qué necesitas: mis clientes, mis créditos, consultar cliente o registrar pago.'
    );
    return true;
  }

  return false;
}

async function responderIA_RAG(pregunta, datos = "", contexto = {}) {
  try {
    const result = await answerRagQuestion({
      question: pregunta,
      tenantId: contexto.tenantId || null,
      role: contexto.role || 'cobrador',
      userId: contexto.userId || null,
      userName: contexto.userName || '',
      conversationId: contexto.conversationId || '',
      channel: contexto.channel || 'telegram',
      manualContext: datos,
    });

    return result.answer;
  } catch (error) {
    console.error("Error IA RAG:", error.message);
    return "âŒ Error con la IA";
  }
}

async function responderIA(pregunta, datos = "") {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
  {
    role: "system",
    content: "Eres un asesor financiero experto en préstamos. Responde como una persona real, de forma natural y variada. No repitas siempre la misma estructura ni el mismo saludo."
  },
  {
    role: "system",
    content: "Usa únicamente los datos proporcionados. Nunca inventes días, fechas o valores. Si falta información, dilo claramente y explica qué dato falta."
  },
  {
    role: "system",
    content: "Si la pregunta es corta, responde corto. Si el usuario pide algo específico (como mensajes o ayuda), responde solo a eso sin repetir todo el análisis de cartera."
  },
  {
    role: "system",
    content: "IMPORTANTE: Si el usuario pide acciones del sistema como consultar cliente, ver clientes, registrar pago o crear crédito, NO respondas con análisis. Indica claramente qué debe hacer o usa el flujo del sistema. Si el contexto trae un cliente específico, habla solo de ese cliente."
  },
  {
    role: "system",
    content: "Responde en español, usa listas solo cuando sea necesario y da recomendaciones prácticas."
  },
  {
    role: "user",
    content: `Pregunta: ${pregunta}\n\nDatos:\n${datos}`,
  }
]
    });

    return completion.choices[0].message.content;

  } catch (error) {
    console.error("Error IA:", error.message);
    return "❌ Error con la IA";
  }
}
