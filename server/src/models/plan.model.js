import mongoose from 'mongoose';

export const billingFrequencies = Object.freeze({ DAILY: 'DAILY', WEEKLY: 'WEEKLY', MONTHLY: 'MONTHLY', YEARLY: 'YEARLY' });
export const planStatuses = Object.freeze({ ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' });

const planSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
  normalizedName: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  description: { type: String, trim: true, maxlength: 4_000, default: '' },
  billingPrice: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3, default: 'INR' },
  billingFrequency: { type: String, required: true, enum: Object.values(billingFrequencies), index: true },
  minimumQuantity: { type: Number, required: true, min: 1, default: 1 },
  availabilityStartDate: { type: Date },
  availabilityEndDate: { type: Date },
  autoClose: { type: Boolean, default: false },
  allowEarlyClosure: { type: Boolean, default: false },
  allowPause: { type: Boolean, default: false },
  allowRenewal: { type: Boolean, default: true },
  status: { type: String, enum: Object.values(planStatuses), default: planStatuses.ACTIVE, index: true },
}, { timestamps: true, versionKey: false });

planSchema.index({ product: 1, normalizedName: 1 }, { unique: true });
planSchema.index({ status: 1, billingFrequency: 1, availabilityStartDate: 1, availabilityEndDate: 1 });
export const Plan = mongoose.model('Plan', planSchema);
