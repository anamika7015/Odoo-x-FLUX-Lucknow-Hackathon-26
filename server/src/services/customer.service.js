import mongoose from 'mongoose';
import { AuditLog } from '../models/audit-log.model.js';
import { Customer } from '../models/customer.model.js';
import { Invoice } from '../models/invoice.model.js';
import { Payment } from '../models/payment.model.js';
import { Subscription } from '../models/subscription.model.js';
import { User, roles } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { trustedFilter } from '../utils/trusted-filter.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function customerListFilter({ search, status }, actor) {
  const filter = {};
  if (actor?.role === 'CUSTOMER') filter.email = actor.email;
  if (status) filter.status = status;
  if (search) filter.$or = [
    { fullName: { $regex: escapeRegex(search), $options: 'i' } },
    { email: { $regex: escapeRegex(search), $options: 'i' } },
    { companyName: { $regex: escapeRegex(search), $options: 'i' } },
  ];
  return filter;
}

export function customerResourceFilter(customerId, actor) {
  return actor?.role === 'CUSTOMER' ? { _id: customerId, email: actor.email } : { _id: customerId };
}

export async function createCustomer(input, userId) {
  return Customer.create({ ...input, createdBy: userId });
}

export async function listCustomers({ page, limit, search, status }, actor) {
  const filter = customerListFilter({ search, status }, actor);
  const [items, total] = await Promise.all([
    Customer.find(trustedFilter(filter)).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Customer.countDocuments(trustedFilter(filter)),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getCustomer(customerId, actor) {
  const filter = customerResourceFilter(customerId, actor);
  const customer = await Customer.findOne(filter);
  if (!customer) throw new AppError('Customer not found.', { statusCode: 404, code: 'CUSTOMER_NOT_FOUND' });
  return customer;
}

export async function updateCustomer(customerId, input, actor) {
  const session = await mongoose.startSession();
  let customer;
  try {
    await session.withTransaction(async () => {
      customer = await Customer.findById(customerId).session(session);
      if (!customer) throw new AppError('Customer not found.', { statusCode: 404, code: 'CUSTOMER_NOT_FOUND' });
      const before = { fullName: customer.fullName, email: customer.email, companyName: customer.companyName, status: customer.status };
      if (input.email && input.email.toLowerCase() !== customer.email) {
        const linkedUser = await User.findOne({ email: customer.email, role: roles.CUSTOMER }).session(session);
        if (linkedUser) {
          linkedUser.email = input.email;
          await linkedUser.save({ session });
        }
      }
      if (input.status === 'INACTIVE' && customer.status !== 'INACTIVE') {
        const [openSubscription, outstandingInvoice] = await Promise.all([
          Subscription.exists(trustedFilter({ customer: customer._id, status: { $in: ['CONFIRMED', 'ACTIVE', 'PAUSED'] } })).session(session),
          Invoice.exists(trustedFilter({ customer: customer._id, status: { $in: ['CONFIRMED', 'PAID'] }, outstanding: { $gt: 0 } })).session(session),
        ]);
        if (openSubscription || outstandingInvoice) throw new AppError('A customer with an open subscription or unpaid invoice cannot be deactivated.', { statusCode: 409, code: 'CUSTOMER_HAS_OPEN_BALANCE_OR_SUBSCRIPTION' });
      }
      Object.assign(customer, input);
      await customer.save({ session });
      await AuditLog.create([{ actor: actor._id, action: 'CUSTOMER_UPDATED', entityType: 'Customer', entityId: customer._id, details: { changedFields: Object.keys(input), before, after: { fullName: customer.fullName, email: customer.email, companyName: customer.companyName, status: customer.status } } }], { session });
    });
  } finally { await session.endSession(); }
  return customer;
}

export async function getCustomerHistory(customerId, actor) {
  const customer = await getCustomer(customerId, actor);
  const [subscriptions, invoices, payments] = await Promise.all([
    Subscription.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(50).select('subscriptionNumber status currency subtotal startDate nextBillingDate createdAt').lean(),
    Invoice.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(50).select('invoiceNumber status currency total amountPaid outstanding dueDate createdAt').lean(),
    Payment.find({ customer: customer._id }).sort({ paymentDate: -1 }).limit(50).populate('invoice', 'invoiceNumber currency').select('invoice paymentReference method amount paymentDate note').lean(),
  ]);
  return { subscriptions, invoices, payments };
}

export async function getOwnCustomer(actor) {
  const customer = await Customer.findOne({ email: actor.email });
  if (!customer) throw new AppError('Customer profile not found.', { statusCode: 404, code: 'CUSTOMER_NOT_FOUND' });
  return customer;
}

export async function updateOwnCustomer(actor, input) {
  const customer = await Customer.findOneAndUpdate({ email: actor.email }, input, { new: true, runValidators: true });
  if (!customer) throw new AppError('Customer profile not found.', { statusCode: 404, code: 'CUSTOMER_NOT_FOUND' });
  return customer;
}
