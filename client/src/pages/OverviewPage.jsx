import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Layers,
  CreditCard,
  Users,
  Package,
  FileText,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Clock,
  Activity,
  ArrowRight,
} from 'lucide-react';
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
  Legend,
} from 'recharts';
import { formatCurrencyBuckets, reportDateParams } from '../lib/analytics.js';
import { Input } from '../components/ui/Primitives.jsx';

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

  // High-Contrast Obsidian & Violet Chart Palette
  const chartPalette = ['#5145CD', '#9065EF', '#3B82F6', '#B8A8F8', '#10B981', '#F59E0B'];

  return (
    <PageTransition className="relative">
      <ThreeBackground variant="subtle" />

      <PageHeader
        eyebrow="EXECUTIVE DASHBOARD"
        title="Workspace Performance"
        description="Comprehensive real-time telemetry, recurring revenue trajectory, and active subscriber metrics."
        actions={
          <div className="flex items-center gap-2">
            <select
              aria-label="Dashboard date range"
              className="h-10 rounded-xl border border-app-border bg-app-surface px-3.5 pr-8 text-xs font-semibold text-app-text shadow-subtle focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring cursor-pointer"
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
        }
      />

      {range === 'custom' && (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-app-border bg-app-surface/80 p-4 backdrop-blur-sm shadow-subtle">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-app-text">
            <span>From</span>
            <Input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-app-text">
            <span>To</span>
            <Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
          </label>
        </div>
      )}

      {/* Primary KPI Executive Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Collected Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-brand-indigo/30 bg-app-surface p-5 shadow-card transition-all hover:shadow-elevated hover:border-brand-indigo/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-indigo dark:text-brand-violet-light">
              Total Revenue
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-indigo/10 dark:bg-brand-violet/20 text-brand-indigo dark:text-brand-violet-light border border-brand-indigo/20">
              <DollarSign size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-app-text tabular-nums">
              {report.isLoading ? '…' : formatCurrencyBuckets(report.data?.collected)}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-app-text-muted">
              <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                <ArrowUpRight size={14} className="mr-0.5" /> Settled
              </span>
              <span>across all invoices</span>
            </p>
          </div>
        </div>

        {/* Card 2: Recurring Revenue (MRR / ARR) */}
        <div className="relative overflow-hidden rounded-2xl border border-brand-violet/30 bg-app-surface p-5 shadow-card transition-all hover:shadow-elevated hover:border-brand-violet/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-violet dark:text-brand-violet-light">
              Monthly Recurring
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-violet/10 dark:bg-brand-violet/20 text-brand-violet dark:text-brand-violet-light border border-brand-violet/20">
              <TrendingUp size={18} strokeWidth={2.2} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-app-text tabular-nums">
              {report.isLoading ? '…' : formatCurrencyBuckets(report.data?.mrr)}
            </p>
            <p className="mt-1.5 flex items-center justify-between text-xs text-app-text-muted">
              <span>ARR Normalized</span>
              <span className="font-bold text-app-text tabular-nums">
                {report.isLoading ? '…' : formatCurrencyBuckets(report.data?.arr)}
              </span>
            </p>
          </div>
        </div>

        {/* Card 3: Active Subscriptions */}
        <div className="relative overflow-hidden rounded-2xl border border-app-border bg-app-surface p-5 shadow-card transition-all hover:shadow-elevated hover:border-app-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-app-text-muted">
              Active Subscriptions
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-secondary text-app-text border border-app-border">
              <Layers size={18} strokeWidth={2} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-app-text tabular-nums">
              {report.isLoading ? '…' : report.data?.activeSubscriptions ?? 0}
            </p>
            <p className="mt-1.5 flex items-center justify-between text-xs text-app-text-muted">
              <span>Client base</span>
              <span className="font-bold text-app-text tabular-nums">
                {report.isLoading ? '…' : report.data?.customers ?? 0} active
              </span>
            </p>
          </div>
        </div>

        {/* Card 4: Outstanding & Overdue */}
        <div className="relative overflow-hidden rounded-2xl border border-app-border bg-app-surface p-5 shadow-card transition-all hover:shadow-elevated">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-app-text-muted">
              Outstanding Balance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <CreditCard size={18} strokeWidth={2} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-app-text tabular-nums">
              {report.isLoading ? '…' : formatCurrencyBuckets(report.data?.outstanding)}
            </p>
            <p className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-app-text-muted">Overdue risk</span>
              <span className="font-bold text-rose-500 tabular-nums">
                {report.isLoading ? '…' : formatCurrencyBuckets(report.data?.overdue)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics Row */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total Customers', value: report.data?.customers ?? '0', icon: Users },
          { label: 'Products', value: report.data?.products ?? '0', icon: Package },
          { label: 'Active Plans', value: report.data?.activeSubscriptions ?? '0', icon: Layers },
          { label: 'Quotations', value: report.data?.quotations ?? '0', icon: FileText },
          { label: 'Invoices Issued', value: report.data?.invoices ?? '0', icon: FileText },
          { label: 'Payment Methods', value: paymentMethods.length, icon: CheckCircle2 },
        ].map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 rounded-xl border border-app-border bg-app-surface px-3.5 py-2.5 shadow-subtle transition-colors hover:border-brand-violet/40"
          >
            <item.icon className="h-4 w-4 text-brand-indigo dark:text-brand-violet-light shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-app-text-muted truncate">{item.label}</p>
              <p className="text-sm font-bold text-app-text tabular-nums">{report.isLoading ? '…' : item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Ribbon */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-subtle">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-brand-violet" />
          <span className="text-xs font-bold uppercase tracking-wider text-app-text">Quick Launch:</span>
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-app-border bg-app-surface px-3.5 py-1.5 text-xs font-semibold text-app-text shadow-subtle transition-all hover:border-brand-indigo dark:hover:border-brand-violet hover:bg-brand-indigo/5 dark:hover:bg-brand-violet/10 hover:text-brand-indigo dark:hover:text-brand-violet-light hover:-translate-y-0.5"
            >
              <Plus size={13} className="text-brand-indigo dark:text-brand-violet-light" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Primary Analytics Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Revenue Trajectory */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-subtle">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Revenue Trajectory</CardTitle>
              <p className="text-xs text-app-text-muted">Monthly collections settled in INR</p>
            </div>
            <span className="rounded-full bg-brand-indigo/10 dark:bg-brand-violet/20 px-2.5 py-0.5 text-[11px] font-bold text-brand-indigo dark:text-brand-violet-light border border-brand-indigo/20">
              Gross Collections
            </span>
          </CardHeader>
          <CardContent className="pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="execRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5145CD" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#9065EF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.7} />
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
                  stroke="#5145CD"
                  strokeWidth={2.5}
                  fill="url(#execRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Operational Audit Activity */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-subtle flex flex-col">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Recent Operations Activity</CardTitle>
              <p className="text-xs text-app-text-muted">Live audit stream of subscriptions and invoices</p>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Audit
            </span>
          </CardHeader>
          <CardContent className="pt-4 flex-1 overflow-y-auto space-y-2.5 max-h-72">
            {report.isError && (
              <p className="text-xs text-rose-500">Dashboard telemetry could not be loaded. Please refresh to retry.</p>
            )}
            {(report.data?.recentActivities || []).map((activity) => (
              <div
                key={activity._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-app-border/60 bg-app-secondary/30 p-2.5 transition-colors hover:bg-app-secondary/60"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-app-text capitalize truncate">
                    {activity.action.replaceAll('_', ' ')}
                  </p>
                  <p className="text-[11px] text-app-text-muted font-medium">{activity.entityType}</p>
                </div>
                <span className="text-[11px] font-semibold text-app-text-muted whitespace-nowrap">
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
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-subtle">
          <CardHeader className="border-b border-app-border/60 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-app-text">Subscription Growth</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={subscriptionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.7} />
                <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={11} />
                <YAxis allowDecimals={false} stroke="var(--color-text-muted)" fontSize={11} />
                <Tooltip content={<ExecutiveTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Subscriptions"
                  stroke="#5145CD"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#5145CD' }}
                  activeDot={{ r: 6, fill: '#9065EF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Acquisition */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-subtle">
          <CardHeader className="border-b border-app-border/60 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-app-text">Customer Acquisition</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acquisitionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.7} />
                <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={11} />
                <YAxis allowDecimals={false} stroke="var(--color-text-muted)" fontSize={11} />
                <Tooltip content={<ExecutiveTooltip />} />
                <Bar dataKey="count" name="New Customers" fill="#9065EF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MRR Added by Start Month */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-subtle">
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
                    <stop offset="5%" stopColor="#9065EF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#5145CD" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.7} />
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
                  stroke="#9065EF"
                  strokeWidth={2}
                  fill="url(#execMrr)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Invoice Payment Status */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-subtle">
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
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {invoiceStatusData.map((entry, index) => (
                    <Cell key={entry.status} fill={chartPalette[index % chartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ExecutiveTooltip />} />
                <Legend
                  formatter={(value) => <span className="text-xs font-semibold text-app-text">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payments by Method */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-subtle">
          <CardHeader className="border-b border-app-border/60 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-app-text">Payments by Method</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethods}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.7} />
                <XAxis dataKey="method" stroke="var(--color-text-muted)" fontSize={11} />
                <YAxis
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<ExecutiveTooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />} />
                <Bar dataKey="value" name="Amount" fill="#5145CD" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Subscription Plan */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-subtle">
          <CardHeader className="border-b border-app-border/60 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-app-text">Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planRevenue} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.7} />
                <XAxis
                  type="number"
                  stroke="var(--color-text-muted)"
                  fontSize={11}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <YAxis type="category" dataKey="name" width={115} stroke="var(--color-text-muted)" fontSize={10} />
                <Tooltip content={<ExecutiveTooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />} />
                <Bar dataKey="value" name="Invoiced" fill="#9065EF" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Operational Ledgers: Recent Subscriptions & Recent Payments */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent Subscriptions */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-subtle">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Recent Subscriptions</CardTitle>
              <p className="text-xs text-app-text-muted">Latest commercial commitments</p>
            </div>
            <Link
              to="/subscriptions"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-indigo dark:text-brand-violet-light hover:underline"
            >
              <span>View all</span>
              <ArrowRight size={13} />
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {(report.data?.recentSubscriptions || []).map((subscription) => (
              <div
                key={subscription._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-app-border/60 bg-app-secondary/25 p-3 transition-colors hover:bg-app-secondary/50"
              >
                <div>
                  <strong className="text-xs font-bold text-app-text">{subscription.subscriptionNumber}</strong>
                  <p className="text-[11px] text-app-text-muted mt-0.5">
                    {subscription.customer?.companyName ||
                      subscription.customer?.fullName ||
                      subscription.customer?.email ||
                      'Customer'}{' '}
                    · {new Date(subscription.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      subscription.status === 'ACTIVE'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : subscription.status === 'PAUSED'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-app-secondary text-app-text-muted border border-app-border'
                    }`}
                  >
                    {subscription.status}
                  </span>
                  <p className="mt-1 text-xs font-bold text-app-text tabular-nums">
                    {formatCurrencyBuckets([{ currency: subscription.currency || 'INR', amount: subscription.subtotal }])}
                  </p>
                </div>
              </div>
            ))}
            {!report.data?.recentSubscriptions?.length && (
              <p className="text-xs text-app-text-muted py-3 text-center">No subscriptions recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-subtle">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Recent Payments</CardTitle>
              <p className="text-xs text-app-text-muted">Settled credit transactions</p>
            </div>
            <Link
              to="/payments"
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-indigo dark:text-brand-violet-light hover:underline"
            >
              <span>View all</span>
              <ArrowRight size={13} />
            </Link>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {(report.data?.recentPayments || []).map((payment) => (
              <div
                key={payment._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-app-border/60 bg-app-secondary/25 p-3 transition-colors hover:bg-app-secondary/50"
              >
                <div>
                  <strong className="text-xs font-bold text-app-text">
                    {payment.customer?.companyName ||
                      payment.customer?.fullName ||
                      payment.invoice?.invoiceNumber ||
                      'Payment'}
                  </strong>
                  <p className="text-[11px] text-app-text-muted mt-0.5">
                    {payment.method?.replaceAll('_', ' ')} · {new Date(payment.paymentDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <strong className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrencyBuckets([{ currency: payment.invoice?.currency || 'INR', amount: payment.amount }])}
                  </strong>
                  <p className="text-[11px] text-app-text-muted mt-0.5">{payment.invoice?.invoiceNumber || '—'}</p>
                </div>
              </div>
            ))}
            {!report.data?.recentPayments?.length && (
              <p className="text-xs text-app-text-muted py-3 text-center">No payments recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operational Notices: Upcoming Renewals & Overdue Invoices */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Upcoming Renewals */}
        <Card className="rounded-2xl border-app-border bg-app-surface shadow-subtle">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="text-brand-indigo dark:text-brand-violet-light" size={16} />
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Upcoming Renewals</CardTitle>
            </div>
            <span className="text-[11px] font-semibold text-app-text-muted bg-app-secondary px-2.5 py-0.5 rounded-full border border-app-border">
              Next 30 Days
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {(report.data?.upcomingRenewals || []).map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-app-border/50 bg-app-secondary/25 p-3"
              >
                <div>
                  <p className="text-xs font-bold text-app-text">
                    {item.customer?.companyName || item.customer?.fullName || item.customer?.email}
                  </p>
                  <p className="text-[11px] text-app-text-muted mt-0.5">{item.subscriptionNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-app-text tabular-nums">
                    {formatCurrencyBuckets([{ currency: item.currency, amount: item.subtotal }])}
                  </span>
                  <p className="text-[11px] text-brand-indigo dark:text-brand-violet-light font-medium mt-0.5">
                    Due {new Date(item.nextBillingDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {!report.data?.upcomingRenewals?.length && (
              <p className="text-xs text-app-text-muted py-3 text-center">No renewals due in the next 30 days.</p>
            )}
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card className="rounded-2xl border-rose-500/30 bg-app-surface shadow-subtle">
          <CardHeader className="flex-row items-center justify-between border-b border-rose-500/20 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-rose-500" size={16} />
              <CardTitle className="text-sm font-bold tracking-tight text-app-text">Overdue Invoices</CardTitle>
            </div>
            <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-500 border border-rose-500/20">
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
                  <p className="text-[11px] text-app-text-muted mt-0.5">
                    {invoice.customerSnapshot?.companyName || invoice.customerSnapshot?.fullName}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-500 tabular-nums">
                    {formatCurrencyBuckets([{ currency: invoice.currency, amount: invoice.outstanding }])}
                  </span>
                  <p className="text-[11px] text-rose-400 font-medium mt-0.5">
                    Past due {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {!report.data?.overdueInvoices?.length && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 py-3 text-center font-semibold">
                No overdue invoices. Accounts are in good standing.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
