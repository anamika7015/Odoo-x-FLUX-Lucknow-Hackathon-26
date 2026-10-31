import mongoose from 'mongoose';

export const discountTypes = Object.freeze({ FIXED: 'FIXED', PERCENTAGE: 'PERCENTAGE' });
export const discountTargets = Object.freeze({ PRODUCT: 'PRODUCT', SUBSCRIPTION: 'SUBSCRIPTION' });

const discountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  normalizedCode: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
  type: { type: String, required: true, enum: Object.values(discountTypes) },
  value: { type: Number, required: true, min: 1 }, // paise for FIXED, basis points for PERCENTAGE
  targetType: { type: String, required: true, enum: Object.values(discountTargets) },
  appliesTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  minimumPurchase: { type: Number, min: 0, default: 0 },
  minimumQuantity: { type: Number, min: 1, default: 1 },
  startsAt: { type: Date },
  endsAt: { type: Date },
  maxUses: { type: Number, min: 1 },
  usageCount: { type: Number, min: 0, default: 0 },
  priority: { type: Number, min: 0, max: 10_000, default: 100 },
  autoApply: { type: Boolean, default: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, versionKey: false });

discountSchema.index({ normalizedCode: 1 }, { unique: true });
discountSchema.index({ status: 1, startsAt: 1, endsAt: 1, priority: 1 });
export const Discount = mongoose.model('Discount', discountSchema);
