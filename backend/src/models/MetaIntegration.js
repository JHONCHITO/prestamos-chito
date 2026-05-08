const mongoose = require('mongoose');

const channelConfigSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    senderId: {
      type: String,
      default: '',
    },
    accessToken: {
      type: String,
      default: '',
    },
    verifyToken: {
      type: String,
      default: '',
    },
    appSecret: {
      type: String,
      default: '',
    },
    businessAccountId: {
      type: String,
      default: '',
    },
    pageId: {
      type: String,
      default: '',
    },
    phoneNumberId: {
      type: String,
      default: '',
    },
    instagramUserId: {
      type: String,
      default: '',
    },
    graphApiVersion: {
      type: String,
      default: '',
    },
    defaultReplyMode: {
      type: String,
      enum: ['auto', 'human_only', 'auto_then_human'],
      default: 'auto',
    },
    welcomeMessage: {
      type: String,
      default: '',
    },
    fallbackMessage: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { _id: false },
);

const metaIntegrationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: '',
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    autoReplyEnabled: {
      type: Boolean,
      default: true,
    },
    webhookVerifyToken: {
      type: String,
      default: '',
    },
    webhookAppSecret: {
      type: String,
      default: '',
    },
    graphApiVersion: {
      type: String,
      default: '',
    },
    channels: {
      whatsapp: {
        type: channelConfigSchema,
        default: () => ({}),
      },
      instagram: {
        type: channelConfigSchema,
        default: () => ({}),
      },
      facebook: {
        type: channelConfigSchema,
        default: () => ({}),
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdBy: {
      type: String,
      default: '',
    },
    updatedBy: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.models.MetaIntegration || mongoose.model('MetaIntegration', metaIntegrationSchema, 'metaintegrations');
