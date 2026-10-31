import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { AuditLog } from '../models/audit-log.model.js';
import { Customer } from '../models/customer.model.js';
import { Invoice, invoiceStatuses } from '../models/invoice.model.js';
import { Subscription } from '../models/subscription.model.js';
import { Tax } from '../models/tax.model.js';
import { calculateNextBillingDate } from './plan.service.js';
import { AppError } from '../utils/app-error.js';

const fail = (message, code, statusCode = 422) => { throw new AppError(message, { code, statusCode }); };
const invoiceNumber = () => `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`;

export function calculateTaxAmount(taxableAmount, rateBasisPoints) {
  if (!Number.isSafeInteger(taxableAmount) || taxableAmount < 0 || !Number.isInteger(rateBasisPoints) || rateBasisPoints < 0) fail('Tax inputs must be non-negative integer minor units and basis points.', 'INVALID_TAX_INPUT');
  const amount = Number((BigInt(taxableAmount) * BigInt(rateBasisPoints) + 5_000n) / 10_000n);
  if (!Number.isSafeInteger(amount)) fail('Tax amount is outside the supported money range.', 'AMOUNT_OUT_OF_RANGE');
  return amount;
}

function isEffective(tax, date) {
  return (!tax.effectiveFrom || tax.effectiveFrom <= date) && (!tax.effectiveUntil || tax.effectiveUntil >= date);
}

export async function createInvoiceFromSubscription({ subscription: subscriptionId, periodStart, dueDate }, actor) {
  const session = await mongoose.startSession();
  let invoice;
  try {
    await session.withTransaction(async () => {
      const subscription = await Subscription.findById(subscriptionId).session(session);
      if (!subscription || ![ 'ACTIVE', 'CONFIRMED' ].includes(subscription.status)) fail('Only a confirmed or active subscription can be invoiced.', 'SUBSCRIPTION_NOT_BILLABLE', 409);
      if (actor.role === 'CUSTOMER' && !await Customer.exists({ _id: subscription.customer, email: actor.email })) fail('Subscription not found.', 'SUBSCRIPTION_NOT_FOUND', 404);
      if (!Number.isFinite(periodStart.getTime())) fail('Invoice period start is invalid.', 'INVALID_BILLING_PERIOD');
      const frequencies = new Set(subscription.lines.map(({ billingFrequency }) => billingFrequency));
      if (frequencies.size !== 1) fail('A subscription must have one billing frequency to be invoiced.', 'MIXED_BILLING_FREQUENCIES');
      const periodEnd = calculateNextBillingDate(periodStart, subscription.lines[0].billingFrequency);
      const effectiveDueDate = dueDate ?? periodEnd;
      if (effectiveDueDate < periodStart) fail('Invoice due date cannot precede its billing period.', 'INVALID_DUE_DATE');

      const taxRules = await Tax.find({ status: 'ACTIVE' }).session(session);
      const invoiceLines = subscription.lines.map((line) => {
        const subtotal = line.unitPrice * line.quantity;
        if (!Number.isSafeInteger(subtotal)) fail('Invoice line subtotal is outside the supported money range.', 'AMOUNT_OUT_OF_RANGE');
        const applicable = taxRules.filter((tax) => isEffective(tax, periodStart) && (!tax.appliesTo.length || tax.appliesTo.some((productId) => productId.toString() === line.product.toString())));
        const taxes = applicable.map((tax) => ({ tax: tax._id, name: tax.name, rateBasisPoints: tax.rateBasisPoints, amount: calculateTaxAmount(subtotal, tax.rateBasisPoints) }));
        const taxTotal = taxes.reduce((sum, tax) => sum + tax.amount, 0);
        const total = subtotal + taxTotal;
        if (![taxTotal, total].every(Number.isSafeInteger)) fail('Invoice line total is outside the supported money range.', 'AMOUNT_OUT_OF_RANGE');
        return { product: line.product, productName: line.productName, variant: line.variant, variantName: line.variantName, plan: line.plan, planName: line.planName, quantity: line.quantity, unitPrice: line.unitPrice, subtotal, taxes, taxTotal, total };
      });
      const subtotal = invoiceLines.reduce((sum, line) => sum + line.subtotal, 0);
      const taxTotal = invoiceLines.reduce((sum, line) => sum + line.taxTotal, 0);
      const total = subtotal + taxTotal;
      if (![subtotal, taxTotal, total].every(Number.isSafeInteger)) fail('Invoice total is outside the supported money range.', 'AMOUNT_OUT_OF_RANGE');
      [invoice] = await Invoice.create([{
        invoiceNumber: invoiceNumber(), customer: subscription.customer, customerSnapshot: subscription.customerSnapshot,
        subscription: subscription._id, periodStart, periodEnd, dueDate: effectiveDueDate, currency: subscription.currency,
        lines: invoiceLines, subtotal, taxTotal, total, amountPaid: 0, outstanding: total, status: invoiceStatuses.DRAFT, createdBy: actor._id,
      }], { session });
      await AuditLog.create([{ actor: actor._id, action: 'INVOICE_CREATED', entityType: 'Invoice', entityId: invoice._id, details: { subscription: subscription._id, periodStart, periodEnd, total } }], { session });
    });
  } finally { await session.endSession(); }
  return invoice;
}

