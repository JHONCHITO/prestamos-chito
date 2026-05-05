const mongoose = require('mongoose');

const ragItemSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      default: null,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    userName: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      default: '',
    },
    kind: {
      type: String,
      enum: ['conversation', 'memory', 'knowledge', 'system'],
      required: true,
      index: true,
    },
    channel: {
      type: String,
      default: 'web',
      index: true,
    },
    conversationId: {
      type: String,
      default: '',
      index: true,
    },
    source: {
      type: String,
      default: '',
    },
    sourceId: {
      type: String,
      default: '',
      index: true,
    },
    title: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    embedding: {
      type: [Number],
      default: undefined,
    },
    contentHash: {
      type: String,
      default: '',
      index: true,
    },
    importance: {
      type: Number,
      default: 0,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    lastReferencedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

ragItemSchema.index({ tenantId: 1, kind: 1, createdAt: -1 });
ragItemSchema.index({ tenantId: 1, userId: 1, kind: 1, createdAt: -1 });
ragItemSchema.index({ tenantId: 1, conversationId: 1, createdAt: -1 });

module.exports = mongoose.models.RagItem || mongoose.model('RagItem', ragItemSchema);
