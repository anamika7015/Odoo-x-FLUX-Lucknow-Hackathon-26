import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FiEdit,
  FiFileText,
  FiMail,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiX,
  FiArrowRight,
  FiSend,
  FiLayers,
  FiSearch,
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

const quoteStatusBadge = (status) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-app-secondary text-app-text-muted border-app-border';
    case 'QUOTATION':
      return 'bg-brand-teal/15 text-brand-teal border-brand-teal/30';
    case 'CONFIRMED':
      return 'bg-brand-gold/15 text-brand-gold border-brand-gold/30';
    case 'EXPIRED':
    case 'CANCELLED':
      return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
    default:
      return 'bg-app-secondary text-app-text-muted border-app-border';
  }
};

export function QuotationsPage() {
  const [dialog, setDialog] = useState(null);
  const [activeTab, setActiveTab] = useState('quotations'); // 'quotations' | 'templates'
  const [search, setSearch] = useState('');
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();
  const canManage = ['ADMIN', 'STAFF'].includes(user.role);

  const quotations = useQuery({
    queryKey: ['quotations'],
    queryFn: () => api.get('/quotations', { params: { limit: 100 } }).then(unwrap),
  });

  const customers = useQuery({
    queryKey: ['customers', 'quotation-picker'],
    queryFn: () => api.get('/customers', { params: { limit: 100, status: 'ACTIVE' } }).then(unwrap),
    enabled: Boolean(dialog?.type === 'quotation') && canManage,
  });

  const plans = useQuery({
    queryKey: ['plans', 'quotation-picker'],
    queryFn: () => api.get('/plans', { params: { limit: 100, status: 'ACTIVE' } }).then(unwrap),
    enabled: Boolean(dialog) && canManage,
  });

  const templates = useQuery({
    queryKey: ['quotation-templates'],
    queryFn: () => api.get('/quotations/templates', { params: { limit: 100 } }).then(unwrap),
    enabled: canManage,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['quotations'] });

  const create = useMutation({
    mutationFn: (payload) => api.post('/quotations', payload),
    onSuccess: () => {
      refresh();
      setDialog(null);
      toast.success('Quotation draft created.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const createTemplate = useMutation({
    mutationFn: (payload) => api.post('/quotations/templates', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation-templates'] });
      setDialog(null);
      toast.success('Quotation template created.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/quotations/templates/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation-templates'] });
      setDialog(null);
      toast.success('Quotation template updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const updateDraft = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/quotations/${id}`, payload),
    onSuccess: () => {
      refresh();
      setDialog(null);
      toast.success('Draft quotation saved.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const removeDraft = useMutation({
    mutationFn: (id) => api.delete(`/quotations/${id}`),
    onSuccess: () => {
      refresh();
      toast.success('Draft quotation deleted.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const action = useMutation({
    mutationFn: ({ id, action: next }) => api.post(`/quotations/${id}/${next}`),
    onSuccess: (_response, { action: next }) => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success(
        {
          convert: 'Converted into confirmed subscription.',
          publish: 'Quotation published and opened.',
          accept: 'Quotation accepted.',
          reject: 'Quotation rejected.',
        }[next]
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const email = useMutation({
    mutationFn: ({ id }) => api.post(`/quotations/${id}/email`),
    onSuccess: (_response, { quotationNumber }) => toast.success(`Quotation ${quotationNumber} dispatched via email.`),
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (quotations.isLoading) {
    return (
      <PageTransition className="space-y-4">
        <div className="h-24 w-full rounded-2xl bg-app-surface/60 animate-pulse border border-app-border" />
        <div className="h-96 w-full rounded-2xl bg-app-surface/60 animate-pulse border border-app-border" />
      </PageTransition>
    );
  }

  const rawQuotes = quotations.data?.quotations || [];
  const rawTemplates = templates.data?.templates || [];

  const filteredQuotes = rawQuotes.filter((q) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      q.quotationNumber.toLowerCase().includes(term) ||
      q.customerSnapshot?.companyName?.toLowerCase().includes(term) ||
      q.customerSnapshot?.fullName?.toLowerCase().includes(term) ||
      q.lines.some((l) => l.planName?.toLowerCase().includes(term))
    );
  });

  return (
    <PageTransition className="relative">
      <PageHeader
        eyebrow="COMMERCIAL NEGOTIATIONS"
        title="Sales Quotations"
        description="Author subscription proposals, monitor acceptance windows, and convert accepted terms."
        actions={
          canManage && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDialog({ type: 'template' })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs font-semibold text-app-text shadow-sm hover:border-brand-teal hover:text-brand-teal transition-all"
              >
                <FiPlus size={14} /> New Template
              </button>
              <button
                type="button"
                onClick={() => setDialog({ type: 'quotation' })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-teal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-teal-hover transition-colors"
              >
                <FiPlus size={16} /> New Quotation
              </button>
            </div>
          )
        }
      />

      {/* View Switcher Tabs & Search Filter */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('quotations')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'quotations'
                ? 'bg-brand-teal text-white shadow-sm'
                : 'bg-app-secondary/40 text-app-text-muted hover:text-app-text'
            }`}
          >
            All Quotations ({rawQuotes.length})
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'templates'
                  ? 'bg-brand-teal text-white shadow-sm'
                  : 'bg-app-secondary/40 text-app-text-muted hover:text-app-text'
              }`}
            >
              Reusable Templates ({rawTemplates.length})
            </button>
          )}
        </div>

        {activeTab === 'quotations' && (
          <div className="relative min-w-64">
            <FiSearch className="absolute left-3 top-2.5 text-app-text-muted" size={15} />
            <input
              aria-label="Search quotations"
              placeholder="Search by quote #, client, or plan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-app-border bg-app-surface pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-muted/60 transition-colors focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
          </div>
        )}
      </div>

      {/* TAB 1: Quotations List */}
      {activeTab === 'quotations' && (
        <>
          {filteredQuotes.length ? (
            <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-app-border bg-app-secondary/40 text-app-text-muted uppercase font-semibold">
                    <tr>
                      <th className="p-4">Quotation ID</th>
                      <th className="p-4">Customer Account</th>
                      <th className="p-4">Lines & Estimated Taxes</th>
                      <th className="p-4 text-right">Total Value</th>
                      <th className="p-4">Validity</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {filteredQuotes.map((quote) => (
                      <tr key={quote._id} className="hover:bg-app-secondary/20 transition-colors">
                        <td className="p-4">
                          <strong className="text-sm font-bold text-app-text">{quote.quotationNumber}</strong>
                          <p className="mt-0.5 text-[11px] text-app-text-muted">Issued {date(quote.createdAt)}</p>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-app-text">
                            {quote.customerSnapshot?.companyName || quote.customerSnapshot?.fullName}
                          </span>
                          <p className="text-[11px] text-app-text-muted">{quote.customerSnapshot?.email}</p>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-app-text">
                            {quote.lines.map((l) => `${l.quantity} × ${l.planName}`).join(', ')}
                          </div>
                          <p className="mt-0.5 text-[11px] text-app-text-muted">
                            {quote.discountTotal ? `Discount: −${money(quote.discountTotal, quote.currency)} · ` : ''}
                            Estimated Tax: {money(quote.taxTotal || 0, quote.currency)}
                          </p>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-bold text-app-text tabular-nums">
                            {money(quote.total ?? quote.subtotal, quote.currency)}
                          </span>
                          <span className="block text-[10px] text-app-text-muted tabular-nums">
                            Subtotal: {money(quote.subtotal, quote.currency)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-app-text">{date(quote.validUntil)}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${quoteStatusBadge(
                              quote.status
                            )}`}
                          >
                            {quote.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManage && quote.status === 'DRAFT' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => action.mutate({ id: quote._id, action: 'publish' })}
                                  disabled={action.isPending}
                                  className="inline-flex items-center gap-1 rounded-lg bg-brand-teal px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-brand-teal-hover transition-colors"
                                >
                                  <FiSend size={12} /> Publish
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDialog({ type: 'edit', quotation: quote })}
                                  className="rounded-lg p-1 text-app-text-muted hover:bg-app-secondary hover:text-brand-teal transition-colors"
                                  title="Edit draft"
                                >
                                  <FiEdit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Delete draft ${quote.quotationNumber}?`)) {
                                      removeDraft.mutate(quote._id);
                                    }
                                  }}
                                  className="rounded-lg p-1 text-app-text-muted hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                                  title="Delete draft"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </>
                            )}
                            {canManage && quote.status === 'QUOTATION' && (
                              <button
                                type="button"
                                disabled={email.isPending}
                                onClick={() => email.mutate({ id: quote._id, quotationNumber: quote.quotationNumber })}
                                className="inline-flex items-center gap-1 rounded-lg border border-app-border bg-app-surface px-2.5 py-1 text-xs font-medium text-app-text hover:border-brand-teal hover:text-brand-teal transition-colors"
                              >
                                <FiMail size={12} /> Email
                              </button>
                            )}
                            {quote.status === 'QUOTATION' && (
                              <>
                                <button
                                  type="button"
                                  disabled={action.isPending}
                                  onClick={() => action.mutate({ id: quote._id, action: 'accept' })}
                                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  disabled={action.isPending}
                                  onClick={() => {
                                    if (window.confirm('Reject this quotation offer?')) {
                                      action.mutate({ id: quote._id, action: 'reject' });
                                    }
                                  }}
                                  className="rounded-lg border border-app-border bg-transparent px-2.5 py-1 text-xs font-medium text-app-text hover:border-rose-500 hover:text-rose-500 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {canManage && quote.status === 'CONFIRMED' && (
                              <button
                                type="button"
                                disabled={action.isPending}
                                onClick={() => action.mutate({ id: quote._id, action: 'convert' })}
                                className="inline-flex items-center gap-1 rounded-lg bg-brand-gold px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm hover:bg-amber-400 transition-colors"
                              >
                                <FiArrowRight size={13} /> Convert to Subscription
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FiFileText}
              title="No quotations found"
              description={
                search
                  ? 'No quotations match the active search term.'
                  : 'Create commercial proposals from plans or reusable presets.'
              }
            />
          )}
        </>
      )}

      {/* TAB 2: Quotation Templates */}
      {activeTab === 'templates' && canManage && (
        <>
          {rawTemplates.length ? (
            <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-app-border bg-app-secondary/40 text-app-text-muted uppercase font-semibold">
                    <tr>
                      <th className="p-4">Template Name & Terms</th>
                      <th className="p-4">Preconfigured Plans</th>
                      <th className="p-4">Validity</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border">
                    {rawTemplates.map((template) => (
                      <tr key={template._id} className="hover:bg-app-secondary/20 transition-colors">
                        <td className="p-4">
                          <strong className="text-sm font-bold text-app-text">{template.name}</strong>
                          <p className="mt-0.5 text-[11px] text-app-text-muted">
                            {template.paymentTerms || 'Standard Terms'}
                          </p>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-app-text">
                            {template.lines.map((l) => `${l.quantity} × ${l.plan?.name || l.planName || 'Plan'}`).join(', ')}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-app-text">{template.validityDays} days</td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              template.status === 'ACTIVE'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : 'bg-app-secondary text-app-text-muted'
                            }`}
                          >
                            {template.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDialog({ type: 'template', template })}
                              className="rounded-lg p-1.5 text-app-text-muted hover:bg-app-secondary hover:text-brand-teal transition-colors"
                              title="Edit Template"
                            >
                              <FiEdit size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={updateTemplate.isPending}
                              onClick={() =>
                                updateTemplate.mutate({
                                  id: template._id,
                                  payload: { status: template.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
                                })
                              }
                              className="rounded-lg border border-app-border bg-app-surface px-2 py-1 text-[11px] font-semibold text-app-text hover:bg-app-secondary transition-colors"
                            >
                              {template.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FiLayers}
              title="No templates created yet"
              description="Author reusable quote packages with pre-selected plans and standard terms."
            />
          )}
        </>
      )}

      {/* Global Viewport Centered Modals */}
      {dialog?.type === 'quotation' && (
        <QuotationForm
          customers={customers.data?.items || []}
          plans={plans.data?.plans || []}
          templates={(templates.data?.templates || []).filter((t) => t.status === 'ACTIVE')}
          busy={create.isPending}
          close={() => setDialog(null)}
          submit={create.mutate}
        />
      )}

      {dialog?.type === 'template' && (
        <TemplateForm
          template={dialog.template}
          plans={plans.data?.plans || []}
          busy={dialog.template ? updateTemplate.isPending : createTemplate.isPending}
          close={() => setDialog(null)}
          submit={(payload) =>
            dialog.template
              ? updateTemplate.mutate({ id: dialog.template._id, payload })
              : createTemplate.mutate(payload)
          }
        />
      )}

      {dialog?.type === 'edit' && (
        <DraftQuotationForm
          quotation={dialog.quotation}
          plans={plans.data?.plans || []}
          busy={updateDraft.isPending}
          close={() => setDialog(null)}
          submit={(payload) => updateDraft.mutate({ id: dialog.quotation._id, payload })}
        />
      )}
    </PageTransition>
  );
}

function QuotationForm({ customers, plans, templates, busy, close, submit }) {
  const [form, setForm] = useState({
    customer: '',
    template: '',
    lines: [{ plan: '', quantity: '1' }],
    validityDays: '30',
    paymentTerms: '',
    discountCode: '',
  });

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const updateLine = (index, key, value) =>
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [key]: value } : line)),
    }));

  const send = (event) => {
    event.preventDefault();
    const payload = {
      customer: form.customer,
      validityDays: Number(form.validityDays),
      paymentTerms: form.paymentTerms,
    };
    if (form.template) payload.template = form.template;
    else payload.lines = form.lines.map((line) => ({ plan: line.plan, quantity: Number(line.quantity) }));
    if (form.discountCode.trim()) payload.discountCode = form.discountCode.trim();
    submit(payload);
  };

  return (
    <Modal
      title="Create Sales Quotation"
      description="Select the client, choose a template or configure custom plan lines, and set validity."
      badge="NEW"
      size="lg"
      close={close}
    >
      <form onSubmit={send} className="space-y-4">
        <FormField label="Customer Account" required>
          <FormSelect name="customer" value={form.customer} onChange={update} required>
            <option value="">Select a customer account</option>
            {customers.map((customer) => (
              <option key={customer._id} value={customer._id}>
                {customer.companyName || customer.fullName} ({customer.email})
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField label="Quotation Template (Optional)">
          <FormSelect
            name="template"
            value={form.template}
            onChange={(event) => {
              const tmpl = templates.find((item) => item._id === event.target.value);
              setForm((current) => ({
                ...current,
                template: event.target.value,
                lines: tmpl?.lines?.map((line) => ({
                  plan: line.plan?._id || line.plan,
                  quantity: String(line.quantity),
                })) || [{ plan: '', quantity: '1' }],
              }));
            }}
          >
            <option value="">Choose plans manually (No Template)</option>
            {templates.map((template) => (
              <option key={template._id} value={template._id}>
                {template.name} ({template.lines.length} plan lines)
              </option>
            ))}
          </FormSelect>
        </FormField>

        {!form.template && (
          <div className="rounded-xl border border-app-border bg-app-secondary/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-app-text">Plan Line Items</span>
              <button
                type="button"
                onClick={() => setForm((c) => ({ ...c, lines: [...c.lines, { plan: '', quantity: '1' }] }))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal hover:underline"
              >
                <FiPlus size={13} /> Add Line
              </button>
            </div>

            {form.lines.map((line, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[1fr_7rem_auto] items-end">
                <FormField label={index === 0 ? 'Plan' : undefined} required>
                  <FormSelect
                    value={line.plan}
                    onChange={(e) => updateLine(index, 'plan', e.target.value)}
                    required
                  >
                    <option value="">Select plan</option>
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} · {money(p.billingPrice, p.currency)} / {p.billingFrequency.toLowerCase()}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>
                <FormField label={index === 0 ? 'Quantity' : undefined} required>
                  <FormInput
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                    required
                  />
                </FormField>
                <button
                  type="button"
                  disabled={form.lines.length === 1}
                  onClick={() => setForm((c) => ({ ...c, lines: c.lines.filter((_, li) => li !== index) }))}
                  className="h-10 rounded-lg p-2 text-app-text-muted hover:bg-rose-500/10 hover:text-rose-500 transition-colors disabled:opacity-30"
                  title="Remove Line"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Offer Validity (Days from Today)" required>
            <FormInput
              name="validityDays"
              type="number"
              min="1"
              max="365"
              value={form.validityDays}
              onChange={update}
              required
            />
          </FormField>
          <FormField label="Discount Promo Code (Optional)">
            <FormInput
              name="discountCode"
              value={form.discountCode}
              onChange={update}
              placeholder="e.g. WELCOME20"
              maxLength={40}
            />
          </FormField>
        </div>

        <FormField label="Custom Payment Terms & Notes">
          <FormTextarea
            name="paymentTerms"
            value={form.paymentTerms}
            onChange={update}
            rows={2}
            placeholder="e.g. Net 15 days upon acceptance. Subject to Brightloop standard SLA."
          />
        </FormField>

        <ModalFooter
          onCancel={close}
          cancelLabel="Discard"
          submitLabel="Create Draft Quotation"
          busy={busy}
          submitDisabled={!customers.length || (!form.template && !plans.length)}
        />
      </form>
    </Modal>
  );
}

function TemplateForm({ template, plans, busy, close, submit }) {
  const [form, setForm] = useState(() => ({
    name: template?.name || '',
    description: template?.description || '',
    lines: template?.lines?.map((line) => ({
      plan: line.plan?._id || line.plan,
      quantity: String(line.quantity),
    })) || [{ plan: '', quantity: '1' }],
    validityDays: String(template?.validityDays || 30),
    paymentTerms: template?.paymentTerms || '',
    status: template?.status || 'ACTIVE',
  }));

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateLine = (index, key, value) =>
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [key]: value } : line)),
    }));

  const linesChanged =
    !template ||
    form.lines.length !== template.lines.length ||
    form.lines.some(
      (line, index) =>
        line.plan !== String(template.lines[index]?.plan?._id || template.lines[index]?.plan) ||
        Number(line.quantity) !== template.lines[index]?.quantity
    );

  const send = (event) => {
    event.preventDefault();
    submit({
      name: form.name,
      description: form.description,
      validityDays: Number(form.validityDays),
      paymentTerms: form.paymentTerms,
      ...(linesChanged
        ? { lines: form.lines.map((line) => ({ plan: line.plan, quantity: Number(line.quantity) })) }
        : {}),
      ...(template ? { status: form.status } : {}),
    });
  };

  return (
    <Modal
      title={template ? `Edit Template · ${template.name}` : 'Create Quotation Template'}
      description="Define standard product packages and default terms to accelerate proposal generation."
      badge={template ? template.status : 'NEW'}
      size="lg"
      close={close}
    >
      <form onSubmit={send} className="space-y-4">
        <FormField label="Template Title" required>
          <FormInput
            name="name"
            value={form.name}
            onChange={update}
            placeholder="e.g. Standard SaaS Growth Bundle"
            required
          />
        </FormField>

        <FormField label="Scope & Description">
          <FormTextarea
            name="description"
            value={form.description}
            onChange={update}
            rows={2}
            placeholder="Package overview and target customer segment."
          />
        </FormField>

        <div className="rounded-xl border border-app-border bg-app-secondary/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-app-text">Preset Plans</span>
            <button
              type="button"
              onClick={() => setForm((c) => ({ ...c, lines: [...c.lines, { plan: '', quantity: '1' }] }))}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal hover:underline"
            >
              <FiPlus size={13} /> Add Plan
            </button>
          </div>

          {form.lines.map((line, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_7rem_auto] items-end">
              <FormField label={index === 0 ? 'Plan' : undefined} required>
                <FormSelect
                  value={line.plan}
                  onChange={(e) => updateLine(index, 'plan', e.target.value)}
                  required
                >
                  <option value="">Select plan</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField label={index === 0 ? 'Quantity' : undefined} required>
                <FormInput
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                  required
                />
              </FormField>
              <button
                type="button"
                disabled={form.lines.length === 1}
                onClick={() => setForm((c) => ({ ...c, lines: c.lines.filter((_, li) => li !== index) }))}
                className="h-10 rounded-lg p-2 text-app-text-muted hover:bg-rose-500/10 hover:text-rose-500 transition-colors disabled:opacity-30"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Standard Validity (Days)" required>
            <FormInput
              name="validityDays"
              type="number"
              min="1"
              max="365"
              value={form.validityDays}
              onChange={update}
              required
            />
          </FormField>
          {template && (
            <FormField label="Template Status">
              <FormSelect name="status" value={form.status} onChange={update}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </FormSelect>
            </FormField>
          )}
        </div>

        <FormField label="Standard Payment Terms">
          <FormTextarea
            name="paymentTerms"
            value={form.paymentTerms}
            onChange={update}
            rows={2}
            placeholder="Default payment conditions..."
          />
        </FormField>

        <ModalFooter
          onCancel={close}
          cancelLabel="Discard"
          submitLabel={template ? 'Save Changes' : 'Create Template'}
          busy={busy}
          submitDisabled={!plans.length}
        />
      </form>
    </Modal>
  );
}

function DraftQuotationForm({ quotation, plans, busy, close, submit }) {
  const [form, setForm] = useState(() => ({
    validityDays: String(
      Math.max(1, Math.ceil((new Date(quotation.validUntil).getTime() - Date.now()) / 86_400_000))
    ),
    paymentTerms: quotation.paymentTerms || '',
    discountCode: quotation.discountCode || '',
    lines: quotation.lines.map((line) => ({ plan: line.plan, quantity: String(line.quantity) })),
  }));

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const updateLine = (index, key, value) =>
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (lineIndex === index ? { ...line, [key]: value } : line)),
    }));

  const linesChanged =
    form.lines.length !== quotation.lines.length ||
    form.lines.some(
      (line, index) =>
        line.plan !== String(quotation.lines[index]?.plan) ||
        Number(line.quantity) !== quotation.lines[index]?.quantity
    );

  const send = (event) => {
    event.preventDefault();
    submit({
      validityDays: Number(form.validityDays),
      paymentTerms: form.paymentTerms,
      discountCode: form.discountCode.trim() || null,
      ...(linesChanged
        ? { lines: form.lines.map((line) => ({ plan: line.plan, quantity: Number(line.quantity) })) }
        : {}),
    });
  };

  return (
    <Modal
      title={`Edit Draft · ${quotation.quotationNumber}`}
      description="Update pricing, validity, discounts, or line quantities before publication."
      badge="DRAFT"
      size="lg"
      close={close}
    >
      <form onSubmit={send} className="space-y-4">
        <div className="rounded-xl border border-app-border bg-app-secondary/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-app-text">Plan Line Items</span>
            <button
              type="button"
              onClick={() => setForm((c) => ({ ...c, lines: [...c.lines, { plan: '', quantity: '1' }] }))}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal hover:underline"
            >
              <FiPlus size={13} /> Add Line
            </button>
          </div>

          {form.lines.map((line, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_7rem_auto] items-end">
              <FormField label={index === 0 ? 'Plan' : undefined} required>
                <FormSelect
                  value={line.plan}
                  onChange={(e) => updateLine(index, 'plan', e.target.value)}
                  required
                >
                  {!plans.some((p) => p._id === line.plan) && (
                    <option value={line.plan}>
                      {quotation.lines[index]?.planName || 'Current Plan'}
                    </option>
                  )}
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} · {money(p.billingPrice, p.currency)}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField label={index === 0 ? 'Quantity' : undefined} required>
                <FormInput
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                  required
                />
              </FormField>
              <button
                type="button"
                disabled={form.lines.length === 1}
                onClick={() => setForm((c) => ({ ...c, lines: c.lines.filter((_, li) => li !== index) }))}
                className="h-10 rounded-lg p-2 text-app-text-muted hover:bg-rose-500/10 hover:text-rose-500 transition-colors disabled:opacity-30"
              >
                <FiTrash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Validity Extension (Days from Now)" required>
            <FormInput
              name="validityDays"
              type="number"
              min="1"
              max="365"
              value={form.validityDays}
              onChange={update}
              required
            />
          </FormField>
          <FormField label="Discount Code">
            <FormInput
              name="discountCode"
              value={form.discountCode}
              onChange={update}
              placeholder="e.g. VIP20"
              maxLength={40}
            />
          </FormField>
        </div>

        <FormField label="Payment Terms">
          <FormTextarea
            name="paymentTerms"
            value={form.paymentTerms}
            onChange={update}
            rows={2}
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
