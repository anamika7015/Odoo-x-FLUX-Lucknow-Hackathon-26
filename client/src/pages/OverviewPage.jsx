import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiBox, FiLayers, FiUsers, FiCreditCard, FiFileText, FiDollarSign, FiAlertCircle } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ThreeDCard } from '../components/aceternity/ThreeDCard.jsx';
import { ThreeBackground } from '../components/ThreeBackground.jsx';
import { Spotlight } from '../components/aceternity/Spotlight.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { api, unwrap } from '../services/api.js';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { formatCurrencyBuckets, reportDateParams } from '../lib/analytics.js';
import { Input } from '../components/ui/Primitives.jsx';

export function OverviewPage() {
  const [range, setRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const params = useMemo(() => reportDateParams(range, customFrom, customTo), [range, customFrom, customTo]);
  const report = useQuery({ queryKey: ['reports', 'dashboard', params], queryFn: () => api.get('/reports/dashboard', { params }).then(unwrap), enabled: range !== 'custom' || Boolean(customFrom && customTo) });

  const stats = [
    { icon: FiUsers, label: 'Total customers', value: report.data?.customers ?? '—' },
    { icon: FiBox, label: 'Total products', value: report.data?.products ?? '—' },
    { icon: FiLayers, label: 'Active subscriptions', value: report.data?.activeSubscriptions ?? '—' },
    { icon: FiFileText, label: 'Total quotations', value: report.data?.quotations ?? '—' },
    { icon: FiFileText, label: 'Total invoices', value: report.data?.invoices ?? '—' },
    { icon: FiDollarSign, label: 'Collected', value: formatCurrencyBuckets(report.data?.collected) },
    { icon: FiCreditCard, label: 'Outstanding', value: formatCurrencyBuckets(report.data?.outstanding) },
    { icon: FiAlertCircle, label: 'Overdue balance', value: formatCurrencyBuckets(report.data?.overdue) },
    { icon: FiCreditCard, label: 'Monthly recurring revenue', value: formatCurrencyBuckets(report.data?.mrr) },
    { icon: FiCreditCard, label: 'Annual recurring revenue', value: formatCurrencyBuckets(report.data?.arr) },
  ];
  const revenueData = report.data?.revenueTrend?.filter((entry) => entry.currency === 'INR').map((entry) => ({ name: entry.month, value: entry.amount / 100 })) || [];
  const subscriptionData = report.data?.subscriptionTrend || [];
  const acquisitionData = report.data?.customerAcquisition || [];
  const mrrData = report.data?.mrrByStartMonth?.filter((entry) => entry.currency === 'INR').map((entry) => ({ month: entry.month, value: entry.amount / 100 })) || [];
  const invoiceStatusData = report.data?.invoiceStatusCounts || [];
  const paymentMethods = report.data?.paymentsByMethod?.filter((entry) => entry.currency === 'INR').map((entry) => ({ method: entry.method.replaceAll('_', ' '), value: entry.amount / 100 })) || [];
  const planRevenue = report.data?.revenueByPlan?.filter((entry) => entry.currency === 'INR').map((entry) => ({ name: entry.name.replace(/^Demo · /, ''), value: entry.amount / 100 })) || [];
  const productRevenue = report.data?.revenueByProduct?.filter((entry) => entry.currency === 'INR').map((entry) => ({ name: entry.name.replace(/^Demo · /, ''), value: entry.amount / 100 })) || [];
  const chartColors = ['var(--color-accent)', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <PageTransition className="relative">
      <ThreeBackground />
      <Spotlight />
      <PageHeader eyebrow="OVERVIEW" title="Workspace dashboard" description="Operational snapshot of your subscription business." actions={<select aria-label="Dashboard date range" className="h-10 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text" value={range} onChange={(event) => setRange(event.target.value)}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="thisMonth">This month</option><option value="lastMonth">Last month</option><option value="custom">Custom range</option></select>} />
      {range === 'custom' && <div className="mb-5 flex flex-wrap items-end gap-3"><label className="field"><span>From</span><Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /></label><label className="field"><span>To</span><Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></label></div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ icon: Icon, label, value }) => (
          <ThreeDCard key={label}>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-app-muted">{label}</CardTitle>
                <Icon className="h-4 w-4 text-app-accent" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-app-text">{report.isLoading ? '…' : value}</p>
              </CardContent>
            </Card>
          </ThreeDCard>
        ))}
      </div>
      <Card className="mt-6"><CardHeader><CardTitle>Quick actions</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">
        {[
          ['Add customer', '/customers'], ['Create product', '/products'], ['Create plan', '/plans'],
          ['Create quotation', '/quotations'], ['Create invoice', '/invoices'], ['Record payment', '/payments'],
        ].map(([label, to]) => <Link key={label} className="primary-button" to={to}>{label}</Link>)}
      </CardContent></Card>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--color-text-muted)" />
                <YAxis stroke="var(--color-text-muted)" />
                <Tooltip />
                <Area type="monotone" dataKey="value" name="Collected (₹)" stroke="var(--color-accent)" fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {report.isError && <p className="text-sm text-red-500">Dashboard data could not be loaded. Refresh the page to retry.</p>}
            {(report.data?.recentActivities || []).map((activity) => <div key={activity._id} className="flex items-center justify-between gap-3 border-b border-app-border pb-3 text-sm"><span className="text-app-text">{activity.action.replaceAll('_', ' ')} · {activity.entityType}</span><span className="text-app-muted">{new Date(activity.createdAt).toLocaleDateString()}</span></div>)}
            {!report.isLoading && !report.data?.recentActivities?.length && <EmptyState title="No activity yet" description="Customer, quotation, subscription, invoice and payment events will appear here." />}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <ChartCard title="Subscription growth"><ResponsiveContainer width="100%" height="100%"><LineChart data={subscriptionData}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="month" stroke="var(--color-text-muted)" /><YAxis allowDecimals={false} stroke="var(--color-text-muted)" /><Tooltip /><Line type="monotone" dataKey="count" name="Subscriptions" stroke="var(--color-accent)" strokeWidth={2} /></LineChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Customer acquisition"><ResponsiveContainer width="100%" height="100%"><BarChart data={acquisitionData}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="month" stroke="var(--color-text-muted)" /><YAxis allowDecimals={false} stroke="var(--color-text-muted)" /><Tooltip /><Bar dataKey="count" name="New customers" fill="var(--color-accent)" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="MRR by active subscription start month"><ResponsiveContainer width="100%" height="100%"><AreaChart data={mrrData}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="month" stroke="var(--color-text-muted)" /><YAxis stroke="var(--color-text-muted)" /><Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} /><Area type="monotone" dataKey="value" name="Active MRR added (₹)" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.16} /></AreaChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Invoice payment status"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={invoiceStatusData} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={92} label>{invoiceStatusData.map((entry, index) => <Cell key={entry.status} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Payments by method"><ResponsiveContainer width="100%" height="100%"><BarChart data={paymentMethods}><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis dataKey="method" stroke="var(--color-text-muted)" /><YAxis stroke="var(--color-text-muted)" /><Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} /><Bar dataKey="value" name="Payments (₹)" fill="var(--color-accent)" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Revenue by product"><ResponsiveContainer width="100%" height="100%"><BarChart data={productRevenue} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis type="number" stroke="var(--color-text-muted)" /><YAxis type="category" dataKey="name" width={125} stroke="var(--color-text-muted)" /><Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} /><Bar dataKey="value" name="Invoiced (₹)" fill="var(--color-accent)" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></ChartCard>
        <ChartCard title="Revenue by subscription plan"><ResponsiveContainer width="100%" height="100%"><BarChart data={planRevenue} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" /><XAxis type="number" stroke="var(--color-text-muted)" /><YAxis type="category" dataKey="name" width={125} stroke="var(--color-text-muted)" /><Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} /><Bar dataKey="value" name="Invoiced (₹)" fill="var(--color-accent)" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></ChartCard>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent subscriptions</CardTitle>
            <Link to="/subscriptions" className="text-xs font-medium text-app-accent hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(report.data?.recentSubscriptions || []).map((subscription) => (
              <div key={subscription._id} className="flex items-center justify-between gap-3 border-b border-app-border pb-3 text-sm">
                <div>
                  <strong className="text-app-text">{subscription.subscriptionNumber}</strong>
                  <p className="text-xs text-app-muted">{subscription.customer?.companyName || subscription.customer?.fullName || subscription.customer?.email || 'Customer'} · {new Date(subscription.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className={`status text-xs ${subscription.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{subscription.status}</span>
                  <p className="mt-0.5 text-xs text-app-muted">{formatCurrencyBuckets([{ currency: subscription.currency || 'INR', amount: subscription.subtotal }])}</p>
                </div>
              </div>
            ))}
            {!report.data?.recentSubscriptions?.length && <p className="text-sm text-app-muted">No subscriptions recorded yet.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent payments</CardTitle>
            <Link to="/payments" className="text-xs font-medium text-app-accent hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {(report.data?.recentPayments || []).map((payment) => (
              <div key={payment._id} className="flex items-center justify-between gap-3 border-b border-app-border pb-3 text-sm">
                <div>
                  <strong className="text-app-text">{payment.customer?.companyName || payment.customer?.fullName || payment.invoice?.invoiceNumber || 'Payment'}</strong>
                  <p className="text-xs text-app-muted">{payment.method?.replaceAll('_', ' ')} · {new Date(payment.paymentDate).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <strong className="text-app-text">{formatCurrencyBuckets([{ currency: payment.invoice?.currency || 'INR', amount: payment.amount }])}</strong>
                  <p className="text-xs text-app-muted">{payment.invoice?.invoiceNumber || '—'}</p>
                </div>
              </div>
            ))}
            {!report.data?.recentPayments?.length && <p className="text-sm text-app-muted">No payments recorded yet.</p>}
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Upcoming renewals</CardTitle></CardHeader><CardContent className="space-y-3">
          {(report.data?.upcomingRenewals || []).map((item) => <div key={item._id} className="flex justify-between gap-3 border-b border-app-border pb-3 text-sm"><span>{item.customer?.companyName || item.customer?.fullName || item.customer?.email} · {item.subscriptionNumber}</span><span className="text-app-muted">{new Date(item.nextBillingDate).toLocaleDateString()} · {formatCurrencyBuckets([{ currency: item.currency, amount: item.subtotal }])}</span></div>)}
          {!report.data?.upcomingRenewals?.length && <p className="text-sm text-app-muted">No renewals due in the next 30 days.</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Overdue invoices</CardTitle></CardHeader><CardContent className="space-y-3">
          {(report.data?.overdueInvoices || []).map((invoice) => <div key={invoice._id} className="flex justify-between gap-3 border-b border-app-border pb-3 text-sm"><span>{invoice.invoiceNumber} · {invoice.customerSnapshot?.companyName || invoice.customerSnapshot?.fullName}</span><span className="text-app-muted">Due {new Date(invoice.dueDate).toLocaleDateString()} · {formatCurrencyBuckets([{ currency: invoice.currency, amount: invoice.outstanding }])}</span></div>)}
          {!report.data?.overdueInvoices?.length && <p className="text-sm text-app-muted">No overdue invoices.</p>}
        </CardContent></Card>
      </div>
    </PageTransition>
  );
}

function ChartCard({ title, children }) { return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="h-72">{children}</CardContent></Card>; }
