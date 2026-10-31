import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Edit,
  FileText,
  Mail,
  Plus,
  Receipt,
  Search,
  Check,
  X,
  CreditCard,
  Building2,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Modal, FormField, FormInput, FormSelect, ModalFooter } from '../components/ui/Modal.jsx';

const money = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((amount || 0) / 100);
const date = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '—');

export function InvoicesPage() {
  const [open, setOpen] = useState(false);
  const [draftEditor, setDraftEditor] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const canManage = ['ADMIN', 'STAFF'].includes(user.role);

  const invoices = useQuery({
    queryKey: ['invoices', status, search],
    queryFn: () =>
      api
        .get('/invoices', {
          params: { limit: 100, ...(status ? { status } : {}), ...(search ? { search } : {}) },
        })
        .then(unwrap),
  });

  const subscriptions = useQuery({
    queryKey: ['subscriptions', 'invoice-picker'],
    queryFn: () => api.get('/subscriptions', { params: { status: 'ACTIVE', limit: 100 } }).then(unwrap),
    enabled: open && canManage,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['invoices'] });

  const create = useMutation({
    mutationFn: (payload) => api.post('/invoices/from-subscription', payload),
    onSuccess: () => {
      refresh();
      setOpen(false);
      toast.success('Draft invoice generated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const action = useMutation({
    mutationFn: ({ id, name }) => api.post(`/invoices/${id}/${name}`, {}),
    onSuccess: (_response, { name }) => {
      refresh();
      toast.success({ confirm: 'Invoice confirmed.', cancel: 'Invoice cancelled.' }[name]);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const updateDraft = useMutation({
    mutationFn: ({ id, dueDate }) => api.patch(`/invoices/${id}`, { dueDate }),
    onSuccess: () => {
      refresh();
      setDraftEditor(null);
      toast.success('Draft invoice updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const email = useMutation({
    mutationFn: ({ id }) => api.post(`/invoices/${id}/email`),
    onSuccess: (_response, { invoiceNumber }) => {
      toast.success(`Invoice ${invoiceNumber} emailed.`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (invoices.isLoading) {
    return (
      <section className="page-wrap space-y-4">
        <div className="skeleton tall" />
      </section>
    );
  }

  if (invoices.isError) {
    return (
      <section className="page-wrap">
        <EmptyState icon={Receipt} title="Invoices could not load" description={errorMessage(invoices.error)} />
      </section>
    );
  }

  const rows = invoices.data?.invoices || [];

  return (
    <PageTransition className="page-wrap">
      <PageHeader
        eyebrow="BILLING & RECEIVABLES"
        title="Commercial Invoices"
        description="Generate, confirm, and audit recurring subscription tax invoices, balances, and collection states."
        actions={
          canManage && (
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} />
              <span>Generate Invoice</span>
            </Button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-subtle">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-72">
            <Search className="absolute left-3 top-2.5 text-app-text-muted" size={15} />
            <input
              aria-label="Search invoices"
              placeholder="Search invoice #, client, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-app-border bg-app-surface pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-muted/60 transition-colors focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
            />
          </div>
          <select
            aria-label="Filter invoice status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-xl border border-app-border bg-app-surface px-3 text-xs font-semibold text-app-text cursor-pointer transition-colors focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
          >
            <option value="">All Invoices</option>
            {['DRAFT', 'CONFIRMED', 'PAID', 'OVERDUE', 'CANCELLED'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-app-text-muted font-semibold">
          Total: <span className="font-bold text-app-text tabular-nums">{rows.length}</span> invoices
        </div>
      </div>

      {rows.length ? (
        <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-app-border bg-app-secondary/50 text-app-text-muted uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4">Invoice</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Period</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Paid / Due</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {rows.map((invoice) => {
                  const overdue =
                    invoice.status === 'CONFIRMED' && invoice.outstanding > 0 && new Date(invoice.dueDate) < new Date();
                  const displayStatus = overdue ? 'OVERDUE' : invoice.status;
                  return (
                    <tr key={invoice._id} className="hover:bg-app-secondary/30 transition-colors">
                      <td className="p-4">
                        <strong className="text-sm font-bold text-app-text">{invoice.invoiceNumber}</strong>
                        <small className="text-app-text-muted">
                          {invoice.lines.map((line) => line.productName).join(', ')}
                        </small>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-app-text">
                          {invoice.customerSnapshot?.companyName || invoice.customerSnapshot?.fullName}
                        </span>
                        <small className="text-app-text-muted">{invoice.customerSnapshot?.email}</small>
                      </td>
                      <td className="p-4">
                        {date(invoice.periodStart)} – {date(invoice.periodEnd)}
                      </td>
                      <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                        {invoice.discountTotal ? `−${money(invoice.discountTotal, invoice.currency)}` : '—'}
                      </td>
                      <td className="p-4 tabular-nums font-bold text-sm text-app-text">
                        {money(invoice.total, invoice.currency)}
                      </td>
                      <td className="p-4 tabular-nums font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {money(invoice.amountPaid, invoice.currency)} paid
                        </span>
                        <small className="text-amber-600 dark:text-amber-400 font-bold">
                          {money(invoice.outstanding, invoice.currency)} due
                        </small>
                      </td>
                      <td className="p-4 tabular-nums">{date(invoice.dueDate)}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`status ${
                            displayStatus === 'PAID' ? 'active' : overdue ? 'danger' : 'inactive'
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Download PDF"
                            onClick={() => downloadPdf(invoice.invoiceNumber, invoice._id)}
                          >
                            <Download size={14} />
                          </Button>
                          {canManage && ['CONFIRMED', 'PAID'].includes(invoice.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              title="Email invoice"
                              disabled={email.isPending}
                              onClick={() => email.mutate({ id: invoice._id, invoiceNumber: invoice.invoiceNumber })}
                            >
                              <Mail size={14} />
                            </Button>
                          )}
                          {canManage && invoice.status === 'DRAFT' && (
                            <Button
                              size="sm"
                              variant="outline"
                              title="Edit draft invoice"
                              onClick={() => setDraftEditor(invoice)}
                            >
                              <Edit size={14} />
                            </Button>
                          )}
                          {canManage && invoice.status === 'DRAFT' && (
                            <Button
                              size="sm"
                              onClick={() => action.mutate({ id: invoice._id, name: 'confirm' })}
                            >
                              Confirm
                            </Button>
                          )}
                          {canManage && ['DRAFT', 'CONFIRMED'].includes(invoice.status) && invoice.amountPaid === 0 && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm(`Cancel invoice ${invoice.invoiceNumber}?`)) {
                                  action.mutate({ id: invoice._id, name: 'cancel' });
                                }
                              }}
                            >
                              Cancel
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
        </div>
      ) : (
        <EmptyState
          icon={Receipt}
          title="No invoices found"
          description={
            status
              ? 'Try another status filter.'
              : 'Draft invoices generated from active subscriptions will appear here.'
          }
          action={
            canManage && (
              <Button onClick={() => setOpen(true)}>
                <Plus size={16} />
                <span>Generate Invoice</span>
              </Button>
            )
          }
        />
      )}

      {/* Global Viewport Centered Modals */}
      {open && (
        <InvoiceForm
          subscriptions={subscriptions.data?.subscriptions || []}
          busy={create.isPending}
          close={() => setOpen(false)}
          submit={create.mutate}
        />
      )}

      {draftEditor && (
        <DraftInvoiceForm
          invoice={draftEditor}
          busy={updateDraft.isPending}
          close={() => setDraftEditor(null)}
          submit={(dueDate) => updateDraft.mutate({ id: draftEditor._id, dueDate })}
        />
      )}
    </PageTransition>
  );
}

function DraftInvoiceForm({ invoice, busy, close, submit }) {
  const [dueDate, setDueDate] = useState(invoice.dueDate?.slice(0, 10) || '');
  return (
    <Modal title={`Edit Draft · ${invoice.invoiceNumber}`} badge="DRAFT" size="md" close={close}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit(new Date(`${dueDate}T00:00:00.000Z`).toISOString());
        }}
      >
        <p className="text-xs text-app-text-muted leading-relaxed">
          Line prices, taxes, and discounts are server snapshots and stay immutable while the invoice is a draft.
        </p>
        <FormField label="Payment Due Date" required>
          <FormInput
            type="date"
            min={invoice.periodStart?.slice(0, 10)}
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            required
          />
        </FormField>
        <ModalFooter
          onCancel={close}
          cancelLabel="Discard"
          submitLabel="Save Changes"
          busy={busy}
          submitDisabled={!dueDate}
        />
      </form>
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    toast.error(errorMessage(error));
  }
}

function InvoiceForm({ subscriptions, busy, close, submit }) {
  const [form, setForm] = useState({ subscription: '', periodStart: '', dueDate: '' });
  const selected = subscriptions.find((subscription) => subscription._id === form.subscription);

  const updateSubscription = (event) => {
    const subscription = subscriptions.find((item) => item._id === event.target.value);
    setForm({
      subscription: event.target.value,
      periodStart: subscription?.startDate?.slice(0, 10) || '',
      dueDate: '',
    });
  };

  return (
    <Modal
      title="Generate Subscription Invoice"
      description="Create an itemized billing invoice snapshot from an active customer subscription."
      badge="NEW"
      size="md"
      close={close}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit({
            subscription: form.subscription,
            periodStart: new Date(`${form.periodStart}T00:00:00.000Z`).toISOString(),
            ...(form.dueDate ? { dueDate: new Date(`${form.dueDate}T00:00:00.000Z`).toISOString() } : {}),
          });
        }}
      >
        <FormField label="Active Subscription" required>
          <FormSelect name="subscription" value={form.subscription} onChange={updateSubscription} required>
            <option value="">Choose a subscription</option>
            {subscriptions.map((subscription) => (
              <option key={subscription._id} value={subscription._id}>
                {subscription.subscriptionNumber} · {subscription.customerSnapshot?.companyName || subscription.customerSnapshot?.fullName}
              </option>
            ))}
          </FormSelect>
        </FormField>

        {selected && (
          <div className="rounded-xl border border-app-border bg-app-secondary/30 p-3 text-xs text-app-text-muted">
            <span className="font-semibold text-app-text block mb-1">Subscribed Offerings:</span>
            {selected.lines.map((line) => `${line.quantity} × ${line.planName}`).join(', ')} · Started {date(selected.startDate)}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Billing Period Start" required>
            <FormInput
              name="periodStart"
              type="date"
              value={form.periodStart}
              onChange={(event) => setForm((current) => ({ ...current, periodStart: event.target.value }))}
              required
            />
          </FormField>
          <FormField label="Due Date (Optional)">
            <FormInput
              name="dueDate"
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
            />
          </FormField>
        </div>

        <ModalFooter
          onCancel={close}
          cancelLabel="Discard"
          submitLabel="Generate Draft Invoice"
          busy={busy}
          submitDisabled={!subscriptions.length || !form.subscription || !form.periodStart}
        />
      </form>
    </Modal>
  );
}
