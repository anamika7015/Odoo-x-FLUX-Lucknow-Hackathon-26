import mongoose from 'mongoose';
import { AuditLog } from '../models/audit-log.model.js';
import { Customer } from '../models/customer.model.js';
import { Invoice, invoiceStatuses } from '../models/invoice.model.js';
import { Payment } from '../models/payment.model.js';
import { AppError } from '../utils/app-error.js';
import { trustedFilter } from '../utils/trusted-filter.js';
import { createNotificationForEmail } from './notification.service.js';

const fail = (message, code, statusCode = 422) => { throw new AppError(message, { code, statusCode }); };

export function calculateInvoiceBalance(amountPaid, outstanding, paymentAmount) {
  if (![amountPaid, outstanding, paymentAmount].every(Number.isSafeInteger) || amountPaid < 0 || outstanding < 0 || paymentAmount <= 0) fail('Payment amounts must be positive integer minor units.', 'INVALID_PAYMENT_AMOUNT');
  if (paymentAmount > outstanding) fail('Payment cannot exceed the invoice outstanding balance.', 'OVERPAYMENT_NOT_ALLOWED');
  const nextOutstanding = outstanding - paymentAmount;
  const nextPaid = amountPaid + paymentAmount;
  if (!Number.isSafeInteger(nextPaid)) fail('Payment total is outside the supported money range.', 'AMOUNT_OUT_OF_RANGE');
  return { amountPaid: nextPaid, outstanding: nextOutstanding, status: nextOutstanding === 0 ? invoiceStatuses.PAID : invoiceStatuses.CONFIRMED };
}

export async function recordPayment(input, actor) {
  const session = await mongoose.startSession();
  let payment;
  try {
    await session.withTransaction(async () => {
      const invoice = await Invoice.findById(input.invoice).session(session);
      if (!invoice) fail('Invoice not found.', 'INVOICE_NOT_FOUND', 404);
      if (actor.role === 'CUSTOMER' && !await Customer.exists({ _id: invoice.customer, email: actor.email })) fail('Invoice not found.', 'INVOICE_NOT_FOUND', 404);
      if (invoice.status !== invoiceStatuses.CONFIRMED || invoice.outstanding <= 0) fail('Only confirmed invoices with an outstanding balance can receive payment.', 'INVOICE_NOT_PAYABLE', 409);
      const paymentDate = input.paymentDate ?? new Date();
      if (paymentDate > new Date()) fail('Payment date cannot be in the future.', 'INVALID_PAYMENT_DATE');
      const normalizedReference = input.paymentReference?.trim().toLowerCase() || undefined;
      [payment] = await Payment.create([{
        invoice: invoice._id, customer: invoice.customer,
        paymentReference: input.paymentReference?.trim() || undefined, normalizedReference,
        method: input.method, amount: input.amount, paymentDate, note: input.note ?? '', recordedBy: actor._id,
      }], { session });
      Object.assign(invoice, calculateInvoiceBalance(invoice.amountPaid, invoice.outstanding, input.amount));
      await invoice.save({ session });
      await AuditLog.create([{ actor: actor._id, action: 'PAYMENT_RECORDED', entityType: 'Payment', entityId: payment._id, details: { invoice: invoice._id, amount: input.amount, method: input.method } }], { session });
    });
  } finally { await session.endSession(); }
  const customer = await Customer.findById(payment.customer).select('email').lean();
  await createNotificationForEmail(customer?.email, {
    type: 'PAYMENT', title: 'Payment recorded',
    message: 'A payment was recorded for your invoice.', href: '/payments',
  }).catch(() => {});
  return payment;
}

export async function listPayments(query, actor) {
  const filter = {};
  if (actor.role === 'CUSTOMER') {
    const customer = await Customer.findOne({ email: actor.email }).select('_id');
    if (!customer) return { items: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
    filter.customer = customer._id;
  }
  if (query.invoice) filter.invoice = query.invoice;
  if (query.method) filter.method = query.method;
  if (query.from || query.to) filter.paymentDate = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) };
  const [items, total] = await Promise.all([
    Payment.find(trustedFilter(filter)).populate('invoice', 'invoiceNumber currency total status outstanding').sort({ paymentDate: -1 }).skip((query.page - 1) * query.limit).limit(query.limit),
    Payment.countDocuments(trustedFilter(filter)),
  ]);
  return { items, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function getPayment(paymentId, actor) {
  const payment = await Payment.findById(paymentId).populate('invoice', 'invoiceNumber currency total status outstanding');
  if (!payment || (actor.role === 'CUSTOMER' && !await Customer.exists({ _id: payment.customer, email: actor.email }))) fail('Payment not found.', 'PAYMENT_NOT_FOUND', 404);
  return payment;
}

export async function updatePayment(paymentId, input, actor) {
  const session = await mongoose.startSession();
  let payment;
  try {
    await session.withTransaction(async () => {
      payment = await Payment.findById(paymentId).session(session);
      if (!payment || (actor.role === 'CUSTOMER' && !await Customer.exists({ _id: payment.customer, email: actor.email }).session(session))) fail('Payment not found.', 'PAYMENT_NOT_FOUND', 404);
      if (input.paymentDate && input.paymentDate > new Date()) fail('Payment date cannot be in the future.', 'INVALID_PAYMENT_DATE');
      const before = {};
      for (const key of Object.keys(input)) before[key] = payment[key];
      if (input.paymentReference !== undefined) {
        payment.paymentReference = input.paymentReference || undefined;
        payment.normalizedReference = input.paymentReference ? input.paymentReference.toLowerCase() : undefined;
      }
      if (input.method !== undefined) payment.method = input.method;
      if (input.paymentDate !== undefined) payment.paymentDate = input.paymentDate;
      if (input.note !== undefined) payment.note = input.note;
      await payment.save({ session });
      await AuditLog.create([{ actor: actor._id, action: 'PAYMENT_DETAILS_UPDATED', entityType: 'Payment', entityId: payment._id, details: { changedFields: Object.keys(input), before } }], { session });
    });
  } finally { await session.endSession(); }
  return payment;
}
