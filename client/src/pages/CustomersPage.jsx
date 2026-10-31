import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FiClock,
  FiEdit,
  FiPlus,
  FiSearch,
  FiUsers,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiDownload,
  FiFileText,
  FiCreditCard,
  FiLayers,
} from 'react-icons/fi';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { api, errorMessage, unwrap } from '../services/api.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Modal, FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '../components/ui/Modal.jsx';

const toForm = (customer) =>
  customer
    ? {
        fullName: customer.fullName,
        email: customer.email,
        phone: customer.phone || '',
        companyName: customer.companyName || '',
        billingAddress: customer.billingAddress || '',
        taxId: customer.taxId || '',
        status: customer.status,
      }
    : {
        fullName: '',
        email: '',
        phone: '',
        companyName: '',
        billingAddress: '',
        taxId: '',
        status: 'ACTIVE',
      };

const money = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((amount || 0) / 100);

export function CustomersPage() {
  const [editor, setEditor] = useState(null);
  const [history, setHistory] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { user } = useSelector((state) => state.auth);
  const adminOrStaff = user.role === 'ADMIN' || user.role === 'STAFF';
  const queryClient = useQueryClient();

  const customers = useQuery({
    queryKey: ['customers', page, search, status],
    queryFn: () =>
      api
        .get('/customers', {
          params: { page, limit: 20, search: search || undefined, status: status || undefined },
        })
        .then(unwrap),
  });

  const save = useMutation({
    mutationFn: ({ id, payload }) => (id ? api.patch(`/customers/${id}`, payload) : api.post('/customers', payload)),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setEditor(null);
      toast.success(id ? 'Customer profile updated.' : 'Customer account created.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (customers.isLoading) {
    return (
      <PageTransition className="space-y-4">
        <div className="h-24 w-full rounded-2xl bg-app-surface/60 animate-pulse border border-app-border" />
        <div className="h-96 w-full rounded-2xl bg-app-surface/60 animate-pulse border border-app-border" />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="relative">
      <PageHeader
        eyebrow="RELATIONSHIP DIRECTORY"
        title="Customer Accounts"
        description="Corporate contacts, billing locations, and commercial transaction records."
        actions={
          adminOrStaff && (
            <button
              onClick={() => setEditor({})}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-teal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-teal-hover transition-colors"
            >
              <FiPlus size={16} /> New Customer
            </button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-72">
            <FiSearch className="absolute left-3 top-2.5 text-app-text-muted" size={15} />
            <input
              aria-label="Search customers"
              placeholder="Search by name, company, email, or tax ID…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="h-9 w-full rounded-lg border border-app-border bg-app-surface pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-muted/60 transition-colors focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
          </div>
          <select
            aria-label="Filter customers by status"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="h-9 rounded-lg border border-app-border bg-app-surface px-3 text-xs font-medium text-app-text transition-colors focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="text-xs text-app-text-muted font-medium">
          Total: <span className="font-bold text-app-text tabular-nums">{customers.data?.meta?.total ?? 0}</span> accounts
        </div>
      </div>

      {/* Customers Table */}
      {customers.data?.items?.length ? (
        <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-app-border bg-app-secondary/40 text-app-text-muted uppercase font-semibold">
                <tr>
                  <th className="p-4">Customer Contact</th>
                  <th className="p-4">Company & Identity</th>
                  <th className="p-4">Tax ID / GST</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">History</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {customers.data.items.map((customer) => {
                  const initials = customer.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={customer._id} className="hover:bg-app-secondary/20 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-teal/15 font-bold text-brand-teal text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <strong className="text-sm font-bold text-app-text">{customer.fullName}</strong>
                            <div className="flex items-center gap-2 mt-0.5 text-app-text-muted text-[11px]">
                              <span className="flex items-center gap-1">
                                <FiMail size={12} /> {customer.email}
                              </span>
                              {customer.phone && (
                                <span className="flex items-center gap-1">
                                  · <FiPhone size={11} /> {customer.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-medium text-app-text">
                          <FiBriefcase size={13} className="text-app-text-muted" />
                          <span>{customer.companyName || '—'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-xs text-app-text-muted">{customer.taxId || '—'}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            customer.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-app-secondary text-app-text-muted'
                          }`}
                        >
                          {customer.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => setHistory(customer)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-2.5 py-1 text-xs font-medium text-app-text hover:border-brand-teal hover:text-brand-teal transition-colors"
                        >
                          <FiClock size={13} />
                          <span>Ledger</span>
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => setEditor(customer)}
                          title="Edit Customer"
                          className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-secondary hover:text-brand-teal transition-colors"
                        >
                          <FiEdit size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between border-t border-app-border px-4 py-3 text-xs text-app-text-muted">
            <span>
              Showing {customers.data.items.length} of {customers.data.meta.total} customers
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || customers.isFetching}
                onClick={() => setPage((v) => v - 1)}
                className="rounded-lg border border-app-border px-3 py-1 text-xs font-medium text-app-text hover:bg-app-secondary disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="font-medium text-app-text">
                Page {page} of {Math.max(customers.data.meta.totalPages, 1)}
              </span>
              <button
                type="button"
                disabled={page >= customers.data.meta.totalPages || customers.isFetching}
                onClick={() => setPage((v) => v + 1)}
                className="rounded-lg border border-app-border px-3 py-1 text-xs font-medium text-app-text hover:bg-app-secondary disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FiUsers}
          title="No customer accounts found"
          description={
            search || status
              ? 'No customers match the current search or status filter.'
              : 'Add customer profiles to start creating quotations and subscriptions.'
          }
        />
      )}

      {/* Global Viewport Centered Customer Form */}
      {editor && (
        <CustomerForm
          customer={editor._id ? editor : null}
          busy={save.isPending}
          close={() => setEditor(null)}
          submit={(payload) => {
            if (
              payload.status === 'INACTIVE' &&
              editor._id &&
              editor.status !== 'INACTIVE' &&
              !window.confirm(
                'Deactivate this customer? Customers with active subscriptions or unpaid invoices cannot be deactivated.'
              )
            ) {
              return;
            }
            save.mutate({ id: editor._id, payload });
          }}
        />
      )}

      {/* Global Viewport Centered Customer Account History Ledger */}
      {history && <CustomerHistory customer={history} close={() => setHistory(null)} />}
    </PageTransition>
  );
}

function CustomerHistory({ customer, close }) {
  const query = useQuery({
    queryKey: ['customer-history', customer._id],
    queryFn: () => api.get(`/customers/${customer._id}/history`).then(unwrap),
  });
  const historyData = query.data;

  const download = async (invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice._id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoice.invoiceNumber}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <Modal
      title={`${customer.fullName} · Account Ledger`}
      description={`Complete commercial timeline for ${customer.companyName || customer.email}`}
      badge="LEDGER"
      size="lg"
      close={close}
    >
      {query.isLoading ? (
        <div className="h-60 animate-pulse rounded-xl bg-app-secondary/50" />
      ) : query.isError ? (
        <p className="text-xs text-rose-500">{errorMessage(query.error)}</p>
      ) : (
        <div className="space-y-6 text-xs text-app-text">
          {/* Subscriptions section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FiLayers className="text-brand-teal" size={15} />
              <h4 className="font-bold uppercase tracking-wider text-app-text">Subscriptions</h4>
            </div>
            {historyData.subscriptions.length ? (
              <div className="space-y-2">
                {historyData.subscriptions.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-xl border border-app-border bg-app-secondary/20 p-3"
                  >
                    <div>
                      <strong className="text-app-text">{item.subscriptionNumber}</strong>
                      <p className="text-[11px] text-app-text-muted mt-0.5">
                        Status: <span className="font-semibold text-app-text">{item.status}</span>
                      </p>
                    </div>
                    <span className="font-bold text-app-text tabular-nums">{money(item.subtotal, item.currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-app-text-muted italic">No subscriptions recorded.</p>
            )}
          </div>

          {/* Invoices section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FiFileText className="text-brand-teal" size={15} />
              <h4 className="font-bold uppercase tracking-wider text-app-text">Issued Invoices</h4>
            </div>
            {historyData.invoices.length ? (
              <div className="space-y-2">
                {historyData.invoices.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-xl border border-app-border bg-app-secondary/20 p-3"
                  >
                    <div>
                      <strong className="text-app-text">{item.invoiceNumber}</strong>
                      <p className="text-[11px] text-app-text-muted mt-0.5">
                        Status: <span className="font-semibold text-app-text">{item.status}</span> · Outstanding:{' '}
                        <span className="font-bold text-amber-500 tabular-nums">{money(item.outstanding, item.currency)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <strong className="text-app-text tabular-nums">{money(item.total, item.currency)}</strong>
                      <button
                        type="button"
                        onClick={() => download(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-app-border bg-app-surface px-2.5 py-1 text-[11px] font-semibold text-app-text hover:border-brand-teal hover:text-brand-teal transition-colors"
                      >
                        <FiDownload size={12} /> PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-app-text-muted italic">No invoices issued.</p>
            )}
          </div>

          {/* Payments section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FiCreditCard className="text-brand-teal" size={15} />
              <h4 className="font-bold uppercase tracking-wider text-app-text">Recorded Payments</h4>
            </div>
            {historyData.payments.length ? (
              <div className="space-y-2">
                {historyData.payments.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-xl border border-app-border bg-app-secondary/20 p-3"
                  >
                    <div>
                      <strong className="text-app-text">{item.invoice?.invoiceNumber || 'Direct Payment'}</strong>
                      <p className="text-[11px] text-app-text-muted mt-0.5">
                        {item.method?.replaceAll('_', ' ')} · {new Date(item.paymentDate).toLocaleDateString()}
                      </p>
                    </div>
                    <strong className="font-bold text-emerald-500 tabular-nums">
                      {money(item.amount, item.invoice?.currency)}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-app-text-muted italic">No payment receipts recorded.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function CustomerForm({ customer, close, submit, busy }) {
  const [form, setForm] = useState(toForm(customer));
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const send = (event) => {
    event.preventDefault();
    submit(form);
  };

  return (
    <Modal
      title={customer ? `Edit Customer · ${customer.fullName}` : 'Create Customer Account'}
      description="Register customer identity, corporate organization details, and tax credentials."
      badge={customer ? customer.status : 'NEW'}
      size="md"
      close={close}
    >
      <form onSubmit={send} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full Name" required>
            <FormInput
              name="fullName"
              value={form.fullName}
              onChange={update}
              placeholder="e.g. Vikram Sharma"
              required
            />
          </FormField>
          <FormField label="Email Address" required>
            <FormInput
              name="email"
              type="email"
              value={form.email}
              onChange={update}
              placeholder="vikram@enterprise.com"
              required
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phone Number">
            <FormInput
              name="phone"
              value={form.phone}
              onChange={update}
              placeholder="+91 98765 43210"
            />
          </FormField>
          <FormField label="Company Name">
            <FormInput
              name="companyName"
              value={form.companyName}
              onChange={update}
              placeholder="e.g. Acme Tech Labs Pvt Ltd"
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tax Identification (GST/VAT)">
            <FormInput
              name="taxId"
              value={form.taxId}
              onChange={update}
              placeholder="e.g. 07AAAAA0000A1Z5"
            />
          </FormField>
          <FormField label="Account Status">
            <FormSelect name="status" value={form.status} onChange={update}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </FormSelect>
          </FormField>
        </div>

        <FormField label="Default Billing Address">
          <FormTextarea
            name="billingAddress"
            value={form.billingAddress}
            onChange={update}
            rows={3}
            placeholder="Complete postal address for tax invoice generation..."
          />
        </FormField>

        <ModalFooter
          onCancel={close}
          cancelLabel="Discard"
          submitLabel={customer ? 'Save Changes' : 'Create Account'}
          busy={busy}
        />
      </form>
    </Modal>
  );
}
