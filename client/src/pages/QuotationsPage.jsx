import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiEdit, FiFileText, FiMail, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Input, Modal, Status } from './ProductsPage.jsx';

const money = (amount, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((amount || 0) / 100);
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '—';

export function QuotationsPage() {
  const [dialog, setDialog] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const canManage = ['ADMIN', 'STAFF'].includes(user.role);
  const quotations = useQuery({ queryKey: ['quotations'], queryFn: () => api.get('/quotations', { params: { limit: 100 } }).then(unwrap) });
  const customers = useQuery({ queryKey: ['customers', 'quotation-picker'], queryFn: () => api.get('/customers', { params: { limit: 100, status: 'ACTIVE' } }).then(unwrap), enabled: Boolean(dialog?.type === 'quotation') && canManage });
  const plans = useQuery({ queryKey: ['plans', 'quotation-picker'], queryFn: () => api.get('/plans', { params: { limit: 100, status: 'ACTIVE' } }).then(unwrap), enabled: Boolean(dialog) && canManage });
  const templates = useQuery({ queryKey: ['quotation-templates'], queryFn: () => api.get('/quotations/templates', { params: { limit: 100 } }).then(unwrap), enabled: canManage });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['quotations'] });
  const create = useMutation({ mutationFn: (payload) => api.post('/quotations', payload), onSuccess: () => { refresh(); setDialog(null); toast.success('Quotation created.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const createTemplate = useMutation({ mutationFn: (payload) => api.post('/quotations/templates', payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotation-templates'] }); setDialog(null); toast.success('Quotation template created.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const updateTemplate = useMutation({ mutationFn: ({ id, payload }) => api.patch(`/quotations/templates/${id}`, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotation-templates'] }); setDialog(null); toast.success('Quotation template updated.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const updateDraft = useMutation({ mutationFn: ({ id, payload }) => api.patch(`/quotations/${id}`, payload), onSuccess: () => { refresh(); setDialog(null); toast.success('Draft quotation updated.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const removeDraft = useMutation({ mutationFn: (id) => api.delete(`/quotations/${id}`), onSuccess: () => { refresh(); toast.success('Draft quotation deleted.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const action = useMutation({ mutationFn: ({ id, action: next }) => api.post(`/quotations/${id}/${next}`), onSuccess: (_response, { action: next }) => { refresh(); queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); toast.success(({ convert: 'Subscription created from quotation.', publish: 'Quotation published.', accept: 'Quotation accepted.', reject: 'Quotation rejected.' })[next]); }, onError: (error) => toast.error(errorMessage(error)) });
  const email = useMutation({ mutationFn: ({ id }) => api.post(`/quotations/${id}/email`), onSuccess: (_response, { quotationNumber }) => toast.success(`Quotation ${quotationNumber} emailed.`), onError: (error) => toast.error(errorMessage(error)) });

  if (quotations.isLoading) return <section className="page"><div className="skeleton tall" /></section>;
  if (quotations.isError) return <section className="page"><EmptyState icon={FiFileText} title="Quotations could not load" description={errorMessage(quotations.error)} /></section>;

  return (
    <PageTransition>
      <PageHeader eyebrow="SALES" title="Quotations" description="Prepare offers, track customer decisions, and convert accepted offers into subscriptions." actions={canManage && <><Button variant="outline" onClick={() => setDialog({ type: 'template' })}>New template</Button><Button onClick={() => setDialog({ type: 'quotation' })}><FiPlus size={16} />New quotation</Button></>} />
      {canManage && Boolean(templates.data?.templates?.length) && <div className="data-card mb-5"><table><thead><tr><th>Quotation templates</th><th>Plans</th><th>Validity</th><th>Status</th><th /></tr></thead><tbody>{templates.data.templates.map((template) => <tr key={template._id}><td><strong>{template.name}</strong><small>{template.paymentTerms || 'No payment terms'}</small></td><td>{template.lines.map((line) => `${line.quantity} × ${line.plan?.name || line.planName || 'Plan'}`).join(', ')}</td><td>{template.validityDays} days</td><td><Status value={template.status} /></td><td><div className="row-actions"><Button size="sm" variant="outline" onClick={() => setDialog({ type: 'template', template })}><FiEdit size={14} />Edit</Button><Button size="sm" variant="outline" disabled={updateTemplate.isPending} onClick={() => updateTemplate.mutate({ id: template._id, payload: { status: template.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } })}>{template.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</Button></div></td></tr>)}</tbody></table></div>}
      {quotations.data.quotations.length ? <div className="data-card"><table><thead><tr><th>Quotation</th><th>Customer</th><th>Lines and estimate</th><th>Total</th><th>Valid until</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {quotations.data.quotations.map((quote) => <tr key={quote._id}>
          <td><strong>{quote.quotationNumber}</strong><small>Created {date(quote.createdAt)}</small></td>
          <td>{quote.customerSnapshot?.companyName || quote.customerSnapshot?.fullName}<small>{quote.customerSnapshot?.email}</small></td>
          <td>{quote.lines.map((line) => `${line.quantity} × ${line.planName}`).join(', ')}<small>{quote.discountTotal ? `Discount ${money(quote.discountTotal, quote.currency)}` : 'No discount'} · Estimated tax ${money(quote.taxTotal || 0, quote.currency)}</small></td>
          <td>{money(quote.total ?? quote.subtotal, quote.currency)}<small>Subtotal {money(quote.subtotal, quote.currency)}</small></td><td>{date(quote.validUntil)}</td><td><Status value={quote.status} /></td>
          <td><div className="row-actions">
            {canManage && quote.status === 'DRAFT' && <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => action.mutate({ id: quote._id, action: 'publish' })}>Publish</Button>}
            {canManage && quote.status === 'DRAFT' && <Button size="sm" variant="outline" title="Edit draft quotation" onClick={() => setDialog({ type: 'edit', quotation: quote })}><FiEdit size={14} /></Button>}
            {canManage && quote.status === 'DRAFT' && <Button size="sm" variant="destructive" title="Delete draft" disabled={removeDraft.isPending} onClick={() => { if (window.confirm(`Delete draft ${quote.quotationNumber}?`)) removeDraft.mutate(quote._id); }}><FiTrash2 size={14} /></Button>}
            {canManage && quote.status === 'QUOTATION' && <Button size="sm" variant="outline" disabled={email.isPending} onClick={() => email.mutate({ id: quote._id, quotationNumber: quote.quotationNumber })}><FiMail size={14} />Email</Button>}
            {quote.status === 'QUOTATION' && <Button size="sm" disabled={action.isPending} onClick={() => action.mutate({ id: quote._id, action: 'accept' })}>Accept</Button>}
            {quote.status === 'QUOTATION' && <Button size="sm" variant="outline" disabled={action.isPending} onClick={() => { if (window.confirm('Reject this quotation?')) action.mutate({ id: quote._id, action: 'reject' }); }}>Reject</Button>}
            {canManage && quote.status === 'CONFIRMED' && <Button size="sm" disabled={action.isPending} onClick={() => action.mutate({ id: quote._id, action: 'convert' })}>Convert</Button>}
          </div></td>
        </tr>)}
      </tbody></table></div> : <EmptyState icon={FiFileText} title="No quotations yet" description={canManage ? 'Create a quotation from a plan or reusable template.' : 'Your quotations will appear here.'} action={canManage && <Button onClick={() => setDialog({ type: 'quotation' })}><FiPlus size={16} />New quotation</Button>} />}
      {dialog?.type === 'quotation' && <QuotationForm customers={customers.data?.items || []} plans={plans.data?.plans || []} templates={(templates.data?.templates || []).filter((template) => template.status === 'ACTIVE')} busy={create.isPending} close={() => setDialog(null)} submit={create.mutate} />}
      {dialog?.type === 'template' && <TemplateForm template={dialog.template} plans={plans.data?.plans || []} busy={dialog.template ? updateTemplate.isPending : createTemplate.isPending} close={() => setDialog(null)} submit={(payload) => dialog.template ? updateTemplate.mutate({ id: dialog.template._id, payload }) : createTemplate.mutate(payload)} />}
      {dialog?.type === 'edit' && <DraftQuotationForm quotation={dialog.quotation} plans={plans.data?.plans || []} busy={updateDraft.isPending} close={() => setDialog(null)} submit={(payload) => updateDraft.mutate({ id: dialog.quotation._id, payload })} />}
    </PageTransition>
  );
}

function DraftQuotationForm({ quotation, plans, busy, close, submit }) {
  const [form, setForm] = useState(() => ({ validityDays: String(Math.max(1, Math.ceil((new Date(quotation.validUntil).getTime() - Date.now()) / 86_400_000))), paymentTerms: quotation.paymentTerms || '', discountCode: quotation.discountCode || '', lines: quotation.lines.map((line) => ({ plan: line.plan, quantity: String(line.quantity) })) }));
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateLine = (index, key, value) => setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line) }));
  const linesChanged = form.lines.length !== quotation.lines.length || form.lines.some((line, index) => line.plan !== String(quotation.lines[index]?.plan) || Number(line.quantity) !== quotation.lines[index]?.quantity);
  return <Modal title={`Edit draft ${quotation.quotationNumber}`} close={close}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); submit({ validityDays: Number(form.validityDays), paymentTerms: form.paymentTerms, discountCode: form.discountCode.trim() || null, ...(linesChanged ? { lines: form.lines.map((line) => ({ plan: line.plan, quantity: Number(line.quantity) })) } : {}) }); }}>
    <p className="field full text-sm text-app-muted">The customer stays fixed. Plan prices and discounts are revalidated on the server.</p>
    {form.lines.map((line, index) => <div className="field full grid gap-2 sm:grid-cols-[1fr_8rem_auto]" key={index}><label className="field"><span>Plan</span><select value={line.plan} onChange={(event) => updateLine(index, 'plan', event.target.value)} required>{!plans.some((plan) => plan._id === line.plan) && <option value={line.plan}>{quotation.lines[index]?.planName || 'Unavailable plan'} · saved price {money(quotation.lines[index]?.unitPrice, quotation.currency)}</option>}{plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name} · {money(plan.billingPrice, plan.currency)} / {plan.billingFrequency.toLowerCase()}</option>)}</select></label><Input label="Quantity" type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} required /><Button type="button" variant="outline" title="Remove plan" disabled={form.lines.length === 1} onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((_item, lineIndex) => lineIndex !== index) }))}><FiTrash2 size={14} /></Button></div>)}
    <Button type="button" variant="outline" className="full" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, { plan: '', quantity: '1' }] }))}><FiPlus size={14} />Add plan</Button>
    <Input label="Validity from today (days)" name="validityDays" type="number" min="1" max="365" value={form.validityDays} onChange={update} required />
    <Input label="Discount code (optional)" name="discountCode" value={form.discountCode} onChange={update} maxLength={40} />
    <label className="field full"><span>Payment terms</span><textarea name="paymentTerms" value={form.paymentTerms} onChange={update} maxLength={2000} /></label>
    <div className="full flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button></div>
  </form></Modal>;
}

