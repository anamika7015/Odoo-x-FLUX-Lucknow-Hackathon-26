import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FiClock,
  FiEdit,
  FiLayers,
  FiSearch,
  FiPlay,
  FiPause,
  FiXCircle,
  FiRefreshCw,
  FiCheckCircle,
} from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Modal, FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '../components/ui/Modal.jsx';

const money = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((amount || 0) / 100);

const date = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '—');

const subStatusBadge = (status) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
    case 'CONFIRMED':
      return 'bg-brand-gold/15 text-brand-gold border-brand-gold/30';
    case 'PAUSED':
      return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    case 'CLOSED':
    case 'EXPIRED':
      return 'bg-app-secondary text-app-text-muted border-app-border';
    default:
      return 'bg-app-secondary text-app-text-muted border-app-border';
  }
};

export function SubscriptionsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const canManage = ['ADMIN', 'STAFF'].includes(user.role);
  const queryClient = useQueryClient();

  const subscriptions = useQuery({
    queryKey: ['subscriptions', status],
    queryFn: () =>
      api.get('/subscriptions', { params: { limit: 100, ...(status ? { status } : {}) } }).then(unwrap),
  });

  const details = useQuery({
    queryKey: ['subscription', selected],
    queryFn: () => api.get(`/subscriptions/${selected}`).then(unwrap),
    enabled: Boolean(selected),
  });

  const action = useMutation({
    mutationFn: ({ id, name }) => api.post(`/subscriptions/${id}/${name}`, {}),
    onSuccess: (_response, { name }) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', selected] });
      toast.success(`Subscription ${name} successful.`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const edit = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/subscriptions/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setEditing(null);
      toast.success('Confirmed subscription updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (subscriptions.isLoading) {
    return (
      <PageTransition className="space-y-4">
        <div className="h-24 w-full rounded-2xl bg-app-surface/60 animate-pulse border border-app-border" />
        <div className="h-96 w-full rounded-2xl bg-app-surface/60 animate-pulse border border-app-border" />
      </PageTransition>
    );
  }

  const rawRows = subscriptions.data?.subscriptions || [];
  const filteredRows = rawRows.filter((sub) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      sub.subscriptionNumber.toLowerCase().includes(term) ||
      sub.customerSnapshot?.companyName?.toLowerCase().includes(term) ||
      sub.customerSnapshot?.fullName?.toLowerCase().includes(term) ||
      sub.lines.some((l) => l.planName?.toLowerCase().includes(term))
    );
  });

  return (
    <PageTransition className="relative">
      <PageHeader
        eyebrow="ACTIVE AGREEMENTS"
        title="Subscriptions"
        description="Monitor active subscription commitments, automated renewal dates, and lifecycle states."
      />

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-64">
            <FiSearch className="absolute left-3 top-2.5 text-app-text-muted" size={15} />
            <input
              aria-label="Search subscriptions"
              placeholder="Search by sub #, customer, or plan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-app-border bg-app-surface pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-muted/60 transition-colors focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
          </div>
          <select
            aria-label="Filter subscriptions by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-lg border border-app-border bg-app-surface px-3 text-xs font-medium text-app-text transition-colors focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
          >
            <option value="">All Statuses</option>
            {['CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-app-text-muted font-medium">
          Total: <span className="font-bold text-app-text tabular-nums">{rawRows.length}</span> subscriptions
        </div>
      </div>

      {/* Subscriptions Table */}
      {filteredRows.length ? (
        <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-app-border bg-app-secondary/40 text-app-text-muted uppercase font-semibold">
                <tr>
                  <th className="p-4">Subscription ID</th>
                  <th className="p-4">Customer Account</th>
                  <th className="p-4">Subscribed Plans</th>
                  <th className="p-4 text-right">Recurring Rate</th>
                  <th className="p-4">Next Billing Date</th>
                  <th className="p-4 text-center">Lifecycle Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredRows.map((subscription) => {
                  const total = subscription.lines.reduce((sum, line) => sum + line.lineTotal, 0);
                  const allowed = [
                    ...(subscription.status === 'CONFIRMED' ? ['activate'] : []),
                    ...(subscription.status === 'ACTIVE' && subscription.allowPause ? ['pause'] : []),
                    ...(subscription.status === 'PAUSED' ? ['resume'] : []),
                    ...(['ACTIVE', 'PAUSED'].includes(subscription.status) && subscription.allowEarlyClosure
                      ? ['close']
                      : []),
                    ...(['CLOSED', 'EXPIRED'].includes(subscription.status) && subscription.allowRenewal
                      ? ['renew']
                      : []),
                  ];

                  return (
                    <tr key={subscription._id} className="hover:bg-app-secondary/20 transition-colors">
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => setSelected(subscription._id)}
                          className="text-left group"
                        >
                          <strong className="text-sm font-bold text-app-text group-hover:text-brand-teal transition-colors">
                            {subscription.subscriptionNumber}
                          </strong>
                          <p className="mt-0.5 text-[11px] text-app-text-muted">
                            Started {date(subscription.startDate)}
                          </p>
                        </button>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-app-text">
                          {subscription.customerSnapshot?.companyName || subscription.customerSnapshot?.fullName}
                        </span>
                        <p className="text-[11px] text-app-text-muted">{subscription.customerSnapshot?.email}</p>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-app-text">
                          {subscription.lines.map((l) => `${l.planName} × ${l.quantity}`).join(', ')}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-bold text-app-text tabular-nums">
                          {money(total, subscription.currency)}
                        </span>
                        <span className="block text-[10px] text-app-text-muted uppercase">
                          / {subscription.lines[0]?.billingFrequency?.toLowerCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-app-text">{date(subscription.nextBillingDate)}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${subStatusBadge(
                            subscription.status
                          )}`}
                        >
                          {subscription.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && subscription.status === 'CONFIRMED' && (
                            <button
                              type="button"
                              onClick={() => setEditing(subscription)}
                              className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-secondary hover:text-brand-teal transition-colors"
                              title="Edit confirmed subscription"
                            >
                              <FiEdit size={14} />
                            </button>
                          )}
                          {allowed.map((actionName) => (
                            <button
                              key={actionName}
                              type="button"
                              disabled={action.isPending}
                              onClick={() => action.mutate({ id: subscription._id, name: actionName })}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm transition-all ${
                                actionName === 'activate'
                                  ? 'bg-brand-teal text-white hover:bg-brand-teal-hover'
                                  : actionName === 'close'
                                  ? 'border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20'
                                  : 'border border-app-border bg-app-surface text-app-text hover:bg-app-secondary'
                              }`}
                            >
                              {actionName.charAt(0).toUpperCase() + actionName.slice(1)}
                            </button>
                          ))}
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
          icon={FiLayers}
          title="No subscriptions found"
          description={
            search || status
              ? 'No subscriptions match the selected search or status filters.'
              : 'Subscriptions created from confirmed quotations will appear here.'
          }
        />
      )}

      {/* Global Viewport Centered Details Modal */}
      {selected && (
        <SubscriptionDetails
          result={details.data}
          loading={details.isLoading}
          close={() => setSelected(null)}
        />
      )}

      {/* Global Viewport Centered Edit Modal */}
      {editing && (
        <SubscriptionEditor
          subscription={editing}
          busy={edit.isPending}
          close={() => setEditing(null)}
          submit={(payload) => edit.mutate({ id: editing._id, payload })}
        />
      )}
    </PageTransition>
  );
}

