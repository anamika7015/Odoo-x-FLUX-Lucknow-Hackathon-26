import mongoose from 'mongoose';

export const billingEventStatuses = Object.freeze({ PROCESSING: 'PROCESSING', SUCCEEDED: 'SUCCEEDED', FAILED: 'FAILED', SKIPPED: 'SKIPPED' });
export const notificationStatuses = Object.freeze({ PENDING: 'PENDING', PROCESSING: 'PROCESSING', SENT: 'SENT', FAILED: 'FAILED' });

const billingEventSchema = new mongoose.Schema({
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  status: { type: String, enum: Object.values(billingEventStatuses), required: true, index: true },
  attempts: { type: Number, required: true, default: 0 },
  lockedAt: { type: Date },
  nextAttemptAt: { type: Date },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  lastError: { type: String, maxlength: 1_000 },
  startedAt: { type: Date },
  completedAt: { type: Date },
  notificationStatus: { type: String, enum: Object.values(notificationStatuses), default: notificationStatuses.PENDING },
  notificationAttempts: { type: Number, default: 0 },
  notificationLockedAt: { type: Date },
  notificationNextAttemptAt: { type: Date },
  notificationError: { type: String, maxlength: 1_000 },
  notificationSentAt: { type: Date },
}, { timestamps: true, versionKey: false });

billingEventSchema.index({ subscription: 1, periodStart: 1 }, { unique: true });
billingEventSchema.index({ status: 1, nextAttemptAt: 1 });
billingEventSchema.index({ status: 1, notificationStatus: 1, notificationNextAttemptAt: 1 });
export const BillingEvent = mongoose.model('BillingEvent', billingEventSchema);