function QuotationForm({ customers, plans, templates, busy, close, submit }) {
  const [form, setForm] = useState({ customer: '', template: '', lines: [{ plan: '', quantity: '1' }], validityDays: '30', paymentTerms: '', discountCode: '' });
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateLine = (index, key, value) => setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line) }));
  const send = (event) => {
    event.preventDefault();
    const payload = { customer: form.customer, validityDays: Number(form.validityDays), paymentTerms: form.paymentTerms };
    if (form.template) payload.template = form.template;
    else payload.lines = form.lines.map((line) => ({ plan: line.plan, quantity: Number(line.quantity) }));
    if (form.discountCode.trim()) payload.discountCode = form.discountCode.trim();
    submit(payload);
  };
  return <Modal title="Create quotation" close={close}><form className="form-grid" onSubmit={send}>
    <label className="field full"><span>Customer</span><select name="customer" value={form.customer} onChange={update} required><option value="">Choose customer</option>{customers.map((customer) => <option key={customer._id} value={customer._id}>{customer.companyName || customer.fullName} · {customer.email}</option>)}</select></label>
    <label className="field full"><span>Quotation template (optional)</span><select name="template" value={form.template} onChange={(event) => { const template = templates.find((item) => item._id === event.target.value); setForm((current) => ({ ...current, template: event.target.value, lines: template?.lines?.map((line) => ({ plan: line.plan?._id || line.plan, quantity: String(line.quantity) })) || [{ plan: '', quantity: '1' }] })); }}><option value="">Choose plans manually</option>{templates.map((template) => <option key={template._id} value={template._id}>{template.name}</option>)}</select></label>
    {!form.template && <>{form.lines.map((line, index) => <div className="field full grid gap-2 sm:grid-cols-[1fr_8rem_auto]" key={index}><label className="field"><span>Plan</span><select value={line.plan} onChange={(event) => updateLine(index, 'plan', event.target.value)} required><option value="">Choose plan</option>{plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name} · {money(plan.billingPrice, plan.currency)} / {plan.billingFrequency.toLowerCase()}</option>)}</select></label><Input label="Quantity" type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} required /><Button type="button" variant="outline" title="Remove plan" disabled={form.lines.length === 1} onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((_item, lineIndex) => lineIndex !== index) }))}><FiTrash2 size={14} /></Button></div>)}<Button type="button" variant="outline" className="full" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, { plan: '', quantity: '1' }], template: '' }))}><FiPlus size={14} />Add plan</Button></>}
    <Input label="Validity (days)" name="validityDays" type="number" min="1" max="365" value={form.validityDays} onChange={update} required />
    <Input label="Discount code (optional)" name="discountCode" value={form.discountCode} onChange={update} maxLength={40} />
    <label className="field full"><span>Payment terms</span><textarea name="paymentTerms" value={form.paymentTerms} onChange={update} maxLength={2000} /></label>
    <button className="primary-button full" disabled={busy || !customers.length || (!form.template && !plans.length)}>{busy ? 'Creating…' : 'Create draft'}</button>
  </form></Modal>;
}

