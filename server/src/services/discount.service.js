import mongoose from 'mongoose';
import { AuditLog } from '../models/audit-log.model.js';
import { Discount, discountTargets, discountTypes } from '../models/discount.model.js';
import { Product } from '../models/product.model.js';
import { AppError } from '../utils/app-error.js';
import { createDiscountSchema } from '../validators/discount.validator.js';
import { trustedFilter } from '../utils/trusted-filter.js';

const fail = (message, code, statusCode = 422, details) => { throw new AppError(message, { code, statusCode, details }); };
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function calculateDiscountAmount(gross, type, value) {
  if (!Number.isSafeInteger(gross) || gross < 0 || !Number.isSafeInteger(value) || value < 0) fail('Discount calculation requires integer minor units.', 'INVALID_DISCOUNT_AMOUNT');
  if (type === discountTypes.FIXED) return Math.min(gross, value);
  if (type === discountTypes.PERCENTAGE) return Number((BigInt(gross) * BigInt(value) + 5_000n) / 10_000n);
  fail('Unsupported discount type.', 'INVALID_DISCOUNT_TYPE');
}

async function validateProducts(ids) {
  const unique = [...new Set(ids ?? [])];
  if (!unique.length) return unique;
  const found = await Product.countDocuments(trustedFilter({ _id: { $in: unique } }));
  if (found !== unique.length) fail('One or more discount products were not found.', 'PRODUCT_NOT_FOUND');
  return unique;
}

export async function createDiscount(input, actorId) {
  const appliesTo = await validateProducts(input.appliesTo);
  const session = await mongoose.startSession();
  let discount;
  try {
    await session.withTransaction(async () => {
      [discount] = await Discount.create([{ ...input, appliesTo, code: input.code.toUpperCase(), normalizedCode: input.code.toLowerCase(), createdBy: actorId }], { session });
      await AuditLog.create([{ actor: actorId, action: 'DISCOUNT_CREATED', entityType: 'Discount', entityId: discount._id, details: { code: discount.code, type: discount.type, targetType: discount.targetType } }], { session });
    });
  } finally { await session.endSession(); }
  return discount;
}

