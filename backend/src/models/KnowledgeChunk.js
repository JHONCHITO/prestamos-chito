const mongoose = require('mongoose');

const knowledgeChunkSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      default: null,
      index: true,
    },
    sourceId: {
      type: String,
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      default: 0,
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
    sourceType: {
      type: String,
      default: 'document',
      index: true,
    },
    fileName: {
      type: String,
      default: '',
    },
    originalTitle: {
      type: String,
      default: '',
    },
    mimeType: {
      type: String,
      default: '',
    },
    pageCount: {
      type: Number,
      default: null,
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
    uploadedBy: {
      type: String,
      default: '',
    },
    uploadedById: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'knowledge_chunks',
  },
);

knowledgeChunkSchema.index({ tenantId: 1, sourceId: 1, chunkIndex: 1 }, { unique: true });

module.exports = mongoose.models.KnowledgeChunk || mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
