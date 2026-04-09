const express = require('express');
const router = express.Router();
const { telegramWebhook } = require('./telegram.controller');

router.post('/webhook', telegramWebhook);

module.exports = router;
