import mongoose from 'mongoose';
import { AuditLog } from '../models/audit-log.model.js';
import { Customer } from '../models/customer.model.js';
import { User, roles } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { trustedFilter } from '../utils/trusted-filter.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fail = (message, code, statusCode = 422) => { throw new AppError(message, { code, statusCode }); };

export async function listUsers({ page, limit, search, role, status }) {
  const filter = { ...(role ? { role } : {}), ...(status ? { status } : {}) };
  if (search) {
    const escaped = escapeRegex(search);
    filter.$or = [{ fullName: { $regex: escaped, $options: 'i' } }, { email: { $regex: escaped, $options: 'i' } }];
  }
  const [items, total] = await Promise.all([
    User.find(trustedFilter(filter)).select('fullName email role status lastLoginAt createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(trustedFilter(filter)),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function updateUser(userId, input, actor) {
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const user = await User.findById(userId).select('+refreshTokenHash').session(session);
      if (!user) fail('User not found.', 'USER_NOT_FOUND', 404);
      if (user._id.equals(actor._id) && input.status === 'SUSPENDED') fail('You cannot suspend your own account.', 'CANNOT_SUSPEND_SELF', 409);
      if (user.role === roles.ADMIN && user.status === 'ACTIVE' && (input.role && input.role !== roles.ADMIN || input.status === 'SUSPENDED')) {
        // Serialize active-admin changes on a shared anchor to prevent concurrent transactions
        // from both demoting what they each observed as the last remaining administrator.
        const guard = await User.findOne({ role: roles.ADMIN, status: 'ACTIVE' }).sort({ _id: 1 }).select('+adminGuardVersion').session(session);
        if (guard) await User.updateOne({ _id: guard._id }, { $inc: { adminGuardVersion: 1 } }, { session });
        const activeAdmins = await User.countDocuments({ role: roles.ADMIN, status: 'ACTIVE' }).session(session);
        if (activeAdmins <= 1) fail('At least one active administrator must remain.', 'LAST_ACTIVE_ADMIN', 409);
      }
      if (input.role === roles.CUSTOMER && user.role !== roles.CUSTOMER) {
        let customer = await Customer.findOne({ email: user.email }).session(session);
        if (customer?.status === 'INACTIVE') fail('An inactive customer profile cannot be assigned to a portal account.', 'CUSTOMER_ACCOUNT_INACTIVE', 409);
        if (!customer) [customer] = await Customer.create([{ fullName: user.fullName, email: user.email, createdBy: actor._id }], { session });
      }
      const before = { fullName: user.fullName, role: user.role, status: user.status };
      Object.assign(user, input);
      if (user.status === 'SUSPENDED') user.refreshTokenHash = undefined;
      await user.save({ session });
      if (user.role === roles.CUSTOMER && input.fullName) await Customer.updateOne({ email: user.email }, { $set: { fullName: user.fullName } }, { session });
      await AuditLog.create([{ actor: actor._id, action: 'USER_UPDATED', entityType: 'User', entityId: user._id, details: { before, after: { fullName: user.fullName, role: user.role, status: user.status } } }], { session });
      updated = user;
    });
  } finally { await session.endSession(); }
  return updated;
}
