import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiClock, FiEdit, FiShoppingBag } from 'react-icons/fi';
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

export function SubscriptionsPage() {
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const canManage = ['ADMIN', 'STAFF'].includes(user.role);
  const queryClient = useQueryClient();
  const subscriptions = useQuery({ queryKey: ['subscriptions', status], queryFn: () => api.get('/subscriptions', { params: { limit: 100, ...(status ? { status } : {}) } }).then(unwrap) });
  const details = useQuery({ queryKey: ['subscription', selected], queryFn: () => api.get(`/subscriptions/${selected}`).then(unwrap), enabled: Boolean(selected) });
  const action = useMutation({ mutationFn: ({ id, name }) => api.post(`/subscriptions/${id}/${name}`, {}), onSuccess: (_response, { name }) => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscription', selected] }); toast.success(`Subscription ${name} successful.`); }, onError: (error) => toast.error(errorMessage(error)) });
  const edit = useMutation({ mutationFn: ({ id, payload }) => api.patch(`/subscriptions/${id}`, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); queryClient.invalidateQueries({ queryKey: ['subscription'] }); setEditing(null); toast.success('Confirmed subscription updated.'); }, onError: (error) => toast.error(errorMessage(error)) });

  if (subscriptions.isLoading) return <section className="page"><div className="skeleton tall" /></section>;
  if (subscriptions.isError) return <section className="page"><EmptyState icon={FiShoppingBag} title="Subscriptions could not load" description={errorMessage(subscriptions.error)} /></section>;

  const rows = subscriptions.data.subscriptions || [];
  return (
    <PageTransition>
      <PageHeader eyebrow="LIFECYCLE" title="Subscriptions" description="Track customer contracts and permitted lifecycle changes." actions={<label className="field"><span className="sr-only">Filter status</span><select aria-label="Filter subscription status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{['CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>} />
      {rows.length ? <div className="data-card"><table><thead><tr><th>Subscription</th><th>Customer</th><th>Plan</th><th>Recurring total</th><th>Next billing</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {rows.map((subscription) => {
          const total = subscription.lines.reduce((sum, line) => sum + line.lineTotal, 0);
          const allowed = [
            ...(subscription.status === 'CONFIRMED' ? ['activate'] : []),
            ...(subscription.status === 'ACTIVE' && subscription.allowPause ? ['pause'] : []),
            ...(subscription.status === 'PAUSED' ? ['resume'] : []),
            ...(['ACTIVE', 'PAUSED'].includes(subscription.status) && subscription.allowEarlyClosure ? ['close'] : []),
            ...(['CLOSED', 'EXPIRED'].includes(subscription.status) && subscription.allowRenewal ? ['renew'] : []),
          ];
          return <tr key={subscription._id}>
            <td><button className="link-button" onClick={() => setSelected(subscription._id)}><strong>{subscription.subscriptionNumber}</strong></button><small>Started {date(subscription.startDate)}</small></td>
            <td>{subscription.customerSnapshot?.companyName || subscription.customerSnapshot?.fullName}<small>{subscription.customerSnapshot?.email}</small></td>
            <td>{subscription.lines.map((line) => `${line.planName} × ${line.quantity}`).join(', ')}</td>
            <td>{money(total, subscription.currency)} <small>/ {subscription.lines[0]?.billingFrequency?.toLowerCase()}</small></td>
            <td>{date(subscription.nextBillingDate)}</td><td><span className={`status ${subscription.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{subscription.status}</span></td>
            <td><div className="row-actions">{canManage && subscription.status === 'CONFIRMED' && <Button size="sm" variant="outline" title="Edit confirmed subscription" onClick={() => setEditing(subscription)}><FiEdit size={14} />Edit</Button>}{allowed.map((name) => <Button key={name} size="sm" variant={name === 'close' ? 'destructive' : 'outline'} disabled={action.isPending} onClick={() => action.mutate({ id: subscription._id, name })}>{name[0].toUpperCase() + name.slice(1)}</Button>)}</div></td>
          </tr>;
        })}
      </tbody></table></div> : <EmptyState icon={FiShoppingBag} title="No subscriptions found" description={status ? 'Try another status filter.' : 'Subscriptions created from confirmed quotations will appear here.'} />}
      {selected && <SubscriptionDetails result={details.data} loading={details.isLoading} close={() => setSelected(null)} />}
      {editing && <SubscriptionEditor subscription={editing} busy={edit.isPending} close={() => setEditing(null)} submit={(payload) => edit.mutate({ id: editing._id, payload })} />}
    </PageTransition>
  );
}

function SubscriptionEditor({ subscription, busy, close, submit }) {
  const [quantities, setQuantities] = useState(subscription.lines.map((line) => String(line.quantity)));
  const [paymentTerms, setPaymentTerms] = useState(subscription.paymentTerms || '');
  return <Modal title={`Edit ${subscription.subscriptionNumber}`} close={close}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); submit({ lines: quantities.map((quantity) => ({ quantity: Number(quantity) })), paymentTerms }); }}>
    <p className="field full text-sm text-app-muted">Prices and plan snapshots stay fixed. Only quantities and payment terms can change before activation.</p>
    {subscription.lines.map((line, index) => <Input key={`${line.plan}-${index}`} label={`${line.planName} quantity`} type="number" min="1" value={quantities[index]} onChange={(event) => setQuantities((current) => current.map((value, lineIndex) => lineIndex === index ? event.target.value : value))} required />)}
    <label className="field full"><span>Payment terms</span><textarea value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} maxLength={2000} /></label>
    <div className="full flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button></div>
  </form></Modal>;
}

function SubscriptionDetails({ result, loading, close }) {
  const subscription = result?.subscription;
  return <Modal title={subscription?.subscriptionNumber || 'Subscription details'} close={close}>{loading ? <div className="skeleton tall" /> : subscription ? <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2"><div><small className="muted">Customer</small><p>{subscription.customerSnapshot?.fullName}</p><p className="text-sm text-app-muted">{subscription.customerSnapshot?.email}</p></div><div><small className="muted">Status</small><p>{subscription.status}</p><p className="text-sm text-app-muted">Next billing {date(subscription.nextBillingDate)}</p></div></div>
    <div><h4 className="mb-2 font-medium">Contract lines</h4><div className="data-card"><table><thead><tr><th>Product / plan</th><th>Quantity</th><th>Price</th></tr></thead><tbody>{subscription.lines.map((line, index) => <tr key={`${line.plan}-${index}`}><td>{line.productName}{line.variantName ? ` · ${line.variantName}` : ''}<small>{line.planName}</small></td><td>{line.quantity}</td><td>{money(line.unitPrice, line.currency)} / {line.billingFrequency.toLowerCase()}</td></tr>)}</tbody></table></div></div>
    <div><h4 className="mb-2 flex items-center gap-2 font-medium"><FiClock />Status history</h4>{result.history.length ? <ul className="space-y-2">{result.history.map((entry) => <li key={entry._id} className="rounded-lg bg-app-secondary p-3 text-sm"><strong>{entry.fromStatus || 'Created'} → {entry.toStatus}</strong><p className="text-app-muted">{date(entry.occurredAt)} · {entry.reason}</p></li>)}</ul> : <p className="text-sm text-app-muted">No history recorded yet.</p>}</div>
  </div> : <p className="text-sm text-app-muted">Subscription details could not be loaded.</p>}</Modal>;
}
