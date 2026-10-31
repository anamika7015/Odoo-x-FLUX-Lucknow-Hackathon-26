import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { Customer } from '../models/customer.model.js';
import { AuditLog } from '../models/audit-log.model.js';
import { Plan } from '../models/plan.model.js';
import { ProductVariant } from '../models/product-variant.model.js';
import { Quotation } from '../models/quotation.model.js';
import { QuotationTemplate } from '../models/quotation-template.model.js';
import { Subscription, subscriptionStatuses } from '../models/subscription.model.js';
import { SubscriptionHistory } from '../models/subscription-history.model.js';
import { Tax } from '../models/tax.model.js';
import { calculateTaxAmount } from './invoice.service.js';
import { previewQuotationDiscounts } from './discount.service.js';
import { calculateNextBillingDate } from './plan.service.js';
import { AppError } from '../utils/app-error.js';
import { sendQuotationNotification } from './email.service.js';
import { trustedFilter } from '../utils/trusted-filter.js';
import { createNotificationForEmail } from './notification.service.js';

const idNumber = (prefix) => `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fail = (message, code, statusCode = 422) => { throw new AppError(message, { code, statusCode }); };

async function resolveLines(inputs, session) {
  const lines = [];
  const planIds = [...new Set(inputs.map(({ plan }) => plan.toString()))];
  const variantIds = [...new Set(inputs.flatMap(({ variant }) => variant ? [variant.toString()] : []))];
  const plans = await Plan.find(trustedFilter({ _id: { $in: planIds } })).populate('product').session(session || null);
  const planById = new Map(plans.map((plan) => [plan._id.toString(), plan]));
  const variants = await ProductVariant.find(trustedFilter({ _id: { $in: variantIds } })).session(session || null);
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

async function calculateQuotationTotals(baseLines, discountCode, atDate = new Date(), session) {
  const discounted = await previewQuotationDiscounts(baseLines, discountCode, atDate, session);
  const taxes = await Tax.find({ status: 'ACTIVE' }).session(session || null);
  const lines = discounted.lines.map((line) => {
    const applicable = taxes.filter((tax) => (!tax.effectiveFrom || tax.effectiveFrom <= atDate) && (!tax.effectiveUntil || tax.effectiveUntil >= atDate) && (!tax.appliesTo.length || tax.appliesTo.some((product) => product.toString() === line.product.toString())));
    const taxSnapshots = applicable.map((tax) => ({ tax: tax._id, name: tax.name, rateBasisPoints: tax.rateBasisPoints, amount: calculateTaxAmount(line.taxableSubtotal, tax.rateBasisPoints) }));
    const taxTotal = taxSnapshots.reduce((sum, tax) => sum + tax.amount, 0);
    const total = line.taxableSubtotal + taxTotal;
    if (![taxTotal, total].every(Number.isSafeInteger)) fail('Quotation total is outside the supported money range.', 'AMOUNT_OUT_OF_RANGE');
    return { ...line, taxes: taxSnapshots, taxTotal, total };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const taxTotal = lines.reduce((sum, line) => sum + line.taxTotal, 0);
  const total = subtotal - discounted.discountTotal + taxTotal;
  if (![subtotal, taxTotal, total].every(Number.isSafeInteger)) fail('Quotation total is outside the supported money range.', 'AMOUNT_OUT_OF_RANGE');
  return { lines, discounts: discounted.discounts, subtotal, discountTotal: discounted.discountTotal, taxTotal, total };
}

export async function createQuotationTemplate(input, actorId) {
  const lines = await resolveLines(input.lines);
  return QuotationTemplate.create({ ...input, normalizedName: input.name.toLowerCase(), lines: lines.map(({ plan, variant, quantity }) => ({ plan, variant, quantity })), createdBy: actorId });
}

export async function updateQuotationTemplate(id, input, actor) {
  const session = await mongoose.startSession();
  let template;
  try {
    await session.withTransaction(async () => {
      template = await QuotationTemplate.findById(id).session(session);
      if (!template) fail('Quotation template not found.', 'TEMPLATE_NOT_FOUND', 404);
      const changedFields = Object.keys(input);
      if (input.lines) {
        const lines = await resolveLines(input.lines, session);
        template.lines = lines.map(({ plan, variant, quantity }) => ({ plan, variant, quantity }));
      }
      if (input.name !== undefined) { template.name = input.name; template.normalizedName = input.name.toLowerCase(); }
      if (input.description !== undefined) template.description = input.description;
      if (input.validityDays !== undefined) template.validityDays = input.validityDays;
      if (input.paymentTerms !== undefined) template.paymentTerms = input.paymentTerms;
      if (input.status !== undefined) template.status = input.status;
      await template.save({ session });
      await AuditLog.create([{ actor: actor._id, action: 'QUOTATION_TEMPLATE_UPDATED', entityType: 'QuotationTemplate', entityId: template._id, details: { changedFields } }], { session });
    });
  } finally { await session.endSession(); }
  return template;
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
  const validityDays = input.validityDays ?? template?.validityDays ?? 30;
  const validUntil = new Date(Date.now() + validityDays * 86_400_000);
  const totals = await calculateQuotationTotals(lines, input.discountCode);
  const quotation = await Quotation.create({
    quotationNumber: idNumber('QT'), customer: customer._id,
    customerSnapshot: { fullName: customer.fullName, email: customer.email, companyName: customer.companyName, billingAddress: customer.billingAddress, taxId: customer.taxId },
    template: template?._id, lines: totals.lines, subtotal: totals.subtotal, discountTotal: totals.discountTotal, taxTotal: totals.taxTotal, total: totals.total, discounts: totals.discounts, currency: lines[0].currency,
    paymentTerms: input.paymentTerms ?? template?.paymentTerms ?? '', discountCode: input.discountCode?.toUpperCase(), validUntil, createdBy: actor._id,
  });
  return quotation;
}

export async function updateDraftQuotation(id, input, actor) {
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const quote = await getQuotation(id, actor, session);
      if (quote.status !== 'DRAFT') fail('Only draft quotations can be edited.', 'QUOTATION_NOT_EDITABLE', 409);
      const fields = {};
      if (input.validityDays !== undefined) fields.validUntil = new Date(Date.now() + input.validityDays * 86_400_000);
      if (input.paymentTerms !== undefined) fields.paymentTerms = input.paymentTerms;
      const baseLines = input.lines !== undefined ? await resolveLines(input.lines, session) : quote.lines.map((line) => ({ product: line.product, productName: line.productName, variant: line.variant, variantName: line.variantName, plan: line.plan, planName: line.planName, quantity: line.quantity, unitPrice: line.unitPrice, currency: line.currency, billingFrequency: line.billingFrequency, lineTotal: line.lineTotal }));
      if (input.discountCode !== undefined && input.discountCode !== null) fields.discountCode = input.discountCode.toUpperCase();
      const nextDiscountCode = input.discountCode === null ? undefined : (input.discountCode?.toUpperCase() ?? quote.discountCode);
      if (input.lines !== undefined || input.discountCode !== undefined) {
        const totals = await calculateQuotationTotals(baseLines, nextDiscountCode, new Date(), session);
        Object.assign(fields, { lines: totals.lines, subtotal: totals.subtotal, discountTotal: totals.discountTotal, taxTotal: totals.taxTotal, total: totals.total, discounts: totals.discounts, currency: totals.lines[0].currency });
      }
      updated = await Quotation.findOneAndUpdate({ _id: quote._id, status: 'DRAFT' }, { $set: fields, ...(input.discountCode === null ? { $unset: { discountCode: 1 } } : {}) }, { new: true, runValidators: true, session });
      if (!updated) fail('Only draft quotations can be edited.', 'QUOTATION_NOT_EDITABLE', 409);
      await AuditLog.create([{ actor: actor._id, action: 'QUOTATION_DRAFT_UPDATED', entityType: 'Quotation', entityId: quote._id, details: { changedFields: Object.keys(fields) } }], { session });
    });
  } finally { await session.endSession(); }
  return updated;
}

export async function deleteDraftQuotation(id, actor) {
  const session = await mongoose.startSession();
  let quotationId;
  try {
    await session.withTransaction(async () => {
      const quote = await getQuotation(id, actor, session);
      if (quote.status !== 'DRAFT') fail('Only draft quotations can be deleted.', 'QUOTATION_NOT_DELETABLE', 409);
      const removed = await Quotation.findOneAndDelete({ _id: quote._id, status: 'DRAFT' }).session(session);
      if (!removed) fail('Only draft quotations can be deleted.', 'QUOTATION_NOT_DELETABLE', 409);
      await AuditLog.create([{ actor: actor._id, action: 'QUOTATION_DRAFT_DELETED', entityType: 'Quotation', entityId: quote._id, details: { quotationNumber: quote.quotationNumber } }], { session });
      quotationId = quote._id;
    });
  } finally { await session.endSession(); }
  return { quotationId };
}

export async function listQuotations(query, actor) {
  const filter = {};
  if (actor.role === 'CUSTOMER') {
    const customer = await Customer.findOne({ email: actor.email }).select('_id');
    if (!customer) return { items: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
    filter.customer = customer._id;
  }
  if (query.status) filter.status = query.status;
  if (query.search) filter.quotationNumber = trustedFilter({ $regex: escapeRegex(query.search), $options: 'i' });
  const safeFilter = trustedFilter(filter);
  const [items, total] = await Promise.all([Quotation.find(safeFilter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit), Quotation.countDocuments(safeFilter)]);
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
  await createNotificationForEmail(quote.customerSnapshot.email, {
    type: 'QUOTATION', title: 'New quotation available',
    message: `Quotation ${quote.quotationNumber} is ready for your review.`, href: '/quotations',
  }).catch(() => {});
  return quote;
}

export async function emailQuotation(id, actor) {
  const quote = await getQuotation(id, actor);
  if (quote.status !== 'QUOTATION') fail('Only a published quotation can be emailed.', 'QUOTATION_NOT_SENDABLE', 409);
  if (quote.validUntil < new Date()) fail('This quotation has expired.', 'QUOTATION_EXPIRED', 409);
  const sent = await sendQuotationNotification({
    to: quote.customerSnapshot.email,
    fullName: quote.customerSnapshot.fullName || quote.customerSnapshot.companyName || 'Customer',
    quotationNumber: quote.quotationNumber,
    lines: quote.lines,
    subtotal: quote.subtotal,
    discountTotal: quote.discountTotal,
    taxTotal: quote.taxTotal,
    total: quote.total,
    currency: quote.currency,
    validUntil: quote.validUntil,
    eventId: `${quote._id}-${Date.now()}`,
  });
  if (!sent) fail('Quotation email could not be delivered. Check server SMTP configuration and retry.', 'QUOTATION_EMAIL_FAILED', 503);
  await AuditLog.create({ actor: actor._id, action: 'QUOTATION_EMAIL_SENT', entityType: 'Quotation', entityId: quote._id, details: { quotationNumber: quote.quotationNumber, recipient: quote.customerSnapshot.email } });
  return { quotationNumber: quote.quotationNumber, recipient: quote.customerSnapshot.email, sentAt: new Date() };
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

export async function rejectQuotation(id, actor) {
  const quote = await getQuotation(id, actor);
  if (quote.validUntil < new Date()) {
    quote.status = 'EXPIRED';
    await quote.save();
    fail('This quotation has expired.', 'QUOTATION_EXPIRED', 409);
  }
  if (quote.status !== 'QUOTATION') fail('Only a published quotation can be rejected.', 'QUOTATION_NOT_OPEN', 409);
  quote.status = 'REJECTED';
  quote.rejectedAt = new Date();
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
        paymentTerms: quote.paymentTerms, discountCode: quote.discountCode, status: subscriptionStatuses.CONFIRMED, startDate,
        createdBy: actor._id,
      };
      const planIds = [...new Set(quote.lines.map(({ plan }) => plan.toString()))];
      const plans = await Plan.find(trustedFilter({ _id: { $in: planIds } })).session(session);
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

export async function updateConfirmedSubscription(id, input, actor) {
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const subscription = await Subscription.findById(id).session(session);
      if (!subscription || (actor.role === 'CUSTOMER' && !await Customer.exists({ _id: subscription.customer, email: actor.email }).session(session))) fail('Subscription not found.', 'SUBSCRIPTION_NOT_FOUND', 404);
      if (subscription.status !== subscriptionStatuses.CONFIRMED) fail('Only confirmed, not-yet-active subscriptions can be edited.', 'SUBSCRIPTION_NOT_EDITABLE', 409);
      const changedFields = [];
      if (input.lines) {
        if (input.lines.length !== subscription.lines.length) fail('Subscription line count cannot be changed after conversion.', 'SUBSCRIPTION_LINES_IMMUTABLE');
        const planIds = [...new Set(subscription.lines.map((line) => line.plan.toString()))];
        const plans = await Plan.find(trustedFilter({ _id: { $in: planIds } })).session(session).select('_id minimumQuantity');
        const planById = new Map(plans.map((plan) => [plan._id.toString(), plan]));
        const lines = subscription.lines.map((line, index) => {
          const quantity = input.lines[index].quantity;
          const plan = planById.get(line.plan.toString());
          if (!plan || quantity < plan.minimumQuantity) fail(`Quantity for ${line.planName} is below its current minimum.`, 'MINIMUM_QUANTITY');
          const lineTotal = line.unitPrice * quantity;
          if (!Number.isSafeInteger(lineTotal)) fail('Subscription line total is outside the supported money range.', 'AMOUNT_OUT_OF_RANGE');
          return { ...line.toObject(), quantity, lineTotal };
        });
        const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
        if (!Number.isSafeInteger(subtotal)) fail('Subscription total is outside the supported money range.', 'AMOUNT_OUT_OF_RANGE');
        subscription.lines = lines;
        subscription.subtotal = subtotal;
        changedFields.push('lines', 'subtotal');
      }
      if (input.paymentTerms !== undefined) { subscription.paymentTerms = input.paymentTerms; changedFields.push('paymentTerms'); }
      await subscription.save({ session });
      await AuditLog.create([{ actor: actor._id, action: 'CONFIRMED_SUBSCRIPTION_UPDATED', entityType: 'Subscription', entityId: subscription._id, details: { changedFields } }], { session });
      updated = subscription;
    });
  } finally { await session.endSession(); }
  return updated;
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
