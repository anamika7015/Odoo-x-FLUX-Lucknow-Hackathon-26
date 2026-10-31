import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Edit,
  Plus,
  Search,
  Building2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Modal, FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '../components/ui/Modal.jsx';

const money = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((amount || 0) / 100);
const date = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '—');
const methods = ['CASH', 'BANK_TRANSFER', 'CARD', 'UPI', 'OTHER'];

export function PaymentsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [method, setMethod] = useState('');
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const canManage = ['ADMIN', 'STAFF'].includes(user.role);

  const payments = useQuery({
    queryKey: ['payments', method],
    queryFn: () =>
      api
        .get('/payments', {
          params: { limit: 100, ...(method ? { method } : {}) },
        })
        .then(unwrap),
  });

  const invoices = useQuery({
    queryKey: ['invoices', 'payment-picker'],
    queryFn: () => api.get('/invoices', { params: { status: 'CONFIRMED', limit: 100 } }).then(unwrap),
    enabled: open && canManage,
  });

  const record = useMutation({
    mutationFn: (payload) => api.post('/payments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customer'] });
      setOpen(false);
      toast.success('Payment recorded and invoice balance updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const edit = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/payments/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setEditing(null);
      toast.success('Payment details updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (payments.isLoading) {
    return (
      <section className="page-wrap space-y-4">
        <div className="skeleton tall" />
      </section>
    );
  }

  if (payments.isError) {
    return (
      <section className="page-wrap">
        <EmptyState icon={CreditCard} title="Payments could not load" description={errorMessage(payments.error)} />
      </section>
    );
  }

  const rows = payments.data?.payments || [];

  return (
    <PageTransition className="page-wrap">
      <PageHeader
        eyebrow="RECONCILIATION & LEDGER"
        title="Payment Transactions"
        description="Record incoming payments, settle outstanding invoices, and reconcile banking credits."
        actions={
          <div className="flex items-center gap-2.5">
            {canManage && (
              <Button onClick={() => setOpen(true)}>
                <Plus size={16} />
                <span>Record Payment</span>
              </Button>
            )}
            <select
              aria-label="Filter payment method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="h-10 rounded-xl border border-app-border bg-app-surface px-3 text-xs font-semibold text-app-text cursor-pointer transition-colors focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
            >
              <option value="">All payment methods</option>
              {methods.map((item) => (
                <option key={item} value={item}>
                  {item.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {rows.length ? (
        <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-app-border bg-app-secondary/50 text-app-text-muted uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4">Payment Ref</th>
                  <th className="p-4">Invoice</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">External Reference</th>
                  <th className="p-4">Payment Date</th>
                  <th className="p-4 text-right">Amount Settled</th>
                  {canManage && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {rows.map((payment) => (
                  <tr key={payment._id} className="hover:bg-app-secondary/30 transition-colors">
                    <td className="p-4">
                      <strong className="text-sm font-bold text-app-text">
                        {payment.paymentReference || payment._id.slice(-8).toUpperCase()}
                      </strong>
                      <small className="text-app-text-muted">{payment.note || 'No note'}</small>
                    </td>
                    <td className="p-4">
                      <strong className="text-app-text">{payment.invoice?.invoiceNumber || '—'}</strong>
                      <small className="text-app-text-muted">{payment.invoice?.status}</small>
                    </td>
                    <td className="p-4">
                      <span className="rounded-lg bg-app-secondary px-2.5 py-1 text-xs font-semibold text-app-text border border-app-border">
                        {payment.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-app-text-muted font-medium">
                      {payment.paymentReference || '—'}
                    </td>
                    <td className="p-4 tabular-nums font-medium">{date(payment.paymentDate)}</td>
                    <td className="p-4 text-right tabular-nums">
                      <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {money(payment.amount, payment.invoice?.currency)}
                      </strong>
                    </td>
                    {canManage && (
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          title="Edit payment details"
                          disabled={edit.isPending}
                          onClick={() => setEditing(payment)}
                        >
                          <Edit size={14} />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={CreditCard}
          title="No payments recorded"
          description={method ? 'Try another payment method.' : 'Recorded customer payments will appear here.'}
          action={
            canManage && (
              <Button onClick={() => setOpen(true)}>
                <Plus size={16} />
                <span>Record Payment</span>
              </Button>
            )
          }
        />
      )}

      {/* Global Viewport Centered Modals */}
      {open && (
        <PaymentForm
          invoices={invoices.data?.invoices || []}
          busy={record.isPending}
          close={() => setOpen(false)}
          submit={record.mutate}
        />
      )}

      {editing && (
        <EditPaymentForm
          payment={editing}
          busy={edit.isPending}
          close={() => setEditing(null)}
          submit={(payload) => edit.mutate({ id: editing._id, payload })}
        />
      )}
    </PageTransition>
  );
}

function EditPaymentForm({ payment, busy, close, submit }) {
  const [form, setForm] = useState({
    method: payment.method,
    paymentDate: new Date(payment.paymentDate).toISOString().slice(0, 10),
    paymentReference: payment.paymentReference || '',
    note: payment.note || '',
  });

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <Modal
      title={`Edit Payment · ${payment.paymentReference || payment._id.slice(-8).toUpperCase()}`}
      description="Update internal transaction metadata and reference details."
      badge="RECONCILIATION"
      size="md"
      close={close}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit({
            ...form,
            paymentDate: new Date(`${form.paymentDate}T00:00:00.000Z`).toISOString(),
          });
        }}
      >
        <p className="text-xs text-app-text-muted leading-relaxed">
          Amount and settled invoice reference are locked to preserve the audit trail and invoice balance integrity.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Payment Method" required>
            <FormSelect name="method" value={form.method} onChange={update}>
              {methods.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll('_', ' ')}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField label="Payment Date" required>
            <FormInput
              name="paymentDate"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.paymentDate}
              onChange={update}
              required
            />
          </FormField>
        </div>

        <FormField label="Transaction Reference (UTR / Cheque #)">
          <FormInput
            name="paymentReference"
            value={form.paymentReference}
            onChange={update}
            maxLength={120}
            placeholder="e.g. UTR-98234823"
          />
        </FormField>

        <FormField label="Internal Reconciliation Note">
          <FormTextarea
            name="note"
            value={form.note}
            onChange={update}
            maxLength={1000}
            rows={2}
            placeholder="Additional notes for accounting audit..."
          />
        </FormField>

        <ModalFooter
          onCancel={close}
          cancelLabel="Discard"
          submitLabel="Save Changes"
          busy={busy}
        />
      </form>
    </Modal>
  );
}

function PaymentForm({ invoices, busy, close, submit }) {
  const [form, setForm] = useState({
    invoice: '',
    amount: '',
    method: 'BANK_TRANSFER',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentReference: '',
    note: '',
  });

  const selected = invoices.find((invoice) => invoice._id === form.invoice);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const send = (event) => {
    event.preventDefault();
    submit({
      invoice: form.invoice,
      amount: Math.round(Number(form.amount) * 100),
      method: form.method,
      paymentDate: new Date(`${form.paymentDate}T00:00:00.000Z`).toISOString(),
      paymentReference: form.paymentReference,
      note: form.note,
    });
  };

  return (
    <Modal
      title="Record Customer Payment"
      description="Apply a credit settlement toward an outstanding customer invoice."
      badge="CREDIT"
      size="md"
      close={close}
    >
      <form className="space-y-4" onSubmit={send}>
        <FormField label="Target Invoice" required>
          <FormSelect name="invoice" value={form.invoice} onChange={update} required>
            <option value="">Select an outstanding invoice</option>
            {invoices.map((invoice) => (
              <option key={invoice._id} value={invoice._id}>
                {invoice.invoiceNumber} · {invoice.customerSnapshot?.companyName || invoice.customerSnapshot?.fullName} · Due: {money(invoice.outstanding, invoice.currency)}
              </option>
            ))}
          </FormSelect>
        </FormField>

        {selected && (
          <div className="rounded-xl border border-app-border bg-app-secondary/30 p-3 text-xs flex justify-between items-center">
            <span className="text-app-text-muted">Invoice Total: <strong className="text-app-text">{money(selected.total, selected.currency)}</strong></span>
            <span className="text-app-text-muted">Balance Due: <strong className="text-amber-600 dark:text-amber-400">{money(selected.outstanding, selected.currency)}</strong></span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Payment Amount (₹)" required>
            <FormInput
              name="amount"
              type="number"
              min="0.01"
              max={selected ? (selected.outstanding / 100).toFixed(2) : undefined}
              step="0.01"
              value={form.amount}
              onChange={update}
              placeholder="e.g. 1500.00"
              required
            />
          </FormField>
          <FormField label="Payment Method" required>
            <FormSelect name="method" value={form.method} onChange={update}>
              {methods.map((item) => (
                <option key={item} value={item}>
                  {item.replace('_', ' ')}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Payment Date" required>
            <FormInput
              name="paymentDate"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.paymentDate}
              onChange={update}
              required
            />
          </FormField>
          <FormField label="Reference (Optional)">
            <FormInput
              name="paymentReference"
              value={form.paymentReference}
              onChange={update}
              placeholder="UTR or Bank Reference"
              maxLength={120}
            />
          </FormField>
        </div>

        <FormField label="Audit Note">
          <FormTextarea
            name="note"
            value={form.note}
            onChange={update}
            rows={2}
            placeholder="Optional transaction remarks..."
            maxLength={1000}
          />
        </FormField>

        <ModalFooter
          onCancel={close}
          cancelLabel="Discard"
          submitLabel="Record Payment"
          busy={busy}
          submitDisabled={!invoices.length || !form.invoice}
        />
      </form>
    </Modal>
  );
}
