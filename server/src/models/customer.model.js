import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  phone: { type: String, trim: true, default: '' },
  companyName: { type: String, trim: true, default: '' },
  billingAddress: { type: String, trim: true, default: '' },
  taxId: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

customerSchema.index({ fullName: 'text', email: 'text', companyName: 'text' });

export const Customer = mongoose.model('Customer', customerSchema);