function SubscriptionEditor({ subscription, busy, close, submit }) {
  const [quantities, setQuantities] = useState(subscription.lines.map((l) => String(l.quantity)));
  const [paymentTerms, setPaymentTerms] = useState(subscription.paymentTerms || '');

  return (
    <Modal
      title={`Edit Subscription · ${subscription.subscriptionNumber}`}
      description="Adjust contract quantities and payment terms prior to final activation."
      badge="CONFIRMED"
      size="md"
      close={close}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit({
            lines: quantities.map((qty) => ({ quantity: Number(qty) })),
            paymentTerms,
          });
        }}
        className="space-y-4"
      >
        <div className="rounded-xl border border-app-border bg-app-secondary/20 p-4 space-y-3">
          <p className="text-xs text-app-text-muted leading-relaxed">
            Locked price and plan snapshots remain immutable. Only committed line quantities can be tuned before activation.
          </p>
          {subscription.lines.map((line, index) => (
            <FormField key={`${line.plan}-${index}`} label={`${line.planName} (${line.productName}) Quantity`} required>
              <FormInput
                type="number"
                min="1"
                value={quantities[index]}
                onChange={(e) =>
                  setQuantities((curr) => curr.map((v, i) => (i === index ? e.target.value : v)))
                }
                required
              />
            </FormField>
          ))}
        </div>

        <FormField label="Payment Terms & Notes">
          <FormTextarea
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            rows={2}
            maxLength={2000}
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

