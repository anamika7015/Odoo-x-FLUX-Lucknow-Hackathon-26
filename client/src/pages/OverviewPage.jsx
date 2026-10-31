import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FiBox,
  FiLayers,
  FiUsers,
  FiCreditCard,
  FiFileText,
  FiDollarSign,
  FiAlertCircle,
  FiTrendingUp,
  FiArrowUpRight,
  FiCalendar,
  FiPlus,
  FiCheckCircle,
  FiClock,
} from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ThreeBackground } from '../components/ThreeBackground.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { api, unwrap } from '../services/api.js';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatCurrencyBuckets, reportDateParams } from '../lib/analytics.js';
import { Input } from '../components/ui/Primitives.jsx';

// Custom tooltip component for sleek Midnight Executive charts
function ExecutiveTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-app-border bg-app-surface/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
      {label && <p className="mb-1 text-xs font-semibold text-app-text">{label}</p>}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-app-text-muted">{entry.name}:</span>
          <span className="font-semibold tabular-nums text-app-text">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function OverviewPage() {
  const [range, setRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const params = useMemo(() => reportDateParams(range, customFrom, customTo), [range, customFrom, customTo]);
  const report = useQuery({
    queryKey: ['reports', 'dashboard', params],
    queryFn: () => api.get('/reports/dashboard', { params }).then(unwrap),
    enabled: range !== 'custom' || Boolean(customFrom && customTo),
  });

  const revenueData =
    report.data?.revenueTrend
      ?.filter((entry) => entry.currency === 'INR')
      .map((entry) => ({ name: entry.month, value: entry.amount / 100 })) || [];

  const subscriptionData = report.data?.subscriptionTrend || [];
  const acquisitionData = report.data?.customerAcquisition || [];
  const mrrData =
    report.data?.mrrByStartMonth
      ?.filter((entry) => entry.currency === 'INR')
      .map((entry) => ({ month: entry.month, value: entry.amount / 100 })) || [];

  const invoiceStatusData = report.data?.invoiceStatusCounts || [];
  const paymentMethods =
    report.data?.paymentsByMethod
      ?.filter((entry) => entry.currency === 'INR')
      .map((entry) => ({ method: entry.method.replaceAll('_', ' '), value: entry.amount / 100 })) || [];

  const planRevenue =
    report.data?.revenueByPlan
      ?.filter((entry) => entry.currency === 'INR')
      .map((entry) => ({ name: entry.name.replace(/^Demo · /, ''), value: entry.amount / 100 })) || [];

  const productRevenue =
    report.data?.revenueByProduct
      ?.filter((entry) => entry.currency === 'INR')
      .map((entry) => ({ name: entry.name.replace(/^Demo · /, ''), value: entry.amount / 100 })) || [];

  // Midnight Executive Chart Palette
  const chartColors = ['#176B68', '#C5A46D', '#3D8981', '#26344B', '#10B981', '#F59E0B'];

  return (
    <PageTransition className="relative">
      <ThreeBackground />

      <PageHeader
        eyebrow="EXECUTIVE OVERVIEW"
        title="Workspace Performance"
        description="Comprehensive real-time telemetry, revenue trajectory, and active subscriber metrics."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                aria-label="Dashboard date range"
                className="h-9 rounded-lg border border-app-border bg-app-surface px-3 pr-8 text-xs font-medium text-app-text shadow-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
                value={range}
                onChange={(event) => setRange(event.target.value)}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="thisMonth">This month</option>
                <option value="lastMonth">Last month</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
          </div>
        }
      />

      {range === 'custom' && (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-app-border bg-app-surface/60 p-4 backdrop-blur-sm">
          <label className="flex flex-col gap-1 text-xs font-medium text-app-text">
            <span>From</span>
            <Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-app-text">
            <span>To</span>
            <Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
          </label>
        </div>
      )}

      {/* Primary KPI Executive Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Collected Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-brand-gold/30 bg-gradient-to-br from-app-surface to-brand-gold/5 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-gold">Total Revenue</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gold/15 text-brand-gold">
              <FiDollarSign size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-app-text tabular-nums">
              {report.isLoading ? '…' : formatCurrencyBuckets(report.data?.collected)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-app-text-muted">
              <span className="inline-flex items-center text-emerald-500 font-medium">
                <FiArrowUpRight size={14} className="mr-0.5" /> Settled
              </span>
              <span>across all invoices</span>
            </p>
          </div>
        </div>

        {/* Card 2: Recurring Revenue (MRR / ARR) */}
        <div className="relative overflow-hidden rounded-2xl border border-brand-teal/30 bg-gradient-to-br from-app-surface to-brand-teal/5 p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-teal">Monthly Recurring</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal/15 text-brand-teal">
              <FiTrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-app-text tabular-nums">
              {report.isLoading ? '…' : formatCurrencyBuckets(report.data?.mrr)}
            </p>
            <p className="mt-1 flex items-center justify-between text-xs text-app-text-muted">
              <span>ARR Normalized</span>
              <span className="font-semibold text-app-text tabular-nums">
                {report.isLoading ? '…' : formatCurrencyBuckets(report.data?.arr)}
              </span>
            </p>
          </div>
        </div>

        {/* Card 3: Active Subscriptions */}
        <div className="relative overflow-hidden rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-app-text-muted">Active Subscriptions</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-secondary text-app-text">
              <FiLayers size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-app-text tabular-nums">
              {report.isLoading ? '…' : report.data?.activeSubscriptions ?? 0}
            </p>
            <p className="mt-1 flex items-center justify-between text-xs text-app-text-muted">
              <span>Customer base</span>
              <span className="font-semibold text-app-text tabular-nums">
                {report.isLoading ? '…' : report.data?.customers ?? 0} clients
              </span>
            </p>
          </div>
        </div>

        {/* Card 4: Outstanding & Overdue */}
        <div className="relative overflow-hidden rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-app-text-muted">Outstanding Balance</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <FiCreditCard size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-app-text tabular-nums">
              {report.isLoading ? '…' : formatCurrencyBuckets(report.data?.outstanding)}
            </p>
            <p className="mt-1 flex items-center justify-between text-xs">
              <span className="text-app-text-muted">Overdue</span>
              <span className="font-semibold text-rose-500 tabular-nums">
                {report.isLoading ? '…' : formatCurrencyBuckets(report.data?.overdue)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics Row */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Customers', value: report.data?.customers ?? '0', icon: FiUsers },
          { label: 'Products', value: report.data?.products ?? '0', icon: FiBox },
          { label: 'Active Plans', value: report.data?.activeSubscriptions ?? '0', icon: FiLayers },
          { label: 'Quotations', value: report.data?.quotations ?? '0', icon: FiFileText },
          { label: 'Invoices Issued', value: report.data?.invoices ?? '0', icon: FiFileText },
          { label: 'Payment Method Count', value: paymentMethods.length, icon: FiCheckCircle },
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface/60 px-3.5 py-2.5 transition-colors hover:bg-app-surface"
          >
            <item.icon className="h-4 w-4 text-brand-teal shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-app-text-muted truncate">{item.label}</p>
              <p className="text-sm font-bold text-app-text tabular-nums">{report.isLoading ? '…' : item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Ribbon */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-app-text-muted">Quick Actions:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Add Customer', to: '/customers' },
            { label: 'Create Product', to: '/products' },
            { label: 'Create Plan', to: '/plans' },
            { label: 'New Quotation', to: '/quotations' },
            { label: 'Generate Invoice', to: '/invoices' },
            { label: 'Record Payment', to: '/payments' },
          ].map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-xs font-medium text-app-text shadow-sm transition-all hover:border-brand-teal hover:bg-brand-teal/5 hover:text-brand-teal"
            >
              <FiPlus size={13} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Primary Analytics Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Revenue Trajectory */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-sm">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Revenue Trajectory</CardTitle>
              <p className="text-xs text-app-text-muted">Monthly collections settled in INR</p>
            </div>
            <span className="rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand-teal">
              Gross Collections
            </span>
          </CardHeader>
          <CardContent className="pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="execRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#176B68" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#176B68" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<ExecutiveTooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Collected"
                  stroke="#176B68"
                  strokeWidth={2.5}
                  fill="url(#execRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Operational Audit Activity */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-sm flex flex-col">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Recent Operations Activity</CardTitle>
              <p className="text-xs text-app-text-muted">Live audit stream of subscriptions and invoices</p>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </CardHeader>
          <CardContent className="pt-4 flex-1 overflow-y-auto space-y-3 max-h-72">
            {report.isError && (
              <p className="text-xs text-rose-500">Dashboard data could not be loaded. Please refresh to retry.</p>
            )}
            {(report.data?.recentActivities || []).map((activity) => (
              <div
                key={activity._id}
                className="flex items-center justify-between gap-3 rounded-lg border border-app-border/40 bg-app-secondary/20 p-2.5 transition-colors hover:bg-app-secondary/40"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-app-text capitalize truncate">
                    {activity.action.replaceAll('_', ' ')}
                  </p>
                  <p className="text-[11px] text-app-text-muted">{activity.entityType}</p>
                </div>
                <span className="text-[11px] font-medium text-app-text-muted whitespace-nowrap">
                  {new Date(activity.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
            {!report.isLoading && !report.data?.recentActivities?.length && (
              <EmptyState
                title="No activity recorded"
                description="Events for customers, subscriptions, quotations and invoices will stream here."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Analytics Grid */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Subscription Growth */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-sm">
          <CardHeader className="border-b border-app-border/60 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-app-text">Subscription Growth</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={subscriptionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
                <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={11} />
                <YAxis allowDecimals={false} stroke="var(--color-text-muted)" fontSize={11} />
                <Tooltip content={<ExecutiveTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Subscriptions"
                  stroke="#176B68"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#176B68' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Acquisition */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-sm">
          <CardHeader className="border-b border-app-border/60 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-app-text">Customer Acquisition</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acquisitionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
                <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={11} />
                <YAxis allowDecimals={false} stroke="var(--color-text-muted)" fontSize={11} />
                <Tooltip content={<ExecutiveTooltip />} />
                <Bar dataKey="count" name="New Customers" fill="#C5A46D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MRR Added by Start Month */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-sm">
          <CardHeader className="border-b border-app-border/60 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-app-text">
              Active MRR Added by Cohort
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrData}>
                <defs>
                  <linearGradient id="execMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3D8981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3D8981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
                <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={11} />
                <YAxis
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<ExecutiveTooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="MRR Added"
                  stroke="#3D8981"
                  strokeWidth={2}
                  fill="url(#execMrr)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Invoice Payment Status */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-sm">
          <CardHeader className="border-b border-app-border/60 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-app-text">
              Invoice Settlement Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={invoiceStatusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {invoiceStatusData.map((entry, index) => (
                    <Cell key={entry.status} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ExecutiveTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payments by Method */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-sm">
          <CardHeader className="border-b border-app-border/60 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-app-text">Payments by Method</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethods}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
                <XAxis dataKey="method" stroke="var(--color-text-muted)" fontSize={11} />
                <YAxis
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<ExecutiveTooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />} />
                <Bar dataKey="value" name="Amount" fill="#176B68" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Subscription Plan */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-sm">
          <CardHeader className="border-b border-app-border/60 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-app-text">Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
                <XAxis
                  type="number"
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <YAxis type="category" dataKey="name" width={115} stroke="var(--color-text-muted)" fontSize={10} />
                <Tooltip content={<ExecutiveTooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />} />
                <Bar dataKey="value" name="Invoiced" fill="#C5A46D" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Operational Ledgers: Recent Subscriptions & Recent Payments */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent Subscriptions */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-sm">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Recent Subscriptions</CardTitle>
              <p className="text-xs text-app-text-muted">Latest commercial commitments</p>
            </div>
            <Link to="/subscriptions" className="text-xs font-semibold text-brand-teal hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {(report.data?.recentSubscriptions || []).map((subscription) => (
              <div
                key={subscription._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-app-border/50 bg-app-secondary/20 p-3 transition-colors hover:bg-app-secondary/40"
              >
                <div>
                  <strong className="text-xs font-bold text-app-text">{subscription.subscriptionNumber}</strong>
                  <p className="text-[11px] text-app-text-muted">
                    {subscription.customer?.companyName ||
                      subscription.customer?.fullName ||
                      subscription.customer?.email ||
                      'Customer'}{' '}
                    · {new Date(subscription.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      subscription.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : subscription.status === 'PAUSED'
                        ? 'bg-amber-500/15 text-amber-500'
                        : 'bg-app-secondary text-app-text-muted'
                    }`}
                  >
                    {subscription.status}
                  </span>
                  <p className="mt-0.5 text-xs font-bold text-app-text tabular-nums">
                    {formatCurrencyBuckets([{ currency: subscription.currency || 'INR', amount: subscription.subtotal }])}
                  </p>
                </div>
              </div>
            ))}
            {!report.data?.recentSubscriptions?.length && (
              <p className="text-xs text-app-text-muted py-2 text-center">No subscriptions recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-sm">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Recent Payments</CardTitle>
              <p className="text-xs text-app-text-muted">Recent credit transactions</p>
            </div>
            <Link to="/payments" className="text-xs font-semibold text-brand-teal hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {(report.data?.recentPayments || []).map((payment) => (
              <div
                key={payment._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-app-border/50 bg-app-secondary/20 p-3 transition-colors hover:bg-app-secondary/40"
              >
                <div>
                  <strong className="text-xs font-bold text-app-text">
                    {payment.customer?.companyName ||
                      payment.customer?.fullName ||
                      payment.invoice?.invoiceNumber ||
                      'Payment'}
                  </strong>
                  <p className="text-[11px] text-app-text-muted">
                    {payment.method?.replaceAll('_', ' ')} · {new Date(payment.paymentDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <strong className="text-xs font-bold text-emerald-500 tabular-nums">
                    {formatCurrencyBuckets([{ currency: payment.invoice?.currency || 'INR', amount: payment.amount }])}
                  </strong>
                  <p className="text-[11px] text-app-text-muted">{payment.invoice?.invoiceNumber || '—'}</p>
                </div>
              </div>
            ))}
            {!report.data?.recentPayments?.length && (
              <p className="text-xs text-app-text-muted py-2 text-center">No payments recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational Notices: Upcoming Renewals & Overdue Invoices */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Upcoming Renewals */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-sm">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <div className="flex items-center gap-2">
              <FiCalendar className="text-brand-teal" size={16} />
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Upcoming Renewals</CardTitle>
            </div>
            <span className="text-[11px] text-app-text-muted">Next 30 Days</span>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {(report.data?.upcomingRenewals || []).map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-app-border/40 bg-app-secondary/20 p-3"
              >
                <div>
                  <p className="text-xs font-bold text-app-text">
                    {item.customer?.companyName || item.customer?.fullName || item.customer?.email}
                  </p>
                  <p className="text-[11px] text-app-text-muted">{item.subscriptionNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-app-text tabular-nums">
                    {formatCurrencyBuckets([{ currency: item.currency, amount: item.subtotal }])}
                  </span>
                  <p className="text-[11px] text-app-text-muted">
                    Due {new Date(item.nextBillingDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {!report.data?.upcomingRenewals?.length && (
              <p className="text-xs text-app-text-muted py-2 text-center">No renewals due in the next 30 days.</p>
            )}
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card className="rounded-2xl border-rose-500/30 bg-app-surface shadow-sm">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <div className="flex items-center gap-2">
              <FiAlertCircle className="text-rose-500" size={16} />
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Overdue Invoices</CardTitle>
            </div>
            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
              Immediate Action
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {(report.data?.overdueInvoices || []).map((invoice) => (
              <div
                key={invoice._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3"
              >
                <div>
                  <p className="text-xs font-bold text-app-text">{invoice.invoiceNumber}</p>
                  <p className="text-[11px] text-app-text-muted">
                    {invoice.customerSnapshot?.companyName || invoice.customerSnapshot?.fullName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-500 tabular-nums">
                    {formatCurrencyBuckets([{ currency: invoice.currency, amount: invoice.outstanding }])}
                  </span>
                  <p className="text-[11px] text-rose-400">
                    Past due {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {!report.data?.overdueInvoices?.length && (
              <p className="text-xs text-emerald-500 py-2 text-center font-medium">No overdue invoices. Accounts are in good standing.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
