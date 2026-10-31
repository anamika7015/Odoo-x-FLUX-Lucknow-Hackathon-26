import { config } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/user.model.js';
import { Customer } from '../models/customer.model.js';
import { Product } from '../models/product.model.js';
import { Plan } from '../models/plan.model.js';
import { Tax } from '../models/tax.model.js';
import { Discount } from '../models/discount.model.js';
import { Quotation } from '../models/quotation.model.js';
import { Subscription } from '../models/subscription.model.js';
import { Invoice } from '../models/invoice.model.js';
import { Payment } from '../models/payment.model.js';
import { AuditLog } from '../models/audit-log.model.js';
import { Notification } from '../models/notification.model.js';
import { trustedFilter } from '../utils/trusted-filter.js';

if (config.isProduction) throw new Error('Demo reset is disabled in production.');
if (process.env.CONFIRM_DEMO_RESET !== 'DELETE_DEMO_DATA') {
  throw new Error('Set CONFIRM_DEMO_RESET=DELETE_DEMO_DATA to confirm removal of seeded demo data.');
}

try {
  await connectDatabase();
  const [demoUsers, demoCustomers, products, plans, taxes, discounts, quotations, subscriptions, invoices, payments] = await Promise.all([
    User.find(trustedFilter({ demoAccount: true, email: { $in: [config.demo.admin?.email, config.demo.staff?.email, config.demo.customer?.email, 'staff@brightloop.io'].filter(Boolean) } })).select('_id'), Customer.find({ demoAccount: true }).select('_id'),
    Product.find({ normalizedName: /^demo-/ }).select('_id'), Plan.find({ normalizedName: /^demo\s·/i }).select('_id'),
    Tax.find({ normalizedName: /^demo-/ }).select('_id'), Discount.find({ normalizedCode: /^demo-/ }).select('_id'),
    Quotation.find({ quotationNumber: /^DEMO-QT-/ }).select('_id'), Subscription.find({ subscriptionNumber: /^DEMO-SUB-/ }).select('_id'),
    Invoice.find({ invoiceNumber: /^DEMO-INV-/ }).select('_id'), Payment.find({ normalizedReference: /^demo-pay-/ }).select('_id'),
  ]);
  const ids = (documents) => documents.map(({ _id }) => _id);
  await Payment.deleteMany(trustedFilter({ $or: [{ _id: { $in: ids(payments) } }, { invoice: { $in: ids(invoices) } }] }));
  await Invoice.deleteMany(trustedFilter({ $or: [{ _id: { $in: ids(invoices) } }, { subscription: { $in: ids(subscriptions) } }] }));
  await Quotation.deleteMany(trustedFilter({ $or: [{ _id: { $in: ids(quotations) } }, { customer: { $in: ids(demoCustomers) } }] }));
  await Subscription.deleteMany(trustedFilter({ $or: [{ _id: { $in: ids(subscriptions) } }, { customer: { $in: ids(demoCustomers) } }] }));
  await AuditLog.deleteMany(trustedFilter({ $or: [{ 'details.demoKey': /^activity-/ }, { entityId: { $in: [...ids(quotations), ...ids(subscriptions), ...ids(invoices), ...ids(demoCustomers)] } }] }));
  await Notification.deleteMany(trustedFilter({ $or: [{ title: /^Demo ·/ }, { recipient: { $in: ids(demoUsers) } }] }));
  await Discount.deleteMany(trustedFilter({ _id: { $in: ids(discounts) } }));
  await Tax.deleteMany(trustedFilter({ _id: { $in: ids(taxes) } }));
  await Plan.deleteMany(trustedFilter({ _id: { $in: ids(plans) } }));
  await Product.deleteMany(trustedFilter({ _id: { $in: ids(products) } }));
  await Customer.deleteMany(trustedFilter({ _id: { $in: ids(demoCustomers) } }));
  await User.deleteMany(trustedFilter({ _id: { $in: ids(demoUsers) } }));
  console.info('Seeded demo records removed.');
} finally {
  await disconnectDatabase();
}
