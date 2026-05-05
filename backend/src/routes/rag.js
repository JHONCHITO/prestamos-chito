const express = require('express');

const {
  archiveKnowledgeDocument,
  answerRagQuestion,
  getConversationThread,
  deleteKnowledgeDocument,
  ingestKnowledgeDocument,
  listKnowledgeDocuments,
  listConversationThreads,
  restoreKnowledgeDocument,
  synthesizeAudioDocument,
  transcribeAudioDocument,
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
      includeInactive: String(req.query?.includeInactive || '').toLowerCase() === 'true' || req.query?.includeInactive === '1',
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

router.patch('/documents/:sourceId/archive', async (req, res) => {
  try {
    const user = req.user || {};
    const tenantId = req.tenantId || user.tenantId || null;
    const isSuperAdmin = user.rol === 'superadmin' || user.rol === 'superadministrador';
    const targetTenantId = isSuperAdmin
      ? (req.body?.targetTenantId || req.query?.targetTenantId || req.body?.tenantId || req.query?.tenantId || null)
      : null;

    const result = await archiveKnowledgeDocument({
      tenantId,
      targetTenantId,
      role: user.rol || '',
      sourceId: req.params.sourceId,
    });

    return res.json({
      ok: true,
      message: 'Documento archivado correctamente',
      ...result,
    });
  } catch (error) {
    console.error('Error en /api/rag/documents/:sourceId/archive:', error);
    return res.status(400).json({
      ok: false,
      error: error.message || 'No se pudo archivar el documento',
    });
  }
});

router.patch('/documents/:sourceId/restore', async (req, res) => {
  try {
    const user = req.user || {};
    const tenantId = req.tenantId || user.tenantId || null;
    const isSuperAdmin = user.rol === 'superadmin' || user.rol === 'superadministrador';
    const targetTenantId = isSuperAdmin
      ? (req.body?.targetTenantId || req.query?.targetTenantId || req.body?.tenantId || req.query?.tenantId || null)
      : null;

    const result = await restoreKnowledgeDocument({
      tenantId,
      targetTenantId,
      role: user.rol || '',
      sourceId: req.params.sourceId,
    });

    return res.json({
      ok: true,
      message: 'Documento restaurado correctamente',
      ...result,
    });
  } catch (error) {
    console.error('Error en /api/rag/documents/:sourceId/restore:', error);
    return res.status(400).json({
      ok: false,
      error: error.message || 'No se pudo restaurar el documento',
    });
  }
});

router.delete('/documents/:sourceId', async (req, res) => {
  try {
    const user = req.user || {};
    const tenantId = req.tenantId || user.tenantId || null;
    const isSuperAdmin = user.rol === 'superadmin' || user.rol === 'superadministrador';
    const targetTenantId = isSuperAdmin
      ? (req.body?.targetTenantId || req.query?.targetTenantId || req.body?.tenantId || req.query?.tenantId || null)
      : null;

    const result = await deleteKnowledgeDocument({
      tenantId,
      targetTenantId,
      role: user.rol || '',
      sourceId: req.params.sourceId,
    });

    return res.json({
      ok: true,
      message: 'Documento eliminado correctamente',
      ...result,
    });
  } catch (error) {
    console.error('Error en /api/rag/documents/:sourceId:', error);
    return res.status(400).json({
      ok: false,
      error: error.message || 'No se pudo eliminar el documento',
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

    const io = req.app?.get?.('io');
    if (io) {
      const tenantScope = result.tenantId || tenantId || targetTenantId || null;
      const payload = {
        tenantId: tenantScope,
        conversationId: result.conversationId,
        channel: req.body?.channel || 'web',
        userName: user.nombre || user.email || '',
        question,
        updatedAt: new Date().toISOString(),
      };

      if (tenantScope) {
        io.to(`tenant-${String(tenantScope).toLowerCase()}`).emit('rag:conversation-updated', payload);
      }

      if (user.rol === 'superadmin' || user.rol === 'superadministrador') {
        io.to('superadmin-room').emit('rag:conversation-updated', payload);
      }
    }

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

router.get('/conversations', async (req, res) => {
  try {
    const user = req.user || {};
    const tenantId = req.tenantId || user.tenantId || null;
    const isSuperAdmin = user.rol === 'superadmin' || user.rol === 'superadministrador';
    const targetTenantId = isSuperAdmin
      ? (req.query?.targetTenantId || req.query?.tenantId || null)
      : null;
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit || 25)));

    const result = await listConversationThreads({
      tenantId,
      targetTenantId,
      role: user.rol || '',
      limit,
      channel: req.query?.channel || '',
      search: req.query?.search || '',
    });

    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('Error en /api/rag/conversations:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error interno del servidor',
    });
  }
});

router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const user = req.user || {};
    const tenantId = req.tenantId || user.tenantId || null;
    const isSuperAdmin = user.rol === 'superadmin' || user.rol === 'superadministrador';
    const targetTenantId = isSuperAdmin
      ? (req.query?.targetTenantId || req.query?.tenantId || null)
      : null;

    const result = await getConversationThread({
      tenantId,
      targetTenantId,
      role: user.rol || '',
      conversationId: req.params.conversationId,
      channel: req.query?.channel || '',
    });

    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('Error en /api/rag/conversations/:conversationId/messages:', error);
    return res.status(500).json({
      ok: false,
      error: error.message || 'Error interno del servidor',
    });
  }
});

router.post('/audio/transcribe', async (req, res) => {
  try {
    const result = await transcribeAudioDocument({
      audioBase64: req.body?.audioBase64 || req.body?.base64Data || req.body?.fileBase64 || '',
      fileName: req.body?.fileName || req.body?.name || 'audio.webm',
      mimeType: req.body?.mimeType || req.body?.contentType || 'audio/webm',
      language: req.body?.language || 'es',
      prompt: req.body?.prompt || '',
    });

    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('Error en /api/rag/audio/transcribe:', error);
    return res.status(400).json({
      ok: false,
      error: error.message || 'No se pudo transcribir el audio',
    });
  }
});

router.post('/audio/speech', async (req, res) => {
  try {
    const result = await synthesizeAudioDocument({
      text: req.body?.text || req.body?.message || '',
      voice: req.body?.voice || req.body?.audioVoice || undefined,
      model: req.body?.model || undefined,
      speed: req.body?.speed || 1,
    });

    return res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error('Error en /api/rag/audio/speech:', error);
    return res.status(400).json({
      ok: false,
      error: error.message || 'No se pudo generar el audio',
    });
  }
});

module.exports = router;
