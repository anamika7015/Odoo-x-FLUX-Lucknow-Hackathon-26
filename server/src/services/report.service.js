import { Customer } from '../models/customer.model.js';
import { BillingEvent, billingEventStatuses, notificationStatuses } from '../models/billing-event.model.js';
import { Invoice } from '../models/invoice.model.js';
import { Payment } from '../models/payment.model.js';
import { Product } from '../models/product.model.js';
import { Quotation } from '../models/quotation.model.js';
import { Subscription } from '../models/subscription.model.js';
import { AuditLog } from '../models/audit-log.model.js';
import '../models/user.model.js';
import { trustedFilter } from '../utils/trusted-filter.js';

const monthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
const currencyTotals = async (model, pipeline) => model.aggregate(pipeline);

export async function getDashboardReport({ from, to }) {
  const now = new Date();
  const dateFilter = from || to ? { $gte: from ?? new Date(0), $lte: to ?? now } : null;
  const paymentMatch = dateFilter ? { paymentDate: dateFilter } : {};
  const confirmedInvoiceMatch = dateFilter ? { confirmedAt: dateFilter } : {};
  const newSubscriptionMatch = dateFilter ? { createdAt: dateFilter } : {};
  const monthRangeStart = from ? new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1)) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const monthRangeEnd = to ? new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth() + 1, 1)) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const trendMonths = [];
  for (const cursor = new Date(monthRangeStart); cursor < monthRangeEnd; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) trendMonths.push(monthKey(cursor));

  const [customerCount, productCount, quotationCount, invoiceCount, activeSubscriptionCount, newSubscriptionCount, mrr, collected, invoiced, outstanding, overdue, revenueTrend, subscriptionTrend, customerAcquisition, mrrByStartMonth, invoiceStatusCounts, paymentsByMethod, revenueByPlan, revenueByProduct, recentPayments, recentSubscriptions, upcomingRenewals, recentActivities, overdueInvoices, billingFailures, notificationFailures] = await Promise.all([
    Customer.countDocuments(),
    Product.countDocuments(),
    Quotation.countDocuments(),
    Invoice.countDocuments(),
    Subscription.countDocuments({ status: 'ACTIVE' }),
    Subscription.countDocuments(trustedFilter(newSubscriptionMatch)),
    currencyTotals(Subscription, [
      { $match: { status: 'ACTIVE' } }, { $unwind: '$lines' },
      { $set: { monthlyAmount: { $multiply: ['$lines.lineTotal', { $switch: { branches: [
        { case: { $eq: ['$lines.billingFrequency', 'DAILY'] }, then: 30 },
        { case: { $eq: ['$lines.billingFrequency', 'WEEKLY'] }, then: { $divide: [52, 12] } },
        { case: { $eq: ['$lines.billingFrequency', 'YEARLY'] }, then: { $divide: [1, 12] } },
      ], default: 1 } }] } } },
      { $group: { _id: '$currency', amount: { $sum: '$monthlyAmount' } } }, { $project: { _id: 0, currency: '$_id', amount: { $round: ['$amount', 0] } } }, { $sort: { currency: 1 } },
    ]),
    currencyTotals(Payment, [
      { $match: paymentMatch }, { $lookup: { from: 'invoices', localField: 'invoice', foreignField: '_id', as: 'invoice' } }, { $unwind: '$invoice' },
      { $group: { _id: '$invoice.currency', amount: { $sum: '$amount' } } }, { $project: { _id: 0, currency: '$_id', amount: 1 } }, { $sort: { currency: 1 } },
    ]),
    currencyTotals(Invoice, [
      { $match: { status: { $in: ['CONFIRMED', 'PAID'] }, ...confirmedInvoiceMatch } },
      { $group: { _id: '$currency', amount: { $sum: '$total' } } }, { $project: { _id: 0, currency: '$_id', amount: 1 } }, { $sort: { currency: 1 } },
    ]),
    currencyTotals(Invoice, [
      { $match: { status: { $in: ['CONFIRMED', 'PAID'] }, outstanding: { $gt: 0 } } },
      { $group: { _id: '$currency', amount: { $sum: '$outstanding' } } }, { $project: { _id: 0, currency: '$_id', amount: 1 } }, { $sort: { currency: 1 } },
    ]),
    currencyTotals(Invoice, [
      { $match: { status: { $in: ['CONFIRMED', 'PAID'] }, outstanding: { $gt: 0 }, dueDate: { $lt: now } } },
      { $group: { _id: '$currency', amount: { $sum: '$outstanding' } } }, { $project: { _id: 0, currency: '$_id', amount: 1 } }, { $sort: { currency: 1 } },
    ]),
    currencyTotals(Payment, [
      { $match: { paymentDate: { $gte: monthRangeStart, $lt: monthRangeEnd } } },
      { $lookup: { from: 'invoices', localField: 'invoice', foreignField: '_id', as: 'invoice' } }, { $unwind: '$invoice' },
      { $group: { _id: { month: { $dateToString: { format: '%Y-%m', date: '$paymentDate', timezone: 'UTC' } }, currency: '$invoice.currency' }, amount: { $sum: '$amount' } } },
      { $project: { _id: 0, month: '$_id.month', currency: '$_id.currency', amount: 1 } }, { $sort: { month: 1, currency: 1 } },
    ]),
    currencyTotals(Subscription, [
      { $match: { createdAt: { $gte: monthRangeStart, $lt: monthRangeEnd } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $project: { _id: 0, month: '$_id', count: 1 } }, { $sort: { month: 1 } },
    ]),
    Customer.aggregate([
      { $match: { createdAt: { $gte: monthRangeStart, $lt: monthRangeEnd } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
      { $project: { _id: 0, month: '$_id', count: 1 } }, { $sort: { month: 1 } },
    ]),
    currencyTotals(Subscription, [
      { $match: { status: 'ACTIVE', createdAt: { $gte: monthRangeStart, $lt: monthRangeEnd } } }, { $unwind: '$lines' },
      { $set: { monthlyAmount: { $multiply: ['$lines.lineTotal', { $switch: { branches: [
        { case: { $eq: ['$lines.billingFrequency', 'DAILY'] }, then: 30 },
        { case: { $eq: ['$lines.billingFrequency', 'WEEKLY'] }, then: { $divide: [52, 12] } },
        { case: { $eq: ['$lines.billingFrequency', 'YEARLY'] }, then: { $divide: [1, 12] } },
      ], default: 1 } }] } } },
      { $group: { _id: { month: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: 'UTC' } }, currency: '$currency' }, amount: { $sum: '$monthlyAmount' } } },
      { $project: { _id: 0, month: '$_id.month', currency: '$_id.currency', amount: { $round: ['$amount', 0] } } }, { $sort: { month: 1, currency: 1 } },
    ]),
    Invoice.aggregate([
      { $set: { dashboardStatus: { $switch: { branches: [
        { case: { $in: ['$status', ['DRAFT', 'CANCELLED', 'PAID']] }, then: '$status' },
        { case: { $and: [{ $gt: ['$outstanding', 0] }, { $lt: ['$dueDate', now] }] }, then: 'OVERDUE' },
        { case: { $gt: ['$amountPaid', 0] }, then: 'PARTIALLY_PAID' },
      ], default: 'CONFIRMED' } } } },
      { $group: { _id: '$dashboardStatus', count: { $sum: 1 } } }, { $project: { _id: 0, status: '$_id', count: 1 } }, { $sort: { status: 1 } },
    ]),
    currencyTotals(Payment, [
      { $match: paymentMatch }, { $lookup: { from: 'invoices', localField: 'invoice', foreignField: '_id', as: 'invoice' } }, { $unwind: '$invoice' },
      { $group: { _id: { method: '$method', currency: '$invoice.currency' }, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $project: { _id: 0, method: '$_id.method', currency: '$_id.currency', amount: 1, count: 1 } }, { $sort: { amount: -1 } },
    ]),
    ...['planName', 'productName'].map((key) => currencyTotals(Invoice, [
      { $match: { status: { $in: ['CONFIRMED', 'PAID'] }, ...confirmedInvoiceMatch } },
      { $unwind: '$lines' },
      { $group: { _id: { name: `$lines.${key}`, currency: '$currency' }, amount: { $sum: '$lines.total' } } },
      { $project: { _id: 0, name: '$_id.name', currency: '$_id.currency', amount: 1 } },
      { $sort: { amount: -1, name: 1 } }, { $limit: 10 },
    ])),
    Payment.find(trustedFilter(paymentMatch)).sort({ paymentDate: -1 }).limit(6).populate('invoice', 'invoiceNumber currency').populate('customer', 'fullName companyName email').lean(),
    Subscription.find(trustedFilter(newSubscriptionMatch)).sort({ createdAt: -1 }).limit(6).populate('customer', 'fullName companyName email').select('subscriptionNumber status currency subtotal createdAt nextBillingDate').lean(),
    Subscription.find(trustedFilter({ status: 'ACTIVE', nextBillingDate: { $gte: now, $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) } })).sort({ nextBillingDate: 1 }).limit(10).populate('customer', 'fullName companyName email').select('subscriptionNumber status currency nextBillingDate').lean(),
    AuditLog.find().sort({ createdAt: -1 }).limit(12).populate('actor', 'fullName email role').lean(),
    Invoice.find(trustedFilter({ status: { $in: ['CONFIRMED', 'PAID'] }, outstanding: { $gt: 0 }, dueDate: { $lt: now } })).sort({ dueDate: 1 }).limit(8).select('invoiceNumber customerSnapshot dueDate currency outstanding').lean(),
    BillingEvent.countDocuments({ status: billingEventStatuses.FAILED }),
    BillingEvent.countDocuments(trustedFilter({ status: billingEventStatuses.SUCCEEDED, notificationStatus: { $in: [notificationStatuses.PENDING, notificationStatuses.PROCESSING, notificationStatuses.FAILED] } })),
  ]);

  return {
    customers: customerCount,
    products: productCount,
    quotations: quotationCount,
    invoices: invoiceCount,
    activeSubscriptions: activeSubscriptionCount,
    newSubscriptions: newSubscriptionCount,
    mrr,
    arr: mrr.map((entry) => ({ ...entry, amount: entry.amount * 12 })),
    collected,
    invoiced,
    outstanding,
    overdue,
    revenueTrend: trendMonths.flatMap((month) => {
      const entries = revenueTrend.filter((entry) => entry.month === month);
      return entries.length ? entries : [{ month, currency: 'INR', amount: 0 }];
    }),
    subscriptionTrend: trendMonths.map((month) => ({ month, count: subscriptionTrend.find((entry) => entry.month === month)?.count ?? 0 })),
    customerAcquisition: trendMonths.map((month) => ({ month, count: customerAcquisition.find((entry) => entry.month === month)?.count ?? 0 })),
    mrrByStartMonth: trendMonths.flatMap((month) => {
      const entries = mrrByStartMonth.filter((entry) => entry.month === month);
      return entries.length ? entries : [{ month, currency: 'INR', amount: 0 }];
    }),
    invoiceStatusCounts,
    paymentsByMethod,
    revenueByPlan,
    revenueByProduct,
    recentPayments,
    recentSubscriptions,
    upcomingRenewals,
    recentActivities,
    overdueInvoices,
    billingFailures,
    notificationFailures,
  };
}
