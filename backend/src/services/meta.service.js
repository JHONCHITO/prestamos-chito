const axios = require('axios');
const crypto = require('crypto');

const Cliente = require('../models/Cliente');
const Tenant = require('../models/Tenant');
const MetaIntegration = require('../models/MetaIntegration');
const MetaCampaign = require('../models/MetaCampaign');
const { answerRagQuestion, transcribeAudioDocument, normalizeChannel } = require('./rag.service');

const GRAPH_BASE_URL = process.env.META_GRAPH_API_BASE || 'https://graph.facebook.com';
const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
const DEFAULT_VERIFY_TOKEN = String(process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || '').trim();
const DEFAULT_APP_SECRET = String(process.env.META_APP_SECRET || '').trim();
const DEFAULT_BROADCAST_DELAY_MS = Math.max(0, Number(process.env.META_CAMPAIGN_DELAY_MS || 350));
const DEFAULT_COUNTRY_CODE = String(process.env.META_DEFAULT_COUNTRY_CODE || '57').trim();
const MAX_CAMPAIGN_RECIPIENTS = Math.max(1, Number(process.env.META_CAMPAIGN_MAX_RECIPIENTS || 5000));

function safeString(value = '') {
  return String(value ?? '').trim();
}

function isSuperAdminRole(role = '') {
  return ['superadmin', 'superadministrador'].includes(String(role || '').toLowerCase());
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTenantId(value = '') {
  const clean = safeString(value).toLowerCase();
  if (!clean || clean === 'system') {
    return '';
  }
  return clean;
}

function normalizeRecipientPhone(value = '') {
  const digits = safeString(value).replace(/[^\d]/g, '');
  if (!digits) {
    return '';
  }

  if (digits.length === 10) {
    return `${DEFAULT_COUNTRY_CODE}${digits}`;
  }

  return digits;
}

function normalizeMetaChannel(channel = '') {
  const normalized = normalizeChannel(channel);
  if (normalized === 'web') {
    return 'whatsapp';
  }
  return normalized;
}

function buildMetaConversationId({
  channel = 'whatsapp',
  sourceId = '',
  recipientId = '',
  fallback = '',
}) {
  const cleanChannel = normalizeMetaChannel(channel) || 'whatsapp';
  const cleanSourceId = safeString(sourceId);
  const cleanRecipientId = safeString(recipientId);
  const cleanFallback = safeString(fallback);

  const stableId = cleanRecipientId || cleanSourceId || cleanFallback;
  if (!stableId) {
    return `${cleanChannel}:unknown`;
  }

  return `${cleanChannel}:${stableId}`;
}

function buildSeededCampaignTemplate(tenantId, options = {}) {
  const cleanTenantId = normalizeTenantId(tenantId);
  const createdBy = safeString(options.createdBy || 'system');

  return {
    tenantId: cleanTenantId,
    name: safeString(options.name || 'Plantilla inicial de difusion') || 'Plantilla inicial de difusion',
    channel: 'whatsapp',
    sendMode: 'text',
    status: 'draft',
    message: safeString(
      options.message ||
        'Hola {{nombre}}, este es un mensaje de ejemplo para tu oficina. Edita esta plantilla antes de enviar una campana real.',
    ),
    templateName: '',
    templateLanguage: 'es',
    audience: {
      filter: {
        estado: 'activo',
      },
    },
    recipients: [],
    totals: {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      pending: 0,
    },
    createdBy: {
      userId: null,
      userName: createdBy,
    },
    metadata: {
      seeded: true,
      seededAt: new Date().toISOString(),
      seededBy: createdBy,
      source: 'meta-workspace-bootstrap',
      ...(options.metadata || {}),
    },
  };
}

async function ensureMetaWorkspaceForTenant(tenantId, options = {}) {
  const cleanTenantId = normalizeTenantId(tenantId);
  if (!cleanTenantId) {
    return null;
  }

  let integration = await MetaIntegration.findOne({ tenantId: cleanTenantId }).lean();

  if (!integration) {
    const seededIntegration = await MetaIntegration.create(
      sanitizeIntegrationConfig({
        tenantId: cleanTenantId,
        name: safeString(options.name || 'Meta Office'),
        active: true,
        autoReplyEnabled: true,
        webhookVerifyToken: safeString(options.webhookVerifyToken || DEFAULT_VERIFY_TOKEN),
        webhookAppSecret: safeString(options.webhookAppSecret || DEFAULT_APP_SECRET),
        graphApiVersion: safeString(options.graphApiVersion || GRAPH_API_VERSION),
        channels: {},
        metadata: {
          seeded: true,
          seededAt: new Date().toISOString(),
          seededBy: safeString(options.createdBy || 'system'),
          source: 'meta-workspace-bootstrap',
          ...(options.metadata || {}),
        },
        createdBy: safeString(options.createdBy || 'system'),
        updatedBy: safeString(options.createdBy || 'system'),
      }),
    );

    integration = seededIntegration.toObject();
  }

  let seededCampaign = null;
  if (options.seedCampaign !== false) {
    const campaignCount = await MetaCampaign.countDocuments({ tenantId: cleanTenantId });
    if (campaignCount === 0) {
      const campaign = await MetaCampaign.create(
        buildSeededCampaignTemplate(cleanTenantId, options),
      );
      seededCampaign = campaign.toObject();
    }
  }

  return {
    integration,
    seededCampaign,
  };
}

async function bootstrapMetaWorkspaces() {
  const tenants = await Tenant.find({}, { tenantId: 1, nombre: 1 }).lean();
  const results = [];

  for (const tenant of tenants) {
    const tenantId = normalizeTenantId(tenant?.tenantId);
    if (!tenantId) {
      continue;
    }

    try {
      const result = await ensureMetaWorkspaceForTenant(tenantId, {
        seedCampaign: true,
        createdBy: 'system',
        name: `${safeString(tenant.nombre || tenantId)} Meta`,
      });

      results.push({
        tenantId,
        integrationCreated: Boolean(result?.integration),
        campaignSeeded: Boolean(result?.seededCampaign),
      });
    } catch (error) {
      console.error(`Error sembrando Meta para tenant ${tenantId}:`, error.message);
    }
  }

  return results;
}

function channelConfig(integration, channel) {
  return integration?.channels?.[channel] || {};
}

function channelSenderId(integration, channel) {
  const config = channelConfig(integration, channel);
  return safeString(
    config.senderId ||
      config.phoneNumberId ||
      config.pageId ||
      config.instagramUserId ||
      config.businessAccountId ||
      '',
  );
}

function channelAccessToken(integration, channel) {
  return safeString(channelConfig(integration, channel)?.accessToken || '');
}

function channelAppSecret(integration, channel) {
  return safeString(
    channelConfig(integration, channel)?.appSecret ||
      integration?.webhookAppSecret ||
      DEFAULT_APP_SECRET ||
      '',
  );
}

function channelGraphVersion(integration, channel) {
  return safeString(
    channelConfig(integration, channel)?.graphApiVersion ||
      integration?.graphApiVersion ||
      GRAPH_API_VERSION ||
      '',
  ) || GRAPH_API_VERSION;
}

function shouldAutoReply(integration, channel) {
  const config = channelConfig(integration, channel);

  if (!integration?.active || integration.autoReplyEnabled === false) {
    return false;
  }

  if (config.enabled === false) {
    return false;
  }

  return config.defaultReplyMode !== 'human_only';
}

function sanitizeChannelConfig(input = {}, channel = 'whatsapp') {
  const channelName = normalizeMetaChannel(channel);
  const sender = safeString(
    input.senderId ||
      input.phoneNumberId ||
      input.pageId ||
      input.instagramUserId ||
      '',
  );

  const config = {
    enabled: input.enabled === true || String(input.enabled).toLowerCase() === 'true',
    senderId: sender,
    accessToken: safeString(input.accessToken || ''),
    verifyToken: safeString(input.verifyToken || ''),
    appSecret: safeString(input.appSecret || ''),
    businessAccountId: safeString(input.businessAccountId || ''),
    pageId: safeString(input.pageId || ''),
    phoneNumberId: safeString(input.phoneNumberId || ''),
    instagramUserId: safeString(input.instagramUserId || ''),
    graphApiVersion: safeString(input.graphApiVersion || ''),
    defaultReplyMode: ['auto', 'human_only', 'auto_then_human'].includes(input.defaultReplyMode)
      ? input.defaultReplyMode
      : 'auto',
    welcomeMessage: safeString(input.welcomeMessage || ''),
    fallbackMessage: safeString(input.fallbackMessage || ''),
    notes: safeString(input.notes || ''),
  };

  if (channelName === 'whatsapp') {
    config.senderId = safeString(config.senderId || config.phoneNumberId || '');
    config.phoneNumberId = safeString(config.phoneNumberId || config.senderId || '');
  }

  if (channelName === 'facebook') {
    config.senderId = safeString(config.senderId || config.pageId || '');
    config.pageId = safeString(config.pageId || config.senderId || '');
  }

  if (channelName === 'instagram') {
    config.senderId = safeString(config.senderId || config.instagramUserId || '');
    config.instagramUserId = safeString(config.instagramUserId || config.senderId || '');
  }

  return config;
}

function sanitizeIntegrationConfig(input = {}) {
  return {
    tenantId: normalizeTenantId(input.tenantId),
    name: safeString(input.name || ''),
    active: input.active !== false,
    autoReplyEnabled: input.autoReplyEnabled !== false,
    webhookVerifyToken: safeString(input.webhookVerifyToken || DEFAULT_VERIFY_TOKEN),
    webhookAppSecret: safeString(input.webhookAppSecret || DEFAULT_APP_SECRET),
    graphApiVersion: safeString(input.graphApiVersion || GRAPH_API_VERSION),
    channels: {
      whatsapp: sanitizeChannelConfig(input.channels?.whatsapp || input.whatsapp || {}, 'whatsapp'),
      instagram: sanitizeChannelConfig(input.channels?.instagram || input.instagram || {}, 'instagram'),
      facebook: sanitizeChannelConfig(input.channels?.facebook || input.facebook || {}, 'facebook'),
    },
    metadata: input.metadata || {},
    createdBy: safeString(input.createdBy || ''),
    updatedBy: safeString(input.updatedBy || ''),
  };
}

function mergeChannelConfig(existing = {}, incoming = {}, channel = 'whatsapp') {
  return sanitizeChannelConfig(
    {
      ...existing,
      ...incoming,
    },
    channel,
  );
}

function integrationLookupConditions(identifier = '') {
  const value = safeString(identifier);
  if (!value) {
    return [];
  }

  return [
    { 'channels.whatsapp.senderId': value },
    { 'channels.whatsapp.phoneNumberId': value },
    { 'channels.whatsapp.businessAccountId': value },
    { 'channels.instagram.senderId': value },
    { 'channels.instagram.instagramUserId': value },
    { 'channels.instagram.pageId': value },
    { 'channels.facebook.senderId': value },
    { 'channels.facebook.pageId': value },
  ];
}

function detectChannelFromObject(objectName = '') {
  const value = safeString(objectName).toLowerCase();
  if (value.includes('whatsapp')) {
    return 'whatsapp';
  }
  if (value.includes('instagram')) {
    return 'instagram';
  }
  if (value.includes('page') || value.includes('facebook')) {
    return 'facebook';
  }
  return '';
}

function matchingChannelForIntegration(integration, identifiers = []) {
  const ids = Array.from(new Set(identifiers.map(safeString).filter(Boolean)));
  if (!ids.length || !integration) {
    return '';
  }

  for (const candidate of ['whatsapp', 'instagram', 'facebook']) {
    const config = channelConfig(integration, candidate);
    const values = [
      config.senderId,
      config.phoneNumberId,
      config.pageId,
      config.instagramUserId,
      config.businessAccountId,
    ]
      .map(safeString)
      .filter(Boolean);

    if (values.some((value) => ids.includes(value))) {
      return candidate;
    }
  }

  return '';
}

async function findIntegrationForIdentifiers(identifiers = []) {
  const ids = Array.from(new Set(identifiers.map(safeString).filter(Boolean)));
  if (!ids.length) {
    return null;
  }

  const orConditions = [];
  ids.forEach((id) => {
    orConditions.push(...integrationLookupConditions(id));
  });

  if (!orConditions.length) {
    return null;
  }

  const integration = await MetaIntegration.findOne({
    active: true,
    $or: orConditions,
  }).lean();

  if (!integration) {
    return null;
  }

  return {
    integration,
    channel: matchingChannelForIntegration(integration, ids) || 'whatsapp',
  };
}

async function getIntegrationForTenant(tenantId) {
  const cleanTenantId = normalizeTenantId(tenantId);
  if (!cleanTenantId) {
    return null;
  }

  const integration = await MetaIntegration.findOne({ tenantId: cleanTenantId }).lean();
  if (integration) {
    return integration;
  }

  const seeded = await ensureMetaWorkspaceForTenant(cleanTenantId, {
    seedCampaign: false,
    createdBy: 'system',
  });

  return seeded?.integration || {
    tenantId: cleanTenantId,
    name: '',
    active: false,
    autoReplyEnabled: true,
    webhookVerifyToken: DEFAULT_VERIFY_TOKEN,
    webhookAppSecret: DEFAULT_APP_SECRET,
    graphApiVersion: GRAPH_API_VERSION,
    channels: {
      whatsapp: sanitizeChannelConfig({}, 'whatsapp'),
      instagram: sanitizeChannelConfig({}, 'instagram'),
      facebook: sanitizeChannelConfig({}, 'facebook'),
    },
    metadata: {},
  };
}

async function upsertIntegrationConfig({
  tenantId,
  payload = {},
  userId = null,
  userName = '',
}) {
  const cleanTenantId = normalizeTenantId(tenantId);
  if (!cleanTenantId) {
    throw new Error('Tenant no valido para Meta');
  }

  const existing = await MetaIntegration.findOne({ tenantId: cleanTenantId });

  const nextData = sanitizeIntegrationConfig({
    tenantId: cleanTenantId,
    name: payload.name || existing?.name || '',
    active: payload.active !== undefined ? Boolean(payload.active) : (existing?.active !== undefined ? existing.active : true),
    autoReplyEnabled: payload.autoReplyEnabled !== undefined
      ? Boolean(payload.autoReplyEnabled)
      : (existing?.autoReplyEnabled !== undefined ? existing.autoReplyEnabled : true),
    webhookVerifyToken: payload.webhookVerifyToken || existing?.webhookVerifyToken || DEFAULT_VERIFY_TOKEN,
    webhookAppSecret: payload.webhookAppSecret || existing?.webhookAppSecret || DEFAULT_APP_SECRET,
    graphApiVersion: payload.graphApiVersion || existing?.graphApiVersion || GRAPH_API_VERSION,
    channels: {
      whatsapp: mergeChannelConfig(existing?.channels?.whatsapp || {}, payload.channels?.whatsapp || payload.whatsapp || {}, 'whatsapp'),
      instagram: mergeChannelConfig(existing?.channels?.instagram || {}, payload.channels?.instagram || payload.instagram || {}, 'instagram'),
      facebook: mergeChannelConfig(existing?.channels?.facebook || {}, payload.channels?.facebook || payload.facebook || {}, 'facebook'),
    },
    metadata: payload.metadata || existing?.metadata || {},
    createdBy: existing?.createdBy || safeString(userName || userId || ''),
    updatedBy: safeString(userName || userId || ''),
  });

  const updated = await MetaIntegration.findOneAndUpdate(
    { tenantId: cleanTenantId },
    {
      $set: {
        ...nextData,
      },
      $setOnInsert: {
        tenantId: cleanTenantId,
        createdBy: safeString(userName || userId || ''),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  return updated.toObject();
}

async function listMetaCampaigns({
  tenantId,
  targetTenantId,
  role = '',
  channel = '',
  status = '',
  limit = 20,
}) {
  const cleanTenantId = isSuperAdminRole(role) ? normalizeTenantId(targetTenantId) : normalizeTenantId(tenantId);
  if (!cleanTenantId && !isSuperAdminRole(role)) {
    throw new Error('Tenant no valido');
  }

  const query = {};
  if (cleanTenantId) {
    query.tenantId = cleanTenantId;
  }

  if (safeString(channel)) {
    query.channel = normalizeMetaChannel(channel);
  }

  if (safeString(status)) {
    query.status = safeString(status);
  }

  const campaigns = await MetaCampaign.find(query).sort({ createdAt: -1 }).limit(limit).lean();

  return {
    tenantId: cleanTenantId || null,
    campaigns,
    total: campaigns.length,
  };
}

async function getMetaCampaign({
  tenantId,
  targetTenantId,
  role = '',
  campaignId,
}) {
  const cleanCampaignId = safeString(campaignId);
  if (!cleanCampaignId) {
    throw new Error('La campana es obligatoria');
  }

  const cleanTenantId = isSuperAdminRole(role) ? normalizeTenantId(targetTenantId) : normalizeTenantId(tenantId);
  const query = { _id: cleanCampaignId };
  if (cleanTenantId) {
    query.tenantId = cleanTenantId;
  }

  const campaign = await MetaCampaign.findOne(query).lean();
  if (!campaign) {
    throw new Error('Campana no encontrada');
  }

  return campaign;
}

function renderMessageTemplate(message = '', client = {}, tenantName = '') {
  const replacements = {
    '{{nombre}}': client.nombre || '',
    '{{cedula}}': client.cedula || '',
    '{{celular}}': client.celular || client.telefono || '',
    '{{telefono}}': client.telefono || client.celular || '',
    '{{tipoCliente}}': client.tipoCliente || '',
    '{{tenant}}': tenantName || '',
    '{{empresa}}': tenantName || '',
  };

  let output = safeString(message);
  Object.entries(replacements).forEach(([token, value]) => {
    output = output.split(token).join(String(value));
  });

  return output.trim();
}

async function resolveCampaignRecipients({
  tenantId,
  audience = {},
}) {
  const cleanTenantId = normalizeTenantId(tenantId);
  const filter = audience.filter || audience.filters || audience || {};
  const query = {
    tenantId: cleanTenantId,
  };

  if (safeString(filter.estado || filter.status)) {
    query.estado = safeString(filter.estado || filter.status);
  } else {
    query.estado = 'activo';
  }

  if (safeString(filter.tipoCliente)) {
    query.tipoCliente = safeString(filter.tipoCliente);
  }

  if (safeString(filter.search)) {
    const text = safeString(filter.search);
    const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { nombre: regex },
      { cedula: regex },
      { celular: regex },
      { telefono: regex },
      { email: regex },
    ];
  }

  if (Array.isArray(filter.clientIds) && filter.clientIds.length) {
    query._id = { $in: filter.clientIds };
  }

  const clients = await Cliente.find(query).sort({ createdAt: 1 }).lean();
  const recipients = [];

  for (const client of clients) {
    const phone = normalizeRecipientPhone(client.celular || client.telefono || '');
    if (!phone) {
      continue;
    }

    recipients.push({
      clientId: String(client._id),
      externalId: phone,
      name: safeString(client.nombre || ''),
      destination: phone,
      channel: 'whatsapp',
      status: 'pending',
      error: '',
      providerMessageId: '',
      renderedMessage: '',
    });

    if (recipients.length >= MAX_CAMPAIGN_RECIPIENTS) {
      break;
    }
  }

  return {
    recipients,
    total: recipients.length,
    preview: recipients.slice(0, 10),
  };
}

async function previewMetaCampaign({
  tenantId,
  targetTenantId,
  role = '',
  payload = {},
}) {
  const cleanTenantId = isSuperAdminRole(role) ? normalizeTenantId(targetTenantId) : normalizeTenantId(tenantId);
  if (!cleanTenantId) {
    throw new Error('Tenant no valido');
  }

  const tenant = await Tenant.findOne({ tenantId: cleanTenantId }).lean();
  const audience = payload.audience || payload.filters || {};
  const resolved = await resolveCampaignRecipients({
    tenantId: cleanTenantId,
    audience,
  });
  const message = safeString(payload.message || '');

  const sample = resolved.preview.map((recipient) => ({
    ...recipient,
    renderedMessage: renderMessageTemplate(
      message,
      {
        nombre: recipient.name,
        celular: recipient.destination,
        telefono: recipient.destination,
      },
      tenant?.nombre || '',
    ),
  }));

  return {
    tenantId: cleanTenantId,
    tenantName: tenant?.nombre || '',
    total: resolved.total,
    sample,
  };
}

async function createMetaCampaign({
  tenantId,
  targetTenantId,
  role = '',
  payload = {},
  userId = null,
  userName = '',
}) {
  const cleanTenantId = isSuperAdminRole(role) ? normalizeTenantId(targetTenantId) : normalizeTenantId(tenantId);
  if (!cleanTenantId) {
    throw new Error('Tenant no valido');
  }

  const name = safeString(payload.name || payload.title || 'Campana WhatsApp');
  if (!name) {
    throw new Error('El nombre de la campana es obligatorio');
  }

  const channel = normalizeMetaChannel(payload.channel || 'whatsapp');
  const sendMode = safeString(payload.sendMode || payload.mode || 'text') === 'template' ? 'template' : 'text';
  const message = safeString(payload.message || '');
  const templateName = safeString(payload.templateName || '');
  const templateLanguage = safeString(payload.templateLanguage || 'es') || 'es';
  const audience = payload.audience || payload.filters || {};
  const autoSend = payload.autoSend !== false && payload.sendNow !== false;

  if (sendMode === 'template' && !templateName) {
    throw new Error('Debes indicar el nombre de la plantilla');
  }

  if (sendMode === 'text' && !message) {
    throw new Error('El mensaje es obligatorio');
  }

  const resolvedRecipients = Array.isArray(payload.recipients) && payload.recipients.length
    ? {
        recipients: payload.recipients
          .map((recipient) => ({
            clientId: safeString(recipient.clientId || recipient.id || ''),
            externalId: normalizeRecipientPhone(recipient.externalId || recipient.destination || recipient.phone || recipient.celular || ''),
            name: safeString(recipient.name || ''),
            destination: normalizeRecipientPhone(recipient.destination || recipient.phone || recipient.externalId || recipient.celular || ''),
            channel,
            status: 'pending',
            error: '',
            providerMessageId: '',
            renderedMessage: '',
          }))
          .filter((recipient) => recipient.destination),
        total: 0,
      }
    : await resolveCampaignRecipients({
        tenantId: cleanTenantId,
        audience,
      });

  const campaign = await MetaCampaign.create({
    tenantId: cleanTenantId,
    name,
    channel,
    sendMode,
    status: autoSend ? 'queued' : 'draft',
    message,
    templateName,
    templateLanguage,
    audience,
    recipients: resolvedRecipients.recipients.map((recipient) => ({
      ...recipient,
      channel,
    })),
    totals: {
      total: resolvedRecipients.recipients.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      pending: resolvedRecipients.recipients.length,
    },
    createdBy: {
      userId: userId ? String(userId) : null,
      userName: safeString(userName || ''),
    },
    metadata: payload.metadata || {},
  });

  const saved = campaign.toObject();

  if (autoSend) {
    void sendMetaCampaign({
      campaignId: saved._id,
      tenantId: cleanTenantId,
      targetTenantId: cleanTenantId,
      role,
      userId,
      userName,
      allowDraftSend: true,
    }).catch((error) => {
      console.error('Error ejecutando campana en segundo plano:', error);
    });
  }

  return saved;
}

function buildCampaignRecipientMessage(campaign, recipient, tenantName = '') {
  const baseMessage = campaign.sendMode === 'template'
    ? campaign.message || campaign.templateName || ''
    : campaign.message || '';

  return renderMessageTemplate(
    baseMessage,
    {
      nombre: recipient.name,
      cedula: recipient.clientId || '',
      celular: recipient.destination,
      telefono: recipient.destination,
      tipoCliente: recipient.type || '',
    },
    tenantName,
  );
}

async function fetchMetaMediaBuffer({
  mediaId,
  accessToken,
  graphApiVersion = GRAPH_API_VERSION,
}) {
  if (!mediaId || !accessToken) {
    throw new Error('No se pudo descargar el archivo multimedia');
  }

  const metadataResponse = await axios.get(`${GRAPH_BASE_URL}/${graphApiVersion}/${mediaId}`, {
    params: {
      access_token: accessToken,
    },
    timeout: 20000,
  });

  const mediaUrl = metadataResponse.data?.url;
  if (!mediaUrl) {
    throw new Error('No se encontro la URL del archivo multimedia');
  }

  const downloadResponse = await axios.get(mediaUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return {
    buffer: Buffer.from(downloadResponse.data),
    mimeType: metadataResponse.data?.mime_type || 'application/octet-stream',
    fileName: metadataResponse.data?.file_name || `${mediaId}.bin`,
  };
}

async function maybeTranscribeIncomingAudio({
  channel,
  integration,
  audioMediaId = '',
  audioUrl = '',
}) {
  try {
    const accessToken = channelAccessToken(integration, channel);
    const graphVersion = channelGraphVersion(integration, channel);

    let buffer = null;
    let mimeType = 'audio/webm';
    let fileName = 'audio.webm';

    if (audioUrl) {
      const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      buffer = Buffer.from(response.data);
      mimeType = safeString(response.headers['content-type']) || mimeType;
      fileName = `${audioMediaId || 'audio'}.webm`;
    } else if (audioMediaId) {
      const media = await fetchMetaMediaBuffer({
        mediaId: audioMediaId,
        accessToken,
        graphApiVersion: graphVersion,
      });
      buffer = media.buffer;
      mimeType = media.mimeType;
      fileName = media.fileName;
    }

    if (!buffer || !buffer.length) {
      return '';
    }

    const transcription = await transcribeAudioDocument({
      audioBase64: buffer.toString('base64'),
      fileName,
      mimeType,
      language: 'es',
      prompt: 'Transcribe este audio a texto claro en espanol.',
    });

    return safeString(transcription?.text || transcription?.transcription || transcription?.content || '');
  } catch (error) {
    console.error('Error transcribiendo audio entrante de Meta:', error.message);
    return '';
  }
}

function parseMetaWebhookEvents(body = {}) {
  const events = [];
  const objectName = safeString(body.object || '');
  const objectChannel = detectChannelFromObject(objectName);
  const entries = Array.isArray(body.entry) ? body.entry : [];

  for (const entry of entries) {
    const entryId = safeString(entry.id || '');

    if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        const value = change?.value || {};
        const channel = detectChannelFromObject(value.messaging_product || value.object || change.field || objectName) || objectChannel || 'whatsapp';

        if (Array.isArray(value.messages)) {
          value.messages.forEach((message) => {
            const audioAttachment = message?.audio || (Array.isArray(message?.attachments)
              ? message.attachments.find((item) => item?.type === 'audio')
              : null);

            events.push({
              type: 'message',
              channel,
              sourceId: safeString(
                value?.metadata?.phone_number_id ||
                  value?.metadata?.page_id ||
                  value?.metadata?.ig_user_id ||
                  entryId ||
                  '',
              ),
              recipientId: safeString(
                message.from ||
                  message.sender?.id ||
                  value?.contacts?.[0]?.wa_id ||
                  value?.sender?.id ||
                  '',
              ),
              conversationId: buildMetaConversationId({
                channel,
                sourceId: value?.metadata?.phone_number_id || value?.metadata?.page_id || value?.metadata?.ig_user_id || entryId || '',
                recipientId: message.from || message.sender?.id || value?.contacts?.[0]?.wa_id || value?.sender?.id || '',
                fallback: message.id || message.mid || entryId || Date.now(),
              }),
              userName: safeString(
                value?.contacts?.[0]?.profile?.name ||
                  value?.contacts?.[0]?.name ||
                  message?.profile?.name ||
                  value?.sender?.name ||
                  '',
              ),
              messageId: safeString(message.id || message.mid || ''),
              text: safeString(
                message?.text?.body ||
                  message?.text ||
                  message?.button?.text ||
                  message?.interactive?.button_reply?.title ||
                  message?.interactive?.list_reply?.title ||
                  message?.postback?.title ||
                  message?.postback?.payload ||
                  message?.caption ||
                  '',
              ),
              audioMediaId: safeString(
                message?.audio?.id ||
                  audioAttachment?.payload?.id ||
                  audioAttachment?.payload?.attachment_id ||
                  '',
              ),
              audioUrl: safeString(audioAttachment?.payload?.url || ''),
              raw: message,
              rawEntry: entry,
            });
          });
        }

        if (Array.isArray(value.statuses)) {
          value.statuses.forEach((status) => {
            events.push({
              type: 'status',
              channel,
              sourceId: safeString(
                value?.metadata?.phone_number_id ||
                  value?.metadata?.page_id ||
                  value?.metadata?.ig_user_id ||
                  entryId ||
                  '',
              ),
              status: status.status || '',
              raw: status,
              rawEntry: entry,
            });
          });
        }
      }
    }

    if (Array.isArray(entry.messaging)) {
      entry.messaging.forEach((message) => {
        const attachments = Array.isArray(message?.message?.attachments) ? message.message.attachments : [];
        const audioAttachment = attachments.find((item) => item?.type === 'audio');

        events.push({
          type: 'message',
          channel: objectChannel || detectChannelFromObject(entry.messaging_product) || 'facebook',
          sourceId: safeString(entryId || message?.recipient?.id || ''),
          recipientId: safeString(message?.sender?.id || ''),
          conversationId: buildMetaConversationId({
            channel: objectChannel || detectChannelFromObject(entry.messaging_product) || 'facebook',
            sourceId: entryId || message?.recipient?.id || '',
            recipientId: message?.sender?.id || '',
            fallback: message?.mid || entryId || Date.now(),
          }),
          userName: safeString(message?.sender?.name || message?.profile?.name || ''),
          messageId: safeString(message?.mid || ''),
          text: safeString(
            message?.message?.text ||
              message?.message?.quick_reply?.payload ||
              message?.postback?.title ||
              message?.postback?.payload ||
              '',
          ),
          audioMediaId: safeString(
            message?.message?.audio?.id ||
              audioAttachment?.payload?.attachment_id ||
              audioAttachment?.payload?.id ||
              '',
          ),
          audioUrl: safeString(audioAttachment?.payload?.url || ''),
          raw: message,
          rawEntry: entry,
        });
      });
    }
  }

  return events;
}

function buildWebhookSignature(rawBody = '', appSecret = '') {
  if (!rawBody || !appSecret) {
    return '';
  }

  const hash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  return `sha256=${hash}`;
}

function verifyMetaWebhookSignature(rawBody, signatureHeader, appSecrets = []) {
  const header = safeString(signatureHeader);
  if (!header || !rawBody) {
    return true;
  }

  const candidates = Array.from(new Set(appSecrets.map(safeString).filter(Boolean)));
  if (!candidates.length) {
    return true;
  }

  return candidates.some((secret) => buildWebhookSignature(rawBody, secret) === header);
}

async function resolveWebhookIntegration({ body }) {
  const events = parseMetaWebhookEvents(body);
  const identifiers = [];

  events.forEach((event) => {
    identifiers.push(event.sourceId, event.recipientId);
  });

  const found = await findIntegrationForIdentifiers(identifiers);
  if (found) {
    return {
      ...found,
      events,
    };
  }

  const integrations = await MetaIntegration.find({ active: true }).lean();
  if (integrations.length === 1) {
    return {
      integration: integrations[0],
      channel: 'whatsapp',
      events,
    };
  }

  return {
    integration: null,
    channel: 'whatsapp',
    events,
  };
}

async function sendMetaTextMessage({
  integration,
  channel,
  recipientId,
  text,
  replyToId = '',
}) {
  const normalizedChannel = normalizeMetaChannel(channel);
  const senderId = channelSenderId(integration, normalizedChannel);
  const accessToken = channelAccessToken(integration, normalizedChannel);
  const graphVersion = channelGraphVersion(integration, normalizedChannel);

  if (!senderId) {
    throw new Error(`Falta el senderId de ${normalizedChannel}`);
  }

  if (!accessToken) {
    throw new Error(`Falta el access token de ${normalizedChannel}`);
  }

  const url = `${GRAPH_BASE_URL}/${graphVersion}/${senderId}/messages`;
  let payload;

  if (normalizedChannel === 'whatsapp') {
    payload = {
      messaging_product: 'whatsapp',
      to: normalizeRecipientPhone(recipientId),
      type: 'text',
      text: {
        body: safeString(text),
      },
    };

    if (replyToId) {
      payload.context = {
        message_id: replyToId,
      };
    }
  } else {
    payload = {
      messaging_type: 'RESPONSE',
      recipient: {
        id: safeString(recipientId),
      },
      message: {
        text: safeString(text),
      },
    };
  }

  const response = await axios.post(url, payload, {
    params: {
      access_token: accessToken,
    },
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

async function sendMetaTemplateMessage({
  integration,
  channel,
  recipientId,
  templateName,
  templateLanguage = 'es',
  parameters = [],
}) {
  const normalizedChannel = normalizeMetaChannel(channel);

  if (normalizedChannel !== 'whatsapp') {
    return sendMetaTextMessage({
      integration,
      channel: normalizedChannel,
      recipientId,
      text: parameters.join(' ').trim() || templateName,
    });
  }

  const senderId = channelSenderId(integration, normalizedChannel);
  const accessToken = channelAccessToken(integration, normalizedChannel);
  const graphVersion = channelGraphVersion(integration, normalizedChannel);

  if (!senderId) {
    throw new Error('Falta el senderId de WhatsApp');
  }

  if (!accessToken) {
    throw new Error('Falta el access token de WhatsApp');
  }

  const url = `${GRAPH_BASE_URL}/${graphVersion}/${senderId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: normalizeRecipientPhone(recipientId),
    type: 'template',
    template: {
      name: safeString(templateName),
      language: {
        code: safeString(templateLanguage || 'es') || 'es',
      },
    },
  };

  if (Array.isArray(parameters) && parameters.length) {
    payload.template.components = [
      {
        type: 'body',
        parameters: parameters.map((value) => ({
          type: 'text',
          text: safeString(value),
        })),
      },
    ];
  }

  const response = await axios.post(url, payload, {
    params: {
      access_token: accessToken,
    },
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

function buildCampaignStats(campaign) {
  const recipients = Array.isArray(campaign.recipients) ? campaign.recipients : [];
  const sent = recipients.filter((item) => item.status === 'sent').length;
  const failed = recipients.filter((item) => item.status === 'failed').length;
  const skipped = recipients.filter((item) => item.status === 'skipped').length;
  const pending = recipients.filter((item) => item.status === 'pending').length;

  return {
    total: recipients.length,
    sent,
    failed,
    skipped,
    pending,
  };
}

async function sendMetaCampaign({
  campaignId,
  tenantId,
  targetTenantId,
  role = '',
  userId = null,
  userName = '',
  allowDraftSend = false,
}) {
  const cleanCampaignId = safeString(campaignId);
  if (!cleanCampaignId) {
    throw new Error('La campana es obligatoria');
  }

  const campaign = await MetaCampaign.findById(cleanCampaignId);
  if (!campaign) {
    throw new Error('Campana no encontrada');
  }

  const cleanTenantId = isSuperAdminRole(role)
    ? normalizeTenantId(targetTenantId) || campaign.tenantId
    : normalizeTenantId(tenantId) || campaign.tenantId;

  if (cleanTenantId !== campaign.tenantId) {
    throw new Error('No autorizado para esta campana');
  }

  if (!allowDraftSend && campaign.status === 'draft') {
    campaign.status = 'queued';
    await campaign.save();
  }

  if (campaign.status === 'processing') {
    return campaign.toObject();
  }

  const integration = await MetaIntegration.findOne({ tenantId: cleanTenantId }).lean();
  if (!integration) {
    throw new Error('No existe configuracion de Meta para esta oficina');
  }

  if (!channelConfig(integration, campaign.channel).enabled) {
    throw new Error(`El canal ${campaign.channel} no esta habilitado`);
  }

  campaign.status = 'processing';
  campaign.lastRunAt = new Date();
  await campaign.save();

  const tenant = await Tenant.findOne({ tenantId: cleanTenantId }).lean();

  for (let index = 0; index < campaign.recipients.length; index += 1) {
    const recipient = campaign.recipients[index];

    if (!recipient.destination) {
      recipient.status = 'skipped';
      recipient.error = 'Sin numero de destino';
      await campaign.save();
      continue;
    }

    try {
      const renderedMessage = buildCampaignRecipientMessage(campaign.toObject(), recipient, tenant?.nombre || '');
      let providerResponse = null;

      if (campaign.sendMode === 'template') {
        providerResponse = await sendMetaTemplateMessage({
          integration,
          channel: campaign.channel,
          recipientId: recipient.destination,
          templateName: campaign.templateName,
          templateLanguage: campaign.templateLanguage,
          parameters: renderedMessage ? [renderedMessage] : [],
        });
      } else {
        providerResponse = await sendMetaTextMessage({
          integration,
          channel: campaign.channel,
          recipientId: recipient.destination,
          text: renderedMessage,
        });
      }

      recipient.status = 'sent';
      recipient.error = '';
      recipient.sentAt = new Date();
      recipient.providerMessageId = providerResponse?.messages?.[0]?.id || providerResponse?.message_id || providerResponse?.recipient_id || '';
      recipient.renderedMessage = renderedMessage;
    } catch (error) {
      recipient.status = 'failed';
      recipient.error = error.message || 'Error enviando mensaje';
    }

    campaign.totals = {
      ...campaign.totals,
      ...buildCampaignStats(campaign),
    };
    await campaign.save();

    if (DEFAULT_BROADCAST_DELAY_MS > 0) {
      await delay(DEFAULT_BROADCAST_DELAY_MS);
    }
  }

  campaign.totals = {
    ...campaign.totals,
    ...buildCampaignStats(campaign),
  };
  campaign.status = campaign.totals.failed > 0
    ? (campaign.totals.sent > 0 ? 'partial' : 'failed')
    : 'completed';
  campaign.lastRunAt = new Date();
  campaign.metadata = {
    ...campaign.metadata,
    lastRunBy: {
      userId: userId ? String(userId) : null,
      userName: safeString(userName || ''),
    },
  };

  await campaign.save();
  return campaign.toObject();
}

function buildCampaignRecipientMessage(campaign, recipient, tenantName = '') {
  const baseMessage = campaign.sendMode === 'template'
    ? campaign.message || campaign.templateName || ''
    : campaign.message || '';

  return renderMessageTemplate(
    baseMessage,
    {
      nombre: recipient.name,
      cedula: recipient.clientId || '',
      celular: recipient.destination,
      telefono: recipient.destination,
      tipoCliente: recipient.type || '',
    },
    tenantName,
  );
}

async function processMetaInboundEvent({
  event,
  app,
  webhookContext = {},
}) {
  if (!event || event.type === 'status') {
    return { handled: false };
  }

  const sourceLookup = await findIntegrationForIdentifiers([event.sourceId, event.recipientId]);
  const integration = sourceLookup?.integration || await MetaIntegration.findOne({ active: true }).lean();
  const channel = normalizeMetaChannel(sourceLookup?.channel || event.channel || 'whatsapp');

  if (!integration) {
    return { handled: false, reason: 'No integration' };
  }

  const tenantId = normalizeTenantId(integration.tenantId);
  if (!tenantId) {
    return { handled: false, reason: 'No tenant' };
  }

  let messageText = safeString(event.text || '');
  if (!messageText && (event.audioMediaId || event.audioUrl)) {
    messageText = await maybeTranscribeIncomingAudio({
      channel,
      integration,
      audioMediaId: event.audioMediaId,
      audioUrl: event.audioUrl,
    });
  }

  if (!messageText) {
    messageText = safeString(channelConfig(integration, channel)?.fallbackMessage || 'No pude leer tu mensaje, por favor escribelo nuevamente.');
  }

  const conversationId = safeString(event.conversationId || `${channel}:${event.recipientId || event.sourceId || Date.now()}`);
  const reply = await answerRagQuestion({
    question: messageText,
    tenantId,
    targetTenantId: null,
    role: 'admin',
    userId: event.recipientId || event.sourceId || null,
    userName: event.userName || '',
    conversationId,
    channel,
    manualContext: safeString(webhookContext.manualContext || ''),
  });

  const payload = {
    tenantId,
    conversationId: reply.conversationId,
    channel,
    userName: event.userName || '',
    question: messageText,
    updatedAt: new Date().toISOString(),
  };

  try {
    const io = app?.get?.('io');
    if (io) {
      io.to(`tenant-${String(tenantId).toLowerCase()}`).emit('rag:conversation-updated', payload);
      io.to('superadmin-room').emit('rag:conversation-updated', payload);
    }
  } catch (error) {
    console.error('Error emitiendo evento Meta:', error.message);
  }

  if (shouldAutoReply(integration, channel)) {
    await sendMetaTextMessage({
      integration,
      channel,
      recipientId: event.recipientId || event.sourceId || '',
      text: reply.answer,
      replyToId: event.messageId || '',
    });
  }

  return {
    handled: true,
    tenantId,
    channel,
    conversationId: reply.conversationId,
    reply,
  };
}

async function verifyMetaWebhookChallenge({ verifyToken, challenge, mode }) {
  if (String(mode || '') !== 'subscribe') {
    return null;
  }

  const incomingToken = safeString(verifyToken);
  if (!incomingToken) {
    return null;
  }

  if (DEFAULT_VERIFY_TOKEN && incomingToken === DEFAULT_VERIFY_TOKEN) {
    return safeString(challenge);
  }

  const integration = await MetaIntegration.findOne({
    $or: [
      { webhookVerifyToken: incomingToken },
      { 'channels.whatsapp.verifyToken': incomingToken },
      { 'channels.instagram.verifyToken': incomingToken },
      { 'channels.facebook.verifyToken': incomingToken },
    ],
  }).lean();

  if (!integration) {
    return null;
  }

  return safeString(challenge);
}

async function handleMetaWebhook({
  body = {},
  rawBody = '',
  signatureHeader = '',
  app = null,
}) {
  const { integration, events } = await resolveWebhookIntegration({ body });
  const channel = integration ? matchingChannelForIntegration(integration, events.map((event) => event.sourceId).concat(events.map((event) => event.recipientId))) || 'whatsapp' : 'whatsapp';
  const appSecrets = [
    DEFAULT_APP_SECRET,
    integration?.webhookAppSecret || '',
    channelAppSecret(integration || {}, channel),
    channelConfig(integration || {}, channel)?.appSecret || '',
  ].filter(Boolean);

  if (!verifyMetaWebhookSignature(rawBody, signatureHeader, appSecrets)) {
    return {
      ok: false,
      error: 'Invalid webhook signature',
      events: [],
    };
  }

  const results = [];
  for (const event of events) {
    try {
      const result = await processMetaInboundEvent({
        event,
        app,
        webhookContext: {
          channelHint: channel,
        },
      });
      results.push(result);
    } catch (error) {
      console.error('Error procesando evento Meta:', error);
      results.push({
        handled: false,
        error: error.message || 'Error procesando evento',
      });
    }
  }

  return {
    ok: true,
    events: results,
  };
}

module.exports = {
  getIntegrationForTenant,
  upsertIntegrationConfig,
  listMetaCampaigns,
  getMetaCampaign,
  previewMetaCampaign,
  createMetaCampaign,
  sendMetaCampaign,
  sendMetaTextMessage,
  verifyMetaWebhookChallenge,
  handleMetaWebhook,
  normalizeRecipientPhone,
  sanitizeIntegrationConfig,
  sanitizeChannelConfig,
  normalizeMetaChannel,
  ensureMetaWorkspaceForTenant,
  bootstrapMetaWorkspaces,
};
