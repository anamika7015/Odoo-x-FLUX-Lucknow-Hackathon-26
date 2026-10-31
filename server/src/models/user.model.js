import mongoose from 'mongoose';

export const roles = Object.freeze({ ADMIN: 'ADMIN', STAFF: 'STAFF', CUSTOMER: 'CUSTOMER' });

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: Object.values(roles), default: roles.CUSTOMER, index: true },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true },
  demoAccount: { type: Boolean, default: false, index: true },
  refreshTokenHash: { type: String, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  passwordChangedAt: { type: Date, select: false },
  lastLoginAt: { type: Date },
  adminGuardVersion: { type: Number, default: 0, select: false },
}, { timestamps: true, versionKey: false });

userSchema.set('toJSON', {
  transform: (_document, returned) => {
    delete returned.passwordHash;
    delete returned.refreshTokenHash;
    delete returned.passwordResetTokenHash;
    delete returned.passwordResetExpiresAt;
    return returned;
  },
});

export const User = mongoose.model('User', userSchema);