export async function listDiscounts({ page, limit, status, search }) {
  const filter = status ? { status } : {};
  if (search) filter.$or = [{ name: { $regex: escapeRegex(search), $options: 'i' } }, { code: { $regex: escapeRegex(search), $options: 'i' } }];
  const safeFilter = trustedFilter(filter);
  const [items, total] = await Promise.all([Discount.find(safeFilter).populate('appliesTo', 'name').sort({ priority: 1, createdAt: -1 }).skip((page - 1) * limit).limit(limit), Discount.countDocuments(safeFilter)]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function updateDiscount(discountId, input, actorId) {
  const session = await mongoose.startSession();
  let discount;
  try {
    await session.withTransaction(async () => {
      discount = await Discount.findById(discountId).session(session);
      if (!discount) fail('Discount rule not found.', 'DISCOUNT_NOT_FOUND', 404);
      const merged = {
        name: input.name ?? discount.name, code: input.code ?? discount.code,
        type: input.type ?? discount.type, value: input.value ?? discount.value,
        targetType: input.targetType ?? discount.targetType,
        appliesTo: input.appliesTo ?? discount.appliesTo.map((id) => id.toString()),
        minimumPurchase: input.minimumPurchase ?? discount.minimumPurchase,
        minimumQuantity: input.minimumQuantity ?? discount.minimumQuantity,
        startsAt: input.startsAt === null ? undefined : input.startsAt ?? discount.startsAt,
        endsAt: input.endsAt === null ? undefined : input.endsAt ?? discount.endsAt,
        maxUses: input.maxUses === null ? undefined : input.maxUses ?? discount.maxUses,
        priority: input.priority ?? discount.priority,
        autoApply: input.autoApply ?? discount.autoApply, status: input.status ?? discount.status,
      };
      const checked = createDiscountSchema.safeParse(merged);
      if (!checked.success) fail('Discount rule is invalid.', 'VALIDATION_ERROR', 422, checked.error.flatten());
      const appliesTo = await validateProducts(merged.appliesTo);
      if (merged.maxUses && merged.maxUses < discount.usageCount) fail('Maximum usage cannot be lower than usage already recorded.', 'MAX_USES_BELOW_USAGE');
      Object.assign(discount, merged, { appliesTo, code: merged.code.toUpperCase(), normalizedCode: merged.code.toLowerCase() });
      await discount.save({ session });
      await AuditLog.create([{ actor: actorId, action: 'DISCOUNT_UPDATED', entityType: 'Discount', entityId: discount._id, details: { changedFields: Object.keys(input) } }], { session });
    });
  } finally { await session.endSession(); }
  return discount;
}

function effective(discount, date) {
  return (!discount.startsAt || discount.startsAt <= date) && (!discount.endsAt || discount.endsAt >= date) && (!discount.maxUses || discount.usageCount < discount.maxUses);
}

export async function applyDiscountsToInvoice(lines, subscription, periodStart, session) {
  const code = subscription.discountCode?.toLowerCase();
  const rules = await Discount.find({ status: 'ACTIVE' }).sort({ priority: 1, createdAt: 1 }).session(session);
  const balances = lines.map((line) => line.subtotal);
  const lineDiscounts = lines.map(() => []);
  const snapshots = [];

  for (const discount of rules) {
    if (!effective(discount, periodStart) || (!discount.autoApply && discount.normalizedCode !== code)) continue;
    const indexes = lines.map((_line, index) => index).filter((index) => discount.targetType === discountTargets.SUBSCRIPTION || discount.appliesTo.some((productId) => productId.toString() === lines[index].product.toString()));
    const eligibleGross = indexes.reduce((sum, index) => sum + balances[index], 0);
    const eligibleQuantity = indexes.reduce((sum, index) => sum + lines[index].quantity, 0);
    if (!eligibleGross || eligibleGross < discount.minimumPurchase || eligibleQuantity < discount.minimumQuantity) continue;
    const amount = calculateDiscountAmount(eligibleGross, discount.type, discount.value);
    if (amount <= 0) continue;

    let allocated = 0;
    for (const index of indexes) {
      const share = Number((BigInt(amount) * BigInt(balances[index])) / BigInt(eligibleGross));
      lineDiscounts[index].push({ discount: discount._id, name: discount.name, code: discount.code, amount: share });
      balances[index] -= share;
      allocated += share;
    }
    let remainder = amount - allocated;
    for (const index of indexes) {
      if (!remainder) break;
      if (!balances[index]) continue;
      lineDiscounts[index][lineDiscounts[index].length - 1].amount += 1;
      balances[index] -= 1;
      remainder -= 1;
    }

    const use = await Discount.updateOne(trustedFilter({ _id: discount._id, status: 'ACTIVE', usageCount: discount.usageCount, $or: [{ maxUses: { $exists: false } }, { maxUses: { $gt: discount.usageCount } }] }), { $inc: { usageCount: 1 } }, { session });
    if (use.modifiedCount !== 1) fail(`Discount ${discount.code} reached its usage limit. Retry invoice generation.`, 'DISCOUNT_LIMIT_REACHED', 409);
    snapshots.push({ discount: discount._id, name: discount.name, code: discount.code, type: discount.type, value: discount.value, amount });
  }

  if (code && !snapshots.some((snapshot) => snapshot.code.toLowerCase() === code)) fail('The subscription discount code is no longer eligible for this invoice.', 'DISCOUNT_NOT_ELIGIBLE', 409);

  const updatedLines = lines.map((line, index) => {
    const discountTotal = lineDiscounts[index].reduce((sum, item) => sum + item.amount, 0);
    return { ...line, discounts: lineDiscounts[index], discountTotal, taxableSubtotal: balances[index] };
  });
  return { lines: updatedLines, discounts: snapshots, discountTotal: snapshots.reduce((sum, item) => sum + item.amount, 0) };
}

export async function validateDiscountCode(code, lines, atDate = new Date(), session) {
  const discount = await Discount.findOne({ normalizedCode: code.trim().toLowerCase(), status: 'ACTIVE' }).session(session || null);
  if (!discount || !effective(discount, atDate)) fail('Discount code is invalid, inactive, expired, or fully used.', 'INVALID_DISCOUNT_CODE', 422);
  const indexes = lines.map((_line, index) => index).filter((index) => discount.targetType === discountTargets.SUBSCRIPTION || discount.appliesTo.some((productId) => productId.toString() === lines[index].product.toString()));
  const gross = indexes.reduce((sum, index) => sum + lines[index].lineTotal, 0);
  const quantity = indexes.reduce((sum, index) => sum + lines[index].quantity, 0);
  if (gross < discount.minimumPurchase || quantity < discount.minimumQuantity) fail('Discount code does not meet the minimum purchase or quantity.', 'DISCOUNT_NOT_ELIGIBLE');
  return discount;
}

export async function previewQuotationDiscounts(lines, code, atDate = new Date(), session) {
  const normalizedCode = code?.trim().toLowerCase();
  const rules = await Discount.find({ status: 'ACTIVE' }).sort({ priority: 1, createdAt: 1 }).session(session || null);
  if (normalizedCode && !rules.some((discount) => discount.normalizedCode === normalizedCode && effective(discount, atDate))) fail('Discount code is invalid, inactive, expired, or fully used.', 'INVALID_DISCOUNT_CODE');
  const balances = lines.map((line) => line.lineTotal);
  const lineDiscounts = lines.map(() => []);
  const snapshots = [];
  for (const discount of rules) {
    if (!effective(discount, atDate) || (!discount.autoApply && discount.normalizedCode !== normalizedCode)) continue;
    const indexes = lines.map((_line, index) => index).filter((index) => discount.targetType === discountTargets.SUBSCRIPTION || discount.appliesTo.some((productId) => productId.toString() === lines[index].product.toString()));
    const eligibleGross = indexes.reduce((sum, index) => sum + balances[index], 0);
    const eligibleQuantity = indexes.reduce((sum, index) => sum + lines[index].quantity, 0);
    if (!eligibleGross || eligibleGross < discount.minimumPurchase || eligibleQuantity < discount.minimumQuantity) {
      if (normalizedCode && discount.normalizedCode === normalizedCode) fail('Discount code does not meet the minimum purchase or quantity.', 'DISCOUNT_NOT_ELIGIBLE');
      continue;
    }
    const amount = calculateDiscountAmount(eligibleGross, discount.type, discount.value);
    if (amount <= 0) continue;
    let allocated = 0;
    for (const index of indexes) {
      const share = Number((BigInt(amount) * BigInt(balances[index])) / BigInt(eligibleGross));
      lineDiscounts[index].push({ discount: discount._id, name: discount.name, code: discount.code, amount: share });
      balances[index] -= share;
      allocated += share;
    }
    for (const index of indexes) {
      if (allocated === amount) break;
      if (!balances[index]) continue;
      lineDiscounts[index][lineDiscounts[index].length - 1].amount += 1;
      balances[index] -= 1;
      allocated += 1;
    }
    snapshots.push({ discount: discount._id, name: discount.name, code: discount.code, type: discount.type, value: discount.value, amount });
  }
  if (normalizedCode && !snapshots.some((snapshot) => snapshot.code.toLowerCase() === normalizedCode)) fail('Discount code does not apply to these quotation lines.', 'DISCOUNT_NOT_ELIGIBLE');
  const updatedLines = lines.map((line, index) => ({ ...line, discounts: lineDiscounts[index], discountTotal: lineDiscounts[index].reduce((sum, item) => sum + item.amount, 0), taxableSubtotal: balances[index] }));
  return { lines: updatedLines, discounts: snapshots, discountTotal: snapshots.reduce((sum, item) => sum + item.amount, 0) };
}
