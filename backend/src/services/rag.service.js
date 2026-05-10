const crypto = require('crypto');
const mongoose = require('mongoose');
const OpenAI = require('openai');
const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const { createCanvas } = require('@napi-rs/canvas');

const Cliente = require('../models/Cliente');
const Prestamo = require('../models/Prestamo');
const Pago = require('../models/Pago');
const Tenant = require('../models/Tenant');
const Sede = require('../models/Sede');
const RagItem = require('../models/RagItem');
const KnowledgeDocument = require('../models/KnowledgeDocument');
const KnowledgeChunk = require('../models/KnowledgeChunk');

const CHAT_MODEL = process.env.RAG_CHAT_MODEL || process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';
const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const TRANSCRIPTION_MODEL = process.env.RAG_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';
const SPEECH_MODEL = process.env.RAG_TTS_MODEL || 'gpt-4o-mini-tts';
const SPEECH_VOICE = process.env.RAG_TTS_VOICE || 'nova';
const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
const openai = hasOpenAI
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

let pdfjsModulePromise = null;

const STOP_WORDS = new Set([
  'a',
  'al',
  'algo',
  'algun',
  'alguna',
  'algunas',
  'alguno',
  'algunos',
  'ante',
  'antes',
  'con',
  'como',
  'contra',
  'de',
  'del',
  'desde',
  'donde',
  'e',
  'el',
  'ella',
  'ellas',
  'ellos',
  'en',
  'entre',
  'es',
  'esa',
  'esas',
  'ese',
  'eso',
  'esta',
  'estas',
  'este',
  'esto',
  'la',
  'las',
  'le',
  'les',
  'lo',
  'los',
  'para',
  'por',
  'que',
  'quien',
  'quienes',
  'sin',
  'sobre',
  'su',
  'sus',
  'tambien',
  'tan',
  'te',
  'tiene',
  'tienen',
  'tu',
  'un',
  'una',
  'uno',
  'unos',
  'y',
]);

const MAX_MEMORY_CANDIDATES = 250;
const MAX_KNOWLEDGE_CANDIDATES = 300;
const MAX_CONTEXT_CHARS = 12000;
const MAX_SECTION_CHARS = 1800;
const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_SIZE_BYTES = MAX_PDF_SIZE_BYTES;
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;
const PDF_TEXT_THRESHOLD = Math.max(40, Number(process.env.RAG_PDF_TEXT_THRESHOLD || 120));
const PDF_OCR_PAGE_LIMIT = Math.max(1, Math.min(50, Number(process.env.RAG_PDF_OCR_PAGE_LIMIT || 12)));
const PDF_OCR_RENDER_SCALE = Math.max(1, Number(process.env.RAG_PDF_OCR_RENDER_SCALE || 1.75));
const CLIENT_VECTOR_INDEX = String(
  process.env.RAG_CLIENT_VECTOR_INDEX ||
    process.env.RAG_VECTOR_CLIENT_INDEX ||
    process.env.ATLAS_VECTOR_CLIENT_INDEX ||
    'vector_clientes',
).trim() || 'vector_clientes';
const MEMORY_VECTOR_INDEX = String(
  process.env.RAG_MEMORY_VECTOR_INDEX ||
    process.env.RAG_VECTOR_MEMORY_INDEX ||
    process.env.ATLAS_VECTOR_MEMORY_INDEX ||
    'vector_ragitems',
).trim() || 'vector_ragitems';
const KNOWLEDGE_VECTOR_INDEX = String(
  process.env.RAG_KNOWLEDGE_VECTOR_INDEX ||
    process.env.RAG_VECTOR_KNOWLEDGE_INDEX ||
    process.env.ATLAS_VECTOR_KNOWLEDGE_INDEX ||
    'vector_ragitems',
).trim() || 'vector_ragitems';
const VECTOR_NUM_CANDIDATES = Math.max(20, Number(process.env.RAG_VECTOR_NUM_CANDIDATES || 100));
const OFFICE_CONTACT_FALLBACKS = {
  oficina_norte_jd8: ['3187092130', '3009013672'],
};

function flattenTextValue(value, seen = new WeakSet()) {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim().replace(/^\[object Object\]\s*/i, '');
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value).trim();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => flattenTextValue(entry, seen))
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return '';
    }

    seen.add(value);

    const preferredKeys = [
      'text',
      'content',
      'message',
      'answer',
      'respuesta',
      'summary',
      'title',
      'name',
      'label',
      'value',
      'question',
      'prompt',
      'body',
      'preview',
      'description',
      'detail',
      'contentText',
      'originalText',
    ];

    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const extracted = flattenTextValue(value[key], seen);
        if (extracted) {
          return extracted;
        }
      }
    }

    const parts = [];
    for (const nestedValue of Object.values(value)) {
      const extracted = flattenTextValue(nestedValue, seen);
      if (extracted) {
        parts.push(extracted);
      }
    }

    const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (joined) {
      return joined;
    }

    try {
      const serialized = JSON.stringify(value);
      if (serialized && serialized !== '{}') {
        return serialized.trim();
      }
    } catch (error) {
      // Ignore circular or non-serializable payloads.
    }

    return '';
  }

  return String(value).trim();
}

function safeString(value) {
  return flattenTextValue(value);
}

function toObjectId(value) {
  const clean = safeString(value);
  if (!clean || !mongoose.Types.ObjectId.isValid(clean)) {
    return null;
  }

  return new mongoose.Types.ObjectId(clean);
}

function normalizeChannel(value = '') {
  const normalized = normalizeText(value).replace(/\s+/g, '');

  const aliases = {
    wa: 'whatsapp',
    whatsapp: 'whatsapp',
    ig: 'instagram',
    instagram: 'instagram',
    fb: 'facebook',
    facebook: 'facebook',
    messenger: 'messenger',
    telegram: 'telegram',
    tg: 'telegram',
    web: 'web',
    website: 'web',
    portal: 'web',
    email: 'email',
    correo: 'email',
    sms: 'sms',
    text: 'sms',
  };

  return aliases[normalized] || safeString(value).toLowerCase() || 'web';
}

function normalizeText(value) {
  return safeString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value, limit = MAX_SECTION_CHARS) {
  const text = safeString(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 3)).trimEnd()}...`;
}

function buildKnowledgeTenantFilter(resolvedTenantId = null) {
  if (resolvedTenantId) {
    return {
      $or: [
        { tenantId: resolvedTenantId },
        { tenantId: null },
      ],
    };
  }

  return { tenantId: null };
}

function buildKnowledgeViewKey(item = {}) {
  return `${String(item.tenantId || 'global').toLowerCase()}:${String(item.sourceId || item.contentHash || item._id || '').toLowerCase()}`;
}

function buildKnowledgeDocumentView(item = {}, fallback = {}) {
  const sourceType = safeString(item.sourceType || item.metadata?.sourceType || item.source || fallback.sourceType || 'knowledge');
  const fileName = safeString(item.fileName || item.metadata?.fileName || fallback.fileName || item.metadata?.originalTitle || item.originalTitle || item.title || fallback.title || 'Documento');
  const originalTitle = safeString(item.originalTitle || item.metadata?.originalTitle || fallback.originalTitle || fileName || 'Documento');
  const title = safeString(item.title || fallback.title || fileName || originalTitle || 'Documento');
  const createdAt = item.createdAt || fallback.createdAt || null;
  const updatedAt = item.updatedAt || fallback.updatedAt || createdAt || null;

  return {
    sourceId: safeString(item.sourceId || fallback.sourceId || item.contentHash || item._id || ''),
    tenantId: item.tenantId ?? fallback.tenantId ?? null,
    title,
    fileName,
    originalTitle,
    sourceType,
    mimeType: safeString(item.mimeType || item.metadata?.mimeType || fallback.mimeType || '') || '',
    pageCount: item.pageCount ?? item.metadata?.pageCount ?? fallback.pageCount ?? null,
    uploadedBy: safeString(item.uploadedBy || item.userName || fallback.uploadedBy || item.metadata?.uploadedBy || ''),
    uploadedById: item.uploadedById || item.userId || fallback.uploadedById || null,
    createdAt: createdAt ? new Date(createdAt).toISOString() : null,
    updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
    chunkCount: Math.max(
      Number(item.chunkCount ?? item.metadata?.totalChunks ?? 0),
      Number(fallback.chunkCount ?? fallback.totalChunks ?? 0),
    ),
    preview: truncateText(
      item.preview || fallback.preview || item.summary || item.content || fallback.summary || fallback.content || '',
      260,
    ),
    isActive: item.isActive !== undefined ? Boolean(item.isActive) : (fallback.isActive !== undefined ? Boolean(fallback.isActive) : true),
    storage: item.storage || fallback.storage || {
      documentCollection: 'knowledge_documents',
      chunkCollection: 'knowledge_chunks',
      runtimeCollection: 'ragitems',
    },
  };
}

async function persistKnowledgeVisibilityArtifacts({
  resolvedTenantId,
  sourceId,
  sourceType,
  mimeType = '',
  fileName = '',
  title = '',
  originalTitle = '',
  extractedText = '',
  pageCount = null,
  userId = null,
  userName = '',
  extraMetadata = {},
  chunkRecords = [],
}) {
  const documentTitle = safeString(title) || safeString(originalTitle) || safeString(fileName).replace(/\.[^.]+$/, '') || 'Documento';
  const storage = {
    documentCollection: 'knowledge_documents',
    chunkCollection: 'knowledge_chunks',
    runtimeCollection: 'ragitems',
  };
  const documentQuery = {
    tenantId: resolvedTenantId || null,
    sourceId,
  };
  const documentPayload = {
    tenantId: resolvedTenantId || null,
    sourceId,
    title: documentTitle,
    fileName: safeString(fileName) || documentTitle,
    originalTitle: safeString(originalTitle) || documentTitle,
    sourceType: safeString(sourceType) || 'document',
    mimeType: safeString(mimeType) || '',
    pageCount,
    chunkCount: chunkRecords.length,
    preview: truncateText(extractedText || '', 900),
    uploadedBy: safeString(userName || ''),
    uploadedById: userId ? String(userId) : null,
    isActive: true,
    metadata: {
      sourceType: safeString(sourceType) || 'document',
      fileName: safeString(fileName) || documentTitle,
      originalTitle: safeString(originalTitle) || documentTitle,
      mimeType: safeString(mimeType) || '',
      pageCount,
      totalChunks: chunkRecords.length,
      uploadedAt: new Date().toISOString(),
      uploadedBy: safeString(userName || ''),
      storage,
      ...extraMetadata,
    },
    lastIndexedAt: new Date(),
  };

  const documentWrite = KnowledgeDocument.findOneAndUpdate(
    documentQuery,
    {
      $set: {
        title: documentPayload.title,
        fileName: documentPayload.fileName,
        originalTitle: documentPayload.originalTitle,
        sourceType: documentPayload.sourceType,
        mimeType: documentPayload.mimeType,
        pageCount: documentPayload.pageCount,
        chunkCount: documentPayload.chunkCount,
        preview: documentPayload.preview,
        uploadedBy: documentPayload.uploadedBy,
        uploadedById: documentPayload.uploadedById,
        isActive: documentPayload.isActive,
        metadata: documentPayload.metadata,
        lastIndexedAt: documentPayload.lastIndexedAt,
      },
      $setOnInsert: {
        tenantId: resolvedTenantId || null,
        sourceId,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )
    .lean()
    .catch((error) => {
      console.warn('No se pudo persistir knowledge_documents:', error.message || error);
      return null;
    });

  const chunkWrites = chunkRecords.map((record) => KnowledgeChunk.findOneAndUpdate(
    {
      tenantId: record.tenantId ?? resolvedTenantId ?? null,
      sourceId: record.sourceId || sourceId,
      chunkIndex: Number(record.chunkIndex || 0),
    },
    {
      $set: {
        title: record.title,
        content: record.content,
        summary: record.summary,
        sourceType: safeString(record.sourceType || sourceType) || 'document',
        fileName: record.fileName,
        originalTitle: record.originalTitle,
        mimeType: record.mimeType,
        pageCount: record.pageCount,
        embedding: record.embedding,
        contentHash: record.contentHash,
        importance: record.importance,
        uploadedBy: record.uploadedBy,
        uploadedById: record.uploadedById,
        metadata: record.metadata,
        isActive: record.isActive,
      },
      $setOnInsert: {
        tenantId: record.tenantId ?? resolvedTenantId ?? null,
        sourceId: record.sourceId || sourceId,
        chunkIndex: Number(record.chunkIndex || 0),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  )
    .lean()
    .catch((error) => {
      console.warn(`No se pudo persistir knowledge_chunks ${sourceId}#${record.chunkIndex}:`, error.message || error);
      return null;
    }));

  await Promise.allSettled([documentWrite, ...chunkWrites]);

  return documentPayload;
}

