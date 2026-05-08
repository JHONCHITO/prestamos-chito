const mongoose = require('mongoose');

const campaignRecipientSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      default: '',
    },
    externalId: {
      type: String,
      default: '',
    },
    name: {
      type: String,
      default: '',
    },
    destination: {
      type: String,
      default: '',
    },
    channel: {
      type: String,
      default: 'whatsapp',
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
    },
    providerMessageId: {
      type: String,
      default: '',
    },
    error: {
      type: String,
      default: '',
    },
    sentAt: {
      type: Date,
      default: null,
    },
    renderedMessage: {
      type: String,
      default: '',
    },
  },
  { _id: false },
);

const metaCampaignSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: ['whatsapp', 'instagram', 'facebook'],
      default: 'whatsapp',
      index: true,
    },
    sendMode: {
      type: String,
      enum: ['text', 'template'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['draft', 'queued', 'processing', 'completed', 'partial', 'failed'],
      default: 'draft',
      index: true,
    },
    message: {
      type: String,
      default: '',
    },
    templateName: {
      type: String,
      default: '',
    },
    templateLanguage: {
      type: String,
      default: 'es',
    },
    audience: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    recipients: {
      type: [campaignRecipientSchema],
      default: [],
    },
    totals: {
      total: {
        type: Number,
        default: 0,
      },
      sent: {
        type: Number,
        default: 0,
      },
      failed: {
        type: Number,
        default: 0,
      },
      skipped: {
        type: Number,
        default: 0,
      },
      pending: {
        type: Number,
        default: 0,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    scheduleAt: {
      type: Date,
      default: null,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

metaCampaignSchema.index({ tenantId: 1, createdAt: -1 });

module.exports = mongoose.models.MetaCampaign || mongoose.model('MetaCampaign', metaCampaignSchema, 'metacampaigns');
