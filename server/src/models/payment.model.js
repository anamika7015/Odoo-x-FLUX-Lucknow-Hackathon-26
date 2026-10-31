import mongoose from 'mongoose';

export const paymentMethods = Object.freeze({ CASH: 'CASH', BANK_TRANSFER: 'BANK_TRANSFER', CARD: 'CARD', UPI: 'UPI', OTHER: 'OTHER' });

const paymentSchema = new mongoose.Schema({
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  paymentReference: { type: String, trim: true, maxlength: 120 },
  normalizedReference: { type: String, trim: true, lowercase: true, maxlength: 120 },
  method: { type: String, required: true, enum: Object.values(paymentMethods), index: true },
  amount: { type: Number, required: true, min: 1 },
  paymentDate: { type: Date, required: true, index: true },
  note: { type: String, trim: true, maxlength: 1_000, default: '' },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, versionKey: false });

paymentSchema.index({ normalizedReference: 1 }, { unique: true, sparse: true });
paymentSchema.index({ customer: 1, paymentDate: -1 });
export const Payment = mongoose.model('Payment', paymentSchema);
