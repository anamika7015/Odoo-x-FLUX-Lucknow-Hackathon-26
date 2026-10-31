import mongoose from 'mongoose';

export const invoiceStatuses = Object.freeze({ DRAFT: 'DRAFT', CONFIRMED: 'CONFIRMED', PAID: 'PAID', CANCELLED: 'CANCELLED' });

const taxSnapshotSchema = new mongoose.Schema({
  tax: { type: mongoose.Schema.Types.ObjectId, ref: 'Tax' },
  name: { type: String, required: true },
  rateBasisPoints: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const discountSnapshotSchema = new mongoose.Schema({
  discount: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount' },
  name: { type: String, required: true },
  code: { type: String, required: true },
  type: { type: String, enum: ['FIXED', 'PERCENTAGE'] },
  value: { type: Number, min: 0 },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const invoiceLineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
  variantName: { type: String, default: '' },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  planName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
  taxableSubtotal: { type: Number, required: true, min: 0 },
  discounts: { type: [discountSnapshotSchema], default: [] },
  discountTotal: { type: Number, required: true, min: 0, default: 0 },
  taxes: { type: [taxSnapshotSchema], default: [] },
  taxTotal: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  customerSnapshot: { fullName: String, email: String, companyName: String, billingAddress: String, taxId: String },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  dueDate: { type: Date, required: true, index: true },
  currency: { type: String, required: true, minlength: 3, maxlength: 3 },
  lines: { type: [invoiceLineSchema], required: true, validate: (lines) => lines.length > 0 },
  subtotal: { type: Number, required: true, min: 0 },
  discounts: { type: [discountSnapshotSchema], default: [] },
  discountTotal: { type: Number, required: true, min: 0, default: 0 },
  taxTotal: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, required: true, min: 0, default: 0 },
  outstanding: { type: Number, required: true, min: 0 },
  status: { type: String, enum: Object.values(invoiceStatuses), default: invoiceStatuses.DRAFT, index: true },
  confirmedAt: { type: Date },
  cancelledAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, versionKey: false });

invoiceSchema.index({ subscription: 1, periodStart: 1, periodEnd: 1 }, { unique: true });
invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ status: 1, confirmedAt: 1 });
export const Invoice = mongoose.model('Invoice', invoiceSchema);
