import mongoose from 'mongoose';

const subscriptionHistorySchema = new mongoose.Schema({
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
  fromStatus: { type: String },
  toStatus: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, trim: true, maxlength: 1_000, default: '' },
  occurredAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true, versionKey: false });

subscriptionHistorySchema.index({ subscription: 1, occurredAt: -1 });
export const SubscriptionHistory = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