function SubscriptionDetails({ result, loading, close }) {
  const subscription = result?.subscription;

  return (
    <Modal
      title={subscription?.subscriptionNumber || 'Subscription Overview'}
      description="Active contract parameters, product line allocations, and lifecycle history."
      badge={subscription?.status}
      size="lg"
      close={close}
    >
      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-app-secondary/50" />
      ) : subscription ? (
        <div className="space-y-5 text-xs text-app-text">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-app-border bg-app-secondary/30 p-3.5">
            <div>
              <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-semibold">Customer</p>
              <p className="font-bold text-app-text mt-0.5">{subscription.customerSnapshot?.fullName}</p>
              <p className="text-[11px] text-app-text-muted">{subscription.customerSnapshot?.email}</p>
            </div>
            <div>
              <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-semibold">Status</p>
              <p className="font-bold text-app-text mt-0.5">{subscription.status}</p>
            </div>
            <div>
              <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-semibold">Start Date</p>
              <p className="font-semibold text-app-text mt-0.5">{date(subscription.startDate)}</p>
            </div>
            <div>
              <p className="text-[11px] text-app-text-muted uppercase tracking-wider font-semibold">Next Billing</p>
              <p className="font-semibold text-brand-teal mt-0.5">{date(subscription.nextBillingDate)}</p>
            </div>
          </div>

          {/* Contract Lines */}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-app-text mb-2">Committed Offerings</h4>
            <div className="overflow-hidden rounded-xl border border-app-border bg-app-surface">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-app-border bg-app-secondary/40 text-app-text-muted uppercase font-semibold">
                  <tr>
                    <th className="p-3">Product & Plan</th>
                    <th className="p-3 text-center">Quantity</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {subscription.lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-app-secondary/20 transition-colors">
                      <td className="p-3">
                        <strong className="text-app-text font-bold">{line.productName}</strong>
                        {line.variantName && <span className="text-app-text-muted"> · {line.variantName}</span>}
                        <p className="text-[11px] text-app-text-muted">{line.planName}</p>
                      </td>
                      <td className="p-3 text-center tabular-nums font-semibold">{line.quantity}</td>
                      <td className="p-3 text-right tabular-nums">
                        {money(line.unitPrice, line.currency)} / {line.billingFrequency.toLowerCase()}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-app-text">
                        {money(line.lineTotal, line.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Status Lifecycle Audit Log */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FiClock className="text-brand-teal" size={14} />
              <h4 className="font-bold uppercase tracking-wider text-app-text">Status Lifecycle Audit Log</h4>
            </div>
            {result.history?.length ? (
              <div className="space-y-2">
                {result.history.map((entry) => (
                  <div
                    key={entry._id}
                    className="flex items-center justify-between rounded-xl border border-app-border/40 bg-app-secondary/20 p-2.5"
                  >
                    <div>
                      <strong className="text-app-text font-semibold">
                        {entry.fromStatus || 'Draft'} → {entry.toStatus}
                      </strong>
                      <p className="text-[11px] text-app-text-muted mt-0.5">{entry.reason || 'Lifecycle action'}</p>
                    </div>
                    <span className="text-[11px] text-app-text-muted whitespace-nowrap">
                      {date(entry.occurredAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-app-text-muted italic">No status transition history recorded yet.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-app-text-muted">Subscription data could not be loaded.</p>
      )}
    </Modal>
  );
}
