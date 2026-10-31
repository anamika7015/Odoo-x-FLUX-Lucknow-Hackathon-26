import mongoose from 'mongoose';
import cron from 'node-cron';
import { BillingEvent, billingEventStatuses, notificationStatuses } from '../models/billing-event.model.js';
import { Invoice, invoiceStatuses } from '../models/invoice.model.js';
import { Subscription, subscriptionStatuses } from '../models/subscription.model.js';
import { SubscriptionHistory } from '../models/subscription-history.model.js';
import { AppError } from '../utils/app-error.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendInvoiceNotification } from './email.service.js';
import { createInvoiceFromSubscription, transitionInvoice } from './invoice.service.js';
import { calculateNextBillingDate } from './plan.service.js';
import { trustedFilter } from '../utils/trusted-filter.js';

const MAX_ATTEMPTS = 8;
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

export function billingRetryAt(now, attempts) {
  return attempts >= MAX_ATTEMPTS ? undefined : new Date(now.getTime() + Math.min(5 * 60_000 * (2 ** Math.max(0, attempts - 1)), 6 * 60 * 60_000));
}

async function claimBillingEvent(subscription, periodStart, periodEnd, now) {
  const staleLock = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const claimable = await BillingEvent.findOneAndUpdate(trustedFilter({
    subscription: subscription._id,
    periodStart,
    attempts: { $lt: MAX_ATTEMPTS },
    $or: [
      { status: billingEventStatuses.FAILED, attempts: { $lt: MAX_ATTEMPTS }, nextAttemptAt: { $lte: now } },
      { status: billingEventStatuses.PROCESSING, lockedAt: { $lte: staleLock } },
    ],
  }), { $set: { status: billingEventStatuses.PROCESSING, periodEnd, lockedAt: now, startedAt: now }, $unset: { nextAttemptAt: 1, lastError: 1 }, $inc: { attempts: 1 } }, { new: true });
  if (claimable) return claimable;
  try {
    return await BillingEvent.create({ subscription: subscription._id, periodStart, periodEnd, status: billingEventStatuses.PROCESSING, attempts: 1, lockedAt: now, startedAt: now });
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
}

async function findOrCreateInvoice(subscription, periodStart, periodEnd) {
  let invoice = await Invoice.findOne({ subscription: subscription._id, periodStart });
  if (!invoice) {
    try {
      invoice = await createInvoiceFromSubscription({ subscription: subscription._id, periodStart, dueDate: periodEnd }, { _id: subscription.createdBy, role: 'SYSTEM' });
    } catch (error) {
      // A manual invoice or a competing worker may have won the unique period index.
      if (error?.code !== 11000) throw error;
      invoice = await Invoice.findOne({ subscription: subscription._id, periodStart });
      if (!invoice) throw error;
    }
  }
  if (invoice.status === invoiceStatuses.DRAFT) invoice = await transitionInvoice(invoice._id, 'confirm', { _id: subscription.createdBy, role: 'SYSTEM' }, 'Confirmed by recurring billing worker.');
  if (![invoiceStatuses.CONFIRMED, invoiceStatuses.PAID].includes(invoice.status)) throw new AppError(`Billing period already has a ${invoice.status.toLowerCase()} invoice.`, { statusCode: 409, code: 'BILLING_INVOICE_UNAVAILABLE' });
  return invoice;
}

async function billSubscription(subscription, now) {
  const periodStart = subscription.nextBillingDate;
  const periodEnd = calculateNextBillingDate(periodStart, subscription.lines[0].billingFrequency);
  const event = await claimBillingEvent(subscription, periodStart, periodEnd, now);
  if (!event) return { skipped: true };
  try {
    if (subscription.status !== subscriptionStatuses.ACTIVE) {
      await BillingEvent.updateOne({ _id: event._id }, { $set: { status: billingEventStatuses.SKIPPED, lockedAt: undefined, completedAt: now, lastError: 'Subscription stopped before billing was processed.' } });
      return { skipped: true };
    }
    const invoice = await findOrCreateInvoice(subscription, periodStart, periodEnd);
    await Subscription.updateOne({ _id: subscription._id, status: subscriptionStatuses.ACTIVE, nextBillingDate: periodStart }, { $set: { nextBillingDate: periodEnd } });
    await BillingEvent.updateOne({ _id: event._id }, { $set: { status: billingEventStatuses.SUCCEEDED, invoice: invoice._id, completedAt: new Date(), notificationStatus: notificationStatuses.PENDING, notificationNextAttemptAt: now }, $unset: { lockedAt: 1, nextAttemptAt: 1, lastError: 1 } });
    return { billed: true, invoice: invoice._id };
  } catch (error) {
    const attempts = event.attempts;
    const nextAttemptAt = billingRetryAt(now, attempts);
    await BillingEvent.updateOne({ _id: event._id }, { $set: { status: billingEventStatuses.FAILED, lockedAt: undefined, nextAttemptAt, lastError: String(error?.message || 'Billing failed').slice(0, 1_000), completedAt: now } });
    logger.error('Recurring billing attempt failed', { eventId: event._id.toString(), subscriptionId: subscription._id.toString(), attempt: attempts, nextAttemptAt, error });
    return { failed: true, event: event._id };
  }
}

async function notifyInvoice(event, now) {
  const staleLock = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const claimed = await BillingEvent.findOneAndUpdate(trustedFilter({
    _id: event._id,
    notificationAttempts: { $lt: MAX_ATTEMPTS },
    $or: [
      { notificationStatus: notificationStatuses.PENDING, $or: [{ notificationNextAttemptAt: { $exists: false } }, { notificationNextAttemptAt: { $lte: now } }] },
      { notificationStatus: notificationStatuses.FAILED, notificationNextAttemptAt: { $lte: now } },
      { notificationStatus: notificationStatuses.PROCESSING, notificationLockedAt: { $lte: staleLock } },
    ],
  }), { $set: { notificationStatus: notificationStatuses.PROCESSING, notificationLockedAt: now }, $inc: { notificationAttempts: 1 } }, { new: true }).lean();
  if (!claimed) return;
  const invoice = await Invoice.findById(claimed.invoice).lean();
  if (!invoice) {
    await BillingEvent.updateOne({ _id: claimed._id }, { $set: { notificationStatus: notificationStatuses.FAILED, notificationError: 'Invoice record is missing.' }, $unset: { notificationLockedAt: 1, notificationNextAttemptAt: 1 } });
    return;
  }
  const sent = await sendInvoiceNotification({
    to: invoice.customerSnapshot?.email,
    fullName: invoice.customerSnapshot?.fullName || invoice.customerSnapshot?.companyName || 'Customer',
    invoiceNumber: invoice.invoiceNumber,
    total: invoice.total,
    outstanding: invoice.outstanding,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    eventId: claimed._id,
  });
  const attempts = claimed.notificationAttempts;
  const nextAttemptAt = sent ? undefined : billingRetryAt(now, attempts);
  const update = { $set: {
    notificationStatus: sent ? notificationStatuses.SENT : notificationStatuses.FAILED,
    notificationSentAt: sent ? new Date() : undefined,
    notificationError: sent ? undefined : 'Delivery failed or SMTP is not configured.',
  }, $unset: { notificationLockedAt: 1 } };
  if (nextAttemptAt) update.$set.notificationNextAttemptAt = nextAttemptAt;
  else update.$unset.notificationNextAttemptAt = 1;
  if (sent) update.$unset.notificationError = 1;
  await BillingEvent.updateOne({ _id: claimed._id }, update);
  if (!sent) logger.warn('Invoice notification delivery will be retried', { eventId: claimed._id.toString(), attempt: attempts, nextAttemptAt });
}

async function dispatchPendingInvoiceNotifications(now) {
  const staleLock = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  const events = await BillingEvent.find(trustedFilter({ status: billingEventStatuses.SUCCEEDED, invoice: { $exists: true }, notificationAttempts: { $lt: MAX_ATTEMPTS }, $or: [
    { notificationStatus: notificationStatuses.PENDING, $or: [{ notificationNextAttemptAt: { $exists: false } }, { notificationNextAttemptAt: { $lte: now } }] },
    { notificationStatus: notificationStatuses.FAILED, notificationNextAttemptAt: { $lte: now } },
    { notificationStatus: notificationStatuses.PROCESSING, notificationLockedAt: { $lte: staleLock } },
  ] })).sort({ createdAt: 1 }).limit(100).lean();
  for (const event of events) {
    try { await notifyInvoice(event, now); } catch (error) { logger.error('Invoice notification processing failed', { eventId: event._id.toString(), error }); }
  }
}

async function closeExhaustedStaleEvents(now) {
  const staleLock = new Date(now.getTime() - LOCK_TIMEOUT_MS);
  await BillingEvent.updateMany(trustedFilter({ status: billingEventStatuses.PROCESSING, attempts: { $gte: MAX_ATTEMPTS }, lockedAt: { $lte: staleLock } }), {
    $set: { status: billingEventStatuses.FAILED, completedAt: now, lastError: 'Billing worker stopped during the final allowed attempt.' },
    $unset: { lockedAt: 1, nextAttemptAt: 1 },
  });
  await BillingEvent.updateMany(trustedFilter({ status: billingEventStatuses.SUCCEEDED, notificationStatus: notificationStatuses.PROCESSING, notificationAttempts: { $gte: MAX_ATTEMPTS }, notificationLockedAt: { $lte: staleLock } }), {
    $set: { notificationStatus: notificationStatuses.FAILED, notificationError: 'Notification worker stopped during the final allowed attempt.' },
    $unset: { notificationLockedAt: 1, notificationNextAttemptAt: 1 },
  });
}

async function expireSubscriptions(now) {
  const expired = await Subscription.find(trustedFilter({ status: { $in: [subscriptionStatuses.ACTIVE, subscriptionStatuses.PAUSED, subscriptionStatuses.CONFIRMED] }, autoClose: true, expiryDate: { $lte: now } })).select('_id status createdBy').limit(200);
  for (const subscription of expired) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await Subscription.findOne(trustedFilter({ _id: subscription._id, status: subscription.status, expiryDate: { $lte: now } })).session(session);
        if (!current) return;
        current.status = subscriptionStatuses.EXPIRED;
        current.closedAt = now;
        await current.save({ session });
        await SubscriptionHistory.create([{ subscription: current._id, fromStatus: subscription.status, toStatus: subscriptionStatuses.EXPIRED, actor: subscription.createdBy, reason: 'Automatically expired at the configured end date.' }], { session });
      });
    } finally { await session.endSession(); }
  }
}

export async function runRecurringBilling(now = new Date()) {
  if (mongoose.connection.readyState !== 1) return { billed: 0, failed: 0, skipped: 0, databaseReady: false };
  await closeExhaustedStaleEvents(now);
  await expireSubscriptions(now);
  await dispatchPendingInvoiceNotifications(now);
  const due = await Subscription.find(trustedFilter({ status: subscriptionStatuses.ACTIVE, nextBillingDate: { $lte: now }, $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: now } }] })).sort({ nextBillingDate: 1 }).limit(100);
  const results = [];
  for (const subscription of due) results.push(await billSubscription(subscription, now));
  return {
    billed: results.filter((result) => result.billed).length,
    failed: results.filter((result) => result.failed).length,
    skipped: results.filter((result) => result.skipped).length,
    databaseReady: true,
  };
}

export function startRecurringBillingWorker() {
  const run = async () => {
    try {
      const result = await runRecurringBilling();
      if (result.billed || result.failed) logger.info('Recurring billing cycle completed', result);
    } catch (error) { logger.error('Recurring billing cycle failed', { error }); }
  };
  void run();
  return cron.schedule('* * * * *', run, { timezone: config.appTimezone });
}
