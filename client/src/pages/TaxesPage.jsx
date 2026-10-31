import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiEdit, FiPlus, FiTag } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Input, Modal } from './ProductsPage.jsx';

const date = (value) => value ? new Date(value).toLocaleDateString('en-IN') : 'No end date';

export function TaxesPage() {
  const [editor, setEditor] = useState(null);
  const [search, setSearch] = useState('');
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const taxes = useQuery({ queryKey: ['taxes', search], queryFn: () => api.get('/taxes', { params: { limit: 100, ...(search ? { search } : {}) } }).then(unwrap) });
  const products = useQuery({ queryKey: ['products', 'tax-form'], queryFn: () => api.get('/products', { params: { limit: 100, status: 'ACTIVE' } }).then(unwrap), enabled: Boolean(editor) });
  const save = useMutation({ mutationFn: ({ id, payload }) => id ? api.patch(`/taxes/${id}`, payload) : api.post('/taxes', payload), onSuccess: (_response, { id }) => { queryClient.invalidateQueries({ queryKey: ['taxes'] }); setEditor(null); toast.success(id ? 'Tax rule updated.' : 'Tax rule created.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const changeStatus = useMutation({ mutationFn: ({ id, status }) => api.patch(`/taxes/${id}`, { status }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['taxes'] }); toast.success('Tax rule updated.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const admin = user.role === 'ADMIN';

  if (taxes.isLoading) return <section className="page"><div className="skeleton tall" /></section>;
  if (taxes.isError) return <section className="page"><EmptyState icon={FiTag} title="Tax rules could not load" description={errorMessage(taxes.error)} /></section>;
  const rules = taxes.data.taxes || [];
  return <PageTransition>
    <PageHeader eyebrow="COMPLIANCE" title="Tax Configuration" description="Configure percentage tax rates, effective dates, and eligible products." actions={admin && <Button onClick={() => setEditor({})}><FiPlus size={16} />New tax rule</Button>} />
    <div className="mb-4 max-w-sm"><Input aria-label="Search tax rules" placeholder="Search tax rules…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    {rules.length ? <div className="data-card"><table><thead><tr><th>Tax rule</th><th>Rate</th><th>Applies to</th><th>Effective dates</th><th>Status</th>{admin && <th>Action</th>}</tr></thead><tbody>{rules.map((tax) => <tr key={tax._id}>
      <td><strong>{tax.name}</strong></td><td>{(tax.rateBasisPoints / 100).toFixed(2)}%</td><td>{tax.appliesTo?.length ? tax.appliesTo.map((product) => product.name).join(', ') : 'All products'}</td><td>{date(tax.effectiveFrom)} – {date(tax.effectiveUntil)}</td><td><span className={`status ${tax.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{tax.status}</span></td>
      {admin && <td><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setEditor(tax)}><FiEdit size={14} />Edit</Button><Button size="sm" variant="outline" disabled={changeStatus.isPending} onClick={() => changeStatus.mutate({ id: tax._id, status: tax.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>{tax.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button></div></td>}
    </tr>)}</tbody></table></div> : <EmptyState icon={FiTag} title="No tax rules found" description={search ? 'Try another search.' : 'Add a rule to calculate taxes on future invoices.'} action={admin && <Button onClick={() => setEditor({})}><FiPlus size={16} />New tax rule</Button>} />}
    {editor && <TaxForm tax={editor._id ? editor : null} products={products.data?.products || []} busy={save.isPending} close={() => setEditor(null)} submit={(payload) => save.mutate({ id: editor._id, payload })} />}
  </PageTransition>;
}

function TaxForm({ tax, products, busy, close, submit }) {
  const [form, setForm] = useState(() => ({ name: tax?.name || '', rate: tax ? String(tax.rateBasisPoints / 100) : '', effectiveFrom: tax?.effectiveFrom?.slice(0, 10) || '', effectiveUntil: tax?.effectiveUntil?.slice(0, 10) || '', appliesTo: tax?.appliesTo?.map((product) => product._id || product) || [], status: tax?.status || 'ACTIVE' }));
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const send = (event) => {
    event.preventDefault();
    submit({ name: form.name, rateBasisPoints: Math.round(Number(form.rate) * 100), appliesTo: form.appliesTo, status: form.status, ...(tax ? { effectiveFrom: form.effectiveFrom || null, effectiveUntil: form.effectiveUntil || null } : { ...(form.effectiveFrom ? { effectiveFrom: form.effectiveFrom } : {}), ...(form.effectiveUntil ? { effectiveUntil: form.effectiveUntil } : {}) }) });
  };
  return <Modal title={tax ? 'Edit tax rule' : 'Create tax rule'} close={close}><form className="form-grid" onSubmit={send}>
    <Input label="Tax name" name="name" value={form.name} onChange={update} required />
    <Input label="Rate (%)" name="rate" type="number" min="0" max="100" step="0.01" value={form.rate} onChange={update} required />
    <Input label="Effective from" name="effectiveFrom" type="date" value={form.effectiveFrom} onChange={update} />
    <Input label="Effective until" name="effectiveUntil" type="date" min={form.effectiveFrom || undefined} value={form.effectiveUntil} onChange={update} />
    {tax && <label className="field"><span>Status</span><select name="status" value={form.status} onChange={update}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>}
    <label className="field full"><span>Products (leave empty for all products)</span><select multiple value={form.appliesTo} onChange={(event) => setForm((current) => ({ ...current, appliesTo: [...event.target.selectedOptions].map((option) => option.value) }))}>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select><small className="text-app-muted">Use Ctrl/Cmd to select multiple products.</small></label>
    <button className="primary-button full" disabled={busy}>{busy ? 'Saving…' : tax ? 'Save tax rule' : 'Create tax rule'}</button>
  </form></Modal>;
}
