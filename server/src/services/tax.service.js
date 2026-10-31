import mongoose from 'mongoose';
import { Product } from '../models/product.model.js';
import { Tax } from '../models/tax.model.js';
import { AuditLog } from '../models/audit-log.model.js';
import { AppError } from '../utils/app-error.js';
import { trustedFilter } from '../utils/trusted-filter.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function validateProducts(productIds) {
  const ids = [...new Set(productIds)];
  if (!ids.length) return;
  const count = await Product.countDocuments(trustedFilter({ _id: { $in: ids } }));
  if (count !== ids.length) throw new AppError('One or more tax products were not found.', { statusCode: 422, code: 'PRODUCT_NOT_FOUND' });
}

export async function createTax(input, actorId) {
  const appliesTo = [...new Set(input.appliesTo ?? [])];
  await validateProducts(appliesTo);
  const session = await mongoose.startSession();
  let tax;
  try {
    await session.withTransaction(async () => {
      [tax] = await Tax.create([{ ...input, appliesTo, normalizedName: input.name.toLowerCase(), createdBy: actorId }], { session });
      await AuditLog.create([{ actor: actorId, action: 'TAX_CREATED', entityType: 'Tax', entityId: tax._id, details: { rateBasisPoints: tax.rateBasisPoints, appliesTo } }], { session });
    });
  } finally { await session.endSession(); }
  return tax;
}

export async function listTaxes({ page, limit, status, search }) {
  const filter = { ...(status ? { status } : {}) };
  if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };
  const safeFilter = trustedFilter(filter);
  const [items, total] = await Promise.all([Tax.find(safeFilter).populate('appliesTo', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Tax.countDocuments(safeFilter)]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function updateTax(taxId, input, actorId) {
  if (input.appliesTo) {
    input.appliesTo = [...new Set(input.appliesTo)];
    await validateProducts(input.appliesTo);
  }
  const session = await mongoose.startSession();
  let tax;
  try {
    await session.withTransaction(async () => {
      tax = await Tax.findById(taxId).session(session);
      if (!tax) throw new AppError('Tax rule not found.', { statusCode: 404, code: 'TAX_NOT_FOUND' });
      const changedFields = Object.keys(input);
      Object.assign(tax, input, input.name ? { normalizedName: input.name.toLowerCase() } : {});
      await tax.save({ session });
      await AuditLog.create([{ actor: actorId, action: 'TAX_UPDATED', entityType: 'Tax', entityId: tax._id, details: { changedFields } }], { session });
    });
  } finally { await session.endSession(); }
  return tax;
}
