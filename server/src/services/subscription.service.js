import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { Customer } from '../models/customer.model.js';
import { Plan } from '../models/plan.model.js';
import { ProductVariant } from '../models/product-variant.model.js';
import { Quotation } from '../models/quotation.model.js';
import { QuotationTemplate } from '../models/quotation-template.model.js';
import { Subscription, subscriptionStatuses } from '../models/subscription.model.js';
import { SubscriptionHistory } from '../models/subscription-history.model.js';
import { calculateNextBillingDate } from './plan.service.js';
import { AppError } from '../utils/app-error.js';

const idNumber = (prefix) => `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fail = (message, code, statusCode = 422) => { throw new AppError(message, { code, statusCode }); };

async function resolveLines(inputs) {
  const lines = [];
  const planIds = [...new Set(inputs.map(({ plan }) => plan.toString()))];
  const variantIds = [...new Set(inputs.flatMap(({ variant }) => variant ? [variant.toString()] : []))];
  const plans = await Plan.find({ _id: { $in: planIds } }).populate('product');
  const planById = new Map(plans.map((plan) => [plan._id.toString(), plan]));
  const variants = await ProductVariant.find({ _id: { $in: variantIds } });
  const variantById = new Map(variants.map((variant) => [variant._id.toString(), variant]));
  for (const input of inputs) {
    const plan = planById.get(input.plan.toString());
    if (!plan || plan.status !== 'ACTIVE' || !plan.product || plan.product.status !== 'ACTIVE') fail('A selected plan or product is unavailable.', 'PLAN_UNAVAILABLE');
    const variant = input.variant ? variantById.get(input.variant.toString()) : undefined;
    if (input.variant && (!variant || variant.status !== 'ACTIVE' || variant.product.toString() !== plan.product._id.toString())) fail('The selected product variant is unavailable for this plan.', 'VARIANT_UNAVAILABLE');
    const now = new Date();
    if ((plan.availabilityStartDate && plan.availabilityStartDate > now) || (plan.availabilityEndDate && plan.availabilityEndDate < now)) fail('A selected plan is outside its availability window.', 'PLAN_UNAVAILABLE');
    if (input.quantity < plan.minimumQuantity) fail(`Quantity for ${plan.name} is below its minimum.`, 'MINIMUM_QUANTITY');
    const unitPrice = plan.billingPrice + (variant?.additionalPrice ?? 0);
    const lineTotal = unitPrice * input.quantity;
    if (!Number.isSafeInteger(lineTotal)) fail('A line total is outside the supported money range.', 'AMOUNT_OUT_OF_RANGE');
    lines.push({ product: plan.product._id, productName: plan.product.name, variant: variant?._id, variantName: variant?.name ?? '', plan: plan._id, planName: plan.name, quantity: input.quantity, unitPrice, currency: plan.currency, billingFrequency: plan.billingFrequency, lineTotal });
  }
  const currencies = new Set(lines.map(({ currency }) => currency));
  if (currencies.size !== 1) fail('All quotation lines must use the same currency.', 'MIXED_CURRENCIES');
  return lines;
}

async function findCustomerForUser(customerId, user) {
  const filter = user.role === 'CUSTOMER' ? { _id: customerId, email: user.email } : { _id: customerId };
  const customer = await Customer.findOne(filter);
  if (!customer) fail('Customer not found.', 'CUSTOMER_NOT_FOUND', 404);
  return customer;
}

export async function createQuotationTemplate(input, actorId) {
  const lines = await resolveLines(input.lines);
  return QuotationTemplate.create({ ...input, normalizedName: input.name.toLowerCase(), lines: lines.map(({ plan, variant, quantity }) => ({ plan, variant, quantity })), createdBy: actorId });
}

export async function listQuotationTemplates({ page, limit, status }) {
  const filter = status ? { status } : {};
  const [items, total] = await Promise.all([QuotationTemplate.find(filter).populate('lines.plan', 'name billingPrice currency billingFrequency').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), QuotationTemplate.countDocuments(filter)]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function createQuotation(input, actor) {
  const customer = await findCustomerForUser(input.customer, actor);
  let template;
  let sourceLines = input.lines;
  if (input.template) {
    template = await QuotationTemplate.findOne({ _id: input.template, status: 'ACTIVE' });
    if (!template) fail('Quotation template not found or inactive.', 'TEMPLATE_NOT_FOUND', 404);
    sourceLines ??= template.lines.map(({ plan, variant, quantity }) => ({ plan: plan.toString(), ...(variant ? { variant: variant.toString() } : {}), quantity }));
  }
  const lines = await resolveLines(sourceLines);
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  if (!Number.isSafeInteger(subtotal)) fail('Quotation total is outside the supported money range.', 'AMOUNT_OUT_OF_RANGE');
  const validityDays = input.validityDays ?? template?.validityDays ?? 30;
  const validUntil = new Date(Date.now() + validityDays * 86_400_000);
  const quotation = await Quotation.create({
    quotationNumber: idNumber('QT'), customer: customer._id,
    customerSnapshot: { fullName: customer.fullName, email: customer.email, companyName: customer.companyName, billingAddress: customer.billingAddress, taxId: customer.taxId },
    template: template?._id, lines, subtotal, currency: lines[0].currency,
    paymentTerms: input.paymentTerms ?? template?.paymentTerms ?? '', validUntil, createdBy: actor._id,
  });
  return quotation;
}

export async function listQuotations(query, actor) {
  const filter = {};
  if (actor.role === 'CUSTOMER') {
    const customer = await Customer.findOne({ email: actor.email }).select('_id');
    if (!customer) return { items: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
    filter.customer = customer._id;
  }
  if (query.status) filter.status = query.status;
  if (query.search) filter.quotationNumber = { $regex: escapeRegex(query.search), $options: 'i' };
  const [items, total] = await Promise.all([Quotation.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit), Quotation.countDocuments(filter)]);
  return { items, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

async function getQuotation(id, actor, session) {
  const quote = await Quotation.findById(id).session(session || null);
  if (!quote) fail('Quotation not found.', 'QUOTATION_NOT_FOUND', 404);
  if (actor.role === 'CUSTOMER') {
    const customer = await Customer.findOne({ _id: quote.customer, email: actor.email }).select('_id');
    if (!customer) fail('Quotation not found.', 'QUOTATION_NOT_FOUND', 404);
  }
  return quote;
}

export async function getQuotationById(id, actor) { return getQuotation(id, actor); }

export async function publishQuotation(id, actor) {
  const quote = await getQuotation(id, actor);
  if (quote.status !== 'DRAFT') fail('Only a draft quotation can be published.', 'QUOTATION_NOT_DRAFT', 409);
  if (quote.validUntil < new Date()) { quote.status = 'EXPIRED'; await quote.save(); fail('This quotation has expired.', 'QUOTATION_EXPIRED', 409); }
  quote.status = 'QUOTATION';
  await quote.save();
  return quote;
}

export async function acceptQuotation(id, actor) {
  const quote = await getQuotation(id, actor);
  if (quote.validUntil < new Date()) {
    quote.status = 'EXPIRED'; await quote.save();
    fail('This quotation has expired.', 'QUOTATION_EXPIRED', 409);
  }
  if (quote.status !== 'QUOTATION') fail('Only a published quotation can be accepted.', 'QUOTATION_NOT_OPEN', 409);
  quote.status = 'CONFIRMED'; quote.acceptedAt = new Date();
  await quote.save();
  return quote;
}

export async function convertQuotation(id, actor) {
  const session = await mongoose.startSession();
  let subscription;
  try {
    await session.withTransaction(async () => {
      const quote = await getQuotation(id, actor, session);
      if (quote.status !== 'CONFIRMED' || quote.validUntil < new Date()) fail('Quotation must be accepted and unexpired before conversion.', 'QUOTATION_NOT_CONVERTIBLE', 409);
      const startDate = new Date();
      const subscriptionValues = {
        subscriptionNumber: idNumber('SUB'), customer: quote.customer, customerSnapshot: quote.customerSnapshot,
        quotation: quote._id, lines: quote.lines, currency: quote.currency, subtotal: quote.subtotal,
        paymentTerms: quote.paymentTerms, status: subscriptionStatuses.CONFIRMED, startDate,
        createdBy: actor._id,
      };
      const planIds = [...new Set(quote.lines.map(({ plan }) => plan.toString()))];
      const plans = await Plan.find({ _id: { $in: planIds } }).session(session);
      const frequency = new Set(quote.lines.map(({ billingFrequency }) => billingFrequency));
      if (frequency.size !== 1) fail('A subscription requires one billing frequency across all lines.', 'MIXED_BILLING_FREQUENCIES');
      const planById = new Map(plans.map((plan) => [plan._id.toString(), plan]));
      subscriptionValues.nextBillingDate = calculateNextBillingDate(startDate, quote.lines[0].billingFrequency);
      subscriptionValues.autoClose = plans.every((plan) => plan.autoClose);
      subscriptionValues.allowEarlyClosure = plans.every((plan) => plan.allowEarlyClosure);
      subscriptionValues.allowPause = plans.every((plan) => plan.allowPause);
      subscriptionValues.allowRenewal = plans.every((plan) => plan.allowRenewal);
      const autoCloseDates = plans.filter((plan) => plan.autoClose && plan.availabilityEndDate).map((plan) => plan.availabilityEndDate);
      if (autoCloseDates.length) subscriptionValues.expiryDate = new Date(Math.min(...autoCloseDates.map((date) => date.getTime())));
      if (planById.size !== planIds.length) fail('A plan is no longer available.', 'PLAN_UNAVAILABLE');
      [subscription] = await Subscription.create([subscriptionValues], { session });
      quote.status = 'CONVERTED'; quote.convertedAt = new Date(); await quote.save({ session });
      await SubscriptionHistory.create([{ subscription: subscription._id, toStatus: subscription.status, actor: actor._id, reason: 'Converted from accepted quotation.' }], { session });
    });
  } finally { await session.endSession(); }
  return subscription;
}

export async function listSubscriptions(query, actor) {
  const filter = {};
  if (actor.role === 'CUSTOMER') {
    const customer = await Customer.findOne({ email: actor.email }).select('_id');
    if (!customer) return { items: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
    filter.customer = customer._id;
  }
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([Subscription.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit), Subscription.countDocuments(filter)]);
  return { items, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getSubscriptionById(id, actor) {
  const subscription = await Subscription.findById(id);
  if (!subscription) fail('Subscription not found.', 'SUBSCRIPTION_NOT_FOUND', 404);
  if (actor.role === 'CUSTOMER' && !await Customer.exists({ _id: subscription.customer, email: actor.email })) fail('Subscription not found.', 'SUBSCRIPTION_NOT_FOUND', 404);
  const history = await SubscriptionHistory.find({ subscription: id }).sort({ occurredAt: 1 });
  return { subscription, history };
}

export async function transitionSubscription(id, action, actor, reason = '') {
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const subscription = await Subscription.findById(id).session(session);
      if (!subscription || (actor.role === 'CUSTOMER' && !await Customer.exists({ _id: subscription.customer, email: actor.email }))) fail('Subscription not found.', 'SUBSCRIPTION_NOT_FOUND', 404);
      const fromStatus = subscription.status;
      const now = new Date();
      if (action === 'activate' && [subscriptionStatuses.CONFIRMED, subscriptionStatuses.DRAFT].includes(fromStatus)) subscription.status = subscriptionStatuses.ACTIVE;
      else if (action === 'pause' && fromStatus === subscriptionStatuses.ACTIVE && subscription.allowPause) subscription.status = subscriptionStatuses.PAUSED;
      else if (action === 'resume' && fromStatus === subscriptionStatuses.PAUSED) subscription.status = subscriptionStatuses.ACTIVE;
      else if (action === 'close' && [subscriptionStatuses.ACTIVE, subscriptionStatuses.PAUSED, subscriptionStatuses.CONFIRMED].includes(fromStatus) && (subscription.allowEarlyClosure || (subscription.expiryDate && subscription.expiryDate <= now))) { subscription.status = subscriptionStatuses.CLOSED; subscription.closedAt = now; }
      else if (action === 'renew' && [subscriptionStatuses.CLOSED, subscriptionStatuses.EXPIRED].includes(fromStatus) && subscription.allowRenewal) {
        subscription.status = subscriptionStatuses.ACTIVE; subscription.startDate = now; subscription.closedAt = undefined;
        subscription.nextBillingDate = calculateNextBillingDate(now, subscription.lines[0].billingFrequency);
      } else fail(`Cannot ${action} a subscription in ${fromStatus} status.`, 'INVALID_SUBSCRIPTION_TRANSITION', 409);
      if (action === 'activate' || action === 'resume') {
        if (!subscription.nextBillingDate || subscription.nextBillingDate < now) subscription.nextBillingDate = calculateNextBillingDate(now, subscription.lines[0].billingFrequency);
      }
      await subscription.save({ session });
      await SubscriptionHistory.create([{ subscription: subscription._id, fromStatus, toStatus: subscription.status, actor: actor._id, reason }], { session });
      updated = subscription;
    });
  } finally { await session.endSession(); }
  return updated;
}
