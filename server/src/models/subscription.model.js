import mongoose from 'mongoose';

export const subscriptionStatuses = Object.freeze({ DRAFT: 'DRAFT', QUOTATION: 'QUOTATION', CONFIRMED: 'CONFIRMED', ACTIVE: 'ACTIVE', PAUSED: 'PAUSED', CLOSED: 'CLOSED', EXPIRED: 'EXPIRED' });

const lineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
  variantName: { type: String, default: '' },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  planName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  billingFrequency: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'], required: true },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  subscriptionNumber: { type: String, required: true, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  customerSnapshot: { fullName: String, email: String, companyName: String, billingAddress: String, taxId: String },
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', unique: true, sparse: true },
  lines: { type: [lineSchema], validate: (lines) => lines.length > 0 },
  currency: { type: String, required: true },
  subtotal: { type: Number, required: true, min: 0 },
  paymentTerms: { type: String, trim: true, maxlength: 2_000, default: '' },
  discountCode: { type: String, trim: true, uppercase: true, maxlength: 40 },
  status: { type: String, enum: Object.values(subscriptionStatuses), default: subscriptionStatuses.CONFIRMED, index: true },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date },
  nextBillingDate: { type: Date, index: true },
  autoClose: { type: Boolean, default: false },
  allowEarlyClosure: { type: Boolean, default: false },
  allowPause: { type: Boolean, default: false },
  allowRenewal: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  closedAt: { type: Date },
}, { timestamps: true, versionKey: false });

subscriptionSchema.index({ status: 1, nextBillingDate: 1 });
subscriptionSchema.index({ customer: 1, createdAt: -1 });
subscriptionSchema.index({ status: 1, createdAt: -1 });
export const Subscription = mongoose.model('Subscription', subscriptionSchema);
