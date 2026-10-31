import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiDownload, FiEdit, FiFile, FiMail, FiPlus } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Input, Modal } from './ProductsPage.jsx';

const money = (amount, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((amount || 0) / 100);
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '—';

export function InvoicesPage() {
  const [open, setOpen] = useState(false);
  const [draftEditor, setDraftEditor] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const canManage = ['ADMIN', 'STAFF'].includes(user.role);
  const invoices = useQuery({ queryKey: ['invoices', status, search], queryFn: () => api.get('/invoices', { params: { limit: 100, ...(status ? { status } : {}), ...(search ? { search } : {}) } }).then(unwrap) });
  const subscriptions = useQuery({ queryKey: ['subscriptions', 'invoice-picker'], queryFn: () => api.get('/subscriptions', { params: { status: 'ACTIVE', limit: 100 } }).then(unwrap), enabled: open && canManage });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['invoices'] });
  const create = useMutation({ mutationFn: (payload) => api.post('/invoices/from-subscription', payload), onSuccess: () => { refresh(); setOpen(false); toast.success('Draft invoice generated.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const action = useMutation({ mutationFn: ({ id, name }) => api.post(`/invoices/${id}/${name}`, {}), onSuccess: (_response, { name }) => { refresh(); toast.success(({ confirm: 'Invoice confirmed.', cancel: 'Invoice cancelled.' })[name]); }, onError: (error) => toast.error(errorMessage(error)) });
  const updateDraft = useMutation({ mutationFn: ({ id, dueDate }) => api.patch(`/invoices/${id}`, { dueDate }), onSuccess: () => { refresh(); setDraftEditor(null); toast.success('Draft invoice updated.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const email = useMutation({ mutationFn: ({ id }) => api.post(`/invoices/${id}/email`), onSuccess: (_response, { invoiceNumber }) => { toast.success(`Invoice ${invoiceNumber} emailed.`); }, onError: (error) => toast.error(errorMessage(error)) });

  if (invoices.isLoading) return <section className="page"><div className="skeleton tall" /></section>;
  if (invoices.isError) return <section className="page"><EmptyState icon={FiFile} title="Invoices could not load" description={errorMessage(invoices.error)} /></section>;
  const rows = invoices.data.invoices || [];
  return <PageTransition>
    <PageHeader eyebrow="BILLING" title="Invoices" description="Generate, confirm, and track subscription invoices and balances." actions={<div className="flex gap-2">{canManage && <Button onClick={() => setOpen(true)}><FiPlus size={16} />Generate invoice</Button>}<label className="field"><span className="sr-only">Filter invoice status</span><select aria-label="Filter invoice status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All invoices</option>{['DRAFT', 'CONFIRMED', 'PAID', 'OVERDUE', 'CANCELLED'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>} />
    <div className="mb-4 max-w-sm"><Input label="Search invoices" aria-label="Search invoices" placeholder="Invoice number, customer, or email…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    {rows.length ? <div className="data-card"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Period</th><th>Discount</th><th>Total</th><th>Paid / due</th><th>Due date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{rows.map((invoice) => {
      const overdue = invoice.status === 'CONFIRMED' && invoice.outstanding > 0 && new Date(invoice.dueDate) < new Date();
      const displayStatus = overdue ? 'OVERDUE' : invoice.status;
      return <tr key={invoice._id}>
        <td><strong>{invoice.invoiceNumber}</strong><small>{invoice.lines.map((line) => line.productName).join(', ')}</small></td>
        <td>{invoice.customerSnapshot?.companyName || invoice.customerSnapshot?.fullName}<small>{invoice.customerSnapshot?.email}</small></td>
        <td>{date(invoice.periodStart)} – {date(invoice.periodEnd)}</td><td>{invoice.discountTotal ? `−${money(invoice.discountTotal, invoice.currency)}` : '—'}</td>
        <td>{money(invoice.total, invoice.currency)}</td>
        <td>{money(invoice.amountPaid, invoice.currency)} paid<small>{money(invoice.outstanding, invoice.currency)} outstanding</small></td>
        <td>{date(invoice.dueDate)}</td><td><span className={`status ${displayStatus === 'PAID' ? 'active' : overdue ? 'warning' : 'inactive'}`}>{displayStatus}</span></td>
        <td><div className="row-actions">
          <Button size="sm" variant="outline" title="Download PDF" onClick={() => downloadPdf(invoice.invoiceNumber, invoice._id)}><FiDownload size={15} /></Button>
          {canManage && ['CONFIRMED', 'PAID'].includes(invoice.status) && <Button size="sm" variant="outline" title="Email invoice" disabled={email.isPending} onClick={() => email.mutate({ id: invoice._id, invoiceNumber: invoice.invoiceNumber })}><FiMail size={15} /></Button>}
          {canManage && invoice.status === 'DRAFT' && <Button size="sm" variant="outline" title="Edit draft invoice" onClick={() => setDraftEditor(invoice)}><FiEdit size={15} /></Button>}
          {canManage && invoice.status === 'DRAFT' && <Button size="sm" onClick={() => action.mutate({ id: invoice._id, name: 'confirm' })}>Confirm</Button>}
          {canManage && ['DRAFT', 'CONFIRMED'].includes(invoice.status) && invoice.amountPaid === 0 && <Button size="sm" variant="destructive" onClick={() => { if (window.confirm(`Cancel invoice ${invoice.invoiceNumber}?`)) action.mutate({ id: invoice._id, name: 'cancel' }); }}>Cancel</Button>}
        </div></td>
      </tr>;
    })}</tbody></table></div> : <EmptyState icon={FiFile} title="No invoices found" description={status ? 'Try another status filter.' : 'Draft invoices generated from subscriptions will appear here.'} action={canManage && <Button onClick={() => setOpen(true)}><FiPlus size={16} />Generate invoice</Button>} />}
    {open && <InvoiceForm subscriptions={subscriptions.data?.subscriptions || []} busy={create.isPending} close={() => setOpen(false)} submit={create.mutate} />}
    {draftEditor && <DraftInvoiceForm invoice={draftEditor} busy={updateDraft.isPending} close={() => setDraftEditor(null)} submit={(dueDate) => updateDraft.mutate({ id: draftEditor._id, dueDate })} />}
  </PageTransition>;
}

function DraftInvoiceForm({ invoice, busy, close, submit }) {
  const [dueDate, setDueDate] = useState(invoice.dueDate?.slice(0, 10) || '');
  return <Modal title={`Edit draft ${invoice.invoiceNumber}`} close={close}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); submit(new Date(`${dueDate}T00:00:00.000Z`).toISOString()); }}>
    <p className="field full text-sm text-app-muted">Invoice line prices, taxes, and discounts are server snapshots and stay unchanged while the invoice is a draft.</p>
    <Input label="Due date" type="date" min={invoice.periodStart?.slice(0, 10)} value={dueDate} onChange={(event) => setDueDate(event.target.value)} required />
    <div className="full flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={busy || !dueDate}>{busy ? 'Saving…' : 'Save changes'}</Button></div>
  </form></Modal>;
}

async function downloadPdf(invoiceNumber, invoiceId) {
  try {
    const response = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${invoiceNumber}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) { toast.error(errorMessage(error)); }
}

function InvoiceForm({ subscriptions, busy, close, submit }) {
  const [form, setForm] = useState({ subscription: '', periodStart: '', dueDate: '' });
  const selected = subscriptions.find((subscription) => subscription._id === form.subscription);
  const updateSubscription = (event) => {
    const subscription = subscriptions.find((item) => item._id === event.target.value);
    setForm({ subscription: event.target.value, periodStart: subscription?.startDate?.slice(0, 10) || '', dueDate: '' });
  };
  return <Modal title="Generate subscription invoice" close={close}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); submit({ subscription: form.subscription, periodStart: new Date(`${form.periodStart}T00:00:00.000Z`).toISOString(), ...(form.dueDate ? { dueDate: new Date(`${form.dueDate}T00:00:00.000Z`).toISOString() } : {}) }); }}>
    <label className="field full"><span>Active subscription</span><select name="subscription" value={form.subscription} onChange={updateSubscription} required><option value="">Choose subscription</option>{subscriptions.map((subscription) => <option key={subscription._id} value={subscription._id}>{subscription.subscriptionNumber} · {subscription.customerSnapshot?.companyName || subscription.customerSnapshot?.fullName}</option>)}</select></label>
    {selected && <p className="field full text-sm text-app-muted">{selected.lines.map((line) => `${line.quantity} × ${line.planName}`).join(', ')} · starts {date(selected.startDate)}</p>}
    <Input label="Billing period start" name="periodStart" type="date" value={form.periodStart} onChange={(event) => setForm((current) => ({ ...current, periodStart: event.target.value }))} required />
    <Input label="Due date (defaults to period end)" name="dueDate" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
    <button className="primary-button full" disabled={busy || !subscriptions.length || !form.subscription || !form.periodStart}>{busy ? 'Generating…' : 'Generate draft invoice'}</button>
  </form></Modal>;
}
