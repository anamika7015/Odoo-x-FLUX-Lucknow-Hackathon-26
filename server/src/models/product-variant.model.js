import mongoose from 'mongoose';
import { productStatuses } from './product.model.js';

const productVariantSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
  normalizedName: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
  attribute: { type: String, required: true, trim: true, maxlength: 80 },
  additionalPrice: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: Object.values(productStatuses), default: productStatuses.ACTIVE, index: true },
}, { timestamps: true, versionKey: false });

productVariantSchema.index({ product: 1, normalizedName: 1 }, { unique: true });
productVariantSchema.index({ product: 1, status: 1 });
export const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);
