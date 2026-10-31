import mongoose from 'mongoose';

export const quotationStatuses = Object.freeze({ DRAFT: 'DRAFT', QUOTATION: 'QUOTATION', CONFIRMED: 'CONFIRMED', REJECTED: 'REJECTED', EXPIRED: 'EXPIRED', CONVERTED: 'CONVERTED' });

const quotationLineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
  variantName: { type: String, default: '' },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  planName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, minlength: 3, maxlength: 3 },
  billingFrequency: { type: String, required: true, enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
  lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });

const quotationSchema = new mongoose.Schema({
  quotationNumber: { type: String, required: true, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  customerSnapshot: {
    fullName: { type: String, required: true }, email: { type: String, required: true },
    companyName: { type: String, default: '' }, billingAddress: { type: String, default: '' }, taxId: { type: String, default: '' },
  },
  template: { type: mongoose.Schema.Types.ObjectId, ref: 'QuotationTemplate' },
  lines: { type: [quotationLineSchema], validate: (lines) => lines.length > 0 },
  subtotal: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, minlength: 3, maxlength: 3 },
  paymentTerms: { type: String, trim: true, maxlength: 2_000, default: '' },
  status: { type: String, enum: Object.values(quotationStatuses), default: quotationStatuses.DRAFT, index: true },
  validUntil: { type: Date, required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  acceptedAt: { type: Date },
  convertedAt: { type: Date },
}, { timestamps: true, versionKey: false });

quotationSchema.index({ customer: 1, createdAt: -1 });
quotationSchema.index({ status: 1, validUntil: 1 });
export const Quotation = mongoose.model('Quotation', quotationSchema);
