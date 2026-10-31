import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CreditCard,
  Users,
  Layers,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  Activity,
  FileText,
  Clock,
  Sparkles,
  PieChart as PieIcon,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Input } from '../components/ui/Primitives.jsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { api, unwrap } from '../services/api.js';
import { formatCurrencyBuckets, reportDateParams } from '../lib/analytics.js';

// Custom tooltip component for high-contrast Obsidian & Violet charts
function ExecutiveTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-app-border bg-[#17172E] text-[#F7F6FF] px-4 py-3 shadow-modal backdrop-blur-md">
      {label && <p className="mb-1.5 text-xs font-bold text-[#A5A3BC] uppercase tracking-wider">{label}</p>}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2.5 text-xs py-0.5">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: entry.color || entry.fill }}
          />
          <span className="text-[#A5A3BC] font-medium">{entry.name}:</span>
          <span className="font-bold tabular-nums text-white">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReportsPage() {
  const [range, setRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [currency, setCurrency] = useState('INR');

  const params = useMemo(() => reportDateParams(range, customFrom, customTo), [range, customFrom, customTo]);
  const report = useQuery({
    queryKey: ['reports', 'dashboard', params],
    queryFn: () => api.get('/reports/dashboard', { params }).then(unwrap),
    enabled: range !== 'custom' || Boolean(customFrom && customTo),
  });

  const data = report.data;
  const revenue =
    data?.revenueTrend?.filter((entry) => entry.currency === currency).map((entry) => ({
      month: entry.month,
      revenue: entry.amount / 100,
    })) || [];

  const metrics = [
    { icon: Users, label: 'Active Customers', value: data?.customers ?? '—', trend: 'Catalog accounts' },
    { icon: Layers, label: 'Active Subscriptions', value: data?.activeSubscriptions ?? '—', trend: 'Live recurring' },
    { icon: CreditCard, label: 'MRR (Pre-tax)', value: formatCurrencyBuckets(data?.mrr), trend: 'Monthly baseline' },
    { icon: TrendingUp, label: 'ARR (Pre-tax)', value: formatCurrencyBuckets(data?.arr), trend: 'Annualized baseline' },
    { icon: DollarSign, label: 'Collected Payments', value: formatCurrencyBuckets(data?.collected), trend: 'Settled funds' },
    { icon: FileText, label: 'Confirmed Invoices', value: formatCurrencyBuckets(data?.invoiced), trend: 'Recognized revenue' },
    { icon: Activity, label: 'Outstanding Balance', value: formatCurrencyBuckets(data?.outstanding), trend: 'Pending collection' },
    { icon: Clock, label: 'Overdue Balance', value: formatCurrencyBuckets(data?.overdue), trend: 'Past due date' },
    { icon: Sparkles, label: 'New Subscriptions', value: data?.newSubscriptions ?? '—', trend: 'Acquisition cohort' },
    { icon: AlertCircle, label: 'Billing Attempts Needing Review', value: data?.billingFailures ?? '—', trend: 'Failed transactions' },
    { icon: AlertCircle, label: 'Invoice Notifications Pending', value: data?.notificationFailures ?? '—', trend: 'Delivery queue' },
  ];

  const currencies = [
    ...new Set(
      [
        ...(data?.revenueTrend || []),
        ...(data?.revenueByPlan || []),
        ...(data?.revenueByProduct || []),
        ...(data?.mrr || []),
      ].map((entry) => entry.currency)
    ),
  ];

  const planRevenue = data?.revenueByPlan?.filter((entry) => entry.currency === currency) || [];
  const productRevenue = data?.revenueByProduct?.filter((entry) => entry.currency === currency) || [];
  const money = (amount) => formatCurrencyBuckets([{ currency, amount }]);
  const dateLabel = (value) =>
    value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <PageTransition>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          eyebrow="FINANCIAL INTELLIGENCE"
          title="Revenue & Growth Analytics"
          description="Track recurring revenue streams, recognized collections, cohort growth, and cash flow performance."
          actions={
            <div className="flex items-center gap-3">
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none" />
                <select
                  aria-label="Report date range"
                  className="h-10 pl-9 pr-8 rounded-xl border border-app-border bg-app-card text-sm text-app-text font-medium focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 dark:focus:ring-brand-violet/30 transition-all cursor-pointer shadow-subtle"
                  value={range}
                  onChange={(event) => setRange(event.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="thisMonth">This month</option>
                  <option value="lastMonth">Last month</option>
                  <option value="custom">Custom range…</option>
                </select>
              </div>
            </div>
          }
        />

        {range === 'custom' && (
          <div className="p-4 rounded-2xl bg-app-card border border-app-border shadow-subtle flex flex-wrap items-end gap-4 animate-in fade-in duration-300">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-app-muted uppercase">From Date</label>
              <Input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-app-muted uppercase">To Date</label>
              <Input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            {(!customFrom || !customTo) && (
              <p className="text-xs text-amber-500 pb-2">Select both start and end dates to compute custom metrics.</p>
            )}
          </div>
        )}

        {report.isError && (
          <div role="alert" className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-500 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>Report data could not be loaded. Please check your network connection and retry.</span>
          </div>
        )}

        {/* Executive KPI Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {metrics.map(({ icon: Icon, label, value, trend }) => (
            <Card key={label} className="hover:border-brand-indigo/30 dark:hover:border-brand-violet/30 transition-all group">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-app-muted">{label}</CardTitle>
                <div className="w-8 h-8 rounded-lg bg-brand-lavender/30 dark:bg-brand-violet/15 flex items-center justify-center text-brand-indigo dark:text-brand-violet group-hover:scale-110 transition-transform">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-2xl font-bold tracking-tight text-app-text tabular-nums">
                  {report.isLoading ? (
                    <span className="inline-block w-20 h-6 rounded bg-app-secondary animate-pulse" />
                  ) : (
                    value
                  )}
                </p>
                <p className="text-xs text-app-muted">{trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Primary Interactive Charts */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Revenue Bar Chart */}
          <Card className="shadow-subtle">
            <CardHeader className="flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-bold text-app-text flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-indigo dark:text-brand-violet" />
                  Collected Payments by Month
                </CardTitle>
                <p className="text-xs text-app-muted mt-0.5">Historical cash collections across billing cycles</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-app-muted font-medium">Currency:</span>
                <select
                  aria-label="Revenue chart currency"
                  className="h-8 rounded-lg border border-app-border bg-app-surface px-2.5 text-xs font-semibold text-app-text focus:outline-none focus:ring-1 focus:ring-brand-indigo dark:focus:ring-brand-violet"
                  value={currencies.includes(currency) ? currency : currencies[0] || 'INR'}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  {(currencies.length ? currencies : ['INR']).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent className="h-80">
              {revenue.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9065EF" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#5145CD" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(81, 69, 205, 0.12)" />
                    <XAxis
                      dataKey="month"
                      stroke="var(--color-text-muted)"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--color-text-muted)"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip
                      content={
                        <ExecutiveTooltip
                          formatter={(val) =>
                            new Intl.NumberFormat('en-IN', {
                              style: 'currency',
                              currency,
                              maximumFractionDigits: 0,
                            }).format(val)
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="revenue"
                      name={`Collected (${currency})`}
                      fill="url(#revenueBarGrad)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title={report.isLoading ? 'Computing reports…' : 'No collected revenue recorded'}
                  description="Payments will populate this chart once recorded against confirmed invoices."
                  className="h-full py-8"
                />
              )}
            </CardContent>
          </Card>

          {/* Subscription Growth Line Chart */}
          <Card className="shadow-subtle">
            <CardHeader className="flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-bold text-app-text flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-violet" />
                  Subscription Growth Curve
                </CardTitle>
                <p className="text-xs text-app-muted mt-0.5">Monthly trajectory of active customer recurring plans</p>
              </div>
            </CardHeader>
            <CardContent className="h-80">
              {data?.subscriptionTrend?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.subscriptionTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(81, 69, 205, 0.12)" />
                    <XAxis
                      dataKey="month"
                      stroke="var(--color-text-muted)"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="var(--color-text-muted)"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <Tooltip content={<ExecutiveTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Active Subscriptions"
                      stroke="#9065EF"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#5145CD', stroke: '#9065EF', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#9065EF', stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="No subscription history recorded"
                  description="Subscription trends will render automatically as memberships are activated."
                  className="h-full py-8"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Breakdown by Plan & Product */}
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Revenue by Plan */}
          <Card className="shadow-subtle">
            <CardHeader className="border-b border-app-border pb-4">
              <CardTitle className="text-base font-bold text-app-text flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-indigo dark:text-brand-violet" />
                Invoiced Revenue by Plan
              </CardTitle>
              <p className="text-xs text-app-muted mt-0.5">Billed amounts segmented across tiered subscription plans</p>
            </CardHeader>
            <CardContent className="pt-4">
              {planRevenue.length ? (
                <div className="space-y-3">
                  {planRevenue.map((entry) => (
                    <div
                      key={`${entry.name}-${entry.currency}`}
                      className="p-3 rounded-xl border border-app-border bg-app-card hover:bg-brand-indigo/5 dark:hover:bg-brand-violet/5 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <strong className="block text-sm font-semibold text-app-text truncate">{entry.name}</strong>
                        <span className="text-xs text-app-muted">Plan tier breakdown</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-app-text shrink-0">
                        {money(entry.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="No plan revenue in this period"
                  description="Confirmed invoice lines are grouped by their plan snapshot."
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>

          {/* Revenue by Product */}
          <Card className="shadow-subtle">
            <CardHeader className="border-b border-app-border pb-4">
              <CardTitle className="text-base font-bold text-app-text flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-brand-indigo dark:text-brand-violet" />
                Invoiced Revenue by Product
              </CardTitle>
              <p className="text-xs text-app-muted mt-0.5">Billed amounts segmented by underlying core products</p>
            </CardHeader>
            <CardContent className="pt-4">
              {productRevenue.length ? (
                <div className="space-y-3">
                  {productRevenue.map((entry) => (
                    <div
                      key={`${entry.name}-${entry.currency}`}
                      className="p-3 rounded-xl border border-app-border bg-app-card hover:bg-brand-indigo/5 dark:hover:bg-brand-violet/5 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <strong className="block text-sm font-semibold text-app-text truncate">{entry.name}</strong>
                        <span className="text-xs text-app-muted">Catalog product</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-app-text shrink-0">
                        {money(entry.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="No product revenue in this period"
                  description="Confirmed invoice lines are grouped by their product catalog snapshot."
                  className="py-8"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Operational Audit Feeds */}
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Recent Payments */}
          <Card className="shadow-subtle">
            <CardHeader className="border-b border-app-border pb-4">
              <CardTitle className="text-sm font-bold text-app-text flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {data?.recentPayments?.length ? (
                <div className="space-y-3">
                  {data.recentPayments.map((payment) => (
                    <div
                      key={payment._id}
                      className="p-2.5 rounded-xl border border-app-border bg-app-card flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <strong className="block truncate text-app-text font-medium">
                          {payment.customer?.companyName ||
                            payment.customer?.fullName ||
                            payment.invoice?.invoiceNumber ||
                            'Payment'}
                        </strong>
                        <span className="text-xs text-app-muted flex items-center gap-1 mt-0.5">
                          <span>{payment.method.replaceAll('_', ' ')}</span>
                          <span>•</span>
                          <span>{dateLabel(payment.paymentDate)}</span>
                        </span>
                      </div>
                      <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                        {formatCurrencyBuckets([
                          { currency: payment.invoice?.currency || 'INR', amount: payment.amount },
                        ])}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CreditCard}
                  title="No recent payments"
                  description="Recorded settlements will appear here."
                  className="py-6"
                />
              )}
            </CardContent>
          </Card>

          {/* Recent Subscriptions */}
          <Card className="shadow-subtle">
            <CardHeader className="border-b border-app-border pb-4">
              <CardTitle className="text-sm font-bold text-app-text flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-indigo dark:text-brand-violet" />
                Recent Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {data?.recentSubscriptions?.length ? (
                <div className="space-y-3">
                  {data.recentSubscriptions.map((subscription) => (
                    <div
                      key={subscription._id}
                      className="p-2.5 rounded-xl border border-app-border bg-app-card flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <strong className="block truncate text-app-text font-medium">
                          {subscription.subscriptionNumber}
                        </strong>
                        <span className="text-xs text-app-muted flex items-center gap-1 mt-0.5">
                          <span>{subscription.customer?.companyName || subscription.customer?.fullName || 'Customer'}</span>
                          <span>•</span>
                          <span>{dateLabel(subscription.createdAt)}</span>
                        </span>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-lavender/40 dark:bg-brand-violet/20 text-brand-indigo dark:text-brand-softPurple shrink-0">
                        {subscription.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Layers}
                  title="No recent subscriptions"
                  description="New subscriptions will appear here."
                  className="py-6"
                />
              )}
            </CardContent>
          </Card>

          {/* Upcoming Renewals */}
          <Card className="shadow-subtle">
            <CardHeader className="border-b border-app-border pb-4">
              <CardTitle className="text-sm font-bold text-app-text flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Upcoming Renewals
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {data?.upcomingRenewals?.length ? (
                <div className="space-y-3">
                  {data.upcomingRenewals.map((subscription) => (
                    <div
                      key={subscription._id}
                      className="p-2.5 rounded-xl border border-app-border bg-app-card flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <strong className="block truncate text-app-text font-medium">
                          {subscription.subscriptionNumber}
                        </strong>
                        <span className="text-xs text-app-muted block truncate mt-0.5">
                          {subscription.customer?.companyName || subscription.customer?.fullName || 'Customer'}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {dateLabel(subscription.nextBillingDate)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Layers}
                  title="No upcoming renewals"
                  description="Active subscriptions due within 30 days will appear here."
                  className="py-6"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
