import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['QUOTATION', 'INVOICE', 'PAYMENT', 'SUBSCRIPTION', 'SYSTEM'], required: true },
  title: { type: String, required: true, maxlength: 140 },
  message: { type: String, required: true, maxlength: 500 },
  href: { type: String, maxlength: 300 },
  readAt: Date,
}, { timestamps: true, versionKey: false });

notificationSchema.index({ recipient: 1, createdAt: -1 });
export const Notification = mongoose.model('Notification', notificationSchema);
