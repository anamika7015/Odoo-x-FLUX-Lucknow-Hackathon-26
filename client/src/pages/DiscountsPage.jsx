import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiEdit, FiPercent, FiPlus } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Input, Modal } from './ProductsPage.jsx';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((value || 0) / 100);
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '—';

export function DiscountsPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const discounts = useQuery({ queryKey: ['discounts', search], queryFn: () => api.get('/discounts', { params: { limit: 100, ...(search ? { search } : {}) } }).then(unwrap) });
  const products = useQuery({ queryKey: ['products', 'discount-form'], queryFn: () => api.get('/products', { params: { limit: 100, status: 'ACTIVE' } }).then(unwrap), enabled: open });
  const create = useMutation({ mutationFn: (payload) => api.post('/discounts', payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['discounts'] }); setOpen(false); toast.success('Discount rule created.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const update = useMutation({ mutationFn: ({ id, payload }) => api.patch(`/discounts/${id}`, payload), onSuccess: (_response, { closeEditor }) => { queryClient.invalidateQueries({ queryKey: ['discounts'] }); if (closeEditor) setOpen(false); toast.success('Discount rule updated.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const admin = user.role === 'ADMIN';

  if (discounts.isLoading) return <section className="page"><div className="skeleton tall" /></section>;
  if (discounts.isError) return <section className="page"><EmptyState icon={FiPercent} title="Discounts could not load" description={errorMessage(discounts.error)} /></section>;
  const rows = discounts.data.discounts || [];
  return <PageTransition>
    <PageHeader eyebrow="PRICING" title="Discounts" description="Manage fixed and percentage offers, eligibility, and usage limits." actions={admin && <Button onClick={() => setOpen(true)}><FiPlus size={16} />New discount</Button>} />
    <div className="mb-4 max-w-sm"><Input aria-label="Search discounts" placeholder="Search by name or code…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    {rows.length ? <div className="data-card"><table><thead><tr><th>Discount</th><th>Value</th><th>Applies to</th><th>Eligibility</th><th>Usage</th><th>Active dates</th><th>Status</th>{admin && <th>Action</th>}</tr></thead><tbody>{rows.map((item) => <tr key={item._id}>
      <td><strong>{item.name}</strong><small>Code: {item.code} · Priority {item.priority}</small></td><td>{item.type === 'FIXED' ? money(item.value) : `${(item.value / 100).toFixed(2)}%`}</td><td>{item.targetType === 'SUBSCRIPTION' ? 'Whole subscription' : item.appliesTo?.map((product) => product.name).join(', ')}</td><td>Min {money(item.minimumPurchase)} · {item.minimumQuantity} unit(s)<small>{item.autoApply ? 'Auto-applied when eligible' : 'Requires code'}</small></td><td>{item.usageCount}{item.maxUses ? ` / ${item.maxUses}` : ' / unlimited'}</td><td>{date(item.startsAt)} – {date(item.endsAt)}</td><td><span className={`status ${item.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{item.status}</span></td>
      {admin && <td><div className="row-actions"><Button size="sm" variant="outline" title="Edit rule" onClick={() => setOpen(item)}><FiEdit size={14} /></Button><Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate({ id: item._id, payload: { status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } })}>{item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button></div></td>}
    </tr>)}</tbody></table></div> : <EmptyState icon={FiPercent} title="No discounts found" description={search ? 'Try another search.' : 'Create a discount rule for eligible future invoices.'} action={admin && <Button onClick={() => setOpen(true)}><FiPlus size={16} />New discount</Button>} />}
    {open && <DiscountForm discount={open?._id ? open : null} products={products.data?.products || []} busy={open?._id ? update.isPending : create.isPending} close={() => setOpen(false)} submit={(payload) => open?._id ? update.mutate({ id: open._id, payload, closeEditor: true }) : create.mutate(payload)} />}
  </PageTransition>;
}

function DiscountForm({ discount, products, busy, close, submit }) {
  const [form, setForm] = useState(() => discount ? ({ name: discount.name, code: discount.code, type: discount.type, value: String(discount.value / 100), targetType: discount.targetType, appliesTo: (discount.appliesTo || []).map((product) => product._id || product), minimumPurchase: String(discount.minimumPurchase / 100), minimumQuantity: String(discount.minimumQuantity), startsAt: discount.startsAt ? new Date(discount.startsAt).toISOString().slice(0, 10) : '', endsAt: discount.endsAt ? new Date(discount.endsAt).toISOString().slice(0, 10) : '', maxUses: discount.maxUses ? String(discount.maxUses) : '', priority: String(discount.priority), autoApply: discount.autoApply }) : ({ name: '', code: '', type: 'PERCENTAGE', value: '', targetType: 'SUBSCRIPTION', appliesTo: [], minimumPurchase: '0', minimumQuantity: '1', startsAt: '', endsAt: '', maxUses: '', priority: '100', autoApply: true }));
  const update = (event) => { const { name, value, type, checked } = event.target; setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value })); };
  const send = (event) => {
    event.preventDefault();
    const value = form.type === 'FIXED' ? Math.round(Number(form.value) * 100) : Math.round(Number(form.value) * 100);
    submit({ name: form.name, code: form.code.toUpperCase(), type: form.type, value, targetType: form.targetType, appliesTo: form.targetType === 'PRODUCT' ? form.appliesTo : [], minimumPurchase: Math.round(Number(form.minimumPurchase) * 100), minimumQuantity: Number(form.minimumQuantity), priority: Number(form.priority), autoApply: form.autoApply, ...(discount ? { startsAt: form.startsAt || null, endsAt: form.endsAt || null, maxUses: form.maxUses ? Number(form.maxUses) : null } : { ...(form.startsAt ? { startsAt: form.startsAt } : {}), ...(form.endsAt ? { endsAt: form.endsAt } : {}), ...(form.maxUses ? { maxUses: Number(form.maxUses) } : {}) }) });
  };
  return <Modal title={discount ? `Edit ${discount.name}` : 'Create discount rule'} close={close}><form className="form-grid" onSubmit={send}>
    <Input label="Name" name="name" value={form.name} onChange={update} required />
    <Input label="Discount code" name="code" value={form.code} onChange={update} pattern="[A-Za-z0-9_-]+" required />
    <label className="field"><span>Discount type</span><select name="type" value={form.type} onChange={update}><option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option></select></label>
    <Input label={form.type === 'FIXED' ? 'Amount (₹)' : 'Rate (%)'} name="value" type="number" min="0.01" max={form.type === 'PERCENTAGE' ? '100' : undefined} step="0.01" value={form.value} onChange={update} required />
    <label className="field"><span>Discount scope</span><select name="targetType" value={form.targetType} onChange={update}><option value="SUBSCRIPTION">Whole subscription</option><option value="PRODUCT">Selected products</option></select></label>
    <Input label="Minimum purchase (₹)" name="minimumPurchase" type="number" min="0" step="0.01" value={form.minimumPurchase} onChange={update} required />
    <Input label="Minimum quantity" name="minimumQuantity" type="number" min="1" value={form.minimumQuantity} onChange={update} required />
    {form.targetType === 'PRODUCT' && <label className="field full"><span>Eligible products</span><select multiple required value={form.appliesTo} onChange={(event) => setForm((current) => ({ ...current, appliesTo: [...event.target.selectedOptions].map((option) => option.value) }))}>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label>}
    <Input label="Starts on" name="startsAt" type="date" value={form.startsAt} onChange={update} />
    <Input label="Ends on" name="endsAt" type="date" min={form.startsAt || undefined} value={form.endsAt} onChange={update} />
    <Input label="Maximum uses (blank = unlimited)" name="maxUses" type="number" min="1" value={form.maxUses} onChange={update} />
    <Input label="Priority (lower applies first)" name="priority" type="number" min="0" value={form.priority} onChange={update} required />
    <label className="field"><span><input type="checkbox" name="autoApply" checked={form.autoApply} onChange={update} /> Automatically apply when eligible</span></label>
    <button className="primary-button full" disabled={busy || (form.targetType === 'PRODUCT' && !products.length)}>{busy ? 'Saving…' : discount ? 'Save discount' : 'Create discount'}</button>
  </form></Modal>;
}