async function syncKnowledgeVisibilityFromRagItems({
  resolvedTenantId,
  sourceId,
}) {
  const sourceIdSafe = safeString(sourceId);
  if (!sourceIdSafe) {
    return null;
  }

  const ragItems = await RagItem.find({
    kind: 'knowledge',
    sourceId: sourceIdSafe,
    ...(resolvedTenantId ? { tenantId: resolvedTenantId } : { tenantId: null }),
    isActive: true,
  })
    .sort({ createdAt: 1, updatedAt: 1 })
    .lean();

  if (!ragItems.length) {
    return null;
  }

  const primary = ragItems[0];
  const view = buildKnowledgeDocumentView(primary, {
    sourceId: sourceIdSafe,
    tenantId: resolvedTenantId || null,
    title: primary.title || primary.metadata?.fileName || 'Documento',
    fileName: primary.metadata?.fileName || primary.metadata?.originalTitle || primary.title || 'Documento',
    originalTitle: primary.metadata?.originalTitle || primary.title || 'Documento',
    sourceType: primary.metadata?.sourceType || primary.source || 'knowledge',
    mimeType: primary.metadata?.mimeType || '',
    pageCount: primary.metadata?.pageCount || null,
    uploadedBy: primary.userName || '',
    uploadedById: primary.userId || null,
    createdAt: primary.createdAt || null,
    updatedAt: primary.updatedAt || null,
    chunkCount: ragItems.length,
    preview: primary.summary || primary.content || '',
    storage: {
      documentCollection: 'knowledge_documents',
      chunkCollection: 'knowledge_chunks',
      runtimeCollection: 'ragitems',
    },
  });

  const chunkRecords = ragItems.map((item, index) => ({
    tenantId: item.tenantId ?? resolvedTenantId ?? null,
    sourceId: item.sourceId || sourceIdSafe,
    chunkIndex: Number(item.metadata?.chunkIndex ?? index),
    title: item.title || view.title,
    content: item.content || item.summary || '',
    summary: item.summary || item.content || '',
    sourceType: item.metadata?.sourceType || item.source || view.sourceType || 'knowledge',
    fileName: item.metadata?.fileName || item.metadata?.originalTitle || view.fileName,
    originalTitle: item.metadata?.originalTitle || view.originalTitle,
    mimeType: item.metadata?.mimeType || view.mimeType || '',
    pageCount: item.metadata?.pageCount || view.pageCount || null,
    embedding: item.embedding || undefined,
    contentHash: item.contentHash || '',
    importance: item.importance ?? 0.5,
    uploadedBy: item.userName || view.uploadedBy || '',
    uploadedById: item.userId || view.uploadedById || null,
    metadata: item.metadata || {},
    isActive: item.isActive !== false,
  }));

  await persistKnowledgeVisibilityArtifacts({
    resolvedTenantId,
    sourceId: sourceIdSafe,
    sourceType: view.sourceType,
    mimeType: view.mimeType,
    fileName: view.fileName,
    title: view.title,
    originalTitle: view.originalTitle,
    extractedText: view.preview || '',
    pageCount: view.pageCount,
    userId: view.uploadedById,
    userName: view.uploadedBy,
    extraMetadata: {
      syncedFrom: 'ragitems',
      sourceCount: ragItems.length,
      storage: view.storage,
    },
    chunkRecords,
  });

  return view;
}

