import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiCreditCard, FiDownload, FiFileText, FiPackage, FiUser } from 'react-icons/fi';
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
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ['customer', 'me'], queryFn: () => api.get('/customers/me').then(unwrap) });
  const subscriptions = useQuery({ queryKey: ['subscriptions'], queryFn: () => api.get('/subscriptions', { params: { limit: 100 } }).then(unwrap) });
  const invoices = useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/invoices', { params: { limit: 100 } }).then(unwrap) });
  const payments = useQuery({ queryKey: ['payments'], queryFn: () => api.get('/payments', { params: { limit: 100 } }).then(unwrap) });
  const quotations = useQuery({ queryKey: ['quotations'], queryFn: () => api.get('/quotations', { params: { limit: 100 } }).then(unwrap) });
  const save = useMutation({ mutationFn: (payload) => api.patch('/customers/me', payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer', 'me'] }); setEditing(false); toast.success('Profile updated.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const changeSubscription = useMutation({ mutationFn: ({ id, action }) => api.post(`/subscriptions/${id}/${action}`, { reason: 'Customer request from the portal.' }), onSuccess: (_response, { action }) => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscription'] }); toast.success(`Subscription ${action} successful.`); }, onError: (error) => toast.error(errorMessage(error)) });
  const decideQuotation = useMutation({ mutationFn: ({ id, action }) => api.post(`/quotations/${id}/${action}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success('Quotation updated.'); }, onError: (error) => toast.error(errorMessage(error)) });

  if (profile.isLoading || subscriptions.isLoading || invoices.isLoading || payments.isLoading || quotations.isLoading) return <section className="page"><div className="skeleton tall" /></section>;
  if (profile.isError || subscriptions.isError || invoices.isError || payments.isError || quotations.isError) return <section className="page"><EmptyState icon={FiUser} title="Your account could not load" description={errorMessage(profile.error || subscriptions.error || invoices.error || payments.error || quotations.error)} /></section>;

  const customer = profile.data.customer;
  const plans = subscriptions.data.subscriptions || [];
  const bills = invoices.data.invoices || [];
  const paymentHistory = payments.data.payments || [];
  const quoteHistory = quotations.data.quotations || [];
  const active = plans.filter((subscription) => subscription.status === 'ACTIVE');
  const outstanding = bills.reduce((sum, invoice) => sum + invoice.outstanding, 0);
  const nextBilling = active.map(({ nextBillingDate }) => nextBillingDate).filter(Boolean).sort()[0];
  return <PageTransition>
    <PageHeader eyebrow="CUSTOMER PORTAL" title={`Hello, ${customer.fullName.split(' ')[0]}`} description="View your subscription activity, invoices, and account details." actions={<Button variant="outline" onClick={() => setEditing(true)}><FiUser size={16} />Edit profile</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={FiPackage} label="Active subscriptions" value={active.length} />
      <Metric icon={FiCreditCard} label="Outstanding balance" value={money(outstanding)} />
      <Metric icon={FiFileText} label="Invoices" value={bills.length} />
      <Metric icon={FiPackage} label="Next billing" value={date(nextBilling)} />
    </div>
    <div className="mt-6 grid gap-6 xl:grid-cols-3">
      <Card><CardHeader><CardTitle>Your subscriptions</CardTitle></CardHeader><CardContent>
        {plans.length ? <div className="space-y-3">{plans.map((subscription) => <div key={subscription._id} className="flex flex-col gap-3 rounded-xl border border-app-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong>{subscription.lines.map((line) => line.planName).join(', ')}</strong><p className="mt-1 text-sm text-app-muted">{subscription.subscriptionNumber} · Next billing {date(subscription.nextBillingDate)}</p></div><div className="flex flex-wrap items-center gap-2"><Badge variant={subscription.status === 'ACTIVE' ? 'success' : 'muted'}>{subscription.status}</Badge>{subscription.status === 'ACTIVE' && subscription.allowPause && <Button size="sm" variant="outline" disabled={changeSubscription.isPending} onClick={() => changeSubscription.mutate({ id: subscription._id, action: 'pause' })}>Request pause</Button>}{subscription.status === 'PAUSED' && <Button size="sm" variant="outline" disabled={changeSubscription.isPending} onClick={() => changeSubscription.mutate({ id: subscription._id, action: 'resume' })}>Resume</Button>}{['ACTIVE', 'PAUSED'].includes(subscription.status) && subscription.allowEarlyClosure && <Button size="sm" variant="destructive" disabled={changeSubscription.isPending} onClick={() => { if (window.confirm('Close this subscription? This cannot be undone.')) changeSubscription.mutate({ id: subscription._id, action: 'close' }); }}>Close</Button>}</div></div>)}</div> : <EmptyState icon={FiPackage} title="No subscriptions yet" description="Your confirmed plans will appear here." />}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Recent invoices</CardTitle></CardHeader><CardContent>
        {bills.length ? <div className="data-card"><table><thead><tr><th>Invoice</th><th>Date</th><th>Outstanding</th><th>Status</th><th /></tr></thead><tbody>{bills.slice(0, 8).map((invoice) => <tr key={invoice._id}><td><strong>{invoice.invoiceNumber}</strong></td><td>{date(invoice.createdAt)}</td><td>{money(invoice.outstanding, invoice.currency)}</td><td>{invoice.status}</td><td><Button size="sm" variant="outline" title="Download invoice PDF" onClick={() => downloadPdf(invoice.invoiceNumber, invoice._id)}><FiDownload size={15} /></Button></td></tr>)}</tbody></table></div> : <EmptyState icon={FiFileText} title="No invoices yet" description="Invoices for your subscriptions will appear here." />}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Recent payments</CardTitle></CardHeader><CardContent>
        {paymentHistory.length ? <div className="space-y-3">{paymentHistory.slice(0, 8).map((payment) => <div key={payment._id} className="flex items-center justify-between gap-3 rounded-xl border border-app-border p-3"><div><strong>{payment.invoice?.invoiceNumber || 'Invoice payment'}</strong><p className="text-sm text-app-muted">{payment.method.replace('_', ' ')} · {date(payment.paymentDate)}</p></div><span className="font-medium">{money(payment.amount, payment.invoice?.currency)}</span></div>)}</div> : <EmptyState icon={FiCreditCard} title="No payments yet" description="Payments made toward your invoices will appear here." />}
      </CardContent></Card>
    </div>
    <Card className="mt-6"><CardHeader><CardTitle>Recent quotations</CardTitle></CardHeader><CardContent>
      {quoteHistory.length ? <div className="data-card"><table><thead><tr><th>Quotation</th><th>Date</th><th>Product / plan</th><th>Total</th><th>Valid until</th><th>Status</th><th>Actions</th></tr></thead><tbody>{quoteHistory.slice(0, 8).map((quote) => <tr key={quote._id}><td><strong>{quote.quotationNumber}</strong></td><td>{date(quote.createdAt)}</td><td>{quote.lines.map((line) => line.planName).join(', ')}</td><td>{money(quote.total, quote.currency)}</td><td>{date(quote.validUntil)}</td><td><Badge variant={quote.status === 'QUOTATION' ? 'success' : 'muted'}>{quote.status}</Badge></td><td><div className="flex gap-2"><Button size="sm" variant="outline" title="Download quotation PDF" onClick={() => downloadQuotationPdf(quote.quotationNumber, quote._id)}><FiDownload size={15} /></Button>{quote.status === 'QUOTATION' && new Date(quote.validUntil) >= new Date() && <><Button size="sm" disabled={decideQuotation.isPending} onClick={() => decideQuotation.mutate({ id: quote._id, action: 'accept' })}>Accept</Button><Button size="sm" variant="outline" disabled={decideQuotation.isPending} onClick={() => decideQuotation.mutate({ id: quote._id, action: 'reject' })}>Reject</Button></>}</div></td></tr>)}</tbody></table></div> : <EmptyState icon={FiFileText} title="No quotations yet" description="Quotations prepared for your account will appear here." />}
    </CardContent></Card>
    <Card className="mt-6"><CardHeader><CardTitle>Billing profile</CardTitle></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2"><ProfileField label="Name" value={customer.fullName} /><ProfileField label="Email" value={customer.email} /><ProfileField label="Company" value={customer.companyName || 'Not provided'} /><ProfileField label="Phone" value={customer.phone || 'Not provided'} /><ProfileField label="Billing address" value={customer.billingAddress || 'Not provided'} /><ProfileField label="Tax ID" value={customer.taxId || 'Not provided'} /><ProfileField label="Account status" value={customer.status || 'ACTIVE'} /><ProfileField label="Member since" value={date(customer.createdAt)} /></div></CardContent></Card>
    {editing && <ProfileForm customer={customer} busy={save.isPending} close={() => setEditing(false)} submit={save.mutate} />}
  </PageTransition>;
}

function Metric({ icon: Icon, label, value }) { return <Card><CardContent className="flex items-center gap-3 p-5"><Icon className="h-5 w-5 text-app-accent" /><div><p className="text-sm text-app-muted">{label}</p><p className="text-xl font-semibold text-app-text">{value}</p></div></CardContent></Card>; }
function ProfileField({ label, value }) { return <div><p className="text-xs uppercase tracking-wide text-app-muted">{label}</p><p className="mt-1 text-sm text-app-text">{value}</p></div>; }

function ProfileForm({ customer, busy, close, submit }) {
  const [form, setForm] = useState({ phone: customer.phone || '', companyName: customer.companyName || '', billingAddress: customer.billingAddress || '' });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  return <Modal title="Edit billing profile" close={close}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); submit(form); }}>
    <label className="field"><span>Phone</span><input name="phone" value={form.phone} onChange={update} /></label>
    <label className="field"><span>Company</span><input name="companyName" value={form.companyName} onChange={update} /></label>
    <label className="field full"><span>Billing address</span><textarea name="billingAddress" value={form.billingAddress} onChange={update} /></label>
    <button className="primary-button full" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
  </form></Modal>;
}

async function downloadPdf(invoiceNumber, invoiceId) {
  try {
    const response = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${invoiceNumber}.pdf`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  } catch (error) { toast.error(errorMessage(error)); }
}

async function downloadQuotationPdf(quotationNumber, quotationId) {
  try {
    const response = await api.get(`/quotations/${quotationId}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${quotationNumber}.pdf`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  } catch (error) { toast.error(errorMessage(error)); }
}
