import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { Customer } from '../src/models/customer.model.js';
import { Subscription } from '../src/models/subscription.model.js';
import { User, roles } from '../src/models/user.model.js';
import { hashPassword } from '../src/utils/password.js';
import { runRecurringBilling } from '../src/services/billing.service.js';

const adminEmail = 'integration-admin@example.test';
const adminPassword = 'Integration!Password1';
const customerEmail = 'integration-customer@example.test';
const customerPassword = 'Customer!Password1';
function pointsAtDisposableLocalDatabase(uri = '') {
  try {
    const parsed = new URL(uri);
    return ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) && parsed.pathname === '/brightloop_it';
  } catch { return false; }
}
const hasIsolatedTestDatabase = pointsAtDisposableLocalDatabase(process.env.MONGODB_URI);

async function csrf(agent) {
  const response = await agent.get('/api/v1/auth/csrf');
  expect(response.status).toBe(200);
  return response.body.data.csrfToken;
}

describe.skipIf(!hasIsolatedTestDatabase)('core authenticated business workflows', () => {
  let admin;
  let customer;
  let adminId;
  let customerId;
  let subscriptionId;
  let invoiceId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5_000 });
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    const adminUser = await User.create({ fullName: 'Integration Admin', email: adminEmail, passwordHash: await hashPassword(adminPassword), role: roles.ADMIN });
    adminId = adminUser.id;
    admin = request.agent(app);
    const login = await admin.post('/api/v1/auth/login').send({ email: adminEmail, password: adminPassword });
    expect(login.status).toBe(200);
  }, 20_000);

  afterAll(async () => { await mongoose.disconnect(); });

  it('registers a customer, protects ownership, and runs the quote-to-payment lifecycle', async () => {
    customer = request.agent(app);
    const register = await customer.post('/api/v1/auth/register').send({ fullName: 'Integration Customer', email: customerEmail, password: customerPassword, confirmPassword: customerPassword });
    expect(register.status).toBe(201);
    customerId = (await Customer.findOne({ email: customerEmail })).id;

    const csrfToken = await csrf(admin);
    const staffCreated = await admin.post('/api/v1/auth/staff').set('X-CSRF-Token', csrfToken).send({ fullName: 'Integration Staff', email: 'integration-staff@example.test', password: 'Staff!Password123', confirmPassword: 'Staff!Password123' });
    expect(staffCreated.status).toBe(201);
    const staff = request.agent(app);
    expect((await staff.post('/api/v1/auth/login').send({ email: 'integration-staff@example.test', password: 'Staff!Password123' })).status).toBe(200);
    expect((await staff.get('/api/v1/users')).status).toBe(403);
    expect((await staff.post('/api/v1/discounts').send({})).status).toBe(403);
    const preventLastAdminDemotion = await admin.patch(`/api/v1/users/${adminId}`).set('X-CSRF-Token', csrfToken).send({ role: 'STAFF' });
    expect(preventLastAdminDemotion.status).toBe(409);
    expect((await admin.get('/api/v1/auth/me')).body.data.user.role).toBe('ADMIN');
    const productResponse = await admin.post('/api/v1/products').set('X-CSRF-Token', csrfToken).send({ name: 'Integration Product', productType: 'SERVICE', salesPrice: 100_000, costPrice: 20_000 });
    expect(productResponse.status).toBe(201);
    const planResponse = await admin.post('/api/v1/plans').set('X-CSRF-Token', csrfToken).send({ name: 'Integration Monthly', product: productResponse.body.data.product._id, billingPrice: 100_000, billingFrequency: 'MONTHLY', minimumQuantity: 1, allowPause: true, availabilityStartDate: null, availabilityEndDate: null });
    expect(planResponse.status).toBe(201);
    expect(planResponse.body.data.plan.availabilityStartDate).toBeFalsy();
    expect(planResponse.body.data.plan.availabilityEndDate).toBeFalsy();
    const templateResponse = await admin.post('/api/v1/quotations/templates').set('X-CSRF-Token', csrfToken).send({ name: 'Integration template', lines: [{ plan: planResponse.body.data.plan._id, quantity: 1 }] });
    expect(templateResponse.status).toBe(201);
    const updatedTemplate = await admin.patch(`/api/v1/quotations/templates/${templateResponse.body.data.template._id}`).set('X-CSRF-Token', csrfToken).send({ name: 'Integration template revised', paymentTerms: 'Net 15 days' });
    expect(updatedTemplate.status).toBe(200);
    expect(updatedTemplate.body.data.template).toMatchObject({ name: 'Integration template revised', paymentTerms: 'Net 15 days' });

    const quotationResponse = await admin.post('/api/v1/quotations').set('X-CSRF-Token', csrfToken).send({ customer: customerId, lines: [{ plan: planResponse.body.data.plan._id, quantity: 1 }], validityDays: 30 });
    expect(quotationResponse.status).toBe(201);
    const quotationId = quotationResponse.body.data.quotation._id;
    expect((await admin.post(`/api/v1/quotations/${quotationId}/publish`).set('X-CSRF-Token', csrfToken)).status).toBe(200);
    const customerCsrf = await csrf(customer);
    expect((await customer.post(`/api/v1/quotations/${quotationId}/accept`).set('X-CSRF-Token', customerCsrf)).status).toBe(200);
    const converted = await admin.post(`/api/v1/quotations/${quotationId}/convert`).set('X-CSRF-Token', csrfToken);
    expect(converted.status).toBe(201);
    subscriptionId = converted.body.data.subscription._id;
    const rejectedDraft = await admin.post('/api/v1/quotations').set('X-CSRF-Token', csrfToken).send({ customer: customerId, lines: [{ plan: planResponse.body.data.plan._id, quantity: 1 }], validityDays: 30 });
    const rejectedId = rejectedDraft.body.data.quotation._id;
    await admin.post(`/api/v1/quotations/${rejectedId}/publish`).set('X-CSRF-Token', csrfToken);
    const customerRejectCsrf = await csrf(customer);
    const rejection = await customer.post(`/api/v1/quotations/${rejectedId}/reject`).set('X-CSRF-Token', customerRejectCsrf);
    expect(rejection.status).toBe(200);
    expect(rejection.body.data.quotation.status).toBe('REJECTED');
    const draftToDelete = await admin.post('/api/v1/quotations').set('X-CSRF-Token', csrfToken).send({ customer: customerId, lines: [{ plan: planResponse.body.data.plan._id, quantity: 1 }], validityDays: 30 });
    const editedQuotation = await admin.patch(`/api/v1/quotations/${draftToDelete.body.data.quotation._id}`).set('X-CSRF-Token', csrfToken).send({ validityDays: 45, paymentTerms: 'Net 15 days', lines: [{ plan: planResponse.body.data.plan._id, quantity: 2 }] });
    expect(editedQuotation.status).toBe(200);
    expect(editedQuotation.body.data.quotation).toMatchObject({ paymentTerms: 'Net 15 days', subtotal: 200_000, lines: [expect.objectContaining({ quantity: 2, unitPrice: 100_000, lineTotal: 200_000 })] });
    expect(new Date(editedQuotation.body.data.quotation.validUntil).getTime()).toBeGreaterThan(Date.now() + 44 * 86_400_000);
    const deletedDraft = await admin.delete(`/api/v1/quotations/${draftToDelete.body.data.quotation._id}`).set('X-CSRF-Token', csrfToken);
    expect(deletedDraft.status).toBe(200);
    expect((await admin.get(`/api/v1/quotations/${draftToDelete.body.data.quotation._id}`)).status).toBe(404);
    const confirmedSubscriptionEdit = await admin.patch(`/api/v1/subscriptions/${subscriptionId}`).set('X-CSRF-Token', csrfToken).send({ lines: [{ quantity: 2 }], paymentTerms: 'Net 15 days' });
    expect(confirmedSubscriptionEdit.status).toBe(200);
    expect(confirmedSubscriptionEdit.body.data.subscription).toMatchObject({ subtotal: 200_000, paymentTerms: 'Net 15 days', lines: [expect.objectContaining({ quantity: 2, unitPrice: 100_000, lineTotal: 200_000 })] });
    const restoredSubscription = await admin.patch(`/api/v1/subscriptions/${subscriptionId}`).set('X-CSRF-Token', csrfToken).send({ lines: [{ quantity: 1 }] });
    expect(restoredSubscription.body.data.subscription.subtotal).toBe(100_000);
    expect((await admin.post(`/api/v1/subscriptions/${subscriptionId}/activate`).set('X-CSRF-Token', csrfToken).send({ reason: 'Integration test activation' })).status).toBe(200);
    const activeSubscriptionEdit = await admin.patch(`/api/v1/subscriptions/${subscriptionId}`).set('X-CSRF-Token', csrfToken).send({ paymentTerms: 'Not allowed after activation' });
    expect(activeSubscriptionEdit.status).toBe(409);
    const customerPauseCsrf = await csrf(customer);
    expect((await customer.post(`/api/v1/subscriptions/${subscriptionId}/pause`).set('X-CSRF-Token', customerPauseCsrf).send({})).body.data.subscription.status).toBe('PAUSED');
    expect((await customer.post(`/api/v1/subscriptions/${subscriptionId}/resume`).set('X-CSRF-Token', customerPauseCsrf).send({})).body.data.subscription.status).toBe('ACTIVE');

    const discountResponse = await admin.post('/api/v1/discounts').set('X-CSRF-Token', csrfToken).send({ name: 'Integration ten percent', code: 'INTEGRATION10', type: 'PERCENTAGE', value: 1_000, targetType: 'SUBSCRIPTION', minimumPurchase: 0, minimumQuantity: 1, priority: 10, autoApply: true });
    expect(discountResponse.status).toBe(201);
    const taxResponse = await admin.post('/api/v1/taxes').set('X-CSRF-Token', csrfToken).send({ name: 'Integration tax', rateBasisPoints: 1_800, appliesTo: [productResponse.body.data.product._id] });
    expect(taxResponse.status).toBe(201);
    const codedQuotation = await admin.post('/api/v1/quotations').set('X-CSRF-Token', csrfToken).send({ customer: customerId, lines: [{ plan: planResponse.body.data.plan._id, quantity: 1 }], discountCode: 'integration10' });
    expect(codedQuotation.status).toBe(201);
    expect(codedQuotation.body.data.quotation).toMatchObject({ discountCode: 'INTEGRATION10', subtotal: 100_000, discountTotal: 10_000, taxTotal: 16_200, total: 106_200 });
    expect((await admin.delete(`/api/v1/quotations/${codedQuotation.body.data.quotation._id}`).set('X-CSRF-Token', csrfToken)).status).toBe(200);

    const periodStart = new Date(Date.now() - 1_000).toISOString();
    const createdInvoice = await admin.post('/api/v1/invoices/from-subscription').set('X-CSRF-Token', csrfToken).send({ subscription: subscriptionId, periodStart });
    expect(createdInvoice.status).toBe(201);
    invoiceId = createdInvoice.body.data.invoice._id;
    expect(createdInvoice.body.data.invoice.total).toBe(106_200);
    expect(createdInvoice.body.data.invoice).toMatchObject({ subtotal: 100_000, discountTotal: 10_000, taxTotal: 16_200 });
    const searchedInvoices = await admin.get('/api/v1/invoices').query({ search: createdInvoice.body.data.invoice.invoiceNumber });
    expect(searchedInvoices.status).toBe(200);
    expect(searchedInvoices.body.data.invoices.map((invoice) => invoice._id)).toContain(invoiceId);
    const editedDiscount = await admin.patch(`/api/v1/discounts/${discountResponse.body.data.discount._id}`).set('X-CSRF-Token', csrfToken).send({ name: 'Integration discount revised', maxUses: null, startsAt: null, endsAt: null });
    expect(editedDiscount.status).toBe(200);
    expect(editedDiscount.body.data.discount).toMatchObject({ name: 'Integration discount revised', usageCount: 1 });
    expect(editedDiscount.body.data.discount.maxUses).toBeUndefined();
    const editedDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const editedDraft = await admin.patch(`/api/v1/invoices/${invoiceId}`).set('X-CSRF-Token', csrfToken).send({ dueDate: editedDueDate });
    expect(editedDraft.status).toBe(200);
    expect(new Date(editedDraft.body.data.invoice.dueDate).toISOString()).toBe(editedDueDate);
    expect((await admin.post(`/api/v1/invoices/${invoiceId}/confirm`).set('X-CSRF-Token', csrfToken).send({})).status).toBe(200);
    const rejectedInvoiceEdit = await admin.patch(`/api/v1/invoices/${invoiceId}`).set('X-CSRF-Token', csrfToken).send({ dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString() });
    expect(rejectedInvoiceEdit.status).toBe(409);

    const partial = await admin.post('/api/v1/payments').set('X-CSRF-Token', csrfToken).send({ invoice: invoiceId, amount: 42_480, method: 'UPI', paymentReference: 'Integration-Ref-1' });
    expect(partial.status).toBe(201);
    const afterPartial = await admin.get(`/api/v1/invoices/${invoiceId}`);
    expect(afterPartial.body.data.invoice).toMatchObject({ status: 'CONFIRMED', amountPaid: 42_480, outstanding: 63_720 });
    const editedPayment = await admin.patch(`/api/v1/payments/${partial.body.data.payment._id}`).set('X-CSRF-Token', csrfToken).send({ method: 'CARD', note: 'Processor settlement confirmed' });
    expect(editedPayment.status).toBe(200);
    expect(editedPayment.body.data.payment).toMatchObject({ amount: 42_480, method: 'CARD', note: 'Processor settlement confirmed' });
    const balanceAfterPaymentEdit = await admin.get(`/api/v1/invoices/${invoiceId}`);
    expect(balanceAfterPaymentEdit.body.data.invoice).toMatchObject({ amountPaid: 42_480, outstanding: 63_720, status: 'CONFIRMED' });
    const overpayment = await admin.post('/api/v1/payments').set('X-CSRF-Token', csrfToken).send({ invoice: invoiceId, amount: 63_721, method: 'UPI', paymentReference: 'Integration-Ref-2' });
    expect(overpayment.status).toBe(422);
    const finalPayment = await admin.post('/api/v1/payments').set('X-CSRF-Token', csrfToken).send({ invoice: invoiceId, amount: 63_720, method: 'BANK_TRANSFER', paymentReference: 'Integration-Ref-3' });
    expect(finalPayment.status).toBe(201);
    expect((await admin.get(`/api/v1/invoices/${invoiceId}`)).body.data.invoice.status).toBe('PAID');

    const history = await customer.get(`/api/v1/customers/${customerId}/history`);
    expect(history.status).toBe(200);
    expect(history.body.data).toMatchObject({ subscriptions: [{ _id: subscriptionId }], invoices: [{ _id: invoiceId }], payments: expect.arrayContaining([expect.objectContaining({ amount: 63_720 }), expect.objectContaining({ amount: 42_480 })]) });

    const outsider = request.agent(app);
    const outsiderRegister = await outsider.post('/api/v1/auth/register').send({ fullName: 'Other Customer', email: 'other-integration-customer@example.test', password: customerPassword, confirmPassword: customerPassword });
    expect(outsiderRegister.status).toBe(201);
    const outsiderId = (await Customer.findOne({ email: 'other-integration-customer@example.test' })).id;
    expect((await customer.get(`/api/v1/customers/${outsiderId}`)).status).toBe(404);

    const oldEmailCsrf = await csrf(admin);
    expect((await admin.patch(`/api/v1/customers/${customerId}`).set('X-CSRF-Token', oldEmailCsrf).send({ email: 'integration-customer-updated@example.test' })).status).toBe(200);
    expect((await customer.get('/api/v1/customers/me')).body.data.customer.email).toBe('integration-customer-updated@example.test');
    const updatedLogin = await request.agent(app).post('/api/v1/auth/login').send({ email: 'integration-customer-updated@example.test', password: customerPassword });
    expect(updatedLogin.status).toBe(200);

    const customerNotifications = await customer.get('/api/v1/notifications');
    expect(customerNotifications.status).toBe(200);
    expect(customerNotifications.body.data.items.map(({ type }) => type)).toEqual(expect.arrayContaining(['QUOTATION', 'INVOICE', 'PAYMENT']));
    const notificationId = customerNotifications.body.data.items[0]._id;
    const customerNotificationCsrf = await csrf(customer);
    const markedRead = await customer.patch(`/api/v1/notifications/${notificationId}/read`).set('X-CSRF-Token', customerNotificationCsrf);
    expect(markedRead.status).toBe(200);

    expect((await admin.get('/api/v1/products').query({ search: 'Integration', status: 'ACTIVE' })).body.data.products).toHaveLength(1);
    expect((await admin.get('/api/v1/customers').query({ search: 'Integration Customer', status: 'ACTIVE' })).body.data.items).toHaveLength(1);
    expect((await admin.get('/api/v1/users').query({ search: 'Integration Customer', role: 'CUSTOMER' })).body.data.users).toHaveLength(1);
    const dateBounds = { from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), to: new Date(Date.now() + 1_000).toISOString() };
    const filteredPayments = await admin.get('/api/v1/payments').query(dateBounds);
    expect(filteredPayments.status).toBe(200);
    expect(filteredPayments.body.data.payments).toHaveLength(2);
    const dashboard = await admin.get('/api/v1/reports/dashboard').query(dateBounds);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.activeSubscriptions).toBe(1);
    expect(dashboard.body.data.collected).toEqual([{ currency: 'INR', amount: 106_200 }]);
    expect(dashboard.body.data.arr).toEqual([{ currency: 'INR', amount: 1_200_000 }]);
    expect(dashboard.body.data.revenueByPlan).toEqual([{ name: 'Integration Monthly', currency: 'INR', amount: 106_200 }]);
    expect(dashboard.body.data.revenueByProduct).toEqual([{ name: 'Integration Product', currency: 'INR', amount: 106_200 }]);
  }, 30_000);

  it('creates one invoice per due billing period and records the event once', async () => {
    const dueAt = new Date(Date.now() - 60_000);
    await Subscription.updateOne({ _id: subscriptionId }, { $set: { nextBillingDate: dueAt } });
    const firstCycle = await runRecurringBilling(new Date());
    expect(firstCycle).toMatchObject({ billed: 1, failed: 0, databaseReady: true });
    const countAfterFirst = await mongoose.model('Invoice').countDocuments({ subscription: subscriptionId });
    const secondCycle = await runRecurringBilling(new Date());
    expect(secondCycle.billed).toBe(0);
    expect(await mongoose.model('Invoice').countDocuments({ subscription: subscriptionId })).toBe(countAfterFirst);
    expect(await mongoose.model('BillingEvent').countDocuments({ subscription: subscriptionId, status: 'SUCCEEDED' })).toBe(1);
  }, 30_000);
});
