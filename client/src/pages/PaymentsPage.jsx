import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiCreditCard, FiEdit, FiPlus } from 'react-icons/fi';
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
const methods = ['CASH', 'BANK_TRANSFER', 'CARD', 'UPI', 'OTHER'];

export function PaymentsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [method, setMethod] = useState('');
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const canManage = ['ADMIN', 'STAFF'].includes(user.role);
  const payments = useQuery({ queryKey: ['payments', method], queryFn: () => api.get('/payments', { params: { limit: 100, ...(method ? { method } : {}) } }).then(unwrap) });
  const invoices = useQuery({ queryKey: ['invoices', 'payment-picker'], queryFn: () => api.get('/invoices', { params: { status: 'CONFIRMED', limit: 100 } }).then(unwrap), enabled: open && canManage });
  const record = useMutation({ mutationFn: (payload) => api.post('/payments', payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payments'] }); queryClient.invalidateQueries({ queryKey: ['invoices'] }); queryClient.invalidateQueries({ queryKey: ['customer'] }); setOpen(false); toast.success('Payment recorded and invoice balance updated.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const edit = useMutation({ mutationFn: ({ id, payload }) => api.patch(`/payments/${id}`, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payments'] }); queryClient.invalidateQueries({ queryKey: ['reports'] }); setEditing(null); toast.success('Payment details updated.'); }, onError: (error) => toast.error(errorMessage(error)) });

  if (payments.isLoading) return <section className="page"><div className="skeleton tall" /></section>;
  if (payments.isError) return <section className="page"><EmptyState icon={FiCreditCard} title="Payments could not load" description={errorMessage(payments.error)} /></section>;
  const rows = payments.data.payments || [];
  return <PageTransition>
    <PageHeader eyebrow="RECONCILIATION" title="Payments" description="Record incoming payments and reconcile invoice balances." actions={<div className="flex gap-2">{canManage && <Button onClick={() => setOpen(true)}><FiPlus size={16} />Record payment</Button>}<label className="field"><span className="sr-only">Filter payment method</span><select aria-label="Filter payment method" value={method} onChange={(event) => setMethod(event.target.value)}><option value="">All methods</option>{methods.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select></label></div>} />
    {rows.length ? <div className="data-card"><table><thead><tr><th>Payment</th><th>Invoice</th><th>Method</th><th>Reference</th><th>Payment date</th><th>Amount</th>{canManage && <th aria-label="Actions" />}</tr></thead><tbody>{rows.map((payment) => <tr key={payment._id}>
      <td><strong>{payment._id.slice(-8).toUpperCase()}</strong><small>{payment.note || 'No note'}</small></td><td>{payment.invoice?.invoiceNumber || '—'}<small>{payment.invoice?.status}</small></td><td>{payment.method.replace('_', ' ')}</td><td>{payment.paymentReference || '—'}</td><td>{date(payment.paymentDate)}</td><td>{money(payment.amount, payment.invoice?.currency)}</td>{canManage && <td><Button size="sm" variant="outline" title="Edit payment details" disabled={edit.isPending} onClick={() => setEditing(payment)}><FiEdit size={14} /></Button></td>}
    </tr>)}</tbody></table></div> : <EmptyState icon={FiCreditCard} title="No payments found" description={method ? 'Try another payment method.' : 'Recorded payments will appear here.'} action={canManage && <Button onClick={() => setOpen(true)}><FiPlus size={16} />Record payment</Button>} />}
    {open && <PaymentForm invoices={invoices.data?.invoices || []} busy={record.isPending} close={() => setOpen(false)} submit={record.mutate} />}
    {editing && <EditPaymentForm payment={editing} busy={edit.isPending} close={() => setEditing(null)} submit={(payload) => edit.mutate({ id: editing._id, payload })} />}
  </PageTransition>;
}

function EditPaymentForm({ payment, busy, close, submit }) {
  const [form, setForm] = useState({ method: payment.method, paymentDate: new Date(payment.paymentDate).toISOString().slice(0, 10), paymentReference: payment.paymentReference || '', note: payment.note || '' });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  return <Modal title={`Edit payment ${payment._id.slice(-8).toUpperCase()}`} close={close}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); submit({ ...form, paymentDate: new Date(`${form.paymentDate}T00:00:00.000Z`).toISOString() }); }}>
    <p className="field full text-sm text-app-muted">Amount and invoice are fixed to preserve the reconciled invoice balance.</p>
    <label className="field"><span>Method</span><select name="method" value={form.method} onChange={update}>{methods.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label>
    <Input label="Payment date" name="paymentDate" type="date" max={new Date().toISOString().slice(0, 10)} value={form.paymentDate} onChange={update} required />
    <Input label="Reference (optional)" name="paymentReference" value={form.paymentReference} onChange={update} maxLength={120} />
    <label className="field full"><span>Note</span><textarea name="note" value={form.note} onChange={update} maxLength={1000} /></label>
    <div className="full flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</Button></div>
  </form></Modal>;
}

function PaymentForm({ invoices, busy, close, submit }) {
  const [form, setForm] = useState({ invoice: '', amount: '', method: 'BANK_TRANSFER', paymentDate: new Date().toISOString().slice(0, 10), paymentReference: '', note: '' });
  const selected = invoices.find((invoice) => invoice._id === form.invoice);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const send = (event) => {
    event.preventDefault();
    submit({ invoice: form.invoice, amount: Math.round(Number(form.amount) * 100), method: form.method, paymentDate: new Date(`${form.paymentDate}T00:00:00.000Z`).toISOString(), paymentReference: form.paymentReference, note: form.note });
  };
  return <Modal title="Record payment" close={close}><form className="form-grid" onSubmit={send}>
    <label className="field full"><span>Invoice</span><select name="invoice" value={form.invoice} onChange={update} required><option value="">Choose invoice</option>{invoices.map((invoice) => <option key={invoice._id} value={invoice._id}>{invoice.invoiceNumber} · {invoice.customerSnapshot?.companyName || invoice.customerSnapshot?.fullName} · due {money(invoice.outstanding, invoice.currency)}</option>)}</select></label>
    {selected && <p className="field full text-sm text-app-muted">Invoice total {money(selected.total, selected.currency)} · Outstanding {money(selected.outstanding, selected.currency)}</p>}
    <Input label="Amount (₹)" name="amount" type="number" min="0.01" max={selected ? (selected.outstanding / 100).toFixed(2) : undefined} step="0.01" value={form.amount} onChange={update} required />
    <label className="field"><span>Method</span><select name="method" value={form.method} onChange={update}>{methods.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select></label>
    <Input label="Payment date" name="paymentDate" type="date" max={new Date().toISOString().slice(0, 10)} value={form.paymentDate} onChange={update} required />
    <Input label="Reference (optional)" name="paymentReference" value={form.paymentReference} onChange={update} maxLength={120} />
    <label className="field full"><span>Note</span><textarea name="note" value={form.note} onChange={update} maxLength={1000} /></label>
    <button className="primary-button full" disabled={busy || !invoices.length || !form.invoice}>{busy ? 'Recording…' : 'Record payment'}</button>
  </form></Modal>;
}