function TemplateForm({ template, plans, busy, close, submit }) {
  const [form, setForm] = useState(() => ({ name: template?.name || '', description: template?.description || '', lines: template?.lines?.map((line) => ({ plan: line.plan?._id || line.plan, quantity: String(line.quantity) })) || [{ plan: '', quantity: '1' }], validityDays: String(template?.validityDays || 30), paymentTerms: template?.paymentTerms || '', status: template?.status || 'ACTIVE' }));
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateLine = (index, key, value) => setForm((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line) }));
  const linesChanged = !template || form.lines.length !== template.lines.length || form.lines.some((line, index) => line.plan !== String(template.lines[index]?.plan?._id || template.lines[index]?.plan) || Number(line.quantity) !== template.lines[index]?.quantity);
  return <Modal title={template ? 'Edit quotation template' : 'Create quotation template'} close={close}><form className="form-grid" onSubmit={(event) => { event.preventDefault(); submit({ name: form.name, description: form.description, validityDays: Number(form.validityDays), paymentTerms: form.paymentTerms, ...(linesChanged ? { lines: form.lines.map((line) => ({ plan: line.plan, quantity: Number(line.quantity) })) } : {}), ...(template ? { status: form.status } : {}) }); }}>
    <Input label="Template name" name="name" value={form.name} onChange={update} required />
    <label className="field full"><span>Description</span><textarea name="description" value={form.description} onChange={update} maxLength={2000} /></label>
    {form.lines.map((line, index) => <div className="field full grid gap-2 sm:grid-cols-[1fr_8rem_auto]" key={index}><label className="field"><span>Plan</span><select value={line.plan} onChange={(event) => updateLine(index, 'plan', event.target.value)} required>{template && !plans.some((plan) => plan._id === line.plan) && <option value={line.plan}>{template.lines[index]?.plan?.name || 'Unavailable plan'}</option>}{plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name}</option>)}</select></label><Input label="Quantity" type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} required /><Button type="button" variant="outline" title="Remove plan" disabled={form.lines.length === 1} onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((_item, lineIndex) => lineIndex !== index) }))}><FiTrash2 size={14} /></Button></div>)}
    <Button type="button" variant="outline" className="full" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, { plan: '', quantity: '1' }] }))}><FiPlus size={14} />Add plan</Button>
    <Input label="Validity (days)" name="validityDays" type="number" min="1" max="365" value={form.validityDays} onChange={update} required />
    <label className="field full"><span>Payment terms</span><textarea name="paymentTerms" value={form.paymentTerms} onChange={update} maxLength={2000} /></label>
    {template && <label className="field"><span>Status</span><select name="status" value={form.status} onChange={update}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>}
    <button className="primary-button full" disabled={busy || !plans.length}>{busy ? 'Saving…' : template ? 'Save template' : 'Create template'}</button>
  </form></Modal>;
}
