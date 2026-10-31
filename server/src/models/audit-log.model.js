import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, maxlength: 100 },
  entityType: { type: String, required: true, maxlength: 80 },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, versionKey: false });

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
