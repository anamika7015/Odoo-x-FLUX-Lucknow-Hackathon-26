import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiBarChart2, FiCreditCard, FiUsers, FiLayers, FiDollarSign } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Input } from '../components/ui/Primitives.jsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { api, unwrap } from '../services/api.js';
import { formatCurrencyBuckets, reportDateParams } from '../lib/analytics.js';

export function ReportsPage() {
  const [range, setRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [currency, setCurrency] = useState('INR');
  const params = useMemo(() => reportDateParams(range, customFrom, customTo), [range, customFrom, customTo]);
  const report = useQuery({ queryKey: ['reports', 'dashboard', params], queryFn: () => api.get('/reports/dashboard', { params }).then(unwrap), enabled: range !== 'custom' || Boolean(customFrom && customTo) });
  const data = report.data;
  const revenue = data?.revenueTrend?.filter((entry) => entry.currency === currency).map((entry) => ({ month: entry.month, revenue: entry.amount / 100 })) || [];
  const metrics = [
    { icon: FiUsers, label: 'Active customers', value: data?.customers ?? '—' },
    { icon: FiLayers, label: 'Active subscriptions', value: data?.activeSubscriptions ?? '—' },
    { icon: FiCreditCard, label: 'MRR before discounts and tax', value: formatCurrencyBuckets(data?.mrr) },
    { icon: FiCreditCard, label: 'ARR before discounts and tax', value: formatCurrencyBuckets(data?.arr) },
    { icon: FiDollarSign, label: 'Collected payments', value: formatCurrencyBuckets(data?.collected) },
    { icon: FiBarChart2, label: 'Confirmed invoices', value: formatCurrencyBuckets(data?.invoiced) },
    { icon: FiDollarSign, label: 'Outstanding', value: formatCurrencyBuckets(data?.outstanding) },
    { icon: FiDollarSign, label: 'Overdue balance', value: formatCurrencyBuckets(data?.overdue) },
    { icon: FiLayers, label: 'New subscriptions', value: data?.newSubscriptions ?? '—' },
    { icon: FiBarChart2, label: 'Billing attempts needing review', value: data?.billingFailures ?? '—' },
    { icon: FiBarChart2, label: 'Invoice notifications pending', value: data?.notificationFailures ?? '—' },
  ];
  const currencies = [...new Set([...(data?.revenueTrend || []), ...(data?.revenueByPlan || []), ...(data?.revenueByProduct || []), ...(data?.mrr || [])].map((entry) => entry.currency))];
  const planRevenue = data?.revenueByPlan?.filter((entry) => entry.currency === currency) || [];
  const productRevenue = data?.revenueByProduct?.filter((entry) => entry.currency === currency) || [];
  const money = (amount) => formatCurrencyBuckets([{ currency, amount }]);
  const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '—';

  return (
    <PageTransition>
      <PageHeader eyebrow="ANALYTICS" title="Reports" description="Compare invoiced revenue, collected payments, outstanding balances, and recurring revenue." actions={<select aria-label="Report date range" className="h-10 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text" value={range} onChange={(event) => setRange(event.target.value)}><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="thisMonth">This month</option><option value="lastMonth">Last month</option><option value="custom">Custom range</option></select>} />
      {range === 'custom' && <div className="mb-5 flex flex-wrap items-end gap-3"><label className="field"><span>From</span><Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label><label className="field"><span>To</span><Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label></div>}
      {report.isError && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-500">Report data could not be loaded. Check the API connection and retry.</p>}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value }) => <Card key={label}><CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-sm font-medium text-app-muted">{label}</CardTitle><Icon className="h-4 w-4 text-app-accent" /></CardHeader><CardContent><p className="text-xl font-semibold text-app-text">{report.isLoading ? '…' : value}</p></CardContent></Card>)}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle>Collected payments by month</CardTitle><select aria-label="Revenue chart currency" className="h-9 rounded-lg border border-app-border bg-app-surface px-2 text-sm text-app-text" value={currencies.includes(currency) ? currency : currencies[0] || 'INR'} onChange={(event) => setCurrency(event.target.value)}>{(currencies.length ? currencies : ['INR']).map((item) => <option key={item} value={item}>{item}</option>)}</select></CardHeader>
          <CardContent className="h-72">{revenue.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={revenue}><XAxis dataKey="month" stroke="var(--color-text-muted)" /><YAxis stroke="var(--color-text-muted)" /><Tooltip /><Bar dataKey="revenue" name={`Collected (${currency})`} fill="var(--color-accent)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyState icon={FiBarChart2} title={report.isLoading ? 'Loading report…' : 'No collected revenue in this period'} description="Payments appear here once they are recorded against confirmed invoices." className="h-full py-8" />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Subscription growth</CardTitle></CardHeader>
          <CardContent className="h-72">{data?.subscriptionTrend?.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data.subscriptionTrend}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="month" stroke="var(--color-text-muted)" /><YAxis allowDecimals={false} stroke="var(--color-text-muted)" /><Tooltip /><Line type="monotone" dataKey="count" name="Subscriptions" stroke="var(--color-accent)" strokeWidth={2} /></LineChart></ResponsiveContainer> : <EmptyState icon={FiBarChart2} title="No subscription history" description="New subscriptions will appear as they are created." className="h-full py-8" />}</CardContent>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Invoiced revenue by plan</CardTitle></CardHeader>
          <CardContent>{planRevenue.length ? <div className="grid gap-3">{planRevenue.map((entry) => <div className="flex items-center justify-between gap-4 border-b border-app-border pb-2 text-sm" key={`${entry.name}-${entry.currency}`}><span className="truncate text-app-text">{entry.name}</span><strong className="shrink-0 text-app-text">{money(entry.amount)}</strong></div>)}</div> : <EmptyState icon={FiBarChart2} title="No plan revenue in this period" description="Confirmed invoice lines are grouped by their plan snapshot." className="py-8" />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Invoiced revenue by product</CardTitle></CardHeader>
          <CardContent>{productRevenue.length ? <div className="grid gap-3">{productRevenue.map((entry) => <div className="flex items-center justify-between gap-4 border-b border-app-border pb-2 text-sm" key={`${entry.name}-${entry.currency}`}><span className="truncate text-app-text">{entry.name}</span><strong className="shrink-0 text-app-text">{money(entry.amount)}</strong></div>)}</div> : <EmptyState icon={FiBarChart2} title="No product revenue in this period" description="Confirmed invoice lines are grouped by their product snapshot." className="py-8" />}</CardContent>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Recent payments</CardTitle></CardHeader>
          <CardContent>{data?.recentPayments?.length ? <div className="grid gap-3">{data.recentPayments.map((payment) => <div className="flex items-start justify-between gap-3 border-b border-app-border pb-2 text-sm" key={payment._id}><span className="min-w-0"><strong className="block truncate text-app-text">{payment.customer?.companyName || payment.customer?.fullName || payment.invoice?.invoiceNumber || 'Payment'}</strong><small className="text-app-muted">{payment.method.replaceAll('_', ' ')} · {dateLabel(payment.paymentDate)}</small></span><strong className="shrink-0 text-app-text">{formatCurrencyBuckets([{ currency: payment.invoice?.currency || 'INR', amount: payment.amount }])}</strong></div>)}</div> : <EmptyState icon={FiCreditCard} title="No recent payments" description="Payments will appear here when recorded." className="py-8" />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent subscriptions</CardTitle></CardHeader>
          <CardContent>{data?.recentSubscriptions?.length ? <div className="grid gap-3">{data.recentSubscriptions.map((subscription) => <div className="flex items-start justify-between gap-3 border-b border-app-border pb-2 text-sm" key={subscription._id}><span className="min-w-0"><strong className="block truncate text-app-text">{subscription.subscriptionNumber}</strong><small className="text-app-muted">{subscription.customer?.companyName || subscription.customer?.fullName || 'Customer'} · {dateLabel(subscription.createdAt)}</small></span><strong className="shrink-0 text-app-text">{subscription.status}</strong></div>)}</div> : <EmptyState icon={FiLayers} title="No recent subscriptions" description="New subscriptions will appear here." className="py-8" />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Upcoming renewals</CardTitle></CardHeader>
          <CardContent>{data?.upcomingRenewals?.length ? <div className="grid gap-3">{data.upcomingRenewals.map((subscription) => <div className="flex items-start justify-between gap-3 border-b border-app-border pb-2 text-sm" key={subscription._id}><span className="min-w-0"><strong className="block truncate text-app-text">{subscription.subscriptionNumber}</strong><small className="text-app-muted">{subscription.customer?.companyName || subscription.customer?.fullName || 'Customer'}</small></span><strong className="shrink-0 text-app-text">{dateLabel(subscription.nextBillingDate)}</strong></div>)}</div> : <EmptyState icon={FiLayers} title="No upcoming renewals" description="Active subscriptions due within 30 days will appear here." className="py-8" />}</CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
