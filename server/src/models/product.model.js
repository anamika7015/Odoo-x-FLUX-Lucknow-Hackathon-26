import mongoose from 'mongoose';

export const productStatuses = Object.freeze({ ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  normalizedName: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
  productType: { type: String, required: true, trim: true, maxlength: 80, index: true },
  description: { type: String, trim: true, maxlength: 4_000, default: '' },
  salesPrice: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true, trim: true, minlength: 3, maxlength: 3, default: 'INR' },
  notes: { type: String, trim: true, maxlength: 4_000, default: '' },
  status: { type: String, enum: Object.values(productStatuses), default: productStatuses.ACTIVE, index: true },
}, { timestamps: true, versionKey: false });

productSchema.index({ normalizedName: 1, productType: 1 }, { unique: true });
productSchema.index({ status: 1, createdAt: -1 });
export const Product = mongoose.model('Product', productSchema);
