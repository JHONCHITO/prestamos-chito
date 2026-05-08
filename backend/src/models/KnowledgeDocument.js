const mongoose = require('mongoose');

const knowledgeDocumentSchema = new mongoose.Schema(
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
    title: {
      type: String,
      default: '',
      trim: true,
    },
    fileName: {
      type: String,
      default: '',
    },
    originalTitle: {
      type: String,
      default: '',
    },
    sourceType: {
      type: String,
      default: 'document',
      index: true,
    },
    mimeType: {
      type: String,
      default: '',
    },
    pageCount: {
      type: Number,
      default: null,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    preview: {
      type: String,
      default: '',
    },
    uploadedBy: {
      type: String,
      default: '',
    },
    uploadedById: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastIndexedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'knowledge_documents',
  },
);

knowledgeDocumentSchema.index({ tenantId: 1, sourceId: 1 }, { unique: true });

module.exports = mongoose.models.KnowledgeDocument || mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);