function escapeRegex(value) {
  return safeString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractTokens(question) {
  return normalizeText(question)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function isNumericToken(token) {
  return /^\d{4,}$/.test(token);
}

function toNumber(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value) {
  return `$${toNumber(value).toLocaleString('es-CO')}`;
}

function formatDate(value) {
  if (!value) return 'sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sin fecha';
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function extractContactNumbers(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((entry) => safeString(entry))
    .flatMap((entry) => entry.split(/[\n,;/|]+/g))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatOfficeContacts(numbers = []) {
  const uniqueNumbers = Array.from(
    new Set(
      numbers
        .map((value) => safeString(value).replace(/\s+/g, ' '))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  if (!uniqueNumbers.length) {
    return '';
  }

  return uniqueNumbers.join(' / ');
}

function daysBetween(start, end = new Date()) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)));
}

function calculateBalance(loan) {
  return Math.max(0, toNumber(loan.totalAPagar) - toNumber(loan.totalPagado));
}

function calculateOverdueDays(loan) {
  if (!loan?.fechaVencimiento) return 0;
  return daysBetween(loan.fechaVencimiento, new Date());
}

function cosineSimilarity(a = [], b = []) {
  if (!Array.isArray(a) || !Array.isArray(b) || !a.length || !b.length) {
    return 0;
  }

  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function runAtlasVectorSearch({
  model,
  index,
  queryVector,
  filter = {},
  path = 'embedding',
  limit = 10,
  numCandidates = VECTOR_NUM_CANDIDATES,
}) {
  if (!model || !index || !Array.isArray(queryVector) || !queryVector.length) {
    return null;
  }

  try {
    const pipeline = [
      {
        $vectorSearch: {
          index,
          path,
          queryVector,
          numCandidates,
          limit,
          filter,
        },
      },
      {
        $addFields: {
          vectorScore: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    return await model.aggregate(pipeline).allowDiskUse(true);
  } catch (error) {
    const message = String(error?.message || error || '');
    if (/vectorSearch|search index|not found|unknown pipeline stage/i.test(message)) {
      console.warn(`Atlas vector search no disponible en ${index}: ${message}`);
    }
    return null;
  }
}

function lexicalScore(question, content) {
  const tokens = extractTokens(question);
  if (!tokens.length) return 0;

  const normalizedContent = normalizeText(content);
  let score = 0;

  for (const token of tokens) {
    if (normalizedContent.includes(token)) {
      score += 1 / tokens.length;
    }
  }

  if (normalizedContent.includes(normalizeText(question))) {
    score += 0.35;
  }

  return Math.min(1, score);
}

function buildSource({ id, title, type, snippet, score = 0, importance = 0 }) {
  return {
    id,
    title,
    type,
    snippet: truncateText(snippet, 420),
    score,
    importance,
  };
}

function stripBase64DataUrlPrefix(value) {
  const raw = safeString(value);
  return raw.replace(/^data:[^;]+;base64,/i, '');
}

function decodeBase64Buffer(base64Data, maxBytes = MAX_UPLOAD_SIZE_BYTES) {
  const cleaned = stripBase64DataUrlPrefix(base64Data).replace(/\s+/g, '');
  if (!cleaned) {
    throw new Error('El archivo no contiene datos válidos');
  }

  const buffer = Buffer.from(cleaned, 'base64');
  if (!buffer.length) {
    throw new Error('No se pudo leer el archivo');
  }

  if (buffer.length > maxBytes) {
    throw new Error('El archivo supera el tamaño máximo permitido de 20 MB');
  }

  return buffer;
}

function decodePdfBuffer(base64Data) {
  const buffer = decodeBase64Buffer(base64Data, MAX_PDF_SIZE_BYTES);
  const signature = buffer.subarray(0, 4).toString('latin1');
  if (signature !== '%PDF') {
    throw new Error('El archivo cargado no parece ser un PDF válido');
  }
  return buffer;
}

function getFileExtension(fileName = '') {
  const safeName = safeString(fileName).toLowerCase();
  const match = safeName.match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function inferAudioFileName(fileName = '', mimeType = '') {
  const safeName = safeString(fileName);
  if (safeName && getFileExtension(safeName)) {
    return safeName;
  }

  const normalizedMime = safeString(mimeType).toLowerCase();
  const mimeToExtension = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
  };

  const extension = mimeToExtension[normalizedMime] || 'webm';
  return `audio.${extension}`;
}

function numberToColombianMoneySpeech(value = '') {
  const digits = safeString(value).replace(/[^\d]/g, '').replace(/^0+/, '') || '0';
  const number = Number(digits);

  if (!Number.isFinite(number)) {
    return safeString(value);
  }

  if (number === 0) {
    return 'cero';
  }

  const millions = Math.floor(number / 1000000);
  const thousands = Math.floor((number % 1000000) / 1000);
  const units = number % 1000;
  const parts = [];

  if (millions) {
    parts.push(millions === 1 ? '1 millón' : `${millions} millones`);
  }

  if (thousands) {
    parts.push(thousands === 1 ? '1 mil' : `${thousands} mil`);
  }

  if (units) {
    parts.push(String(units));
  }

  return parts.join(' ');
}

function normalizeSpeechText(text = '') {
  const cleanText = safeString(text);
  if (!cleanText) {
    return '';
  }

  const withSeparatedMoney = cleanText.replace(
    /(\$|COP)?\s*(\d{1,3}(?:[.,\s]\d{3})+)(?:\s*(?:pesos?|COP|cop))?/gi,
    (match, currencyPrefix, amount) => {
      const spokenAmount = numberToColombianMoneySpeech(amount);
      if (!spokenAmount) {
        return match;
      }

      const hasMoneyLabel = Boolean(currencyPrefix) || /pesos?|cop/i.test(match);
      return hasMoneyLabel ? `${spokenAmount} pesos` : spokenAmount;
    },
  );

  const withPlainMoney = withSeparatedMoney.replace(
    /(\$|COP)\s*(\d{4,})|(\d{4,})\s*(?:pesos?|COP|cop)/gi,
    (match, currencyPrefix, amountWithPrefix, amountWithSuffix) => {
      const amount = amountWithPrefix || amountWithSuffix || '';
      const spokenAmount = numberToColombianMoneySpeech(amount);
      if (!spokenAmount) {
        return match;
      }

      return `${spokenAmount} pesos`;
    },
  );

  return withPlainMoney.replace(/\s+/g, ' ').trim();
}

function parseConversationTurn(content = '') {
  const text = safeString(content);
  if (!text) {
    return {
      question: '',
      answer: '',
    };
  }

  const match = text.match(/Pregunta:\s*([\s\S]*?)(?:\nRespuesta:\s*([\s\S]*))?$/i);
  if (match) {
    return {
      question: safeString(match[1]),
      answer: safeString(match[2]),
    };
  }

  const answerMatch = text.match(/Respuesta:\s*([\s\S]*)$/i);
  if (answerMatch) {
    return {
      question: '',
      answer: safeString(answerMatch[1]),
    };
  }

  return {
    question: text,
    answer: '',
  };
}

function normalizeMeaningfulTenantId(value = '') {
  const normalized = safeString(value).trim().toLowerCase();
  if (!normalized) {
    return '';
  }

  if (['system', 'global', 'null', 'undefined'].includes(normalized)) {
    return '';
  }

  return normalized;
}

function resolveConversationTenantId({ tenantId, targetTenantId, role }) {
  if (role === 'superadmin' || role === 'superadministrador') {
    return normalizeMeaningfulTenantId(targetTenantId) || null;
  }

  return normalizeMeaningfulTenantId(tenantId) || null;
}

function isImageMimeType(mimeType = '', fileName = '') {
  const normalized = safeString(mimeType).toLowerCase();
  const ext = getFileExtension(fileName);
  return (
    normalized.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'tif', 'tiff'].includes(ext)
  );
}

function isWordMimeType(mimeType = '', fileName = '') {
  const normalized = safeString(mimeType).toLowerCase();
  const ext = getFileExtension(fileName);
  return (
    normalized === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    normalized === 'application/msword' ||
    ext === 'docx' ||
    ext === 'doc'
  );
}

function isTextMimeType(mimeType = '', fileName = '') {
  const normalized = safeString(mimeType).toLowerCase();
  const ext = getFileExtension(fileName);
  return (
    normalized.startsWith('text/') ||
    ext === 'txt' ||
    ext === 'md' ||
    ext === 'csv'
  );
}

function detectKnowledgeSourceType({ mimeType = '', fileName = '', rawText = '' }) {
  if (safeString(rawText)) {
    return 'text';
  }

  if (safeString(mimeType).toLowerCase() === 'application/pdf' || getFileExtension(fileName) === 'pdf') {
    return 'pdf';
  }

  if (isWordMimeType(mimeType, fileName)) {
    return 'word';
  }

  if (isImageMimeType(mimeType, fileName)) {
    return 'image';
  }

  if (isTextMimeType(mimeType, fileName)) {
    return 'text';
  }

  return 'unknown';
}

function splitTextIntoChunks(text, maxChars = 1600, overlapChars = 220) {
  const normalized = safeString(text)
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) {
    return [];
  }

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + maxChars, normalized.length);

    if (end < normalized.length) {
      const paragraphBoundary = normalized.lastIndexOf('\n\n', end);
      if (paragraphBoundary > start + Math.floor(maxChars * 0.6)) {
        end = paragraphBoundary;
      } else {
        const sentenceBoundary = normalized.lastIndexOf('. ', end);
        if (sentenceBoundary > start + Math.floor(maxChars * 0.6)) {
          end = sentenceBoundary + 1;
        } else {
          const spaceBoundary = normalized.lastIndexOf(' ', end);
          if (spaceBoundary > start + Math.floor(maxChars * 0.6)) {
            end = spaceBoundary;
          }
        }
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(0, end - overlapChars);
    while (start < normalized.length && /\s/.test(normalized[start])) {
      start += 1;
    }
  }

  return chunks;
}

function resolveKnowledgeTenantId({ tenantId, targetTenantId, role }) {
  if (role === 'superadmin' || role === 'superadministrador') {
    const requested = normalizeMeaningfulTenantId(targetTenantId);
    return requested || null;
  }

  return normalizeMeaningfulTenantId(tenantId) || null;
}

async function extractTextFromImageBuffer({ buffer, mimeType = 'image/png', fileName = '' }) {
  if (!openai) {
    throw new Error('Para extraer texto de imágenes necesitas configurar OPENAI_API_KEY');
  }

  const base64 = buffer.toString('base64');
  const dataUrl = `data:${safeString(mimeType) || 'image/png'};base64,${base64}`;
  const filenameHint = safeString(fileName) ? `Nombre del archivo: ${fileName}.` : '';

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: [
          'Eres un extractor profesional de texto desde imagen.',
          'Devuelve solo el texto visible, sin explicaciones.',
          'Conserva saltos de linea, tablas y listas de forma legible.',
          'Si hay texto parcialmente ilegible, marca [ilegible].',
        ].join(' '),
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extrae el texto visible de esta imagen. ${filenameHint}`.trim(),
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
            },
          },
        ],
      },
    ],
  });

  return safeString(completion.choices?.[0]?.message?.content || '');
}

async function loadPdfJsModule() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import('pdfjs-dist/build/pdf.mjs');
  }

  return pdfjsModulePromise;
}

function createPdfCanvasFactory() {
  return {
    create(width, height) {
      const canvas = createCanvas(Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
      return {
        canvas,
        context: canvas.getContext('2d'),
      };
    },
    reset(canvasAndContext, width, height) {
      canvasAndContext.canvas.width = Math.max(1, Math.ceil(width));
      canvasAndContext.canvas.height = Math.max(1, Math.ceil(height));
    },
    destroy(canvasAndContext) {
      if (canvasAndContext?.canvas) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
      }
      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    },
  };
}

function extractPagePlainText(textContent) {
  if (!textContent?.items?.length) return '';

  return safeString(
    textContent.items
      .map((item) => (typeof item?.str === 'string' ? item.str : ''))
      .join(' '),
  ).replace(/\s+/g, ' ').trim();
}

async function renderPdfPageToBuffer(page, scale = PDF_OCR_RENDER_SCALE) {
  const viewport = page.getViewport({ scale });
  const factory = createPdfCanvasFactory();
  const canvasAndContext = factory.create(viewport.width, viewport.height);
  const { canvas, context } = canvasAndContext;

  try {
    const renderTask = page.render({
      canvasContext: context,
      viewport,
      canvasFactory: factory,
    });

    await renderTask.promise;

    return canvas.toBuffer('image/png');
  } finally {
    factory.destroy(canvasAndContext);
  }
}

async function extractPdfTextWithOcr({ buffer, fileName = '', mimeType = 'application/pdf' }) {
  const pdfjsLib = await loadPdfJsModule();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    stopAtErrors: false,
    maxImageSize: -1,
  });

  const pdf = await loadingTask.promise;
  const extractedSections = [];
  const textPages = [];
  const ocrPages = [];
  const cleanName = safeString(fileName).replace(/\.[^.]+$/, '') || 'documento';

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      let pageText = '';

      try {
        const textContent = await page.getTextContent({ disableNormalization: false });
        pageText = extractPagePlainText(textContent);
      } catch (error) {
        pageText = '';
      }

      if (pageText.length >= PDF_TEXT_THRESHOLD) {
        extractedSections.push(`--- Página ${pageNumber} ---\n${pageText}`);
        textPages.push(pageNumber);
        continue;
      }

      if (pageNumber <= PDF_OCR_PAGE_LIMIT) {
        try {
          const pageBuffer = await renderPdfPageToBuffer(page);
          const ocrText = await extractTextFromImageBuffer({
            buffer: pageBuffer,
            mimeType: 'image/png',
            fileName: `${cleanName}-pagina-${pageNumber}.png`,
          });
          const cleanOcr = safeString(ocrText);
          if (cleanOcr) {
            extractedSections.push(`--- Página ${pageNumber} (OCR) ---\n${cleanOcr}`);
            ocrPages.push(pageNumber);
            continue;
          }
        } catch (error) {
          if (pageText) {
            extractedSections.push(`--- Página ${pageNumber} ---\n${pageText}`);
            textPages.push(pageNumber);
          }
          continue;
        }
      }

      if (pageText) {
        extractedSections.push(`--- Página ${pageNumber} ---\n${pageText}`);
        textPages.push(pageNumber);
      }
    }
  } finally {
    if (typeof pdf.destroy === 'function') {
      await pdf.destroy().catch(() => null);
    }
  }

  return {
    text: extractedSections.join('\n\n').trim(),
    pageCount: pdf.numPages,
    textPages,
    ocrPages,
    mimeType,
  };
}

async function transcribeAudioBuffer({
  audioBase64 = '',
  mimeType = '',
  fileName = '',
  language = 'es',
  prompt = '',
}) {
  if (!openai) {
    throw new Error('Para transcribir audio necesitas configurar OPENAI_API_KEY');
  }

  const buffer = decodeBase64Buffer(audioBase64, MAX_AUDIO_SIZE_BYTES);
  const audioFile = await OpenAI.toFile(
    buffer,
    inferAudioFileName(fileName, mimeType),
    {
      type: safeString(mimeType) || 'audio/webm',
    },
  );

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: TRANSCRIPTION_MODEL,
    language: safeString(language) || 'es',
    prompt: safeString(prompt) || undefined,
    response_format: 'json',
  });

  return {
    text: safeString(transcription?.text || ''),
    language: safeString(language) || 'es',
    model: TRANSCRIPTION_MODEL,
    fileName: inferAudioFileName(fileName, mimeType),
    mimeType: safeString(mimeType) || 'audio/webm',
  };
}

async function synthesizeSpeechAudio({
  text = '',
  voice = SPEECH_VOICE,
  model = SPEECH_MODEL,
  speed = 1,
}) {
  if (!openai) {
    throw new Error('Para generar voz necesitas configurar OPENAI_API_KEY');
  }

  const cleanText = safeString(text);
  if (!cleanText) {
    throw new Error('El texto para sintetizar voz es obligatorio');
  }

  const speech = await openai.audio.speech.create({
    input: truncateText(normalizeSpeechText(cleanText), 3800),
    model: safeString(model) || SPEECH_MODEL,
    voice: safeString(voice) || SPEECH_VOICE,
    response_format: 'mp3',
    speed: Math.min(4, Math.max(0.25, Number(speed) || 1)),
    instructions: 'Habla en español de Colombia de forma clara. Lee los montos completos y no dividas los millones en partes incorrectas.',
  });

  const arrayBuffer = await speech.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    audioBase64: buffer.toString('base64'),
    mimeType: 'audio/mpeg',
    model: safeString(model) || SPEECH_MODEL,
    voice: safeString(voice) || SPEECH_VOICE,
  };
}

async function extractDocumentText({
  base64Data = '',
  rawText = '',
  fileName = '',
  mimeType = '',
}) {
  const sourceType = detectKnowledgeSourceType({
    mimeType,
    fileName,
    rawText,
  });

  if (sourceType === 'text') {
    const text = safeString(rawText) || decodeBase64Buffer(base64Data).toString('utf8');
    return {
      text: safeString(text),
      sourceType: 'text',
      mimeType: safeString(mimeType) || 'text/plain',
    };
  }

  const buffer = decodeBase64Buffer(base64Data);

  if (sourceType === 'pdf') {
    const pdfBuffer = decodePdfBuffer(base64Data);
    const parser = new PDFParse({ data: pdfBuffer });
    let parsedText = '';
    let pageCount = null;
    let pdfInfo = {};
    try {
      const parsed = await parser.getText();
      const infoResult = await parser.getInfo({ parsePageInfo: true }).catch(() => null);

      parsedText = safeString(parsed.text || '');
      pageCount = Number.isFinite(infoResult?.total) ? infoResult.total : null;
      pdfInfo = infoResult?.info || {};
    } finally {
      await parser.destroy().catch(() => null);
    }

    if (parsedText.length >= PDF_TEXT_THRESHOLD) {
      return {
        text: parsedText,
        sourceType: 'pdf',
        mimeType: safeString(mimeType) || 'application/pdf',
        pageCount,
        info: pdfInfo,
      };
    }

    try {
      const ocrResult = await extractPdfTextWithOcr({
        buffer: pdfBuffer,
        fileName,
        mimeType: safeString(mimeType) || 'application/pdf',
      });
      const ocrText = safeString(ocrResult.text);
      const finalText = ocrText.length > parsedText.length ? ocrText : parsedText;

      if (finalText) {
        return {
          text: finalText,
          sourceType: 'pdf',
          mimeType: safeString(mimeType) || 'application/pdf',
          pageCount: pageCount || ocrResult.pageCount || null,
          info: {
            ...pdfInfo,
            ocrUsed: Boolean(ocrResult.ocrPages.length),
            ocrPages: ocrResult.ocrPages,
            textPages: ocrResult.textPages,
            ocrPageLimit: PDF_OCR_PAGE_LIMIT,
          },
        };
      }
    } catch (ocrError) {
      if (parsedText) {
        return {
          text: parsedText,
          sourceType: 'pdf',
          mimeType: safeString(mimeType) || 'application/pdf',
          pageCount,
          info: {
            ...pdfInfo,
            ocrError: ocrError.message || 'No se pudo aplicar OCR al PDF',
          },
        };
      }

      throw new Error(`No se pudo extraer texto del PDF: ${ocrError.message || 'error desconocido'}`);
    }

    if (parsedText) {
      return {
        text: parsedText,
        sourceType: 'pdf',
        mimeType: safeString(mimeType) || 'application/pdf',
        pageCount,
        info: pdfInfo,
      };
    }
  }

  if (sourceType === 'word') {
    if (getFileExtension(fileName) === 'doc') {
      throw new Error('El formato .doc no está soportado directamente. Convierte el archivo a .docx para indexarlo.');
    }

    const result = await mammoth.extractRawText({ buffer });
    return {
      text: safeString(result.value || ''),
      sourceType: 'word',
      mimeType: safeString(mimeType) || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      info: {
        messages: result.messages || [],
      },
    };
  }

  if (sourceType === 'image') {
    const text = await extractTextFromImageBuffer({
      buffer,
      mimeType: safeString(mimeType) || 'image/png',
      fileName,
    });
    return {
      text: safeString(text),
      sourceType: 'image',
      mimeType: safeString(mimeType) || 'image/png',
    };
  }

  const fallbackText = buffer.toString('utf8').trim();
  if (fallbackText) {
    return {
      text: fallbackText,
      sourceType: 'text',
      mimeType: safeString(mimeType) || 'text/plain',
    };
  }

  throw new Error('No se pudo determinar cómo extraer texto de este archivo');
}

function parseJsonPayload(raw) {
  if (!raw) return {};

  const trimmed = String(raw).trim();

  try {
    return JSON.parse(trimmed);
  } catch (firstError) {
    const cleaned = trimmed.replace(/^```json\s*/i, '').replace(/```$/, '');
    try {
      return JSON.parse(cleaned);
    } catch (secondError) {
      return {
        answer: cleaned,
      };
    }
  }
}

async function createEmbedding(text) {
  if (!openai) return null;

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncateText(text, 6000),
  });

  return response.data?.[0]?.embedding || null;
}

function memoryQueryBase({ tenantId, role, userId }) {
  const query = {
    isActive: true,
    kind: { $in: ['conversation', 'memory'] },
  };

  const scope = [];
  const tenantScope = normalizeMeaningfulTenantId(tenantId);

  if (tenantScope) {
    scope.push({ tenantId: tenantScope });
  } else if (role !== 'superadmin' && role !== 'superadministrador') {
    scope.push({ tenantId: null });
  }

  if (userId) {
    scope.push({ userId: String(userId) });
  }

  if (scope.length) {
    query.$or = scope;
  }

  return query;
}

async function searchMemoryItems({ question, tenantId, userId, role, conversationId, channel = '', limit = 5 }) {
  const query = memoryQueryBase({ tenantId, role, userId });

  if (conversationId) {
    query.$or = query.$or ? [...query.$or, { conversationId: String(conversationId) }] : [{ conversationId: String(conversationId) }];
  }

  let queryEmbedding = null;
  if (hasOpenAI) {
    try {
      queryEmbedding = await createEmbedding(question);
    } catch (error) {
      queryEmbedding = null;
    }
  }

  const qTokens = extractTokens(question);
  const normalizedChannel = normalizeChannel(channel);
  let candidates = null;

  if (queryEmbedding) {
    candidates = await runAtlasVectorSearch({
      model: RagItem,
      index: MEMORY_VECTOR_INDEX,
      queryVector: queryEmbedding,
      filter: query,
      limit: Math.max(limit * 4, 20),
    });
  }

  if (!Array.isArray(candidates) || !candidates.length) {
    candidates = await RagItem.find(query)
      .sort({ createdAt: -1 })
      .limit(MAX_MEMORY_CANDIDATES)
      .lean();
  }

  return candidates
    .map((item) => {
      const lexical = lexicalScore(question, `${item.title || ''} ${item.summary || item.content || ''}`);
      const semantic = queryEmbedding && Number.isFinite(Number(item.vectorScore))
        ? Number(item.vectorScore) || 0
        : queryEmbedding && Array.isArray(item.embedding)
          ? cosineSimilarity(queryEmbedding, item.embedding)
        : 0;
      const recencyBoost = item.createdAt ? Math.max(0, 1 - daysBetween(item.createdAt, new Date()) / 365) * 0.05 : 0;
      const userBoost = userId && String(item.userId || '') === String(userId) ? 0.08 : 0;
      const conversationBoost = conversationId && String(item.conversationId || '') === String(conversationId) ? 0.06 : 0;
      const kindBoost = item.kind === 'memory' ? 0.05 : 0.02;
      const memoryType = safeString(item.metadata?.memoryType || '').toLowerCase();
      const memoryTypeBoost = memoryType === 'durable'
        ? 0.08
        : memoryType === 'episodic'
          ? 0.03
          : 0;
      const channelBoost = normalizedChannel && normalizeChannel(item.channel || item.source || '') === normalizedChannel ? 0.04 : 0;
      const exactBoost = qTokens.some((token) => normalizeText(item.content || '').includes(token)) ? 0.05 : 0;

      const score = (semantic * 0.6) + (lexical * 0.25) + recencyBoost + userBoost + conversationBoost + kindBoost + memoryTypeBoost + channelBoost + exactBoost;

      return {
        ...item,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function knowledgeQueryBase({ tenantId, role }) {
  const query = {
    isActive: true,
    kind: 'knowledge',
  };

  const scope = [];
  const tenantScope = normalizeMeaningfulTenantId(tenantId);

  if (tenantScope) {
    scope.push({ tenantId: tenantScope });
    scope.push({ tenantId: null });
  } else if (role !== 'superadmin' && role !== 'superadministrador') {
    scope.push({ tenantId: null });
  } else {
    // Superadmin sin oficina seleccionada: deja la búsqueda abierta a todos los documentos.
  }

  if (scope.length) {
    query.$or = scope;
  }

  return query;
}

async function searchKnowledgeItems({ question, tenantId, role, limit = 6 }) {
  const query = knowledgeQueryBase({ tenantId, role });
  let candidates = null;

  let queryEmbedding = null;
  if (hasOpenAI) {
    try {
      queryEmbedding = await createEmbedding(question);
    } catch (error) {
      queryEmbedding = null;
    }
  }

  if (queryEmbedding) {
    candidates = await runAtlasVectorSearch({
      model: RagItem,
      index: KNOWLEDGE_VECTOR_INDEX,
      queryVector: queryEmbedding,
      filter: query,
      limit: Math.max(limit * 4, 24),
    });
  }

  if (!Array.isArray(candidates) || !candidates.length) {
    candidates = await RagItem.find(query)
      .sort({ createdAt: -1 })
      .limit(MAX_KNOWLEDGE_CANDIDATES)
      .lean();
  }

  return candidates
    .map((item) => {
      const combined = `${item.title || ''} ${item.summary || item.content || ''} ${item.metadata?.fileName || ''}`;
      const lexical = lexicalScore(question, combined);
      const semantic = queryEmbedding && Number.isFinite(Number(item.vectorScore))
        ? Number(item.vectorScore) || 0
        : queryEmbedding && Array.isArray(item.embedding)
          ? cosineSimilarity(queryEmbedding, item.embedding)
        : 0;
      const recencyBoost = item.createdAt ? Math.max(0, 1 - daysBetween(item.createdAt, new Date()) / 365) * 0.04 : 0;
      const tenantBoost = tenantId && String(item.tenantId || '') === String(tenantId) ? 0.08 : 0;
      const globalBoost = item.tenantId ? 0 : 0.03;
      const exactBoost = extractTokens(question).some((token) => normalizeText(combined).includes(token)) ? 0.06 : 0;
      const score = (semantic * 0.6) + (lexical * 0.28) + recencyBoost + tenantBoost + globalBoost + exactBoost;

      return {
        ...item,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function findTenantMatch(question) {
  const tenants = await Tenant.find()
    .select('nombre tenantId codigoEmpresa estado')
    .sort({ fechaCreacion: -1 })
    .limit(150)
    .lean();

  if (!tenants.length) return null;

  const normalizedQuestion = normalizeText(question);
  const tokens = extractTokens(question);

  let best = null;

  for (const tenant of tenants) {
    const haystack = normalizeText(`${tenant.nombre || ''} ${tenant.tenantId || ''} ${tenant.codigoEmpresa || ''}`);
    let score = lexicalScore(question, haystack);

    if (normalizedQuestion && haystack.includes(normalizedQuestion)) {
      score += 0.5;
    }

    for (const token of tokens) {
      if (haystack.includes(token)) {
        score += 0.08;
      }
    }

    if (!best || score > best.score) {
      best = {
        tenant,
        score,
      };
    }
  }

  if (!best || best.score < 0.15) {
    return null;
  }

  return best.tenant;
}

async function resolveScopeTenantId({ tenantId, targetTenantId, role, question }) {
  const requestedTenant = normalizeMeaningfulTenantId(targetTenantId);
  if (requestedTenant) {
    return requestedTenant;
  }

  const currentTenant = normalizeMeaningfulTenantId(tenantId);
  if (currentTenant) {
    return currentTenant;
  }

  if (role === 'superadmin' || role === 'superadministrador') {
    const match = await findTenantMatch(question);
    if (match?.tenantId) {
      return safeString(match.tenantId).toLowerCase();
    }
  }

  return null;
}

async function buildTenantSnapshot({ tenantId, role, userId }) {
  const tenantScope = normalizeMeaningfulTenantId(tenantId) || null;
  const isSuperAdmin = role === 'superadmin' || role === 'superadministrador';
  const filter = {};

  if (tenantScope) {
    filter.tenantId = tenantScope;
  }

  if (!isSuperAdmin && userId && role === 'cobrador') {
    filter.cobrador = userId;
  }

  const clientQuery = { ...filter };
  const loanQuery = { ...filter };

  const [
    tenant,
    clientCount,
    activeClients,
    loanCount,
    activeLoans,
    paidLoans,
    overdueLoanCount,
    loans,
    sedes,
  ] = await Promise.all([
    tenantScope ? Tenant.findOne({ tenantId: tenantScope }).lean() : null,
    Cliente.countDocuments(clientQuery),
    Cliente.countDocuments({ ...clientQuery, estado: { $ne: 'inactivo' } }),
    Prestamo.countDocuments(loanQuery),
    Prestamo.countDocuments({ ...loanQuery, estado: 'activo' }),
    Prestamo.countDocuments({ ...loanQuery, estado: 'pagado' }),
    Prestamo.countDocuments({ ...loanQuery, estado: 'vencido' }),
    Prestamo.find(loanQuery)
      .populate('cliente', 'nombre cedula')
      .populate('cobrador', 'nombre cedula')
      .sort({ updatedAt: -1 })
      .lean(),
    tenantScope ? Sede.find({ tenantId: tenantScope }).sort({ createdAt: -1 }).lean() : Promise.resolve([]),
  ]);

  const fallbackContacts = OFFICE_CONTACT_FALLBACKS[tenantScope] || [];
  const officeContacts = formatOfficeContacts([
    ...extractContactNumbers(tenant?.telefonos || []),
    ...extractContactNumbers(tenant?.telefono || ''),
    ...fallbackContacts,
  ]);

  const loanIds = loans.map((loan) => loan._id);
  const paymentFilter = tenantScope ? { tenantId: tenantScope } : {};
  if (role === 'cobrador' && userId && loanIds.length) {
    paymentFilter.prestamoId = { $in: loanIds };
  }

  const payments = tenantScope
    ? await Pago.find(paymentFilter).sort({ fecha: -1 }).limit(20).lean()
    : [];

  const totalCapital = loans.reduce((sum, loan) => sum + toNumber(loan.capital), 0);
  const totalProgramado = loans.reduce((sum, loan) => sum + toNumber(loan.totalAPagar), 0);
  const totalRecaudado = loans.reduce((sum, loan) => sum + toNumber(loan.totalPagado), 0);
  const carteraPendiente = loans.reduce((sum, loan) => sum + calculateBalance(loan), 0);
  const overdueLoans = loans.filter((loan) => loan.estado !== 'pagado' && calculateOverdueDays(loan) > 0);

  const balanceByClient = new Map();
  loans.forEach((loan) => {
    const clientKey = String(loan.cliente?._id || loan.cliente || '');
    if (!clientKey) return;

    const current = balanceByClient.get(clientKey) || {
      cliente: loan.cliente || null,
      balance: 0,
      loans: 0,
    };

    current.balance += calculateBalance(loan);
    current.loans += 1;
    balanceByClient.set(clientKey, current);
  });

  const topClients = [...balanceByClient.values()]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10);

  const recentPayments = payments.slice(0, 8);
  const recentLoans = [...loans]
    .sort((a, b) => calculateBalance(b) - calculateBalance(a))
    .slice(0, 8);

  const title = tenant?.nombre || tenantScope || 'Global';
  const sectionText = [
    `Resumen operativo para ${title}.`,
    `Fecha de corte: ${formatDate(new Date())}.`,
    tenantScope ? `Tenant ID: ${tenantScope}` : '',
    officeContacts ? `Telefonos de contacto de la oficina: ${officeContacts}.` : '',
    `Clientes activos: ${activeClients} de ${clientCount}.`,
    `Prestamos activos: ${activeLoans} de ${loanCount}.`,
    `Prestamos pagados: ${paidLoans}.`,
    `Cartera pendiente total: ${formatCurrency(carteraPendiente)}.`,
    `Capital colocado: ${formatCurrency(totalCapital)}.`,
    `Valor programado: ${formatCurrency(totalProgramado)}.`,
    `Total recaudado: ${formatCurrency(totalRecaudado)}.`,
    sedes.length ? `Sedes registradas: ${sedes.length}.` : '',
    overdueLoans.length ? `Prestamos en mora detectados: ${overdueLoans.length}.` : '',
    '',
    overdueLoans.length
      ? `Top de cartera en mora: ${overdueLoans
          .slice(0, 5)
          .map((loan, index) => `${index + 1}. ${loan.cliente?.nombre || 'Sin cliente'} - ${formatCurrency(calculateBalance(loan))} - ${calculateOverdueDays(loan)} dias atrasados`)
          .join(' | ')}`
      : 'No se detectaron prestamos en mora en el alcance actual.',
    '',
    recentPayments.length
      ? `Pagos recientes: ${recentPayments
          .map((payment, index) => `${index + 1}. ${formatCurrency(payment.monto)} el ${formatDate(payment.fecha)} (${payment.metodoPago || 'sin metodo'})`)
          .join(' | ')}`
      : 'No hay pagos recientes para este alcance.',
    '',
    topClients.length
      ? `Clientes con mayor saldo: ${topClients
          .map((item, index) => `${index + 1}. ${item.cliente?.nombre || 'Sin nombre'} - ${formatCurrency(item.balance)} en ${item.loans} creditos`)
          .join(' | ')}`
      : 'No hay clientes con saldo relevante en este alcance.',
  ]
    .filter(Boolean)
    .join('\n');

  const sources = [
    buildSource({
      id: tenantScope ? `tenant-summary:${tenantScope}` : 'tenant-summary:global',
      title: tenantScope ? `Resumen de ${title}` : 'Resumen global',
      type: 'summary',
      snippet: sectionText,
      score: 1,
      importance: 1,
    }),
    officeContacts
      ? buildSource({
          id: tenantScope ? `tenant-contact:${tenantScope}` : 'tenant-contact:global',
          title: `Contacto de ${title}`,
          type: 'contact',
          snippet: `Telefonos de contacto de la oficina: ${officeContacts}.`,
          score: 1,
          importance: 1,
        })
      : null,
    ...recentLoans.map((loan) =>
      buildSource({
        id: `loan:${loan._id}`,
        title: `Prestamo ${loan.cliente?.nombre || loan._id}`,
        type: 'loan',
        snippet: [
          `Cliente: ${loan.cliente?.nombre || 'Sin nombre'}`,
          `Estado: ${loan.estado || 'sin estado'}`,
          `Saldo: ${formatCurrency(calculateBalance(loan))}`,
          `Vence: ${formatDate(loan.fechaVencimiento)}`,
        ].join(' | '),
        importance: 0.8,
      }),
    ),
  ].filter(Boolean);

  return {
    title,
    text: sectionText,
    sources,
    stats: {
      tenantId: tenantScope,
      clientCount,
      activeClients,
      loanCount,
      activeLoans,
      paidLoans,
      overdueLoans: overdueLoanCount,
      carteraPendiente,
      totalCapital,
      totalProgramado,
      totalRecaudado,
    },
  };
}

async function buildGlobalSnapshot() {
  const [
    tenantCount,
    activeTenantCount,
    clientCount,
    activeClientCount,
    loanCount,
    activeLoanCount,
    paidLoanCount,
    overdueLoanCount,
    recentTenants,
    activeTenants,
    allLoans,
  ] = await Promise.all([
    Tenant.countDocuments(),
    Tenant.countDocuments({ estado: true }),
    Cliente.countDocuments(),
    Cliente.countDocuments({ estado: { $ne: 'inactivo' } }),
    Prestamo.countDocuments(),
    Prestamo.countDocuments({ estado: 'activo' }),
    Prestamo.countDocuments({ estado: 'pagado' }),
    Prestamo.countDocuments({ estado: 'vencido' }),
    Tenant.find().sort({ fechaCreacion: -1 }).limit(8).lean(),
    Tenant.find({ estado: true }).select('nombre tenantId estado fechaCreacion').lean(),
    Prestamo.find()
      .populate('cliente', 'nombre cedula')
      .populate('cobrador', 'nombre cedula')
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  const aggregate = (await Prestamo.aggregate([
    {
      $group: {
        _id: null,
        totalRecaudado: { $sum: '$totalPagado' },
        totalProgramado: { $sum: '$totalAPagar' },
        totalCapital: { $sum: '$capital' },
      },
    },
  ]))[0] || {
    totalRecaudado: 0,
    totalProgramado: 0,
    totalCapital: 0,
  };

  const pendingOffices = [];
  for (const tenant of activeTenants) {
    const lastPayment = await Pago.findOne({ tenantId: tenant.tenantId }).sort({ fecha: -1 }).lean();
    const baseDate = lastPayment?.fecha || tenant.fechaCreacion;
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + 1);

    if (dueDate <= new Date()) {
      pendingOffices.push({
        tenant,
        dueDate,
        daysLate: daysBetween(dueDate, new Date()),
      });
    }
  }

  const balanceByClient = new Map();
  allLoans.forEach((loan) => {
    const clientKey = String(loan.cliente?._id || loan.cliente || '');
    if (!clientKey) return;

    const current = balanceByClient.get(clientKey) || {
      cliente: loan.cliente || null,
      balance: 0,
      loans: 0,
    };

    current.balance += calculateBalance(loan);
    current.loans += 1;
    balanceByClient.set(clientKey, current);
  });

  const globalTopClients = [...balanceByClient.values()]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10);

  const globalOverdueLoans = allLoans
    .filter((loan) => loan.estado !== 'pagado' && calculateOverdueDays(loan) > 0)
    .sort((a, b) => calculateBalance(b) - calculateBalance(a))
    .slice(0, 10);

  const text = [
    'Resumen global del sistema.',
    `Fecha de corte: ${formatDate(new Date())}.`,
    `Oficinas registradas: ${tenantCount}.`,
    `Oficinas activas: ${activeTenantCount}.`,
    `Clientes totales: ${clientCount}.`,
    `Clientes activos: ${activeClientCount}.`,
    `Prestamos totales: ${loanCount}.`,
    `Prestamos activos: ${activeLoanCount}.`,
    `Prestamos pagados: ${paidLoanCount}.`,
    `Prestamos vencidos: ${overdueLoanCount}.`,
    `Total capital colocado: ${formatCurrency(aggregate.totalCapital)}.`,
    `Total programado: ${formatCurrency(aggregate.totalProgramado)}.`,
    `Total recaudado: ${formatCurrency(aggregate.totalRecaudado)}.`,
    pendingOffices.length
      ? `Oficinas con posible atraso: ${pendingOffices
          .slice(0, 5)
          .map((item, index) => `${index + 1}. ${item.tenant.nombre} - ${item.daysLate} dias tarde`)
          .join(' | ')}`
      : 'No se detectan oficinas con atraso en el barrido reciente.',
    '',
    globalTopClients.length
      ? `Clientes con mayor saldo global: ${globalTopClients
          .map((item, index) => `${index + 1}. ${item.cliente?.nombre || 'Sin nombre'} - ${formatCurrency(item.balance)} en ${item.loans} creditos`)
          .join(' | ')}`
      : 'No se detectan clientes con saldo relevante en el barrido global.',
    '',
    globalOverdueLoans.length
      ? `Prestamos con atraso real mas relevantes: ${globalOverdueLoans
          .slice(0, 5)
          .map((loan, index) => `${index + 1}. ${loan.cliente?.nombre || 'Sin cliente'} - ${formatCurrency(calculateBalance(loan))} - ${calculateOverdueDays(loan)} dias de atraso`)
          .join(' | ')}`
      : 'No se detectan prestamos con atraso real en el barrido global.',
  ]
    .filter(Boolean)
    .join('\n');

  const sources = [
    buildSource({
      id: 'global-summary',
      title: 'Resumen global',
      type: 'summary',
      snippet: text,
      score: 1,
      importance: 1,
    }),
    globalTopClients.length
      ? buildSource({
          id: 'global-top-clients',
          title: 'Clientes con mayor saldo global',
          type: 'summary',
          snippet: globalTopClients
            .map((item, index) => `${index + 1}. ${item.cliente?.nombre || 'Sin nombre'} - ${formatCurrency(item.balance)} en ${item.loans} creditos`)
            .join(' | '),
          score: 1,
          importance: 1,
        })
      : null,
    ...recentTenants.map((tenant) =>
      buildSource({
        id: `tenant:${tenant.tenantId}`,
        title: tenant.nombre,
        type: 'tenant',
        snippet: `Tenant ID: ${tenant.tenantId} | Estado: ${tenant.estado ? 'activo' : 'inactivo'} | Creado: ${formatDate(tenant.fechaCreacion)}`,
        importance: 0.7,
      }),
    ),
  ].filter(Boolean);

  return {
    title: 'Global',
    text,
    sources,
    stats: {
      tenantCount,
      activeTenantCount,
      clientCount,
      activeClientCount,
      loanCount,
      activeLoanCount,
      paidLoanCount,
      overdueLoanCount,
      totalCapital: aggregate.totalCapital || 0,
      totalProgramado: aggregate.totalProgramado || 0,
      totalRecaudado: aggregate.totalRecaudado || 0,
    },
  };
}

async function buildClientContext({ question, tenantId, role, userId }) {
  const tenantScope = normalizeMeaningfulTenantId(tenantId);
  const isSuperAdmin = role === 'superadmin' || role === 'superadministrador';

  if (!tenantScope && !isSuperAdmin) {
    return {
      text: '',
      sources: [],
    };
  }

  const tokens = extractTokens(question);
  let queryEmbedding = null;
  if (hasOpenAI) {
    try {
      queryEmbedding = await createEmbedding(question);
    } catch (error) {
      queryEmbedding = null;
    }
  }

  if (!tokens.length && !queryEmbedding) {
    return {
      text: '',
      sources: [],
    };
  }

  const clientFilter = tenantScope ? { tenantId: tenantScope } : {};
  if (role === 'cobrador' && userId && tenantScope) {
    clientFilter.cobrador = userId;
  }

  const vectorClientFilter = tenantScope ? { tenantId: tenantScope } : {};
  if (role === 'cobrador' && userId && tenantScope) {
    const cobradorObjectId = toObjectId(userId);
    if (cobradorObjectId) {
      vectorClientFilter.cobrador = cobradorObjectId;
    }
  }

  const clientResults = new Map();

  if (queryEmbedding) {
    const vectorClients = await runAtlasVectorSearch({
      model: Cliente,
      index: CLIENT_VECTOR_INDEX,
      queryVector: queryEmbedding,
      filter: vectorClientFilter,
      limit: 12,
    });

    if (Array.isArray(vectorClients)) {
      vectorClients.forEach((client) => {
        const key = String(client._id || client.cedula || client.nombre || '');
        if (key) {
          clientResults.set(key, client);
        }
      });
    }
  }

  const orConditions = [];
  const numericTokens = tokens.filter(isNumericToken);

  numericTokens.slice(0, 3).forEach((token) => {
    orConditions.push({ cedula: { $regex: escapeRegex(token), $options: 'i' } });
  });

  tokens.slice(0, 5).forEach((token) => {
    orConditions.push({ nombre: { $regex: escapeRegex(token), $options: 'i' } });
    orConditions.push({ celular: { $regex: escapeRegex(token), $options: 'i' } });
    orConditions.push({ telefono: { $regex: escapeRegex(token), $options: 'i' } });
  });

  if (orConditions.length) {
    const textClients = await Cliente.find({
      ...clientFilter,
      $or: orConditions,
    })
      .populate('cobrador', 'nombre cedula')
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();

    textClients.forEach((client) => {
      const key = String(client._id || client.cedula || client.nombre || '');
      if (key && !clientResults.has(key)) {
        clientResults.set(key, client);
      }
    });
  }

  const clients = [...clientResults.values()].slice(0, 5);

  if (!clients.length) {
    return {
      text: '',
      sources: [],
    };
  }

  const clientIds = clients.map((client) => client._id);
  const loanFilter = {
    cliente: { $in: clientIds },
  };

  if (tenantScope) {
    loanFilter.tenantId = tenantScope;
  }

  if (role === 'cobrador' && userId && tenantScope) {
    loanFilter.cobrador = userId;
  }

  const loans = await Prestamo.find(loanFilter)
    .populate('cliente', 'nombre cedula')
    .populate('cobrador', 'nombre cedula')
    .sort({ updatedAt: -1 })
    .limit(15)
    .lean();

  const paymentQuery = {
    clienteId: { $in: clientIds },
  };

  if (tenantScope) {
    paymentQuery.tenantId = tenantScope;
  }

  const payments = await Pago.find(paymentQuery)
    .sort({ fecha: -1 })
    .limit(10)
    .lean();

  const clientBlocks = clients.map((client, index) => {
    const relatedLoans = loans.filter((loan) => String(loan.cliente?._id || loan.cliente) === String(client._id));
    const balance = relatedLoans.reduce((sum, loan) => sum + calculateBalance(loan), 0);
    const overdue = relatedLoans.filter((loan) => calculateOverdueDays(loan) > 0 && loan.estado !== 'pagado');

    return [
      `${index + 1}. Cliente: ${client.nombre}`,
      `   Cedula: ${client.cedula}`,
      `   Estado: ${client.estado}`,
      `   Tipo: ${client.tipoCliente || 'nuevo'}`,
      `   Celular: ${client.celular || client.telefono || 'sin dato'}`,
      `   Direccion: ${client.direccion || 'sin dato'}`,
      `   Cobrador: ${client.cobrador?.nombre || 'sin asignar'}`,
      `   Prestamos activos: ${relatedLoans.length}`,
      `   Saldo acumulado: ${formatCurrency(balance)}`,
      overdue.length ? `   En mora: ${overdue.length}` : '   En mora: 0',
    ].join('\n');
  });

  const recentPaymentsText = payments.length
    ? payments
        .map((payment, index) => `${index + 1}. ${formatCurrency(payment.monto)} el ${formatDate(payment.fecha)} (${payment.metodoPago || 'sin metodo'})`)
        .join('\n')
    : 'No hay pagos recientes asociados a los clientes encontrados.';

  const text = [
    'Contexto de clientes encontrados.',
    clientBlocks.join('\n\n'),
    '',
    'Pagos recientes de los clientes encontrados:',
    recentPaymentsText,
  ]
    .filter(Boolean)
    .join('\n');

  const sources = [
    ...clients.map((client) =>
      buildSource({
        id: `client:${client._id}`,
        title: client.nombre,
        type: 'client',
        snippet: `Cedula: ${client.cedula} | Estado: ${client.estado} | Direccion: ${client.direccion || 'sin dato'}`,
        importance: 0.9,
      }),
    ),
    ...loans.map((loan) =>
      buildSource({
        id: `loan:${loan._id}`,
        title: `Prestamo ${loan.cliente?.nombre || loan._id}`,
        type: 'loan',
        snippet: `Saldo: ${formatCurrency(calculateBalance(loan))} | Estado: ${loan.estado || 'sin estado'} | Vence: ${formatDate(loan.fechaVencimiento)}`,
        importance: 0.8,
      }),
    ),
  ];

  return {
    text,
    sources,
  };
}

async function buildMemoryContext({ question, tenantId, userId, role, conversationId, channel = '' }) {
  const memories = await searchMemoryItems({
    question,
    tenantId,
    userId,
    role,
    conversationId,
    channel,
    limit: 5,
  });

  if (!memories.length) {
    return {
      text: '',
      sources: [],
    };
  }

  const text = memories
    .map((memory, index) => {
      const memoryType = safeString(memory.metadata?.memoryType || '').toLowerCase();
      const label = memory.kind === 'conversation'
        ? 'Conversacion'
        : memoryType === 'durable'
          ? 'Memoria duradera'
          : memoryType === 'episodic'
            ? 'Memoria episodica'
            : 'Memoria';
      return `${index + 1}. [${label}] ${memory.title || 'Sin titulo'}\n${truncateText(memory.summary || memory.content, 700)}`;
    })
    .join('\n\n');

  const sources = memories.map((memory) =>
    buildSource({
      id: `memory:${memory._id}`,
      title: memory.title || 'Memoria',
      type: memory.kind,
      snippet: memory.summary || memory.content,
      score: memory.score || 0,
      importance: memory.importance || 0,
    }),
  );

  return {
    text,
    sources,
  };
}

async function buildKnowledgeContext({ question, tenantId, role }) {
  const knowledge = await searchKnowledgeItems({
    question,
    tenantId,
    role,
    limit: 6,
  });

  if (!knowledge.length) {
    return {
      text: '',
      sources: [],
    };
  }

  const text = knowledge
    .map((item, index) => {
      const label = item.metadata?.fileName || item.metadata?.originalTitle || item.title || 'Documento';
      const sourceType = item.metadata?.sourceType || item.source || 'knowledge';
      const chunkLabel = item.metadata?.chunkIndex != null && item.metadata?.totalChunks
        ? ` (${Number(item.metadata.chunkIndex) + 1}/${Number(item.metadata.totalChunks)})`
        : '';
      return `${index + 1}. [${String(sourceType).toUpperCase()}] ${label}${chunkLabel}\n${truncateText(item.summary || item.content, 700)}`;
    })
    .join('\n\n');

  const sources = knowledge.map((item) =>
    buildSource({
      id: `knowledge:${item._id}`,
      title: item.metadata?.fileName || item.metadata?.originalTitle || item.title || 'Documento',
      type: item.metadata?.sourceType || item.source || 'knowledge',
      snippet: item.summary || item.content,
      score: item.score || 0,
      importance: item.importance || 0.6,
    }),
  );

  return {
    text,
    sources,
  };
}

async function listKnowledgeDocuments({
  tenantId,
  targetTenantId,
  role,
  limit = 25,
  includeInactive = false,
}) {
  const resolvedTenantId = resolveKnowledgeTenantId({
    tenantId,
    targetTenantId,
    role,
  });

  const documentQuery = buildKnowledgeTenantFilter(resolvedTenantId);
  const chunkQuery = {
    kind: 'knowledge',
    ...buildKnowledgeTenantFilter(resolvedTenantId),
  };

  if (!includeInactive) {
    documentQuery.isActive = true;
    chunkQuery.isActive = true;
  }
  const [parentDocuments, chunkItems] = await Promise.all([
    KnowledgeDocument.find(documentQuery)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean(),
    RagItem.find(chunkQuery)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean(),
  ]);

  const documents = [];
  const bySource = new Map();
  const chunkGroups = new Map();

  parentDocuments.forEach((item) => {
    const view = buildKnowledgeDocumentView(item);
    const mapKey = buildKnowledgeViewKey(view);
    bySource.set(mapKey, view);
  });

  chunkItems.forEach((item) => {
    const fallback = {
      sourceId: item.sourceId || item.contentHash || item._id,
      tenantId: item.tenantId || null,
      title: item.metadata?.fileName || item.metadata?.originalTitle || item.title || 'Documento',
      fileName: item.metadata?.fileName || item.metadata?.originalTitle || item.title || 'Documento',
      originalTitle: item.metadata?.originalTitle || item.title || 'Documento',
      sourceType: item.metadata?.sourceType || item.source || 'knowledge',
      uploadedBy: item.userName || '',
      uploadedById: item.userId || null,
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
      pageCount: item.metadata?.pageCount || null,
      mimeType: item.metadata?.mimeType || null,
      isActive: item.isActive !== false,
      chunkCount: Number(item.metadata?.totalChunks || 1),
      preview: item.summary || item.content || '',
      storage: {
        documentCollection: 'knowledge_documents',
        chunkCollection: 'knowledge_chunks',
        runtimeCollection: 'ragitems',
      },
    };

    const view = buildKnowledgeDocumentView(item, fallback);
    const mapKey = buildKnowledgeViewKey(view);
    const existing = bySource.get(mapKey);
    const chunkGroup = chunkGroups.get(mapKey) || {
      view,
      chunkRecords: [],
    };
    chunkGroup.chunkRecords.push({
      tenantId: item.tenantId || null,
      sourceId: item.sourceId || item.contentHash || item._id,
      chunkIndex: Number(item.metadata?.chunkIndex ?? 0),
      title: item.title || fallback.title,
      content: item.content || item.summary || '',
      summary: item.summary || item.content || '',
      sourceType: item.metadata?.sourceType || item.source || 'knowledge',
      fileName: item.metadata?.fileName || item.metadata?.originalTitle || item.title || 'Documento',
      originalTitle: item.metadata?.originalTitle || item.title || 'Documento',
      mimeType: item.metadata?.mimeType || null,
      pageCount: item.metadata?.pageCount || null,
      embedding: item.embedding || undefined,
      contentHash: item.contentHash || '',
      importance: item.importance || 0,
      uploadedBy: item.userName || '',
      uploadedById: item.userId || null,
      metadata: {
        sourceType: item.metadata?.sourceType || item.source || 'knowledge',
        fileName: item.metadata?.fileName || item.metadata?.originalTitle || item.title || 'Documento',
        originalTitle: item.metadata?.originalTitle || item.title || 'Documento',
        mimeType: item.metadata?.mimeType || '',
        pageCount: item.metadata?.pageCount || null,
        totalChunks: Number(item.metadata?.totalChunks || 1),
        chunkIndex: Number(item.metadata?.chunkIndex ?? 0),
        uploadedAt: item.metadata?.uploadedAt || item.createdAt || new Date().toISOString(),
        uploadedBy: item.metadata?.uploadedBy || item.userName || '',
      },
      isActive: item.isActive !== false,
    });
    chunkGroups.set(mapKey, chunkGroup);

    if (!existing) {
      bySource.set(mapKey, view);
      return;
    }

    bySource.set(mapKey, {
      ...existing,
      title: existing.title || view.title,
      fileName: existing.fileName || view.fileName,
      originalTitle: existing.originalTitle || view.originalTitle,
      sourceType: existing.sourceType || view.sourceType,
      uploadedBy: existing.uploadedBy || view.uploadedBy,
      uploadedById: existing.uploadedById || view.uploadedById,
      createdAt: existing.createdAt || view.createdAt,
      updatedAt: view.updatedAt || existing.updatedAt,
      pageCount: existing.pageCount || view.pageCount,
      mimeType: existing.mimeType || view.mimeType,
      isActive: existing.isActive !== false || view.isActive !== false,
      chunkCount: Math.max(Number(existing.chunkCount || 0), Number(view.chunkCount || 0)),
      preview: existing.preview || view.preview,
      storage: existing.storage || view.storage,
    });
  });

  if (!parentDocuments.length && chunkGroups.size) {
    await Promise.allSettled(
      Array.from(chunkGroups.values()).map((group) => persistKnowledgeVisibilityArtifacts({
        resolvedTenantId,
        sourceId: group.view.sourceId,
        sourceType: group.view.sourceType,
        mimeType: group.view.mimeType,
        fileName: group.view.fileName,
        title: group.view.title,
        originalTitle: group.view.originalTitle,
        extractedText: group.view.preview,
        pageCount: group.view.pageCount,
        userId: group.view.uploadedById,
        userName: group.view.uploadedBy,
        extraMetadata: {
          storage: group.view.storage,
        },
        chunkRecords: group.chunkRecords,
      })),
    );
  }

  bySource.forEach((value) => documents.push(value));

  documents.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  return {
    tenantId: resolvedTenantId,
    documents: documents.slice(0, limit),
  };
}

function buildKnowledgeDocumentScopeQuery({ tenantId, targetTenantId, role, sourceId }) {
  const resolvedTenantId = resolveKnowledgeTenantId({
    tenantId,
    targetTenantId,
    role,
  });

  const tenantFilter = buildKnowledgeTenantFilter(resolvedTenantId);

  const query = {
    kind: 'knowledge',
    sourceId,
    ...tenantFilter,
  };

  return {
    resolvedTenantId,
    ragQuery: query,
    documentQuery: {
      sourceId,
      ...tenantFilter,
    },
    chunkQuery: {
      sourceId,
      ...tenantFilter,
    },
  };
}

async function setKnowledgeDocumentActiveState({
  tenantId,
  targetTenantId,
  role,
  sourceId,
  isActive,
}) {
  const { resolvedTenantId, ragQuery, documentQuery, chunkQuery } = buildKnowledgeDocumentScopeQuery({
    tenantId,
    targetTenantId,
    role,
    sourceId,
  });

  const [ragResult, documentResult, chunkResult] = await Promise.all([
    RagItem.updateMany(ragQuery, {
      $set: {
        isActive: Boolean(isActive),
      },
    }),
    KnowledgeDocument.updateMany(documentQuery, {
      $set: {
        isActive: Boolean(isActive),
      },
    }),
    KnowledgeChunk.updateMany(chunkQuery, {
      $set: {
        isActive: Boolean(isActive),
      },
    }),
  ]);

  return {
    tenantId: resolvedTenantId,
    sourceId,
    isActive: Boolean(isActive),
    matchedCount: (ragResult.matchedCount || 0) + (documentResult.matchedCount || 0) + (chunkResult.matchedCount || 0),
    modifiedCount: (ragResult.modifiedCount || 0) + (documentResult.modifiedCount || 0) + (chunkResult.modifiedCount || 0),
  };
}

async function archiveKnowledgeDocument({
  tenantId,
  targetTenantId,
  role,
  sourceId,
}) {
  return setKnowledgeDocumentActiveState({
    tenantId,
    targetTenantId,
    role,
    sourceId,
    isActive: false,
  });
}

async function restoreKnowledgeDocument({
  tenantId,
  targetTenantId,
  role,
  sourceId,
}) {
  return setKnowledgeDocumentActiveState({
    tenantId,
    targetTenantId,
    role,
    sourceId,
    isActive: true,
  });
}

async function deleteKnowledgeDocument({
  tenantId,
  targetTenantId,
  role,
  sourceId,
}) {
  const { resolvedTenantId, ragQuery, documentQuery, chunkQuery } = buildKnowledgeDocumentScopeQuery({
    tenantId,
    targetTenantId,
    role,
    sourceId,
  });

  const [ragResult, documentResult, chunkResult] = await Promise.all([
    RagItem.deleteMany(ragQuery),
    KnowledgeDocument.deleteMany(documentQuery),
    KnowledgeChunk.deleteMany(chunkQuery),
  ]);

  return {
    tenantId: resolvedTenantId,
    sourceId,
    deletedCount: (ragResult.deletedCount || 0) + (documentResult.deletedCount || 0) + (chunkResult.deletedCount || 0),
  };
}

async function listConversationThreads({
  tenantId,
  targetTenantId,
  role,
  limit = 25,
  channel = '',
  search = '',
}) {
  const resolvedTenantId = resolveConversationTenantId({
    tenantId,
    targetTenantId,
    role,
  });

  const query = {
    isActive: true,
    kind: 'conversation',
  };

  if (resolvedTenantId) {
    query.tenantId = resolvedTenantId;
  } else if (!(role === 'superadmin' || role === 'superadministrador')) {
    query.tenantId = safeString(tenantId).toLowerCase() || null;
  }

  if (safeString(channel)) {
    query.channel = safeString(channel);
  }

  const items = await RagItem.find(query)
    .sort({ createdAt: -1 })
    .limit(1500)
    .lean();

  const normalizedSearch = normalizeText(search);
  const threads = new Map();

  items.forEach((item) => {
    if (!item.conversationId) return;

    const itemTenantId = normalizeMeaningfulTenantId(item.tenantId) || null;
    const parsed = parseConversationTurn(item.content);
    const question = safeString(parsed.question || item.title || '');
    const answer = safeString(parsed.answer || item.summary || '');
    const preview = truncateText(question || answer || item.summary || item.content, 180);
    const scopeKey = `${String(itemTenantId || 'global').toLowerCase()}:${String(item.conversationId)}`;
    const existing = threads.get(scopeKey);
    const updatedAt = item.updatedAt || item.createdAt || null;

    const haystack = normalizeText(
      [
        item.userName,
        item.title,
        item.summary,
        question,
        answer,
        item.channel,
        item.role,
      ].filter(Boolean).join(' '),
    );

    if (normalizedSearch && !haystack.includes(normalizedSearch)) {
      return;
    }

    if (!existing) {
      threads.set(scopeKey, {
        conversationId: String(item.conversationId),
        tenantId: itemTenantId,
        userId: item.userId || null,
        userName: safeString(item.userName),
        role: safeString(item.role),
        channel: safeString(item.channel),
        title: safeString(item.title) || question || 'Conversación',
        preview,
        lastQuestion: question,
        lastAnswer: answer,
        lastSummary: safeString(item.summary),
        turnCount: 1,
        important: Boolean(item.metadata?.important),
        sourceCount: Number(item.metadata?.sourceCount || 0),
        followUpQuestions: Array.isArray(item.metadata?.followUpQuestions)
          ? item.metadata.followUpQuestions.filter(Boolean).slice(0, 5)
          : [],
        conversationStatus: safeString(item.metadata?.conversationStatus || 'open'),
        createdAt: item.createdAt || null,
        updatedAt,
      });
      return;
    }

    existing.turnCount += 1;
    if (updatedAt && (!existing.updatedAt || new Date(updatedAt) > new Date(existing.updatedAt))) {
      existing.updatedAt = updatedAt;
      existing.preview = preview || existing.preview;
      existing.lastQuestion = question || existing.lastQuestion;
      existing.lastAnswer = answer || existing.lastAnswer;
      existing.lastSummary = safeString(item.summary) || existing.lastSummary;
      existing.title = safeString(item.title) || existing.title;
      existing.userName = safeString(item.userName) || existing.userName;
      existing.userId = item.userId || existing.userId;
      existing.role = safeString(item.role) || existing.role;
      existing.channel = safeString(item.channel) || existing.channel;
      existing.important = Boolean(item.metadata?.important) || existing.important;
      existing.sourceCount = Number(item.metadata?.sourceCount || existing.sourceCount || 0);
      existing.followUpQuestions = Array.isArray(item.metadata?.followUpQuestions)
        ? item.metadata.followUpQuestions.filter(Boolean).slice(0, 5)
        : existing.followUpQuestions;
      existing.conversationStatus = safeString(item.metadata?.conversationStatus || existing.conversationStatus || 'open');
      existing.tenantId = itemTenantId;
    }
  });

  const conversations = Array.from(threads.values())
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, limit);

  return {
    tenantId: resolvedTenantId,
    conversations,
    total: conversations.length,
  };
}

async function getConversationThread({
  tenantId,
  targetTenantId,
  role,
  conversationId,
  channel = '',
}) {
  const resolvedTenantId = resolveConversationTenantId({
    tenantId,
    targetTenantId,
    role,
  });

  const cleanConversationId = safeString(conversationId);
  if (!cleanConversationId) {
    throw new Error('La conversación es obligatoria');
  }

  const query = {
    isActive: true,
    kind: 'conversation',
    conversationId: cleanConversationId,
  };

  if (resolvedTenantId) {
    query.tenantId = resolvedTenantId;
  } else if (!(role === 'superadmin' || role === 'superadministrador')) {
    query.tenantId = safeString(tenantId).toLowerCase() || null;
  }

  if (safeString(channel)) {
    query.channel = safeString(channel);
  }

  const items = await RagItem.find(query)
    .sort({ createdAt: 1 })
    .lean();

  const messages = [];
  let thread = null;

  items.forEach((item, index) => {
    const itemTenantId = normalizeMeaningfulTenantId(item.tenantId) || null;
    const parsed = parseConversationTurn(item.content);
    const question = safeString(parsed.question || item.title || '');
    const answer = safeString(parsed.answer || item.summary || '');

    if (!thread) {
      thread = {
        conversationId: cleanConversationId,
        tenantId: itemTenantId,
        userId: item.userId || null,
        userName: safeString(item.userName),
        role: safeString(item.role),
        channel: safeString(item.channel),
        title: safeString(item.title) || question || 'Conversación',
        updatedAt: item.updatedAt || item.createdAt || null,
        createdAt: item.createdAt || null,
        important: Boolean(item.metadata?.important),
        sourceCount: Number(item.metadata?.sourceCount || 0),
        followUpQuestions: Array.isArray(item.metadata?.followUpQuestions)
          ? item.metadata.followUpQuestions.filter(Boolean).slice(0, 5)
          : [],
        conversationStatus: safeString(item.metadata?.conversationStatus || 'open'),
      };
    }

    const baseId = String(item._id || `${cleanConversationId}-${index}`);
    const timestamp = item.createdAt || item.updatedAt || new Date();

    if (question) {
      messages.push({
        id: `${baseId}-user`,
        role: 'user',
        content: question,
        createdAt: timestamp,
        channel: item.channel || 'web',
        source: item.source || item.channel || 'web',
        metadata: item.metadata || {},
      });
    }

    if (answer) {
      messages.push({
        id: `${baseId}-assistant`,
        role: 'assistant',
        content: answer,
        createdAt: timestamp,
        channel: item.channel || 'web',
        source: item.source || item.channel || 'web',
        metadata: item.metadata || {},
      });
    }

    if (!question && !answer && safeString(item.content)) {
      messages.push({
        id: `${baseId}-content`,
        role: 'assistant',
        content: safeString(item.content),
        createdAt: timestamp,
        channel: item.channel || 'web',
        source: item.source || item.channel || 'web',
        metadata: item.metadata || {},
      });
    }
  });

  return {
    tenantId: resolvedTenantId,
    conversation: thread,
    messages,
    totalMessages: messages.length,
  };
}

async function ingestPdfKnowledge({
  base64Data,
  fileName = '',
  mimeType = 'application/pdf',
  tenantId = null,
  targetTenantId = null,
  role = '',
  userId = null,
  userName = '',
  title = '',
  channel = 'web',
}) {
  const resolvedTenantId = resolveKnowledgeTenantId({
    tenantId,
    targetTenantId,
    role,
  });

  if (!resolvedTenantId && !(role === 'superadmin' || role === 'superadministrador')) {
    throw new Error('No se pudo determinar el tenant para indexar el PDF');
  }

  const buffer = decodePdfBuffer(base64Data);
  const fileHash = crypto.createHash('sha1').update(buffer).digest('hex');
  const [existingRagItem, existingKnowledgeDocument] = await Promise.all([
    RagItem.findOne({
      kind: 'knowledge',
      sourceId: fileHash,
      isActive: true,
      ...(resolvedTenantId ? { tenantId: resolvedTenantId } : { tenantId: null }),
    }).lean(),
    KnowledgeDocument.findOne({
      sourceId: fileHash,
      isActive: true,
      ...(resolvedTenantId ? { tenantId: resolvedTenantId } : { tenantId: null }),
    }).lean(),
  ]);

  const existing = existingKnowledgeDocument || existingRagItem;
  if (existing) {
    if (!existingKnowledgeDocument && existingRagItem) {
      await syncKnowledgeVisibilityFromRagItems({
        resolvedTenantId,
        sourceId: fileHash,
      }).catch((error) => {
        console.warn('No se pudo sincronizar knowledge_documents desde ragitems (pdf):', error.message || error);
      });
    }
    const existingView = buildKnowledgeDocumentView(existing, existingRagItem || existingKnowledgeDocument || {});
    return {
      duplicate: true,
      document: {
        sourceId: fileHash,
        tenantId: existingView.tenantId || null,
        title: existingView.title || fileName || 'Documento PDF',
        fileName: existingView.fileName || fileName || null,
        chunkCount: existingView.chunkCount || 0,
        pageCount: existingView.pageCount || null,
        createdAt: existingView.createdAt || null,
        updatedAt: existingView.updatedAt || null,
        storage: existingView.storage,
      },
      chunksImported: 0,
      pages: existingView.pageCount || null,
    };
  }

  let extractedText = '';
  let pageCount = null;
  let pdfInfo = {};
  let parser = null;

  try {
    parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const infoResult = await parser.getInfo({ parsePageInfo: true }).catch(() => null);

    extractedText = safeString(parsed.text || '');
    pageCount = Number.isFinite(infoResult?.total) ? infoResult.total : null;
    pdfInfo = infoResult?.info || {};
  } catch (error) {
    throw new Error(`No se pudo leer el PDF: ${error.message || 'error desconocido'}`);
  } finally {
    if (parser) {
      await parser.destroy().catch(() => null);
    }
  }

  if (!extractedText.trim()) {
    throw new Error('No se detectó texto extraíble en el PDF. Si es un escaneo, necesitará OCR.');
  }

  const documentTitle = safeString(title) || safeString(fileName).replace(/\.pdf$/i, '') || 'Documento PDF';
  const chunks = splitTextIntoChunks(extractedText, 1600, 220);

  if (!chunks.length) {
    throw new Error('No se pudieron generar fragmentos de texto a partir del PDF');
  }

  const createdItems = [];
  const knowledgeChunkRecords = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const chunkEmbedding = await createEmbedding(chunk).catch(() => null);
    const chunkContentHash = crypto.createHash('sha1').update(chunk).digest('hex');
    const chunkRecord = {
      tenantId: resolvedTenantId || null,
      sourceId: fileHash,
      chunkIndex: i,
      title: `${documentTitle}${chunks.length > 1 ? ` - Parte ${i + 1}/${chunks.length}` : ''}`,
      content: chunk,
      summary: truncateText(chunk, 1000),
      sourceType: 'pdf',
      fileName: fileName || `${documentTitle}.pdf`,
      originalTitle: documentTitle,
      mimeType,
      pageCount,
      embedding: chunkEmbedding || undefined,
      contentHash: chunkContentHash,
      importance: i === 0 ? 0.9 : 0.65,
      uploadedBy: userName || '',
      uploadedById: userId ? String(userId) : null,
      metadata: {
        sourceType: 'pdf',
        fileName: fileName || `${documentTitle}.pdf`,
        originalTitle: documentTitle,
        mimeType,
        fileHash,
        pageCount,
        totalChunks: chunks.length,
        chunkIndex: i,
        pdfInfo,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userName || '',
      },
      isActive: true,
    };

    knowledgeChunkRecords.push(chunkRecord);

    const item = await RagItem.create({
      tenantId: resolvedTenantId || null,
      userId: userId ? String(userId) : null,
      userName: safeString(userName),
      role: safeString(role),
      kind: 'knowledge',
      channel: safeString(channel) || 'web',
      conversationId: '',
      source: 'pdf',
      sourceId: fileHash,
      title: `${documentTitle}${chunks.length > 1 ? ` - Parte ${i + 1}/${chunks.length}` : ''}`,
      content: chunk,
      summary: truncateText(chunk, 1000),
      metadata: {
        sourceType: 'pdf',
        fileName: fileName || `${documentTitle}.pdf`,
        originalTitle: documentTitle,
        mimeType,
        fileHash,
        pageCount,
        totalChunks: chunks.length,
        chunkIndex: i,
        pdfInfo,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userName || '',
      },
      embedding: chunkEmbedding || undefined,
      contentHash: chunkContentHash,
      importance: i === 0 ? 0.9 : 0.65,
      isActive: true,
    });

    createdItems.push(item);
  }

  await persistKnowledgeVisibilityArtifacts({
    resolvedTenantId,
    sourceId: fileHash,
    sourceType: 'pdf',
    mimeType,
    fileName: fileName || `${documentTitle}.pdf`,
    title: documentTitle,
    originalTitle: documentTitle,
    extractedText,
    pageCount,
    userId,
    userName,
    extraMetadata: {
      pdfInfo,
    },
    chunkRecords: knowledgeChunkRecords,
  });

  const firstCreated = createdItems[0];

  return {
    duplicate: false,
    document: {
      sourceId: fileHash,
      tenantId: resolvedTenantId || null,
      title: documentTitle,
      fileName: fileName || `${documentTitle}.pdf`,
      chunkCount: createdItems.length,
      pageCount,
      createdAt: firstCreated?.createdAt || new Date().toISOString(),
      updatedAt: firstCreated?.updatedAt || new Date().toISOString(),
      uploadedBy: userName || '',
      storage: {
        documentCollection: 'knowledge_documents',
        chunkCollection: 'knowledge_chunks',
        runtimeCollection: 'ragitems',
      },
    },
    chunksImported: createdItems.length,
    pages: pageCount,
  };
}

async function storeKnowledgeChunks({
  resolvedTenantId,
  userId = null,
  userName = '',
  role = '',
  channel = 'web',
  sourceType = 'document',
  mimeType = '',
  fileName = '',
  title = '',
  sourceId = '',
  extractedText = '',
  pageCount = null,
  extraMetadata = {},
}) {
  const text = safeString(extractedText);

  if (!text.trim()) {
    throw new Error('No se detectó texto utilizable en el documento');
  }

  const [existingRagItem, existingKnowledgeDocument] = await Promise.all([
    RagItem.findOne({
      kind: 'knowledge',
      sourceId,
      isActive: true,
      ...(resolvedTenantId ? { tenantId: resolvedTenantId } : { tenantId: null }),
    }).lean(),
    KnowledgeDocument.findOne({
      sourceId,
      isActive: true,
      ...(resolvedTenantId ? { tenantId: resolvedTenantId } : { tenantId: null }),
    }).lean(),
  ]);

  const existing = existingKnowledgeDocument || existingRagItem;

  if (existing) {
    if (!existingKnowledgeDocument && existingRagItem) {
      await syncKnowledgeVisibilityFromRagItems({
        resolvedTenantId,
        sourceId,
      }).catch((error) => {
        console.warn('No se pudo sincronizar knowledge_documents desde ragitems:', error.message || error);
      });
    }
    const existingView = buildKnowledgeDocumentView(existing, existingRagItem || existingKnowledgeDocument || {});
    return {
      duplicate: true,
      document: {
        sourceId,
        tenantId: existingView.tenantId || null,
        title: existingView.title || fileName || title || 'Documento',
        fileName: existingView.fileName || fileName || null,
        sourceType: existingView.sourceType || sourceType,
        chunkCount: existingView.chunkCount || 0,
        pageCount: existingView.pageCount || null,
        createdAt: existingView.createdAt || null,
        updatedAt: existingView.updatedAt || null,
        storage: existingView.storage,
      },
      chunksImported: 0,
      pages: existingView.pageCount || null,
    };
  }

  const documentTitle = safeString(title) || safeString(fileName).replace(/\.[^.]+$/, '') || 'Documento';
  const chunks = splitTextIntoChunks(text, 1600, 220);

  if (!chunks.length) {
    throw new Error('No se pudieron generar fragmentos de texto a partir del documento');
  }

  const createdItems = [];
  const knowledgeChunkRecords = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i];
    const chunkEmbedding = await createEmbedding(chunk).catch(() => null);
    const chunkContentHash = crypto.createHash('sha1').update(chunk).digest('hex');
    const chunkRecord = {
      tenantId: resolvedTenantId || null,
      sourceId,
      chunkIndex: i,
      title: `${documentTitle}${chunks.length > 1 ? ` - Parte ${i + 1}/${chunks.length}` : ''}`,
      content: chunk,
      summary: truncateText(chunk, 1000),
      sourceType,
      fileName: fileName || documentTitle,
      originalTitle: documentTitle,
      mimeType: mimeType || '',
      pageCount,
      embedding: chunkEmbedding || undefined,
      contentHash: chunkContentHash,
      importance: i === 0 ? 0.9 : 0.65,
      uploadedBy: userName || '',
      uploadedById: userId ? String(userId) : null,
      metadata: {
        sourceType,
        fileName: fileName || documentTitle,
        originalTitle: documentTitle,
        mimeType: mimeType || '',
        pageCount,
        totalChunks: chunks.length,
        chunkIndex: i,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userName || '',
      },
      isActive: true,
    };

    knowledgeChunkRecords.push(chunkRecord);

    const item = await RagItem.create({
      tenantId: resolvedTenantId || null,
      userId: userId ? String(userId) : null,
      userName: safeString(userName),
      role: safeString(role),
      kind: 'knowledge',
      channel: safeString(channel) || 'web',
      conversationId: '',
      source: sourceType,
      sourceId,
      title: `${documentTitle}${chunks.length > 1 ? ` - Parte ${i + 1}/${chunks.length}` : ''}`,
      content: chunk,
      summary: truncateText(chunk, 1000),
      metadata: {
        sourceType,
        fileName: fileName || documentTitle,
        originalTitle: documentTitle,
        mimeType: mimeType || '',
        pageCount,
        totalChunks: chunks.length,
        chunkIndex: i,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userName || '',
        ...extraMetadata,
      },
      embedding: chunkEmbedding || undefined,
      contentHash: chunkContentHash,
      importance: i === 0 ? 0.9 : 0.65,
      isActive: true,
    });

    createdItems.push(item);
  }

  await persistKnowledgeVisibilityArtifacts({
    resolvedTenantId,
    sourceId,
    sourceType,
    mimeType: mimeType || '',
    fileName: fileName || documentTitle,
    title: documentTitle,
    originalTitle: documentTitle,
    extractedText: text,
    pageCount,
    userId,
    userName,
    extraMetadata: {
      ...extraMetadata,
    },
    chunkRecords: knowledgeChunkRecords,
  });

  const firstCreated = createdItems[0];

  return {
    duplicate: false,
    document: {
      sourceId,
      tenantId: resolvedTenantId || null,
      title: documentTitle,
      fileName: fileName || documentTitle,
      sourceType,
      chunkCount: createdItems.length,
      pageCount,
      createdAt: firstCreated?.createdAt || new Date().toISOString(),
      updatedAt: firstCreated?.updatedAt || new Date().toISOString(),
      uploadedBy: userName || '',
      storage: {
        documentCollection: 'knowledge_documents',
        chunkCollection: 'knowledge_chunks',
        runtimeCollection: 'ragitems',
      },
    },
    chunksImported: createdItems.length,
    pages: pageCount,
  };
}

async function ingestKnowledgeDocument({
  base64Data = '',
  rawText = '',
  fileName = '',
  mimeType = '',
  tenantId = null,
  targetTenantId = null,
  role = '',
  userId = null,
  userName = '',
  title = '',
  channel = 'web',
}) {
  const resolvedTenantId = resolveKnowledgeTenantId({
    tenantId,
    targetTenantId,
    role,
  });

  if (!resolvedTenantId && !(role === 'superadmin' || role === 'superadministrador')) {
    throw new Error('No se pudo determinar el tenant para indexar el documento');
  }

  const extracted = await extractDocumentText({
    base64Data,
    rawText,
    fileName,
    mimeType,
  });

  const sourceSeed = extracted.sourceType === 'text'
    ? safeString(rawText || extracted.text)
    : decodeBase64Buffer(base64Data);

  const sourceId = crypto.createHash('sha1').update(sourceSeed).digest('hex');

  return storeKnowledgeChunks({
    resolvedTenantId,
    userId,
    userName,
    role,
    channel,
    sourceType: extracted.sourceType,
    mimeType: extracted.mimeType || mimeType || '',
    fileName: fileName || title || extracted.sourceType,
    title: title || fileName || extracted.sourceType,
    sourceId,
    extractedText: extracted.text,
    pageCount: extracted.pageCount || null,
    extraMetadata: {
      extractionInfo: extracted.info || {},
    },
  });
}

async function transcribeAudioDocument({
  audioBase64 = '',
  fileName = '',
  mimeType = '',
  language = 'es',
  prompt = '',
}) {
  return transcribeAudioBuffer({
    audioBase64,
    fileName,
    mimeType,
    language,
    prompt,
  });
}

async function synthesizeAudioDocument({
  text = '',
  voice = SPEECH_VOICE,
  model = SPEECH_MODEL,
  speed = 1,
}) {
  return synthesizeSpeechAudio({
    text,
    voice,
    model,
    speed,
  });
}

async function buildOperationalContext({ question, tenantId, targetTenantId, role, userId, conversationId, channel = '', manualContext = '' }) {
  const resolvedTenantId = await resolveScopeTenantId({
    tenantId,
    targetTenantId,
    role,
    question,
  });

  const sections = [];
  const sources = [];

  if (resolvedTenantId) {
    const snapshot = await buildTenantSnapshot({
      tenantId: resolvedTenantId,
      role,
      userId,
    });

    if (snapshot.text) {
      sections.push(`### Resumen operativo\n${snapshot.text}`);
      sources.push(...snapshot.sources);
    }
  } else {
    const globalSnapshot = await buildGlobalSnapshot();
    if (globalSnapshot.text) {
      sections.push(`### Resumen global\n${globalSnapshot.text}`);
      sources.push(...globalSnapshot.sources);
    }
  }

  const knowledgeContext = await buildKnowledgeContext({
    question,
    tenantId: resolvedTenantId,
    role,
  });

  if (knowledgeContext.text) {
    sections.push(`### Conocimiento recuperado\n${knowledgeContext.text}`);
    sources.push(...knowledgeContext.sources);
  }

  const clientContext = await buildClientContext({
    question,
    tenantId: resolvedTenantId,
    role,
    userId,
  });

  if (clientContext.text) {
    sections.push(`### Detalle de clientes\n${clientContext.text}`);
    sources.push(...clientContext.sources);
  }

  if (shouldIncludeMemoryContext(question)) {
    const memoryContext = await buildMemoryContext({
      question,
      tenantId: resolvedTenantId,
      userId,
      role,
      conversationId,
      channel,
    });

    if (memoryContext.text) {
      sections.push(`### Memoria relevante\n${memoryContext.text}`);
      sources.push(...memoryContext.sources);
    }
  }

  if (manualContext && safeString(manualContext)) {
    const manualText = truncateText(manualContext, 4000);
    sections.push(`### Contexto adicional\n${manualText}`);
    sources.push(
      buildSource({
        id: 'manual-context',
        title: 'Contexto adicional',
        type: 'manual',
        snippet: manualText,
        importance: 0.9,
      }),
    );
  }

  const joined = sections.join('\n\n---\n\n');
  const trimmed = joined.length > MAX_CONTEXT_CHARS ? joined.slice(0, MAX_CONTEXT_CHARS) : joined;

  return {
    tenantId: resolvedTenantId,
    text: trimmed,
    sources: sources.slice(0, 14),
  };
}

function shouldPersistMemory(question, answer, memorySummary) {
  if (safeString(memorySummary)) return true;
  const cues = /recuerda|prefiero|siempre|nunca|ten en cuenta|a partir de ahora|guarda|memoria|nota|anota/i;
  return cues.test(question) || cues.test(answer);
}

function isLiveOperationalQuestion(question = '') {
  const normalized = normalizeText(question);
  if (!normalized) {
    return false;
  }

  return /(\bcu[aá]nt[oa]s?\b|\bqu[ií]en\b|\bsaldo\b|\bdebe\b|\badeuda\b|\bmora\b|\batraso\b|\bprestamo\b|\bpr[eé]stamo\b|\bcliente\b|\bclientes\b|\bcobrador\b|\bcobradores\b|\btelefono\b|\btel[eé]fono\b|\bnumero\b|\bn[uú]mero\b|\bcontacto\b|\bestado\b|\bvigente\b|\bpagado\b|\bvencid[oa]s?\b)/i.test(normalized);
}

function shouldIncludeMemoryContext(question = '') {
  const normalized = normalizeText(question);
  if (!normalized) {
    return false;
  }

  const memoryCues = /recuerd|memoria|te dije|te coment|como te dije|como te comente|antes|anterior|seguimiento|retomar|continuar/i.test(normalized);
  if (memoryCues) {
    return true;
  }

  if (isLiveOperationalQuestion(normalized)) {
    return false;
  }

  return true;
}

async function storeConversationMemory({
  tenantId,
  userId,
  userName,
  role,
  question,
  answer,
  conversationId,
  channel,
  memorySummary,
  sources = [],
  followUpQuestions = [],
  conversationStatus = 'open',
}) {
  const normalizedChannel = normalizeChannel(channel);
  const turnContent = truncateText(`Pregunta: ${question}\nRespuesta: ${answer}`, 2200);
  const turnEmbedding = await createEmbedding(turnContent).catch(() => null);
  const important = shouldPersistMemory(question, answer, memorySummary);

  const conversationDoc = {
    tenantId: tenantId || null,
    userId: userId ? String(userId) : null,
    userName: safeString(userName),
    role: safeString(role),
    kind: 'conversation',
    channel: normalizedChannel,
    conversationId: safeString(conversationId),
    source: normalizedChannel,
    title: truncateText(question, 90),
    content: turnContent,
    summary: truncateText(memorySummary || answer, 900),
    metadata: {
      sourceCount: sources.length,
      followUpQuestions,
      important,
      memoryType: 'conversation_turn',
      conversationStatus: safeString(conversationStatus || 'open'),
    },
    embedding: turnEmbedding || undefined,
    contentHash: crypto.createHash('sha1').update(turnContent).digest('hex'),
    importance: important ? 0.8 : 0.2,
    isActive: true,
  };

  await RagItem.create(conversationDoc);

  const episodeContent = truncateText(
    `Episodio conversacional:\nPregunta: ${question}\nRespuesta: ${answer}`,
    1200,
  );

  const episodeEmbedding = await createEmbedding(episodeContent).catch(() => null);

  await RagItem.create({
    tenantId: tenantId || null,
    userId: userId ? String(userId) : null,
    userName: safeString(userName),
    role: safeString(role),
    kind: 'memory',
    channel: normalizedChannel,
    conversationId: safeString(conversationId),
    source: normalizedChannel,
    title: truncateText(`Episodio: ${question}`, 90),
    content: episodeContent,
    summary: truncateText(answer || question, 900),
    metadata: {
      memoryType: 'episodic',
      sourceCount: sources.length,
      followUpQuestions,
      conversationId: safeString(conversationId),
      conversationStatus: safeString(conversationStatus || 'open'),
    },
    embedding: episodeEmbedding || undefined,
    contentHash: crypto.createHash('sha1').update(episodeContent).digest('hex'),
    importance: important ? 0.55 : 0.25,
    isActive: true,
  });

  let memoryStored = false;

  if (important && safeString(memorySummary)) {
    const memoryContent = truncateText(memorySummary, 1000);
    const memoryEmbedding = await createEmbedding(memoryContent).catch(() => null);

    await RagItem.create({
      tenantId: tenantId || null,
      userId: userId ? String(userId) : null,
      userName: safeString(userName),
      role: safeString(role),
      kind: 'memory',
      channel: normalizedChannel,
      conversationId: safeString(conversationId),
      source: normalizedChannel,
      title: truncateText(`Memoria: ${question}`, 90),
      content: memoryContent,
      summary: memoryContent,
      metadata: {
        memoryType: 'durable',
        sourceCount: sources.length,
        followUpQuestions,
        memorySummary: memoryContent,
        conversationId: safeString(conversationId),
        conversationStatus: safeString(conversationStatus || 'open'),
      },
      embedding: memoryEmbedding || undefined,
      contentHash: crypto.createHash('sha1').update(memoryContent).digest('hex'),
      importance: 1,
      isActive: true,
    });

    memoryStored = true;
  }

  return {
    memoryStored,
    conversationStored: true,
  };
}

function buildFallbackAnswer({ question, contextText, sources }) {
  const lines = [];
  lines.push('No tengo la IA de OpenAI disponible en este entorno, pero esto es lo que encontre.');
  lines.push('');
  lines.push(`Pregunta: ${question}`);
  if (contextText) {
    lines.push('');
    lines.push('Contexto recuperado:');
    lines.push(contextText);
  }

  if (sources.length) {
    lines.push('');
    lines.push('Fuentes principales:');
    sources.slice(0, 5).forEach((source, index) => {
      lines.push(`${index + 1}. ${source.title} - ${source.snippet}`);
    });
  }

  return lines.join('\n');
}

async function bootstrapKnowledgeVisibilityArtifacts() {
  const knowledgeItems = await RagItem.find({
    kind: 'knowledge',
    isActive: true,
  })
    .select('tenantId sourceId')
    .lean();

  const seen = new Set();
  const syncTasks = [];

  for (const item of knowledgeItems) {
    const sourceId = safeString(item.sourceId);
    if (!sourceId) {
      continue;
    }

    const tenantKey = String(item.tenantId || 'global').toLowerCase();
    const mapKey = `${tenantKey}:${sourceId.toLowerCase()}`;
    if (seen.has(mapKey)) {
      continue;
    }

    seen.add(mapKey);
    syncTasks.push(
      syncKnowledgeVisibilityFromRagItems({
        resolvedTenantId: item.tenantId || null,
        sourceId,
      }),
    );
  }

  const results = await Promise.allSettled(syncTasks);
  return {
    scanned: knowledgeItems.length,
    syncAttempts: syncTasks.length,
    synced: results.filter((result) => result.status === 'fulfilled' && result.value).length,
    skipped: results.filter((result) => result.status === 'fulfilled' && !result.value).length,
    failed: results.filter((result) => result.status === 'rejected').length,
  };
}

async function answerRagQuestion({
  question,
  tenantId,
  targetTenantId = null,
  role = '',
  userId = null,
  userName = '',
  conversationId = '',
  channel = 'web',
  manualContext = '',
}) {
  const cleanQuestion = safeString(question);
  if (!cleanQuestion) {
    throw new Error('La pregunta es obligatoria');
  }

  const normalizedChannel = normalizeChannel(channel);

  const effectiveConversationId = safeString(conversationId) || crypto.randomUUID();

  const context = await buildOperationalContext({
    question: cleanQuestion,
    tenantId,
    targetTenantId,
    role,
    userId,
    conversationId: effectiveConversationId,
    channel: normalizedChannel,
    manualContext,
  });

  const systemPrompt = [
    'Eres el asistente RAG profesional de Prestamos Chito.',
    'Respondes solo con informacion respaldada por el contexto recuperado o por memoria relevante.',
    'Los documentos cargados, incluyendo PDF, Word, imagen y texto, forman parte del contexto recuperado y puedes citarlos cuando sean relevantes.',
    'Si eres superadmin y no hay una oficina seleccionada, puedes usar el contexto global y buscar clientes en todo el sistema para responder con precision.',
    'Para clientes, saldos, atrasos, prestamos, conteos y estado de oficina, prioriza siempre los datos vivos del contexto operativo sobre la memoria historica. Si memoria y contexto vivo contradicen, ignora la memoria.',
    'Si faltan datos, dilo claramente y pide el dato faltante.',
    'No inventes clientes, saldos, fechas ni estados.',
    'No reveles carteras completas, rankings, mora general ni datos de otros clientes en consultas normales. Si la pregunta es de un prospecto o de alguien que pide un prestamo, responde solo con requisitos, pasos y orientacion general.',
    'Si la consulta es para solicitar un prestamo, responde con informacion inteligente, breve y util: requisitos, pasos, condiciones generales y solo los datos indispensables que falten. Si necesitas hacer preguntas, pide solo nombre, cedula, celular, ciudad y monto aproximado si aplica. No hagas listas innecesarias ni expongas datos internos.',
    'Si te preguntan por telefono, numero de contacto o como llamar a la oficina, responde con los telefonos de la oficina activa que aparezcan en el contexto recuperado. Si hay varios numeros, entregalos todos de forma clara y breve.',
    'Si la pregunta trata sobre un cliente o prestamo concreto, enfocate solo en ese caso.',
    'Si el usuario pide una preferencia duradera o una nota importante, resume esa informacion en memory_summary.',
    'Agrega "should_close_conversation": true cuando la respuesta ya quede resuelta y no haga falta seguir el hilo; usa false solo si de verdad debes dejar el caso abierto.',
    'No escribas la frase de cierre dentro de answer; el sistema la agregara cuando corresponda.',
    'Devuelve un JSON valido con esta forma exacta:',
    '{ "answer": "texto para el usuario", "memory_summary": "nota corta o vacia", "follow_up_questions": ["..."], "used_context_ids": ["..."], "should_close_conversation": true }',
    'El texto debe ser en espanol y profesional.',
  ].join(' ');

  let parsed = {};
  let rawContent = '';

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        temperature: 0.2,
        response_format: {
          type: 'json_object',
        },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: JSON.stringify(
              {
                question: cleanQuestion,
                tenantId: context.tenantId,
                role,
                userId: userId ? String(userId) : null,
                conversationId: effectiveConversationId,
                context: context.text,
              },
              null,
              2,
            ),
          },
        ],
      });

      rawContent = completion.choices?.[0]?.message?.content || '';
      parsed = parseJsonPayload(rawContent);
    } catch (error) {
      parsed = {};
    }
  }

  const answer = truncateText(
    parsed.answer || parsed.respuesta || rawContent || buildFallbackAnswer({
      question: cleanQuestion,
      contextText: context.text,
      sources: context.sources,
    }),
    4000,
  );

  const memorySummary = truncateText(parsed.memory_summary || parsed.resumen_memoria || '', 1000);
  const followUpQuestions = Array.isArray(parsed.follow_up_questions)
    ? parsed.follow_up_questions.map((item) => safeString(item)).filter(Boolean).slice(0, 3)
    : [];
  const usedContextIds = Array.isArray(parsed.used_context_ids)
    ? parsed.used_context_ids.map((item) => safeString(item)).filter(Boolean).slice(0, 10)
    : context.sources.map((item) => item.id);
  const shouldCloseConversation = parsed.should_close_conversation !== false;
  const closingPrompt = '¿Hay algo más en lo que te pueda ayudar?';
  const finalAnswer = shouldCloseConversation
    ? `${answer.trim()}\n\n${closingPrompt}`.trim()
    : answer;

  const memoryResult = await storeConversationMemory({
    tenantId: context.tenantId || null,
    userId,
    userName,
    role,
    question: cleanQuestion,
    answer: finalAnswer,
    conversationId: effectiveConversationId,
    channel: normalizedChannel,
    memorySummary,
    sources: context.sources,
    followUpQuestions,
    conversationStatus: shouldCloseConversation ? 'closed' : 'open',
  }).catch(() => ({
    memoryStored: false,
    conversationStored: false,
  }));

  return {
    answer: finalAnswer,
    memorySummary,
    followUpQuestions,
    usedContextIds,
    sources: context.sources,
    contextText: context.text,
    tenantId: context.tenantId,
    memoryStored: memoryResult.memoryStored,
    conversationStored: memoryResult.conversationStored,
    conversationId: effectiveConversationId,
    conversationStatus: shouldCloseConversation ? 'closed' : 'open',
    fallbackMode: !openai,
  };
}

module.exports = {
  createEmbedding,
  answerRagQuestion,
  buildOperationalContext,
  buildGlobalSnapshot,
  buildTenantSnapshot,
  normalizeChannel,
  getConversationThread,
  listConversationThreads,
  ingestKnowledgeDocument,
  archiveKnowledgeDocument,
  restoreKnowledgeDocument,
  deleteKnowledgeDocument,
  synthesizeAudioDocument,
  searchMemoryItems,
  searchKnowledgeItems,
  listKnowledgeDocuments,
  bootstrapKnowledgeVisibilityArtifacts,
  ingestPdfKnowledge,
  transcribeAudioDocument,
  resolveScopeTenantId,
  resolveKnowledgeTenantId,
};
