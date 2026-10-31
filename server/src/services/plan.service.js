import { Plan } from '../models/plan.model.js';
import { Product } from '../models/product.model.js';
import { AppError } from '../utils/app-error.js';
import { trustedFilter } from '../utils/trusted-filter.js';

const normalize = (value) => value.trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function calculateNextBillingDate(currentDate, frequency) {
  const next = new Date(currentDate);
  if (Number.isNaN(next.getTime())) throw new AppError('Invalid billing date.', { statusCode: 422, code: 'INVALID_BILLING_DATE' });
  if (frequency === 'DAILY') { next.setUTCDate(next.getUTCDate() + 1); return next; }
  if (frequency === 'WEEKLY') { next.setUTCDate(next.getUTCDate() + 7); return next; }
  const originalDay = next.getUTCDate();
  const monthsToAdd = frequency === 'MONTHLY' ? 1 : 12;
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + monthsToAdd);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(originalDay, lastDay));
  return next;
}

async function verifyProduct(productId) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Associated product not found.', { statusCode: 422, code: 'PRODUCT_NOT_FOUND' });
  return product;
}
export async function createPlan(input) { await verifyProduct(input.product); return Plan.create({ ...input, normalizedName: normalize(input.name) }); }
export async function listPlans({ page, limit, product, status, billingFrequency, search }) {
  const filter = { ...(product ? { product } : {}), ...(status ? { status } : {}), ...(billingFrequency ? { billingFrequency } : {}) };
  if (search) filter.name = { $regex: escapeRegex(search), $options: 'i' };
  const safeFilter = trustedFilter(filter);
  const [items, total] = await Promise.all([Plan.find(safeFilter).populate('product', 'name productType status').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Plan.countDocuments(safeFilter)]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
export async function getPlan(planId) { const plan = await Plan.findById(planId).populate('product', 'name productType status'); if (!plan) throw new AppError('Plan not found.', { statusCode: 404, code: 'PLAN_NOT_FOUND' }); return plan; }
export async function updatePlan(planId, input) {
  const plan = await Plan.findById(planId);
  if (!plan) throw new AppError('Plan not found.', { statusCode: 404, code: 'PLAN_NOT_FOUND' });
  if (input.product) await verifyProduct(input.product);
  const start = input.availabilityStartDate === undefined ? plan.availabilityStartDate : input.availabilityStartDate;
  const end = input.availabilityEndDate === undefined ? plan.availabilityEndDate : input.availabilityEndDate;
  if (start && end && end < start) throw new AppError('Availability end date must not precede start date.', { statusCode: 422, code: 'INVALID_AVAILABILITY' });
  Object.assign(plan, input, input.name ? { normalizedName: normalize(input.name) } : {});
  await plan.save();
  return plan.populate('product', 'name productType status');
}
