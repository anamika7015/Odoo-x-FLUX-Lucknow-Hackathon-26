import { config } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User, roles } from '../models/user.model.js';
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
import { hashPassword, passwordPattern } from '../utils/password.js';
import { demoCustomerFixtures, demoDiscountFixtures, demoPlanFixtures, demoProductFixtures, demoQuotationStatuses, demoSubscriptionStatuses, demoTaxFixtures } from './demo-fixtures.js';

if (!config.demo.admin || !config.demo.customer) {
  throw new Error('Set DEMO_ADMIN_EMAIL/PASSWORD and DEMO_CUSTOMER_EMAIL/PASSWORD before seeding demo data.');
}
if (config.isProduction) throw new Error('Demo data seeding is disabled in production.');
const configuredAccounts = [
  ['admin', config.demo.admin],
  ...(config.demo.staff ? [['staff', config.demo.staff]] : [['staff', { email: 'staff@brightloop.io', password: 'Staff@Brightloop2026!' }]]),
  ['customer', config.demo.customer],
];
for (const [role, account] of configuredAccounts) {
  if (!passwordPattern.test(account.password)) throw new Error(`Configured ${role} demo password must contain upper/lowercase letters, a number, and a symbol (minimum 8 characters).`);
}

const daysAgo = (days) => new Date(Date.now() - days * 86_400_000);
const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000);
const getOrCreate = async (Model, filter, values) => {
  const doc = await Model.findOneAndUpdate(filter, { $setOnInsert: values }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return doc;
};
const snapCustomer = (customer) => ({ fullName: customer.fullName, email: customer.email, companyName: customer.companyName, billingAddress: customer.billingAddress, taxId: customer.taxId });

try {
  await connectDatabase();
  const staffAccount = config.demo.staff || { email: 'staff@brightloop.io', password: 'Staff@Brightloop2026!' };
  const accountEmails = [config.demo.admin.email, staffAccount.email, config.demo.customer.email];
  if (new Set(accountEmails).size !== 3) throw new Error('Admin, staff, and customer demo emails must be different.');
  for (const [email, role] of [[config.demo.admin.email, roles.ADMIN], [staffAccount.email, roles.STAFF], [config.demo.customer.email, roles.CUSTOMER]]) {
    const existing = await User.findOne({ email });
    if (existing && (!existing.demoAccount || existing.role !== role)) throw new Error(`Refusing to overwrite non-demo or wrong-role account ${email}.`);
  }
  const admin = await getOrCreate(User, { email: config.demo.admin.email }, {
    fullName: 'Brightloop Demo Admin', email: config.demo.admin.email, role: roles.ADMIN,
    passwordHash: await hashPassword(config.demo.admin.password), demoAccount: true, status: 'ACTIVE',
  });
  const staff = await getOrCreate(User, { email: staffAccount.email }, {
    fullName: 'Alex Vance (Demo Staff)', email: staffAccount.email, role: roles.STAFF,
    passwordHash: await hashPassword(staffAccount.password), demoAccount: true, status: 'ACTIVE',
  });
  const customerUser = await getOrCreate(User, { email: config.demo.customer.email }, {
    fullName: 'Maya Sharma', email: config.demo.customer.email, role: roles.CUSTOMER,
    passwordHash: await hashPassword(config.demo.customer.password), demoAccount: true, status: 'ACTIVE',
  });
  // Sync the configured demo password on repeat runs while preserving user-managed account status.
  await User.updateOne({ _id: admin._id }, { $set: { passwordHash: await hashPassword(config.demo.admin.password), demoAccount: true, role: roles.ADMIN } });
  await User.updateOne({ _id: staff._id }, { $set: { passwordHash: await hashPassword(staffAccount.password), demoAccount: true, role: roles.STAFF } });
  await User.updateOne({ _id: customerUser._id }, { $set: { passwordHash: await hashPassword(config.demo.customer.password), demoAccount: true, role: roles.CUSTOMER } });

  const customers = [];
  for (let index = 0; index < demoCustomerFixtures.length; index += 1) {
    const fixture = demoCustomerFixtures[index];
    const email = index === 0 ? config.demo.customer.email : `demo-customer-${String(index).padStart(2, '0')}@brightloop.demo`;
    const existing = await Customer.findOne({ email });
    if (existing && !existing.demoAccount) throw new Error(`Refusing to overwrite non-demo customer ${email}.`);
    const customer = await getOrCreate(Customer, { email }, {
      ...fixture, email, demoAccount: true, status: 'ACTIVE', createdBy: admin._id, createdAt: daysAgo(150 - index * 18),
    });
    customers.push(customer);
  }

  const products = [];
  for (const fixture of demoProductFixtures) products.push(await getOrCreate(Product,
    { normalizedName: fixture.key, productType: fixture.productType }, {
      name: fixture.name, normalizedName: fixture.key, productType: fixture.productType,
      salesPrice: fixture.salesPrice, costPrice: fixture.costPrice, currency: 'INR', description: fixture.description, status: 'ACTIVE',
    }));
  const plans = [];
  for (const fixture of demoPlanFixtures) {
    const product = products[fixture.product];
    plans.push(await getOrCreate(Plan, { product: product._id, normalizedName: fixture.name.toLowerCase() }, {
      name: fixture.name, normalizedName: fixture.name.toLowerCase(), product: product._id,
      description: `${fixture.frequency.toLowerCase()} subscription for ${product.name.replace('Demo · ', '')}.`,
      billingPrice: fixture.price, currency: 'INR', billingFrequency: fixture.frequency,
      minimumQuantity: fixture.minimumQuantity, allowPause: fixture.allowPause, allowRenewal: fixture.allowRenewal,
      allowEarlyClosure: true, status: 'ACTIVE', createdAt: daysAgo(180 - plans.length * 4),
    }));
  }
  const taxes = [];
  for (const fixture of demoTaxFixtures) taxes.push(await getOrCreate(Tax, { normalizedName: fixture.key }, {
    name: fixture.name, normalizedName: fixture.key, rateBasisPoints: fixture.rateBasisPoints,
    appliesTo: fixture.products.map((index) => products[index]._id), status: 'ACTIVE', createdBy: admin._id,
  }));
  const discounts = [];
  for (const fixture of demoDiscountFixtures) discounts.push(await getOrCreate(Discount, { normalizedCode: fixture.code.toLowerCase() }, {
    name: fixture.name, code: fixture.code, normalizedCode: fixture.code.toLowerCase(), type: fixture.type,
    value: fixture.value, targetType: fixture.targetType, appliesTo: (fixture.products || []).map((index) => products[index]._id),
    startsAt: daysAgo(90), endsAt: daysFromNow(180), maxUses: 500, priority: fixture.priority,
    autoApply: fixture.autoApply, status: 'ACTIVE', createdBy: admin._id,
  }));

  const subscriptions = [];
  for (let index = 0; index < demoSubscriptionStatuses.length; index += 1) {
    const customer = customers[index % customers.length];
    const plan = plans[index % plans.length];
    const product = products[demoPlanFixtures[index % plans.length].product];
    const startDate = daysAgo(220 - index * 9);
    const status = demoSubscriptionStatuses[index];
    subscriptions.push(await getOrCreate(Subscription, { subscriptionNumber: `DEMO-SUB-${String(index + 1).padStart(3, '0')}` }, {
      subscriptionNumber: `DEMO-SUB-${String(index + 1).padStart(3, '0')}`, customer: customer._id, customerSnapshot: snapCustomer(customer),
      lines: [{ product: product._id, productName: product.name, plan: plan._id, planName: plan.name, quantity: plan.minimumQuantity, unitPrice: plan.billingPrice, currency: 'INR', billingFrequency: plan.billingFrequency, lineTotal: plan.billingPrice * plan.minimumQuantity }],
      currency: 'INR', subtotal: plan.billingPrice * plan.minimumQuantity, paymentTerms: 'Net 15 days', status, startDate,
      expiryDate: status === 'EXPIRED' ? daysAgo(5 + index) : daysFromNow(365 - index * 7), nextBillingDate: status === 'ACTIVE' ? daysFromNow(index % 4 === 0 ? 7 : 30 + index) : undefined,
      autoClose: false, allowEarlyClosure: true, allowPause: plan.allowPause, allowRenewal: plan.allowRenewal,
      closedAt: status === 'CLOSED' ? daysAgo(15 + index) : undefined, createdBy: admin._id,
      createdAt: startDate,
    }));
  }

  // Twelve quotes; first six match converted subscription records.
  const quotations = [];
  for (let index = 0; index < demoQuotationStatuses.length; index += 1) {
    const customer = customers[index % customers.length];
    const plan = plans[index % plans.length];
    const product = products[demoPlanFixtures[index % plans.length].product];
    const status = demoQuotationStatuses[index];
    const subtotal = plan.billingPrice * plan.minimumQuantity;
    const tax = taxes.find((item) => item.appliesTo.some((id) => String(id) === String(product._id)));
    const taxAmount = tax ? Math.round(subtotal * tax.rateBasisPoints / 10_000) : 0;
    const quote = await getOrCreate(Quotation, { quotationNumber: `DEMO-QT-${String(index + 1).padStart(3, '0')}` }, {
      quotationNumber: `DEMO-QT-${String(index + 1).padStart(3, '0')}`, customer: customer._id, customerSnapshot: snapCustomer(customer),
      lines: [{ product: product._id, productName: product.name, plan: plan._id, planName: plan.name, quantity: plan.minimumQuantity,
        unitPrice: plan.billingPrice, currency: 'INR', billingFrequency: plan.billingFrequency, lineTotal: subtotal,
        discounts: [], discountTotal: 0, taxableSubtotal: subtotal, taxes: tax ? [{ tax: tax._id, name: tax.name, rateBasisPoints: tax.rateBasisPoints, amount: taxAmount }] : [], taxTotal: taxAmount, total: subtotal + taxAmount }],
      subtotal, discounts: [], discountTotal: 0, taxTotal: taxAmount, total: subtotal + taxAmount, currency: 'INR', paymentTerms: 'Net 15 days',
      status, validUntil: daysFromNow(status === 'EXPIRED' ? -5 : 30), createdBy: admin._id,
      acceptedAt: ['CONVERTED', 'CONFIRMED'].includes(status) ? daysAgo(20 + index) : undefined,
      convertedAt: status === 'CONVERTED' ? daysAgo(20 + index) : undefined,
      rejectedAt: status === 'REJECTED' ? daysAgo(4) : undefined,
      createdAt: daysAgo(55 - index * 4),
    });
    quotations.push(quote);
  }
  // Link converted subscriptions to their source quotation (quote conversion is unique).
  for (let index = 0; index < 6; index += 1) await Subscription.updateOne({ _id: subscriptions[index]._id }, { $set: { quotation: quotations[index]._id } });

  // 26 invoices spanning paid, partial, overdue, draft, and cancelled states.
  const invoiceSpecs = [
    ...Array.from({ length: 10 }, (_, index) => ({ status: 'PAID', paidRatio: 1, days: 130 - index * 8 })),
    ...Array.from({ length: 5 }, (_, index) => ({ status: 'CONFIRMED', paidRatio: 0.4, days: 95 - index * 6 })),
    ...Array.from({ length: 9 }, (_, index) => ({ status: 'CONFIRMED', paidRatio: 0, days: 75 - index * 5 })),
    { status: 'DRAFT', paidRatio: 0, days: 2 }, { status: 'CANCELLED', paidRatio: 0, days: 45 },
  ];
  const invoices = [];
  for (let index = 0; index < invoiceSpecs.length; index += 1) {
    const spec = invoiceSpecs[index];
    const subscription = subscriptions[index % 10];
    const customer = customers.find((item) => String(item._id) === String(subscription.customer));
    const line = subscription.lines[0].toObject ? subscription.lines[0].toObject() : subscription.lines[0];
    const product = products.find((item) => String(item._id) === String(line.product));
    const tax = taxes.find((item) => item.appliesTo.some((id) => String(id) === String(product._id)));
    const subtotal = line.lineTotal;
    const taxAmount = tax ? Math.round(subtotal * tax.rateBasisPoints / 10_000) : 0;
    const total = subtotal + taxAmount;
    const amountPaid = spec.status === 'CANCELLED' ? 0 : Math.floor(total * spec.paidRatio);
    const created = daysAgo(spec.days);
    const invoice = await getOrCreate(Invoice, { invoiceNumber: `DEMO-INV-${String(index + 1).padStart(3, '0')}` }, {
      invoiceNumber: `DEMO-INV-${String(index + 1).padStart(3, '0')}`, customer: customer._id, customerSnapshot: snapCustomer(customer), subscription: subscription._id,
      periodStart: new Date(created.getTime() - 30 * 86_400_000), periodEnd: created, dueDate: new Date(created.getTime() + (spec.status === 'CONFIRMED' && spec.paidRatio === 0 ? -5 : 15) * 86_400_000),
      currency: 'INR', lines: [{ product: line.product, productName: line.productName, plan: line.plan, planName: line.planName, quantity: line.quantity, unitPrice: line.unitPrice,
        subtotal, taxableSubtotal: subtotal, discounts: [], discountTotal: 0,
        taxes: tax ? [{ tax: tax._id, name: tax.name, rateBasisPoints: tax.rateBasisPoints, amount: taxAmount }] : [], taxTotal: taxAmount, total }],
      subtotal, discounts: [], discountTotal: 0, taxTotal: taxAmount, total, amountPaid,
      outstanding: spec.status === 'CANCELLED' ? 0 : total - amountPaid, status: spec.status,
      confirmedAt: spec.status === 'DRAFT' ? undefined : created, cancelledAt: spec.status === 'CANCELLED' ? created : undefined, createdBy: admin._id,
      createdAt: created,
    });
    invoices.push(invoice);
  }
  // Create exactly 20 deterministic payment records: 10 two-part, 5 single full, 5 partial.
  const paymentOps = [];
  for (let invoiceIndex = 0; invoiceIndex < 15; invoiceIndex += 1) {
    const invoice = invoices[invoiceIndex];
    const customer = customers.find((item) => String(item._id) === String(invoice.customer));
    const splitCount = invoiceIndex < 5 ? 2 : 1;
    const firstAmount = splitCount === 2 ? Math.ceil(invoice.total / 2) : (invoiceIndex < 10 ? invoice.total : invoice.amountPaid);
    const amounts = splitCount === 2 ? [firstAmount, invoice.total - firstAmount] : [firstAmount];
    for (let part = 0; part < amounts.length; part += 1) {
      const paymentReference = `DEMO-PAY-${String(invoiceIndex + 1).padStart(3, '0')}-${part + 1}`;
      paymentOps.push(getOrCreate(Payment, { normalizedReference: paymentReference.toLowerCase() }, {
        invoice: invoice._id, customer: customer._id, paymentReference, normalizedReference: paymentReference.toLowerCase(),
        method: ['UPI', 'CARD', 'BANK_TRANSFER', 'CASH'][invoiceIndex % 4], amount: amounts[part],
        paymentDate: new Date(new Date(invoice.confirmedAt || invoice.createdAt || daysAgo(10)).getTime() + part * 86_400_000),
        note: 'Demo transaction', recordedBy: admin._id, createdAt: invoice.confirmedAt || invoice.createdAt || daysAgo(10),
      }));
    }
  }
  const seededPayments = await Promise.all(paymentOps);

  // Stable event keys make activity and notification seeds idempotent.
  const auditSpecs = [
    ...customers.slice(0, 4).map((item, index) => ['CUSTOMER_CREATED', 'Customer', item._id, index]),
    ...subscriptions.slice(0, 4).map((item, index) => ['SUBSCRIPTION_CREATED', 'Subscription', item._id, index + 4]),
    ...invoices.slice(0, 4).map((item, index) => ['INVOICE_CREATED', 'Invoice', item._id, index + 8]),
    ...quotations.slice(0, 3).map((item, index) => ['QUOTATION_CREATED', 'Quotation', item._id, index + 12]),
    ...seededPayments.slice(0, 3).map((item, index) => ['PAYMENT_RECORDED', 'Payment', item._id, index + 15]),
  ];
  for (const [action, entityType, entityId, index] of auditSpecs) await getOrCreate(AuditLog,
    { 'details.demoKey': `activity-${String(index + 1).padStart(2, '0')}` },
    { actor: admin._id, action, entityType, entityId, details: { demoKey: `activity-${String(index + 1).padStart(2, '0')}` }, createdAt: daysAgo(20 - index) });
  const recipients = [admin, staff, customerUser];
  for (let index = 0; index < 15; index += 1) {
    const type = ['QUOTATION', 'INVOICE', 'PAYMENT', 'SUBSCRIPTION', 'SYSTEM'][index % 5];
    const recipient = recipients[index % recipients.length];
    const title = `Demo · ${['New quotation', 'Invoice available', 'Payment received', 'Subscription update', 'Account activity'][index % 5]}`;
    await getOrCreate(Notification, { recipient: recipient._id, title, message: `Demo activity ${index + 1}: ${type.toLowerCase()} update for your Brightloop account.` },
      { recipient: recipient._id, type, title, message: `Demo activity ${index + 1}: ${type.toLowerCase()} update for your Brightloop account.`, href: type === 'INVOICE' ? '/invoices' : type === 'QUOTATION' ? '/quotations' : '/subscriptions', createdAt: daysAgo(14 - index), ...(index < 6 ? { readAt: daysAgo(1) } : {}) });
  }
  console.info(`Demo data seeded: ${customers.length} customers, ${products.length} products, ${plans.length} plans, ${quotations.length} quotations, ${subscriptions.length} subscriptions, ${invoices.length} invoices, 20 payments, ${discounts.length} discounts, ${taxes.length} taxes, ${auditSpecs.length} activities, 15 notifications.`);
} finally {
  await disconnectDatabase();
}