async function assertOwner(invoice, actor) {
  if (actor.role === 'CUSTOMER' && !await Customer.exists({ _id: invoice.customer, email: actor.email })) fail('Invoice not found.', 'INVOICE_NOT_FOUND', 404);
}

export async function listInvoices(query, actor) {
  const filter = {};
  if (actor.role === 'CUSTOMER') {
    const customer = await Customer.findOne({ email: actor.email }).select('_id');
    if (!customer) return { items: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
    filter.customer = customer._id;
  } else if (query.customer) filter.customer = query.customer;
  if (query.subscription) filter.subscription = query.subscription;
  if (query.status === 'OVERDUE') Object.assign(filter, { status: invoiceStatuses.CONFIRMED, dueDate: { $lt: new Date() }, outstanding: { $gt: 0 } });
  else if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([Invoice.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit), Invoice.countDocuments(filter)]);
  return { items, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getInvoice(invoiceId, actor) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) fail('Invoice not found.', 'INVOICE_NOT_FOUND', 404);
  await assertOwner(invoice, actor);
  return invoice;
}

export async function transitionInvoice(invoiceId, action, actor, reason = '') {
  const session = await mongoose.startSession();
  let updated;
  try {
    await session.withTransaction(async () => {
      const invoice = await Invoice.findById(invoiceId).session(session);
      if (!invoice) fail('Invoice not found.', 'INVOICE_NOT_FOUND', 404);
      await assertOwner(invoice, actor);
      const fromStatus = invoice.status;
      if (action === 'confirm' && fromStatus === invoiceStatuses.DRAFT) {
        invoice.status = invoiceStatuses.CONFIRMED;
        invoice.confirmedAt = new Date();
      } else if (action === 'cancel' && [invoiceStatuses.DRAFT, invoiceStatuses.CONFIRMED].includes(fromStatus) && invoice.amountPaid === 0) {
        invoice.status = invoiceStatuses.CANCELLED;
        invoice.cancelledAt = new Date();
      } else fail(`Cannot ${action} an invoice in ${fromStatus} status.`, 'INVALID_INVOICE_TRANSITION', 409);
      await invoice.save({ session });
      const auditAction = action === 'confirm' ? 'INVOICE_CONFIRMED' : 'INVOICE_CANCELLED';
      await AuditLog.create([{ actor: actor._id, action: auditAction, entityType: 'Invoice', entityId: invoice._id, details: { fromStatus, toStatus: invoice.status, reason } }], { session });
      updated = invoice;
    });
  } finally { await session.endSession(); }
  return updated;
}
