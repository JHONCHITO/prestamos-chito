
const express = require('express');
const jwt = require('jsonwebtoken');
const { enviarMensaje } = require('../services/whatsappService');

const {
  getIntegrationForTenant,
  upsertIntegrationConfig,
  listMetaCampaigns,
  getMetaCampaign,
  previewMetaCampaign,
  createMetaCampaign,
  sendMetaCampaign,
  verifyMetaWebhookChallenge,
  handleMetaWebhook,
} = require('../services/meta.service');


const router = express.Router();

function normalizeTenantId(value = '') {
  const clean = String(value || '').trim().toLowerCase();
  if (!clean || clean === 'system') {
    return '';
  }
  return clean;
}

function isSuperAdminRole(role = '') {
  return ['superadmin', 'superadministrador'].includes(String(role || '').toLowerCase());
}

async function authMetaRequest(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Token requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_temporal');
    req.user = decoded;
    req.metaRole = decoded.rol || '';

    if (decoded.tenantId && decoded.tenantId !== 'system') {
      req.tenantId = normalizeTenantId(decoded.tenantId);
    }

    next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'Token invalido' });
  }
}

function resolveScopeTenantId(req) {
  const role = req.metaRole || req.user?.rol || '';
  if (isSuperAdminRole(role)) {
    return normalizeTenantId(
      req.body?.targetTenantId ||
        req.query?.targetTenantId ||
        req.body?.tenantId ||
        req.query?.tenantId ||
        '',
    );
  }

  return normalizeTenantId(req.tenantId || req.user?.tenantId || '');
}

router.get('/webhook', (req, res) => {
  const verify_token = "chito123";

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log("MODE:", mode);
  console.log("TOKEN:", token);
  console.log("EXPECTED:", verify_token);

  if (mode === 'subscribe' && token === verify_token) {
    console.log('✅ WEBHOOK VERIFICADO');
    return res.status(200).send(challenge);
  } else {
    console.log('❌ TOKEN INCORRECTO');
    return res.sendStatus(403);
  }
});

router.post('/webhook', async (req, res) => {
  router.get('/test-whatsapp', async (req, res) => {
  try {
    await enviarMensaje("573187092130", "Hola Chito 🚀 funcionando");
    res.send("Mensaje enviado");
  } catch (error) {
    res.status(500).send("Error enviando mensaje");
  }
});
  const rawBody = req.rawBody || '';
  const signatureHeader = req.headers['x-hub-signature-256'] || '';
  const body = req.body || {};
  const app = req.app;

  res.status(200).json({ ok: true });

  setImmediate(() => {
    handleMetaWebhook({
      body,
      rawBody,
      signatureHeader,
      app,
    }).catch((error) => {
      console.error('Error procesando webhook Meta:', error);
    });
  });
});

router.get('/config', authMetaRequest, async (req, res) => {
  try {
    const tenantId = resolveScopeTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Debes seleccionar una oficina' });
    }

    const integration = await getIntegrationForTenant(tenantId);
    return res.json({ ok: true, integration });
  } catch (error) {
    console.error('Error obteniendo config Meta:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error interno' });
  }
});

router.put('/config', authMetaRequest, async (req, res) => {
  try {
    const tenantId = resolveScopeTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Debes seleccionar una oficina' });
    }

    const integration = await upsertIntegrationConfig({
      tenantId,
      payload: req.body || {},
      userId: req.user?.id || req.user?._id || null,
      userName: req.user?.nombre || req.user?.email || '',
    });

    return res.json({ ok: true, integration });
  } catch (error) {
    console.error('Error guardando config Meta:', error);
    return res.status(400).json({ ok: false, error: error.message || 'No se pudo guardar la configuracion' });
  }
});

router.get('/campaigns', authMetaRequest, async (req, res) => {
  try {
    const tenantId = resolveScopeTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Debes seleccionar una oficina' });
    }

    const result = await listMetaCampaigns({
      tenantId,
      targetTenantId: tenantId,
      role: req.metaRole || req.user?.rol || '',
      channel: req.query?.channel || '',
      status: req.query?.status || '',
      limit: Math.min(100, Math.max(1, Number(req.query?.limit || 25))),
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Error listando campanas Meta:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error interno' });
  }
});

router.get('/campaigns/:campaignId', authMetaRequest, async (req, res) => {
  try {
    const tenantId = resolveScopeTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Debes seleccionar una oficina' });
    }

    const campaign = await getMetaCampaign({
      tenantId,
      targetTenantId: tenantId,
      role: req.metaRole || req.user?.rol || '',
      campaignId: req.params.campaignId,
    });

    return res.json({ ok: true, campaign });
  } catch (error) {
    console.error('Error obteniendo campana Meta:', error);
    return res.status(404).json({ ok: false, error: error.message || 'Campana no encontrada' });
  }
});

router.post('/campaigns/preview', authMetaRequest, async (req, res) => {
  try {
    const tenantId = resolveScopeTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Debes seleccionar una oficina' });
    }

    const result = await previewMetaCampaign({
      tenantId,
      targetTenantId: tenantId,
      role: req.metaRole || req.user?.rol || '',
      payload: req.body || {},
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Error previsualizando campana Meta:', error);
    return res.status(400).json({ ok: false, error: error.message || 'No se pudo previsualizar la campana' });
  }
});

router.post('/campaigns', authMetaRequest, async (req, res) => {
  try {
    const tenantId = resolveScopeTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Debes seleccionar una oficina' });
    }

    const campaign = await createMetaCampaign({
      tenantId,
      targetTenantId: tenantId,
      role: req.metaRole || req.user?.rol || '',
      payload: req.body || {},
      userId: req.user?.id || req.user?._id || null,
      userName: req.user?.nombre || req.user?.email || '',
    });

    return res.status(201).json({ ok: true, campaign });
  } catch (error) {
    console.error('Error creando campana Meta:', error);
    return res.status(400).json({ ok: false, error: error.message || 'No se pudo crear la campana' });
  }
});

router.post('/campaigns/:campaignId/send', authMetaRequest, async (req, res) => {
  try {
    const tenantId = resolveScopeTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ ok: false, error: 'Debes seleccionar una oficina' });
    }

    const campaign = await sendMetaCampaign({
      campaignId: req.params.campaignId,
      tenantId,
      targetTenantId: tenantId,
      role: req.metaRole || req.user?.rol || '',
      userId: req.user?.id || req.user?._id || null,
      userName: req.user?.nombre || req.user?.email || '',
      allowDraftSend: true,
    });

    return res.json({ ok: true, campaign });
  } catch (error) {
    console.error('Error enviando campana Meta:', error);
    return res.status(400).json({ ok: false, error: error.message || 'No se pudo enviar la campana' });
  }
});


module.exports = router;
