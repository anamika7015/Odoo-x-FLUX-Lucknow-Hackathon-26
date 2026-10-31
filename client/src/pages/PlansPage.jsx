import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiCalendar, FiEdit, FiPlus } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Empty, Input, Modal, Status } from './ProductsPage.jsx';

const rupees = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((value || 0) / 100);
const dateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';

export function PlansPage() {
  const [editor, setEditor] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ['plans', search, status], queryFn: () => api.get('/plans', { params: { limit: 100, search: search || undefined, status: status || undefined } }).then(unwrap) });
  const products = useQuery({ queryKey: ['products', 'plan-form'], queryFn: () => api.get('/products', { params: { status: 'ACTIVE', limit: 100 } }).then(unwrap), enabled: Boolean(editor) });
  const savePlan = useMutation({ mutationFn: ({ id, payload }) => id ? api.patch(`/plans/${id}`, payload) : api.post('/plans', payload), onSuccess: (_result, { id }) => { queryClient.invalidateQueries({ queryKey: ['plans'] }); setEditor(null); toast.success(id ? 'Plan updated.' : 'Plan created.'); }, onError: (error) => toast.error(errorMessage(error)) });

  if (plans.isLoading) return <section className="page"><div className="skeleton tall" /></section>;
  if (plans.isError) return <section className="page"><Empty icon={FiCalendar} title="Plans could not load" detail={errorMessage(plans.error)} /></section>;
  return <section className="page">
    <div className="page-heading"><div><p className="eyebrow">RECURRING BILLING</p><h2>Plans</h2><p className="muted">Configure commercial and lifecycle rules for subscriptions.</p></div>{user.role === 'ADMIN' && <button className="primary-button compact" onClick={() => setEditor({})}><FiPlus size={17} />New plan</button>}</div>
    <div className="mb-4 flex flex-wrap gap-3"><input className="h-10 min-w-56 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text" aria-label="Search plans" placeholder="Search plans…" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="h-10 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text" aria-label="Filter plans by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
    {plans.data.plans.length ? <div className="data-card"><table><thead><tr><th>Plan</th><th>Product</th><th>Frequency</th><th>Price</th><th>Status</th>{user.role === 'ADMIN' && <th aria-label="Actions" />}</tr></thead><tbody>{plans.data.plans.map((plan) => <tr key={plan._id}><td><strong>{plan.name}</strong><small>Minimum quantity: {plan.minimumQuantity}</small></td><td>{plan.product?.name || '—'}</td><td>{plan.billingFrequency}</td><td>{rupees(plan.billingPrice, plan.currency)}</td><td><Status value={plan.status} /></td>{user.role === 'ADMIN' && <td><button className="icon-button" aria-label={`Edit ${plan.name}`} onClick={() => setEditor(plan)}><FiEdit size={16} /></button></td>}</tr>)}</tbody></table></div> : <Empty icon={FiCalendar} title="No plans found" detail={search || status ? 'Try changing the search or status filter.' : 'Create a recurring plan after setting up your products.'} />}
    {editor && <PlanForm plan={editor._id ? editor : null} products={products.data?.products || []} busy={savePlan.isPending} close={() => setEditor(null)} submit={(payload) => savePlan.mutate({ id: editor._id, payload })} />}
  </section>;
}

function PlanForm({ plan, products, close, submit, busy }) {
  const [form, setForm] = useState(() => ({
    name: plan?.name || '', product: plan?.product?._id || plan?.product || '', billingPrice: plan ? String(plan.billingPrice / 100) : '', currency: plan?.currency || 'INR', billingFrequency: plan?.billingFrequency || 'MONTHLY', minimumQuantity: String(plan?.minimumQuantity || 1), description: plan?.description || '', availabilityStartDate: dateInput(plan?.availabilityStartDate), availabilityEndDate: dateInput(plan?.availabilityEndDate), status: plan?.status || 'ACTIVE', allowPause: Boolean(plan?.allowPause), allowRenewal: plan?.allowRenewal ?? true, allowEarlyClosure: Boolean(plan?.allowEarlyClosure), autoClose: Boolean(plan?.autoClose),
  }));
  const update = (event) => { const { name, value, type, checked } = event.target; setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value })); };
  const send = (event) => {
    event.preventDefault();
    submit({ ...form, billingPrice: Math.round(Number(form.billingPrice) * 100), minimumQuantity: Number(form.minimumQuantity), availabilityStartDate: form.availabilityStartDate || null, availabilityEndDate: form.availabilityEndDate || null });
  };
  return <Modal title={plan ? 'Edit billing plan' : 'Create billing plan'} close={close}><form className="form-grid" onSubmit={send}>
    <Input label="Plan name" name="name" value={form.name} onChange={update} required />
    <label className="field"><span>Associated product</span><select name="product" value={form.product} onChange={update} required><option value="">Choose a product</option>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label>
    <Input label="Billing price" name="billingPrice" type="number" min="0" step="0.01" value={form.billingPrice} onChange={update} required />
    <Input label="Currency" name="currency" maxLength="3" value={form.currency} onChange={update} required />
    <label className="field"><span>Billing frequency</span><select name="billingFrequency" value={form.billingFrequency} onChange={update}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="YEARLY">Yearly</option></select></label>
    <Input label="Minimum quantity" name="minimumQuantity" type="number" min="1" value={form.minimumQuantity} onChange={update} required />
    <Input label="Available from" name="availabilityStartDate" type="date" value={form.availabilityStartDate} onChange={update} />
    <Input label="Available until" name="availabilityEndDate" type="date" value={form.availabilityEndDate} onChange={update} />
    {plan && <label className="field"><span>Status</span><select name="status" value={form.status} onChange={update}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>}
    <label className="field full"><span>Description</span><textarea name="description" value={form.description} onChange={update} /></label>
    <div className="checkboxes full">{[['allowPause', 'Allow pause'], ['allowRenewal', 'Allow renewal'], ['allowEarlyClosure', 'Allow early closure'], ['autoClose', 'Automatically close']].map(([name, label]) => <label key={name}><input type="checkbox" name={name} checked={form[name]} onChange={update} />{label}</label>)}</div>
    <button className="primary-button full" disabled={busy || !products.length}>{busy ? 'Saving…' : plan ? 'Save plan' : 'Create plan'}</button>
  </form></Modal>;
}
