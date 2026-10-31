import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Download,
  Eye,
  FileText,
  Package,
  Search,
  User,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  Building2,
  Mail,
  Phone,
  FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Badge } from '../components/ui/Primitives.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Modal, FormField, FormInput, FormTextarea, ModalFooter } from '../components/ui/Modal.jsx';

const money = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((amount || 0) / 100);
const date = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '—');

export function CustomerPortalPage() {
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Filter states
  const [subSearch, setSubSearch] = useState('');
  const [subStatus, setSubStatus] = useState('');
  const [invSearch, setInvSearch] = useState('');
  const [invStatus, setInvStatus] = useState('');
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatus, setQuoteStatus] = useState('');
  const [paySearch, setPaySearch] = useState('');

  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['customer', 'me'], queryFn: () => api.get('/customers/me').then(unwrap) });
  const subscriptions = useQuery({ queryKey: ['subscriptions'], queryFn: () => api.get('/subscriptions', { params: { limit: 100 } }).then(unwrap) });
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/invoices', { params: { limit: 100 } }).then(unwrap) });
  const payments = useQuery({ queryKey: ['payments'], queryFn: () => api.get('/payments', { params: { limit: 100 } }).then(unwrap) });
  const quotations = useQuery({ queryKey: ['quotations'], queryFn: () => api.get('/quotations', { params: { limit: 100 } }).then(unwrap) });

  const save = useMutation({
    mutationFn: (payload) => api.patch('/customers/me', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'me'] });
      setEditing(false);
      toast.success('Billing profile updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const changeSubscription = useMutation({
    mutationFn: ({ id, action }) => api.post(`/subscriptions/${id}/${action}`, { reason: 'Customer request from portal.' }),
    onSuccess: (_response, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setSelectedSubscription(null);
      toast.success(`Subscription ${action} request processed.`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const decideQuotation = useMutation({
    mutationFn: ({ id, action }) => api.post(`/quotations/${id}/${action}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setSelectedQuotation(null);
      toast.success('Quotation updated successfully.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const customer = profile.data?.customer;
  const rawPlans = subscriptions.data?.subscriptions || [];
  const rawBills = invoices.data?.invoices || [];
  const rawPayments = payments.data?.payments || [];
  const rawQuotes = quotations.data?.quotations || [];

  // Filtered lists
  const filteredPlans = useMemo(() => {
    return rawPlans.filter((sub) => {
      const matchSearch =
        !subSearch ||
        sub.subscriptionNumber.toLowerCase().includes(subSearch.toLowerCase()) ||
        sub.lines.some(
          (l) =>
            l.planName?.toLowerCase().includes(subSearch.toLowerCase()) ||
            l.productName?.toLowerCase().includes(subSearch.toLowerCase())
        );
      const matchStatus = !subStatus || sub.status === subStatus;
      return matchSearch && matchStatus;
    });
  }, [rawPlans, subSearch, subStatus]);

  const filteredBills = useMemo(() => {
    return rawBills.filter((inv) => {
      const isOverdue = inv.status === 'CONFIRMED' && inv.outstanding > 0 && new Date(inv.dueDate) < new Date();
      const matchSearch =
        !invSearch ||
        inv.invoiceNumber.toLowerCase().includes(invSearch.toLowerCase()) ||
        inv.lines.some((l) => l.productName?.toLowerCase().includes(invSearch.toLowerCase()));
      const matchStatus = !invStatus || (invStatus === 'OVERDUE' ? isOverdue : inv.status === invStatus);
      return matchSearch && matchStatus;
    });
  }, [rawBills, invSearch, invStatus]);

  const filteredQuotes = useMemo(() => {
    return rawQuotes.filter((q) => {
      const matchSearch =
        !quoteSearch ||
        q.quotationNumber.toLowerCase().includes(quoteSearch.toLowerCase()) ||
        q.lines.some((l) => l.planName?.toLowerCase().includes(quoteSearch.toLowerCase()));
      const matchStatus = !quoteStatus || q.status === quoteStatus;
      return matchSearch && matchStatus;
    });
  }, [rawQuotes, quoteSearch, quoteStatus]);

  const filteredPayments = useMemo(() => {
    return rawPayments.filter((p) => {
      return (
        !paySearch ||
        p.paymentReference?.toLowerCase().includes(paySearch.toLowerCase()) ||
        p.invoice?.invoiceNumber?.toLowerCase().includes(paySearch.toLowerCase()) ||
        p.method?.toLowerCase().includes(paySearch.toLowerCase())
      );
    });
  }, [rawPayments, paySearch]);

  if (profile.isLoading || subscriptions.isLoading || invoices.isLoading || payments.isLoading || quotations.isLoading) {
    return (
      <section className="page-wrap">
        <div className="skeleton tall" />
      </section>
    );
  }
  if (profile.isError || subscriptions.isError || invoices.isError || payments.isError || quotations.isError) {
    return (
      <section className="page-wrap">
        <EmptyState
          icon={User}
          title="Your account could not load"
          description={errorMessage(profile.error || subscriptions.error || invoices.error || payments.error || quotations.error)}
        />
      </section>
    );
  }

  const active = rawPlans.filter((sub) => sub.status === 'ACTIVE');
  const totalOutstanding = rawBills.reduce((sum, inv) => sum + (inv.outstanding || 0), 0);
  const nextBilling = active.map(({ nextBillingDate }) => nextBillingDate).filter(Boolean).sort()[0];

  return (
    <PageTransition className="page-wrap">
      <PageHeader
        eyebrow="CUSTOMER PORTAL"
        title={`Welcome back, ${customer?.fullName ? customer.fullName.split(' ')[0] : 'Client'}`}
        description="Monitor subscriptions, review commercial estimates, settle recurring invoices, and manage your billing profile."
        actions={
          <Button variant="outline" onClick={() => setEditing(true)}>
            <User size={15} />
            <span>Edit Profile</span>
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Package} label="Active Subscriptions" value={active.length} variant="indigo" />
        <MetricCard
          icon={CreditCard}
          label="Outstanding Balance"
          value={money(totalOutstanding)}
          variant={totalOutstanding > 0 ? 'amber' : 'emerald'}
        />
        <MetricCard icon={FileText} label="Total Invoices" value={rawBills.length} variant="violet" />
        <MetricCard icon={Calendar} label="Next Billing Date" value={date(nextBilling)} variant="neutral" />
      </div>

      {/* Navigation Filter Tabs */}
      <div className="mt-7 flex flex-wrap items-center gap-2 border-b border-app-border pb-3.5">
        {[
          ['all', 'All Overview'],
          ['subscriptions', `Subscriptions (${filteredPlans.length})`],
          ['invoices', `Invoices (${filteredBills.length})`],
          ['quotations', `Quotations (${filteredQuotes.length})`],
          ['payments', `Payment History (${filteredPayments.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all shadow-subtle ${
              activeTab === key
                ? 'bg-brand-indigo dark:bg-brand-indigo-bright text-white shadow-btn-primary dark:shadow-btn-primary-dark'
                : 'bg-app-surface text-app-text-muted hover:bg-app-secondary hover:text-app-text border border-app-border'
            }`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Subscriptions */}
      {(activeTab === 'all' || activeTab === 'subscriptions') && (
        <Card className="mt-6 shadow-subtle">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <CardTitle>Subscriptions</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-44">
                <Search className="absolute left-3 top-2.5 text-app-text-muted" size={14} />
                <input
                  aria-label="Search subscriptions"
                  className="h-9 w-full rounded-xl border border-app-border bg-app-surface pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-muted/60 focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
                  placeholder="Search plan or ID…"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Filter subscriptions"
                className="h-9 rounded-xl border border-app-border bg-app-surface px-3 text-xs font-semibold text-app-text cursor-pointer focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
                value={subStatus}
                onChange={(e) => setSubStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CLOSED">Closed</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredPlans.length ? (
              <div className="data-card">
                <table>
                  <thead>
                    <tr>
                      <th>Subscription</th>
                      <th>Plan / Products</th>
                      <th>Recurring Total</th>
                      <th>Next Billing</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((subscription) => {
                      const total = subscription.lines.reduce((sum, line) => sum + line.lineTotal, 0);
                      return (
                        <tr key={subscription._id}>
                          <td>
                            <button
                              type="button"
                              className="font-bold text-brand-indigo dark:text-brand-violet-light hover:underline text-left"
                              onClick={() => setSelectedSubscription(subscription)}
                            >
                              {subscription.subscriptionNumber}
                            </button>
                            <small>Started {date(subscription.startDate)}</small>
                          </td>
                          <td>
                            <strong>{subscription.lines.map((l) => l.planName).join(', ')}</strong>
                            <small>{subscription.lines.map((l) => `${l.quantity} × ${l.productName}`).join(' | ')}</small>
                          </td>
                          <td className="tabular-nums font-semibold">
                            {money(total, subscription.currency)}{' '}
                            <small className="inline text-app-text-muted font-normal">
                              / {subscription.lines[0]?.billingFrequency?.toLowerCase()}
                            </small>
                          </td>
                          <td className="tabular-nums">{date(subscription.nextBillingDate)}</td>
                          <td>
                            <span
                              className={`status ${
                                subscription.status === 'ACTIVE'
                                  ? 'active'
                                  : subscription.status === 'PAUSED'
                                  ? 'warning'
                                  : 'inactive'
                              }`}
                            >
                              {subscription.status}
                            </span>
                          </td>
                          <td>
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                title="View details"
                                onClick={() => setSelectedSubscription(subscription)}
                              >
                                <Eye size={14} />
                              </Button>
                              {subscription.status === 'ACTIVE' && subscription.allowPause && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={changeSubscription.isPending}
                                  onClick={() => changeSubscription.mutate({ id: subscription._id, action: 'pause' })}
                                >
                                  Pause
                                </Button>
                              )}
                              {subscription.status === 'PAUSED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={changeSubscription.isPending}
                                  onClick={() => changeSubscription.mutate({ id: subscription._id, action: 'resume' })}
                                >
                                  Resume
                                </Button>
                              )}
                              {['ACTIVE', 'PAUSED'].includes(subscription.status) && subscription.allowEarlyClosure && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={changeSubscription.isPending}
                                  onClick={() => {
                                    if (window.confirm('Close this subscription? This cannot be undone.')) {
                                      changeSubscription.mutate({ id: subscription._id, action: 'close' });
                                    }
                                  }}
                                >
                                  Close
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Package}
                title="No subscriptions match"
                description={
                  subSearch || subStatus
                    ? 'Try adjusting your search query or status filter.'
                    : 'Active subscriptions will appear here.'
                }
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Invoices */}
      {(activeTab === 'all' || activeTab === 'invoices') && (
        <Card className="mt-6 shadow-subtle">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <CardTitle>Invoices</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-44">
                <Search className="absolute left-3 top-2.5 text-app-text-muted" size={14} />
                <input
                  aria-label="Search invoices"
                  className="h-9 w-full rounded-xl border border-app-border bg-app-surface pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-muted/60 focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
                  placeholder="Search invoice number…"
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Filter invoices"
                className="h-9 rounded-xl border border-app-border bg-app-surface px-3 text-xs font-semibold text-app-text cursor-pointer focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
                value={invStatus}
                onChange={(e) => setInvStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
                <option value="DRAFT">Draft</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredBills.length ? (
              <div className="data-card">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Date</th>
                      <th>Billing Period</th>
                      <th>Total</th>
                      <th>Outstanding</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((invoice) => {
                      const isOverdue =
                        invoice.status === 'CONFIRMED' && invoice.outstanding > 0 && new Date(invoice.dueDate) < new Date();
                      const displayStatus = isOverdue ? 'OVERDUE' : invoice.status;
                      return (
                        <tr key={invoice._id}>
                          <td>
                            <button
                              type="button"
                              className="font-bold text-brand-indigo dark:text-brand-violet-light hover:underline text-left"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              {invoice.invoiceNumber}
                            </button>
                            <small>{invoice.lines.map((line) => line.productName).join(', ')}</small>
                          </td>
                          <td>{date(invoice.createdAt)}</td>
                          <td>
                            {date(invoice.periodStart)} – {date(invoice.periodEnd)}
                          </td>
                          <td className="tabular-nums font-bold">{money(invoice.total, invoice.currency)}</td>
                          <td className="tabular-nums font-bold">
                            {invoice.outstanding > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400">
                                {money(invoice.outstanding, invoice.currency)}
                              </span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">Settled</span>
                            )}
                          </td>
                          <td className="tabular-nums">{date(invoice.dueDate)}</td>
                          <td>
                            <span
                              className={`status ${
                                displayStatus === 'PAID' ? 'active' : isOverdue ? 'danger' : 'inactive'
                              }`}
                            >
                              {displayStatus}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                title="View invoice breakdown"
                                onClick={() => setSelectedInvoice(invoice)}
                              >
                                <Eye size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Download invoice PDF"
                                onClick={() => downloadPdf(invoice.invoiceNumber, invoice._id)}
                              >
                                <Download size={14} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No invoices match"
                description={
                  invSearch || invStatus
                    ? 'Try adjusting your search query or status filter.'
                    : 'Invoices generated for your subscriptions will appear here.'
                }
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Quotations */}
      {(activeTab === 'all' || activeTab === 'quotations') && (
        <Card className="mt-6 shadow-subtle">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <CardTitle>Quotations</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-44">
                <Search className="absolute left-3 top-2.5 text-app-text-muted" size={14} />
                <input
                  aria-label="Search quotations"
                  className="h-9 w-full rounded-xl border border-app-border bg-app-surface pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-muted/60 focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
                  placeholder="Search quote number…"
                  value={quoteSearch}
                  onChange={(e) => setQuoteSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Filter quotations"
                className="h-9 rounded-xl border border-app-border bg-app-surface px-3 text-xs font-semibold text-app-text cursor-pointer focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
                value={quoteStatus}
                onChange={(e) => setQuoteStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="QUOTATION">Pending Quote</option>
                <option value="CONFIRMED">Accepted</option>
                <option value="CONVERTED">Converted</option>
                <option value="REJECTED">Rejected</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredQuotes.length ? (
              <div className="data-card">
                <table>
                  <thead>
                    <tr>
                      <th>Quotation</th>
                      <th>Date</th>
                      <th>Product / Plan</th>
                      <th>Total</th>
                      <th>Valid Until</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotes.map((quote) => (
                      <tr key={quote._id}>
                        <td>
                          <button
                            type="button"
                            className="font-bold text-brand-indigo dark:text-brand-violet-light hover:underline text-left"
                            onClick={() => setSelectedQuotation(quote)}
                          >
                            {quote.quotationNumber}
                          </button>
                        </td>
                        <td>{date(quote.createdAt)}</td>
                        <td>
                          <strong>{quote.lines.map((line) => line.planName).join(', ')}</strong>
                          <small>{quote.lines.map((line) => `${line.quantity} × ${line.productName}`).join(' | ')}</small>
                        </td>
                        <td className="tabular-nums font-bold">{money(quote.total, quote.currency)}</td>
                        <td className="tabular-nums">{date(quote.validUntil)}</td>
                        <td>
                          <Badge variant={quote.status === 'QUOTATION' ? 'violet' : 'muted'}>
                            {quote.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              title="View details"
                              onClick={() => setSelectedQuotation(quote)}
                            >
                              <Eye size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title="Download quotation PDF"
                              onClick={() => downloadQuotationPdf(quote.quotationNumber, quote._id)}
                            >
                              <Download size={14} />
                            </Button>
                            {quote.status === 'QUOTATION' && new Date(quote.validUntil) >= new Date() && (
                              <>
                                <Button
                                  size="sm"
                                  disabled={decideQuotation.isPending}
                                  onClick={() => decideQuotation.mutate({ id: quote._id, action: 'accept' })}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={decideQuotation.isPending}
                                  onClick={() => {
                                    if (window.confirm('Reject this quotation?')) {
                                      decideQuotation.mutate({ id: quote._id, action: 'reject' });
                                    }
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No quotations match"
                description={
                  quoteSearch || quoteStatus
                    ? 'Try adjusting your search query or status filter.'
                    : 'Quotations prepared for your account will appear here.'
                }
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Payments */}
      {(activeTab === 'all' || activeTab === 'payments') && (
        <Card className="mt-6 shadow-subtle">
          <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
            <CardTitle>Payment History</CardTitle>
            <div className="relative min-w-44">
              <Search className="absolute left-3 top-2.5 text-app-text-muted" size={14} />
              <input
                aria-label="Search payments"
                className="h-9 w-full rounded-xl border border-app-border bg-app-surface pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-muted/60 focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
                placeholder="Search reference or invoice…"
                value={paySearch}
                onChange={(e) => setPaySearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredPayments.length ? (
              <div className="data-card">
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Invoice</th>
                      <th>Method</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((payment) => (
                      <tr key={payment._id}>
                        <td>
                          <strong>{payment.paymentReference || payment._id.slice(-8).toUpperCase()}</strong>
                        </td>
                        <td>{payment.invoice?.invoiceNumber || '—'}</td>
                        <td className="capitalize">{payment.method?.replaceAll('_', ' ')}</td>
                        <td>{date(payment.paymentDate)}</td>
                        <td className="tabular-nums">
                          <strong className="text-emerald-600 dark:text-emerald-400">
                            {money(payment.amount, payment.invoice?.currency)}
                          </strong>
                        </td>
                        <td>
                          <small className="text-app-text-muted">{payment.note || '—'}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={CreditCard}
                title="No payments recorded"
                description={
                  paySearch ? 'No matching payment records found.' : 'Payments made toward your invoices will appear here.'
                }
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Account / Billing Profile Card */}
      <Card className="mt-6 shadow-subtle">
        <CardHeader className="flex-row items-center justify-between border-b border-app-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="text-brand-indigo dark:text-brand-violet-light" size={17} />
            <CardTitle>Billing Profile</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <User size={14} />
            <span>Update Profile</span>
          </Button>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileField label="Full Name" value={customer?.fullName} />
            <ProfileField label="Email Address" value={customer?.email} />
            <ProfileField label="Company Name" value={customer?.companyName || 'Not specified'} />
            <ProfileField label="Phone" value={customer?.phone || 'Not specified'} />
            <ProfileField label="Billing Address" value={customer?.billingAddress || 'Not specified'} />
            <ProfileField label="Tax Identification (GST/VAT)" value={customer?.taxId || 'Not specified'} />
            <ProfileField label="Account Status" value={customer?.status || 'ACTIVE'} />
            <ProfileField label="Member Since" value={date(customer?.createdAt)} />
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Modal */}
      {editing && (
        <ProfileForm customer={customer} busy={save.isPending} close={() => setEditing(false)} submit={save.mutate} />
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          close={() => setSelectedInvoice(null)}
          onDownloadPdf={() => downloadPdf(selectedInvoice.invoiceNumber, selectedInvoice._id)}
        />
      )}

      {/* Subscription Details Modal */}
      {selectedSubscription && (
        <SubscriptionDetailsModal
          subscription={selectedSubscription}
          close={() => setSelectedSubscription(null)}
          onAction={(action) => changeSubscription.mutate({ id: selectedSubscription._id, action })}
          busy={changeSubscription.isPending}
        />
      )}

      {/* Quotation Details Modal */}
      {selectedQuotation && (
        <QuotationDetailsModal
          quotation={selectedQuotation}
          close={() => setSelectedQuotation(null)}
          onAccept={() => decideQuotation.mutate({ id: selectedQuotation._id, action: 'accept' })}
          onReject={() => decideQuotation.mutate({ id: selectedQuotation._id, action: 'reject' })}
          onDownloadPdf={() => downloadQuotationPdf(selectedQuotation.quotationNumber, selectedQuotation._id)}
          busy={decideQuotation.isPending}
        />
      )}
    </PageTransition>
  );
}

function MetricCard({ icon: Icon, label, value, variant = 'indigo' }) {
  const variantStyles = {
    indigo: 'border-brand-indigo/30 bg-app-surface text-brand-indigo dark:text-brand-violet-light',
    violet: 'border-brand-violet/30 bg-app-surface text-brand-violet dark:text-brand-violet-light',
    amber: 'border-amber-500/30 bg-app-surface text-amber-600 dark:text-amber-400',
    emerald: 'border-emerald-500/30 bg-app-surface text-emerald-600 dark:text-emerald-400',
    neutral: 'border-app-border bg-app-surface text-app-text-muted',
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-card transition-all hover:shadow-elevated ${
        variantStyles[variant] || variantStyles.neutral
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-app-text-muted">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-secondary border border-app-border">
          <Icon size={17} strokeWidth={2} />
        </div>
      </div>
      <p className="mt-3.5 text-2xl font-extrabold tracking-tight text-app-text tabular-nums">{value}</p>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div className="rounded-xl border border-app-border/60 bg-app-secondary/30 p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-app-text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-app-text">{value}</p>
    </div>
  );
}

function ProfileForm({ customer, busy, close, submit }) {
  const [form, setForm] = useState({
    phone: customer?.phone || '',
    companyName: customer?.companyName || '',
    billingAddress: customer?.billingAddress || '',
  });
  const update = (e) => setForm((curr) => ({ ...curr, [e.target.name]: e.target.value }));
  return (
    <Modal
      title="Edit Billing Profile"
      description="Update your corporate details and default billing address for recurring invoices."
      size="md"
      close={close}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit(form);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phone Number">
            <FormInput name="phone" value={form.phone} onChange={update} placeholder="+91 98765 43210" />
          </FormField>
          <FormField label="Company Name">
            <FormInput name="companyName" value={form.companyName} onChange={update} placeholder="Acme Technologies Ltd." />
          </FormField>
        </div>
        <FormField label="Billing Address">
          <FormTextarea
            name="billingAddress"
            value={form.billingAddress}
            onChange={update}
            rows={3}
            placeholder="Level 4, Executive Tower, Cyber Hub, Gurugram, Haryana"
          />
        </FormField>
        <ModalFooter
          onCancel={close}
          cancelLabel="Cancel"
          submitLabel="Save Changes"
          busy={busy}
        />
      </form>
    </Modal>
  );
}

function InvoiceDetailsModal({ invoice, close, onDownloadPdf }) {
  const isOverdue = invoice.status === 'CONFIRMED' && invoice.outstanding > 0 && new Date(invoice.dueDate) < new Date();
  const statusBadge = isOverdue ? 'OVERDUE' : invoice.status;

  return (
    <Modal
      title={`Invoice · ${invoice.invoiceNumber}`}
      description="Commercial tax invoice breakdown and payment settlement details."
      badge={statusBadge}
      size="lg"
      close={close}
    >
      <div className="space-y-5 text-sm text-app-text">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-app-border bg-app-secondary/30 p-3.5 text-xs">
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Status</p>
            <p className="font-bold text-app-text mt-0.5">{statusBadge}</p>
          </div>
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Issued Date</p>
            <p className="font-semibold text-app-text mt-0.5">{date(invoice.createdAt)}</p>
          </div>
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Due Date</p>
            <p className="font-semibold text-app-text mt-0.5">{date(invoice.dueDate)}</p>
          </div>
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Billing Cycle</p>
            <p className="font-semibold text-app-text mt-0.5">
              {date(invoice.periodStart)} – {date(invoice.periodEnd)}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2.5">
            Itemized Products & Subscriptions
          </h4>
          <div className="overflow-x-auto rounded-xl border border-app-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-app-secondary/60 text-app-text-muted font-bold uppercase border-b border-app-border">
                <tr>
                  <th className="p-3">Item / Plan</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Discounts</th>
                  <th className="p-3 text-right">Taxes</th>
                  <th className="p-3 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {invoice.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-app-secondary/20 transition-colors">
                    <td className="p-3 font-semibold text-app-text">
                      {line.productName} <span className="text-app-text-muted font-normal">({line.planName})</span>
                    </td>
                    <td className="p-3 text-center tabular-nums">{line.quantity}</td>
                    <td className="p-3 text-right tabular-nums">{money(line.unitPrice, invoice.currency)}</td>
                    <td className="p-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                      {line.discountTotal ? `−${money(line.discountTotal, invoice.currency)}` : '—'}
                    </td>
                    <td className="p-3 text-right tabular-nums text-app-text-muted">
                      {line.taxTotal ? `+${money(line.taxTotal, invoice.currency)}` : '—'}
                    </td>
                    <td className="p-3 text-right font-bold text-app-text tabular-nums">
                      {money(line.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <div className="w-full sm:w-72 space-y-2 rounded-xl border border-app-border bg-app-secondary/20 p-4 text-xs">
            <div className="flex justify-between text-app-text-muted">
              <span>Subtotal:</span>
              <span className="font-semibold text-app-text tabular-nums">{money(invoice.subtotal, invoice.currency)}</span>
            </div>
            {Boolean(invoice.discountTotal) && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Discounts:</span>
                <span className="tabular-nums">−{money(invoice.discountTotal, invoice.currency)}</span>
              </div>
            )}
            {Boolean(invoice.taxTotal) && (
              <div className="flex justify-between text-app-text-muted">
                <span>Taxes:</span>
                <span className="tabular-nums">+{money(invoice.taxTotal, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-app-border pt-2 font-bold text-sm text-app-text">
              <span>Total Invoiced:</span>
              <span className="tabular-nums">{money(invoice.total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-app-text-muted">
              <span>Amount Paid:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {money(invoice.amountPaid, invoice.currency)}
              </span>
            </div>
            <div className="flex justify-between border-t border-app-border pt-2 font-extrabold text-sm text-brand-indigo dark:text-brand-violet-light">
              <span>Outstanding Due:</span>
              <span className="tabular-nums">{money(invoice.outstanding, invoice.currency)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-4 py-2 text-xs font-semibold text-app-text shadow-subtle hover:border-brand-indigo dark:hover:border-brand-violet hover:text-brand-indigo dark:hover:text-brand-violet-light transition-all"
          >
            <Download size={14} /> Download Official PDF
          </button>
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-app-border bg-app-surface px-4 py-2 text-xs font-semibold text-app-text hover:bg-app-secondary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SubscriptionDetailsModal({ subscription, close, onAction, busy }) {
  const total = subscription.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return (
    <Modal
      title={`Subscription · ${subscription.subscriptionNumber}`}
      description="Recurring billing agreement parameters and subscription lifecycle status."
      badge={subscription.status}
      size="lg"
      close={close}
    >
      <div className="space-y-5 text-sm text-app-text">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-app-border bg-app-secondary/30 p-3.5 text-xs">
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Status</p>
            <p className="font-bold text-app-text mt-0.5">{subscription.status}</p>
          </div>
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Billing Frequency</p>
            <p className="font-semibold text-app-text mt-0.5">{subscription.lines[0]?.billingFrequency || 'Monthly'}</p>
          </div>
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Start Date</p>
            <p className="font-semibold text-app-text mt-0.5">{date(subscription.startDate)}</p>
          </div>
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Next Billing</p>
            <p className="font-semibold text-app-text mt-0.5">{date(subscription.nextBillingDate)}</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2.5">Committed Plans</h4>
          <div className="overflow-x-auto rounded-xl border border-app-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-app-secondary/60 text-app-text-muted font-bold uppercase border-b border-app-border">
                <tr>
                  <th className="p-3">Plan / Tier</th>
                  <th className="p-3">Product</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Cycle Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {subscription.lines.map((l, idx) => (
                  <tr key={idx} className="hover:bg-app-secondary/20 transition-colors">
                    <td className="p-3 font-semibold text-app-text">{l.planName}</td>
                    <td className="p-3 text-app-text-muted">{l.productName}</td>
                    <td className="p-3 text-center tabular-nums">{l.quantity}</td>
                    <td className="p-3 text-right font-bold text-app-text tabular-nums">
                      {money(l.lineTotal, subscription.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center rounded-xl border border-app-border bg-app-secondary/20 p-4">
          <span className="text-xs font-semibold text-app-text-muted uppercase tracking-wider">
            Recurring Commitment Total:
          </span>
          <span className="text-base font-extrabold text-app-text tabular-nums">
            {money(total, subscription.currency)} / cycle
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
          <div className="flex items-center gap-2">
            {subscription.status === 'ACTIVE' && subscription.allowPause && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction('pause')}
                className="rounded-xl border border-app-border bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-text hover:bg-app-secondary transition-colors disabled:opacity-50"
              >
                Pause Subscription
              </button>
            )}
            {subscription.status === 'PAUSED' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction('resume')}
                className="rounded-xl bg-brand-indigo dark:bg-brand-indigo-bright px-3 py-1.5 text-xs font-semibold text-white shadow-btn-primary transition-colors disabled:opacity-50"
              >
                Resume Subscription
              </button>
            )}
            {['ACTIVE', 'PAUSED'].includes(subscription.status) && subscription.allowEarlyClosure && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm('Close this subscription early?')) onAction('close');
                }}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
              >
                Close Early
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-xl border border-app-border bg-app-surface px-4 py-1.5 text-xs font-semibold text-app-text hover:bg-app-secondary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

function QuotationDetailsModal({ quotation, close, onAccept, onReject, onDownloadPdf, busy }) {
  const isPending = quotation.status === 'QUOTATION' && new Date(quotation.validUntil) >= new Date();
  return (
    <Modal
      title={`Quotation · ${quotation.quotationNumber}`}
      description="Subscription proposal estimate and commercial agreement terms."
      badge={quotation.status}
      size="lg"
      close={close}
    >
      <div className="space-y-5 text-sm text-app-text">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-app-border bg-app-secondary/30 p-3.5 text-xs">
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Status</p>
            <p className="font-bold text-app-text mt-0.5">{quotation.status}</p>
          </div>
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Validity</p>
            <p className="font-semibold text-app-text mt-0.5">Valid until {date(quotation.validUntil)}</p>
          </div>
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Payment Terms</p>
            <p className="font-semibold text-app-text mt-0.5">{quotation.paymentTerms || 'Standard terms'}</p>
          </div>
          <div>
            <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-bold">Total Estimate</p>
            <p className="font-bold text-brand-indigo dark:text-brand-violet-light mt-0.5 tabular-nums">
              {money(quotation.total, quotation.currency)}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2.5">Quoted Line Items</h4>
          <div className="overflow-x-auto rounded-xl border border-app-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-app-secondary/60 text-app-text-muted font-bold uppercase border-b border-app-border">
                <tr>
                  <th className="p-3">Plan / Tier</th>
                  <th className="p-3">Product</th>
                  <th className="p-3 text-center">Quantity</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {quotation.lines.map((l, idx) => (
                  <tr key={idx} className="hover:bg-app-secondary/20 transition-colors">
                    <td className="p-3 font-semibold text-app-text">{l.planName}</td>
                    <td className="p-3 text-app-text-muted">{l.productName}</td>
                    <td className="p-3 text-center tabular-nums">{l.quantity}</td>
                    <td className="p-3 text-right tabular-nums">{money(l.unitPrice, quotation.currency)}</td>
                    <td className="p-3 text-right font-bold text-app-text tabular-nums">
                      {money(l.lineTotal, quotation.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-app-border pt-4">
          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-text hover:border-brand-indigo dark:hover:border-brand-violet hover:text-brand-indigo dark:hover:text-brand-violet-light transition-all shadow-subtle"
          >
            <Download size={14} /> Download PDF
          </button>
          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onAccept}
                  className="rounded-xl bg-brand-indigo dark:bg-brand-indigo-bright px-4 py-1.5 text-xs font-semibold text-white shadow-btn-primary hover:bg-brand-indigo-deep dark:hover:bg-brand-violet transition-colors disabled:opacity-50"
                >
                  Accept & Activate
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onReject}
                  className="rounded-xl border border-app-border bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-text hover:border-rose-500 hover:text-rose-500 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-app-border bg-app-surface px-4 py-1.5 text-xs font-semibold text-app-text hover:bg-app-secondary transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

async function downloadPdf(invoiceNumber, invoiceId) {
  try {
    const response = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${invoiceNumber}.pdf`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    toast.success(`Downloaded ${invoiceNumber}.pdf`);
  } catch (error) {
    toast.error(errorMessage(error));
  }
}

async function downloadQuotationPdf(quotationNumber, quotationId) {
  try {
    const response = await api.get(`/quotations/${quotationId}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${quotationNumber}.pdf`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    toast.success(`Downloaded ${quotationNumber}.pdf`);
  } catch (error) {
    toast.error(errorMessage(error));
  }
}
