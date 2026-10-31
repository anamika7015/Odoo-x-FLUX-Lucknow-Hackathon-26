import mongoose from 'mongoose';

const templateLineSchema = new mongoose.Schema({
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
  variant: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const quotationTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  normalizedName: { type: String, required: true, lowercase: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2_000, default: '' },
  validityDays: { type: Number, required: true, min: 1, max: 365, default: 30 },
  paymentTerms: { type: String, trim: true, maxlength: 2_000, default: '' },
  lines: { type: [templateLineSchema], validate: (lines) => lines.length > 0 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, versionKey: false });

quotationTemplateSchema.index({ normalizedName: 1 }, { unique: true });
export const QuotationTemplate = mongoose.model('QuotationTemplate', quotationTemplateSchema);
