import mongoose from 'mongoose';

export const taxStatuses = Object.freeze({ ACTIVE: 'ACTIVE', INACTIVE: 'INACTIVE' });

const taxSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  normalizedName: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
  rateBasisPoints: { type: Number, required: true, min: 0, max: 10_000 },
  appliesTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  effectiveFrom: { type: Date },
  effectiveUntil: { type: Date },
  status: { type: String, enum: Object.values(taxStatuses), default: taxStatuses.ACTIVE, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, versionKey: false });

taxSchema.index({ normalizedName: 1 }, { unique: true });
taxSchema.index({ status: 1, effectiveFrom: 1, effectiveUntil: 1 });
export const Tax = mongoose.model('Tax', taxSchema);
