import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiCreditCard, FiDownload, FiEye, FiFileText, FiPackage, FiSearch, FiUser } from 'react-icons/fi';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Badge } from '../components/ui/Primitives.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Modal } from './ProductsPage.jsx';

const money = (amount, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((amount || 0) / 100);
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '—';

export function CustomerPortalPage() {
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'subscriptions', 'invoices', 'quotations', 'payments'
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
      const matchSearch = !subSearch || sub.subscriptionNumber.toLowerCase().includes(subSearch.toLowerCase()) || sub.lines.some((l) => l.planName?.toLowerCase().includes(subSearch.toLowerCase()) || l.productName?.toLowerCase().includes(subSearch.toLowerCase()));
      const matchStatus = !subStatus || sub.status === subStatus;
      return matchSearch && matchStatus;
    });
  }, [rawPlans, subSearch, subStatus]);

  const filteredBills = useMemo(() => {
    return rawBills.filter((inv) => {
      const isOverdue = inv.status === 'CONFIRMED' && inv.outstanding > 0 && new Date(inv.dueDate) < new Date();
      const matchSearch = !invSearch || inv.invoiceNumber.toLowerCase().includes(invSearch.toLowerCase()) || inv.lines.some((l) => l.productName?.toLowerCase().includes(invSearch.toLowerCase()));
      const matchStatus = !invStatus || (invStatus === 'OVERDUE' ? isOverdue : inv.status === invStatus);
      return matchSearch && matchStatus;
    });
  }, [rawBills, invSearch, invStatus]);

  const filteredQuotes = useMemo(() => {
    return rawQuotes.filter((q) => {
      const matchSearch = !quoteSearch || q.quotationNumber.toLowerCase().includes(quoteSearch.toLowerCase()) || q.lines.some((l) => l.planName?.toLowerCase().includes(quoteSearch.toLowerCase()));
      const matchStatus = !quoteStatus || q.status === quoteStatus;
      return matchSearch && matchStatus;
    });
  }, [rawQuotes, quoteSearch, quoteStatus]);

  const filteredPayments = useMemo(() => {
    return rawPayments.filter((p) => {
      return !paySearch || p.paymentReference?.toLowerCase().includes(paySearch.toLowerCase()) || p.invoice?.invoiceNumber?.toLowerCase().includes(paySearch.toLowerCase()) || p.method?.toLowerCase().includes(paySearch.toLowerCase());
    });
  }, [rawPayments, paySearch]);

  if (profile.isLoading || subscriptions.isLoading || invoices.isLoading || payments.isLoading || quotations.isLoading) {
    return <section className="page"><div className="skeleton tall" /></section>;
  }
  if (profile.isError || subscriptions.isError || invoices.isError || payments.isError || quotations.isError) {
    return <section className="page"><EmptyState icon={FiUser} title="Your account could not load" description={errorMessage(profile.error || subscriptions.error || invoices.error || payments.error || quotations.error)} /></section>;
  }

  const active = rawPlans.filter((sub) => sub.status === 'ACTIVE');
  const totalOutstanding = rawBills.reduce((sum, inv) => sum + (inv.outstanding || 0), 0);
  const nextBilling = active.map(({ nextBillingDate }) => nextBillingDate).filter(Boolean).sort()[0];

  return (
    <PageTransition>
      <PageHeader
        eyebrow="CUSTOMER PORTAL"
        title={`Welcome back, ${customer.fullName.split(' ')[0]}`}
        description="Monitor subscriptions, review quotations, settle invoices, and manage your billing profile."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}><FiUser size={16} />Edit profile</Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={FiPackage} label="Active subscriptions" value={active.length} />
        <Metric icon={FiCreditCard} label="Outstanding balance" value={money(totalOutstanding)} />
        <Metric icon={FiFileText} label="Total invoices" value={rawBills.length} />
        <Metric icon={FiPackage} label="Next billing date" value={date(nextBilling)} />
      </div>

      {/* Navigation Filter Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-app-border pb-3">
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
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${activeTab === key ? 'bg-app-accent text-white' : 'bg-app-secondary/60 text-app-muted hover:text-app-text'}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Subscriptions (or shown in All) */}
      {(activeTab === 'all' || activeTab === 'subscriptions') && (
        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Subscriptions</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-40">
                <FiSearch className="absolute left-2.5 top-2.5 text-app-muted" size={14} />
                <input
                  aria-label="Search subscriptions"
                  className="h-8 w-full rounded-md border border-app-border bg-app-surface pl-8 pr-2 text-xs text-app-text"
                  placeholder="Search plan or ID…"
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Filter subscriptions"
                className="h-8 rounded-md border border-app-border bg-app-surface px-2 text-xs text-app-text"
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
          <CardContent>
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
                      <th>Actions</th>
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
                              className="font-semibold text-app-accent hover:underline text-left"
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
                          <td>{money(total, subscription.currency)} <small>/ {subscription.lines[0]?.billingFrequency?.toLowerCase()}</small></td>
                          <td>{date(subscription.nextBillingDate)}</td>
                          <td><Badge variant={subscription.status === 'ACTIVE' ? 'success' : 'muted'}>{subscription.status}</Badge></td>
                          <td>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Button size="sm" variant="outline" title="View details" onClick={() => setSelectedSubscription(subscription)}>
                                <FiEye size={14} />
                              </Button>
                              {subscription.status === 'ACTIVE' && subscription.allowPause && (
                                <Button size="sm" variant="outline" disabled={changeSubscription.isPending} onClick={() => changeSubscription.mutate({ id: subscription._id, action: 'pause' })}>
                                  Pause
                                </Button>
                              )}
                              {subscription.status === 'PAUSED' && (
                                <Button size="sm" variant="outline" disabled={changeSubscription.isPending} onClick={() => changeSubscription.mutate({ id: subscription._id, action: 'resume' })}>
                                  Resume
                                </Button>
                              )}
                              {['ACTIVE', 'PAUSED'].includes(subscription.status) && subscription.allowEarlyClosure && (
                                <Button size="sm" variant="destructive" disabled={changeSubscription.isPending} onClick={() => { if (window.confirm('Close this subscription? This cannot be undone.')) changeSubscription.mutate({ id: subscription._id, action: 'close' }); }}>
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
              <EmptyState icon={FiPackage} title="No subscriptions match" description={subSearch || subStatus ? 'Try adjusting your search or status filter.' : 'Your subscriptions will appear here.'} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Invoices (or shown in All) */}
      {(activeTab === 'all' || activeTab === 'invoices') && (
        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Invoices</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-40">
                <FiSearch className="absolute left-2.5 top-2.5 text-app-muted" size={14} />
                <input
                  aria-label="Search invoices"
                  className="h-8 w-full rounded-md border border-app-border bg-app-surface pl-8 pr-2 text-xs text-app-text"
                  placeholder="Search invoice number…"
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Filter invoices"
                className="h-8 rounded-md border border-app-border bg-app-surface px-2 text-xs text-app-text"
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
          <CardContent>
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((invoice) => {
                      const isOverdue = invoice.status === 'CONFIRMED' && invoice.outstanding > 0 && new Date(invoice.dueDate) < new Date();
                      const displayStatus = isOverdue ? 'OVERDUE' : invoice.status;
                      return (
                        <tr key={invoice._id}>
                          <td>
                            <button
                              type="button"
                              className="font-semibold text-app-accent hover:underline text-left"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              {invoice.invoiceNumber}
                            </button>
                            <small>{invoice.lines.map((line) => line.productName).join(', ')}</small>
                          </td>
                          <td>{date(invoice.createdAt)}</td>
                          <td>{date(invoice.periodStart)} – {date(invoice.periodEnd)}</td>
                          <td><strong>{money(invoice.total, invoice.currency)}</strong></td>
                          <td>
                            {invoice.outstanding > 0 ? (
                              <span className="font-semibold text-amber-600">{money(invoice.outstanding, invoice.currency)}</span>
                            ) : (
                              <span className="text-emerald-600">Settled</span>
                            )}
                          </td>
                          <td>{date(invoice.dueDate)}</td>
                          <td>
                            <span className={`status ${displayStatus === 'PAID' ? 'active' : isOverdue ? 'warning' : 'inactive'}`}>
                              {displayStatus}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <Button size="sm" variant="outline" title="View invoice breakdown" onClick={() => setSelectedInvoice(invoice)}>
                                <FiEye size={14} />
                              </Button>
                              <Button size="sm" variant="outline" title="Download invoice PDF" onClick={() => downloadPdf(invoice.invoiceNumber, invoice._id)}>
                                <FiDownload size={14} />
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
              <EmptyState icon={FiFileText} title="No invoices match" description={invSearch || invStatus ? 'Try adjusting your search or status filter.' : 'Invoices generated for your subscriptions will appear here.'} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Quotations (or shown in All) */}
      {(activeTab === 'all' || activeTab === 'quotations') && (
        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Quotations</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-40">
                <FiSearch className="absolute left-2.5 top-2.5 text-app-muted" size={14} />
                <input
                  aria-label="Search quotations"
                  className="h-8 w-full rounded-md border border-app-border bg-app-surface pl-8 pr-2 text-xs text-app-text"
                  placeholder="Search quote number…"
                  value={quoteSearch}
                  onChange={(e) => setQuoteSearch(e.target.value)}
                />
              </div>
              <select
                aria-label="Filter quotations"
                className="h-8 rounded-md border border-app-border bg-app-surface px-2 text-xs text-app-text"
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
          <CardContent>
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuotes.map((quote) => (
                      <tr key={quote._id}>
                        <td>
                          <button
                            type="button"
                            className="font-semibold text-app-accent hover:underline text-left"
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
                        <td>{money(quote.total, quote.currency)}</td>
                        <td>{date(quote.validUntil)}</td>
                        <td>
                          <Badge variant={quote.status === 'QUOTATION' ? 'success' : 'muted'}>{quote.status}</Badge>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" variant="outline" title="View details" onClick={() => setSelectedQuotation(quote)}>
                              <FiEye size={14} />
                            </Button>
                            <Button size="sm" variant="outline" title="Download quotation PDF" onClick={() => downloadQuotationPdf(quote.quotationNumber, quote._id)}>
                              <FiDownload size={14} />
                            </Button>
                            {quote.status === 'QUOTATION' && new Date(quote.validUntil) >= new Date() && (
                              <>
                                <Button size="sm" disabled={decideQuotation.isPending} onClick={() => decideQuotation.mutate({ id: quote._id, action: 'accept' })}>
                                  Accept
                                </Button>
                                <Button size="sm" variant="outline" disabled={decideQuotation.isPending} onClick={() => { if (window.confirm('Reject this quotation?')) decideQuotation.mutate({ id: quote._id, action: 'reject' }); }}>
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
              <EmptyState icon={FiFileText} title="No quotations match" description={quoteSearch || quoteStatus ? 'Try adjusting your search or status filter.' : 'Quotations prepared for your account will appear here.'} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Payments (or shown in All) */}
      {(activeTab === 'all' || activeTab === 'payments') && (
        <Card className="mt-6">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Payment History</CardTitle>
            <div className="relative min-w-40">
              <FiSearch className="absolute left-2.5 top-2.5 text-app-muted" size={14} />
              <input
                aria-label="Search payments"
                className="h-8 w-full rounded-md border border-app-border bg-app-surface pl-8 pr-2 text-xs text-app-text"
                placeholder="Search payment reference or invoice…"
                value={paySearch}
                onChange={(e) => setPaySearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
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
                        <td><strong>{payment.paymentReference || payment._id.slice(-8).toUpperCase()}</strong></td>
                        <td>{payment.invoice?.invoiceNumber || '—'}</td>
                        <td>{payment.method?.replaceAll('_', ' ')}</td>
                        <td>{date(payment.paymentDate)}</td>
                        <td><strong className="text-emerald-600">{money(payment.amount, payment.invoice?.currency)}</strong></td>
                        <td><small className="text-app-muted">{payment.note || '—'}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={FiCreditCard} title="No payments recorded" description={paySearch ? 'No matching payment records found.' : 'Payments made toward your invoices will appear here.'} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Account / Billing Profile Card */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Billing Profile</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><FiUser size={14} />Update Profile</Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ProfileField label="Full Name" value={customer.fullName} />
            <ProfileField label="Email Address" value={customer.email} />
            <ProfileField label="Company Name" value={customer.companyName || 'Not provided'} />
            <ProfileField label="Phone" value={customer.phone || 'Not provided'} />
            <ProfileField label="Billing Address" value={customer.billingAddress || 'Not provided'} />
            <ProfileField label="Tax Identification (GST/VAT)" value={customer.taxId || 'Not provided'} />
            <ProfileField label="Account Status" value={customer.status || 'ACTIVE'} />
            <ProfileField label="Member Since" value={date(customer.createdAt)} />
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

function Metric({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <Icon className="h-5 w-5 text-app-accent" />
        <div>
          <p className="text-sm text-app-muted">{label}</p>
          <p className="text-xl font-semibold text-app-text">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileField({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-app-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-app-text">{value}</p>
    </div>
  );
}

function ProfileForm({ customer, busy, close, submit }) {
  const [form, setForm] = useState({
    phone: customer.phone || '',
    companyName: customer.companyName || '',
    billingAddress: customer.billingAddress || '',
  });
  const update = (e) => setForm((curr) => ({ ...curr, [e.target.name]: e.target.value }));
  return (
    <Modal title="Edit billing profile" close={close}>
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          submit(form);
        }}
      >
        <label className="field">
          <span>Phone</span>
          <input name="phone" value={form.phone} onChange={update} placeholder="+91 ..." />
        </label>
        <label className="field">
          <span>Company Name</span>
          <input name="companyName" value={form.companyName} onChange={update} placeholder="Acme Inc." />
        </label>
        <label className="field full">
          <span>Billing Address</span>
          <textarea name="billingAddress" value={form.billingAddress} onChange={update} rows={3} placeholder="Street, City, State, Postal Code" />
        </label>
        <div className="full flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceDetailsModal({ invoice, close, onDownloadPdf }) {
  const isOverdue = invoice.status === 'CONFIRMED' && invoice.outstanding > 0 && new Date(invoice.dueDate) < new Date();
  return (
    <Modal title={`Invoice Details · ${invoice.invoiceNumber}`} close={close}>
      <div className="space-y-4 text-sm text-app-text">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-app-border bg-app-secondary/30 p-3">
          <div>
            <p className="text-xs text-app-muted">Invoice Status</p>
            <p className="font-semibold">{isOverdue ? 'OVERDUE' : invoice.status}</p>
          </div>
          <div>
            <p className="text-xs text-app-muted">Issued Date</p>
            <p className="font-semibold">{date(invoice.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-app-muted">Due Date</p>
            <p className="font-semibold">{date(invoice.dueDate)}</p>
          </div>
          <div>
            <p className="text-xs text-app-muted">Billing Period</p>
            <p className="font-semibold">{date(invoice.periodStart)} – {date(invoice.periodEnd)}</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase text-app-muted">Line Items</h4>
          <div className="mt-2 overflow-x-auto rounded-lg border border-app-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-app-secondary/50 uppercase text-app-muted">
                <tr>
                  <th className="p-2.5">Item / Plan</th>
                  <th className="p-2.5">Qty</th>
                  <th className="p-2.5">Unit Price</th>
                  <th className="p-2.5">Discounts</th>
                  <th className="p-2.5">Taxes</th>
                  <th className="p-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, idx) => (
                  <tr key={idx} className="border-t border-app-border">
                    <td className="p-2.5 font-medium">{line.productName} <span className="text-app-muted">({line.planName})</span></td>
                    <td className="p-2.5">{line.quantity}</td>
                    <td className="p-2.5">{money(line.unitPrice, invoice.currency)}</td>
                    <td className="p-2.5">{line.discountTotal ? `−${money(line.discountTotal, invoice.currency)}` : '—'}</td>
                    <td className="p-2.5">{line.taxTotal ? `+${money(line.taxTotal, invoice.currency)}` : '—'}</td>
                    <td className="p-2.5 text-right font-semibold">{money(line.total, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end border-t border-app-border pt-3">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-app-muted">Subtotal:</span>
              <span>{money(invoice.subtotal, invoice.currency)}</span>
            </div>
            {Boolean(invoice.discountTotal) && (
              <div className="flex justify-between text-emerald-600">
                <span>Discounts:</span>
                <span>−{money(invoice.discountTotal, invoice.currency)}</span>
              </div>
            )}
            {Boolean(invoice.taxTotal) && (
              <div className="flex justify-between text-app-muted">
                <span>Taxes:</span>
                <span>+{money(invoice.taxTotal, invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-app-border pt-1 font-semibold text-sm">
              <span>Total:</span>
              <span>{money(invoice.total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-app-muted">
              <span>Amount Paid:</span>
              <span>{money(invoice.amountPaid, invoice.currency)}</span>
            </div>
            <div className="flex justify-between border-t border-app-border pt-1 font-semibold text-sm text-app-accent">
              <span>Outstanding Due:</span>
              <span>{money(invoice.outstanding, invoice.currency)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2 border-t border-app-border pt-4">
          <Button variant="outline" onClick={onDownloadPdf}>
            <FiDownload size={14} /> Download Official PDF
          </Button>
          <Button variant="outline" onClick={close}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

function SubscriptionDetailsModal({ subscription, close, onAction, busy }) {
  const total = subscription.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  return (
    <Modal title={`Subscription · ${subscription.subscriptionNumber}`} close={close}>
      <div className="space-y-4 text-sm text-app-text">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-app-border bg-app-secondary/30 p-3 text-xs">
          <div><p className="text-app-muted">Status</p><Badge variant={subscription.status === 'ACTIVE' ? 'success' : 'muted'}>{subscription.status}</Badge></div>
          <div><p className="text-app-muted">Frequency</p><p className="font-semibold">{subscription.lines[0]?.billingFrequency}</p></div>
          <div><p className="text-app-muted">Start Date</p><p className="font-semibold">{date(subscription.startDate)}</p></div>
          <div><p className="text-app-muted">Next Billing</p><p className="font-semibold">{date(subscription.nextBillingDate)}</p></div>
          <div><p className="text-app-muted">Payment Terms</p><p className="font-semibold">{subscription.paymentTerms || 'Standard'}</p></div>
          <div><p className="text-app-muted">Recurring Amount</p><p className="font-semibold text-app-accent">{money(total, subscription.currency)}</p></div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase text-app-muted">Subscribed Plans</h4>
          <div className="mt-2 space-y-2">
            {subscription.lines.map((line, idx) => (
              <div key={idx} className="flex justify-between items-center rounded-lg border border-app-border p-2.5 text-xs">
                <div>
                  <strong>{line.planName}</strong>
                  <p className="text-app-muted">{line.productName} · Qty: {line.quantity}</p>
                </div>
                <strong>{money(line.lineTotal, subscription.currency)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-4">
          <div className="flex gap-2">
            {subscription.status === 'ACTIVE' && subscription.allowPause && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction('pause')}>
                Request Pause
              </Button>
            )}
            {subscription.status === 'PAUSED' && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction('resume')}>
                Resume Subscription
              </Button>
            )}
            {['ACTIVE', 'PAUSED'].includes(subscription.status) && subscription.allowEarlyClosure && (
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => { if (window.confirm('Close this subscription early?')) onAction('close'); }}>
                Close Early
              </Button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={close}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

function QuotationDetailsModal({ quotation, close, onAccept, onReject, onDownloadPdf, busy }) {
  const isPending = quotation.status === 'QUOTATION' && new Date(quotation.validUntil) >= new Date();
  return (
    <Modal title={`Quotation · ${quotation.quotationNumber}`} close={close}>
      <div className="space-y-4 text-sm text-app-text">
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-app-border bg-app-secondary/30 p-3 text-xs">
          <div><p className="text-app-muted">Status</p><Badge variant={quotation.status === 'QUOTATION' ? 'success' : 'muted'}>{quotation.status}</Badge></div>
          <div><p className="text-app-muted">Validity</p><p className="font-semibold">Valid until {date(quotation.validUntil)}</p></div>
          <div><p className="text-app-muted">Payment Terms</p><p className="font-semibold">{quotation.paymentTerms || 'Standard terms'}</p></div>
          <div><p className="text-app-muted">Total Estimate</p><p className="font-semibold text-app-accent">{money(quotation.total, quotation.currency)}</p></div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase text-app-muted">Quoted Lines</h4>
          <div className="mt-2 space-y-2">
            {quotation.lines.map((line, idx) => (
              <div key={idx} className="flex justify-between items-center rounded-lg border border-app-border p-2.5 text-xs">
                <div>
                  <strong>{line.planName}</strong>
                  <p className="text-app-muted">{line.productName} · {line.quantity} unit(s) @ {money(line.unitPrice, quotation.currency)}</p>
                </div>
                <strong>{money(line.total || line.lineTotal, quotation.currency)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-border pt-4">
          <Button size="sm" variant="outline" onClick={onDownloadPdf}>
            <FiDownload size={14} /> Download PDF
          </Button>
          <div className="flex gap-2">
            {isPending && (
              <>
                <Button size="sm" disabled={busy} onClick={onAccept}>Accept Offer</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={onReject}>Reject Offer</Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={close}>Close</Button>
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
