const express = require('express');

const {
  answerRagQuestion,
  ingestKnowledgeDocument,
  listKnowledgeDocuments,
} = require('../services/rag.service');

const router = express.Router();

function buildKnowledgeMessage(duplicate = false) {
  if (duplicate) {
    return 'El documento ya estaba indexado';
  }

  return 'Documento indexado correctamente';
}

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'rag',
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
  });
});

router.get('/documents', async (req, res) => {
  try {
    const user = req.user || {};
    const tenantId = req.tenantId || user.tenantId || null;
    const isSuperAdmin = user.rol === 'superadmin' || user.rol === 'superadministrador';
    const targetTenantId = isSuperAdmin
      ? (req.query?.targetTenantId || req.query?.tenantId || null)
      : null;
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit || 25)));

    const result = await listKnowledgeDocuments({
      tenantId,
      targetTenantId,
      role: user.rol || '',
      limit,
    });

    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('Error en /api/rag/documents:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error interno del servidor',
    });
  }
});

async function handleKnowledgeIngest(req, res) {
  try {
    const user = req.user || {};
    const tenantId = req.tenantId || user.tenantId || null;
    const isSuperAdmin = user.rol === 'superadmin' || user.rol === 'superadministrador';
    const targetTenantId = isSuperAdmin
      ? (req.body?.targetTenantId || req.body?.tenantId || null)
      : null;

    const result = await ingestKnowledgeDocument({
      base64Data: req.body?.base64Data || req.body?.fileBase64 || '',
      rawText: req.body?.rawText || req.body?.text || '',
      fileName: req.body?.fileName || req.body?.name || '',
      mimeType: req.body?.mimeType || '',
      tenantId,
      targetTenantId,
      role: user.rol || '',
      userId: user.id || user._id || null,
      userName: user.nombre || user.email || '',
      title: req.body?.title || req.body?.documentTitle || '',
      channel: req.body?.channel || 'web',
    });

    return res.json({
      ok: true,
      message: buildKnowledgeMessage(result.duplicate),
      ...result,
    });
  } catch (error) {
    console.error('Error en /api/rag/knowledge:', error);
    return res.status(400).json({
      ok: false,
      error: error.message || 'No se pudo procesar el documento',
    });
  }
}

router.post('/knowledge', handleKnowledgeIngest);
router.post('/document', handleKnowledgeIngest);
router.post('/pdf', handleKnowledgeIngest);

router.post('/chat', async (req, res) => {
  try {
    const user = req.user || {};
    const tenantId = req.tenantId || user.tenantId || null;
    const isSuperAdmin = user.rol === 'superadmin' || user.rol === 'superadministrador';
    const targetTenantId = isSuperAdmin
      ? (req.body?.targetTenantId || req.body?.tenantId || null)
      : null;
    const conversationId = req.body?.conversationId || req.body?.sessionId || '';
    const question = req.body?.message || req.body?.question || '';

    if (!question || !String(question).trim()) {
      return res.status(400).json({
        ok: false,
        error: 'La pregunta es requerida',
      });
    }

    const result = await answerRagQuestion({
      question,
      tenantId,
      targetTenantId,
      role: user.rol || '',
      userId: user.id || user._id || null,
      userName: user.nombre || user.email || '',
      conversationId,
      channel: req.body?.channel || 'web',
      manualContext: req.body?.manualContext || '',
    });

    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('Error en /api/rag/chat:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error interno del servidor',
    });
  }
});

module.exports = router;
