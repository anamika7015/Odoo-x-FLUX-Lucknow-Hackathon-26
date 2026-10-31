import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit,
  FileText,
  Mail,
  Plus,
  Trash2,
  Check,
  X,
  ArrowRight,
  Send,
  Layers,
  Search,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal, FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '../components/ui/Modal.jsx';

const money = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((amount || 0) / 100);

const date = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '—');

const quoteStatusBadge = (status) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-app-secondary text-app-text-muted border-app-border';
    case 'QUOTATION':
      return 'bg-brand-violet/15 text-brand-indigo dark:text-brand-violet-light border-brand-violet/30';
    case 'CONFIRMED':
      return 'bg-brand-indigo/15 text-brand-indigo dark:text-brand-violet-light border-brand-indigo/30';
    case 'CONVERTED':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25';
    case 'EXPIRED':
    case 'REJECTED':
    case 'CANCELLED':
      return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
    default:
      return 'bg-app-secondary text-app-text-muted border-app-border';
  }
};

export function QuotationsPage() {
  const [dialog, setDialog] = useState(null);
  const [activeTab, setActiveTab] = useState('quotations');
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
      <PageTransition className="page-wrap space-y-4">
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
    <PageTransition className="page-wrap">
      <PageHeader
        eyebrow="COMMERCIAL NEGOTIATIONS"
        title="Sales Quotations"
        description="Author subscription proposals, monitor acceptance windows, and convert accepted terms into active contracts."
        actions={
          canManage && (
            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                onClick={() => setDialog({ type: 'template' })}
              >
                <Plus size={15} />
                <span>New Template</span>
              </Button>
              <Button
                onClick={() => setDialog({ type: 'quotation' })}
              >
                <Plus size={16} />
                <span>New Quotation</span>
              </Button>
            </div>
          )
        }
      />

      {/* View Switcher Tabs & Search Filter */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-subtle">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('quotations')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all shadow-subtle ${
              activeTab === 'quotations'
                ? 'bg-brand-indigo dark:bg-brand-indigo-bright text-white shadow-btn-primary dark:shadow-btn-primary-dark'
                : 'bg-app-surface text-app-text-muted hover:bg-app-secondary hover:text-app-text border border-app-border'
            }`}
          >
            All Quotations ({rawQuotes.length})
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all shadow-subtle ${
                activeTab === 'templates'
                  ? 'bg-brand-indigo dark:bg-brand-indigo-bright text-white shadow-btn-primary dark:shadow-btn-primary-dark'
                  : 'bg-app-surface text-app-text-muted hover:bg-app-secondary hover:text-app-text border border-app-border'
              }`}
            >
              Reusable Templates ({rawTemplates.length})
            </button>
          )}
        </div>

        {activeTab === 'quotations' && (
          <div className="relative min-w-72">
            <Search className="absolute left-3 top-2.5 text-app-text-muted" size={15} />
            <input
              aria-label="Search quotations"
              placeholder="Search by quote #, client, or plan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-app-border bg-app-surface pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-muted/60 transition-colors focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
            />
          </div>
        )}
      </div>

      {/* TAB 1: Quotations List */}
      {activeTab === 'quotations' && (
        <>
          {filteredQuotes.length ? (
            <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-subtle">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-app-border bg-app-secondary/50 text-app-text-muted uppercase font-bold tracking-wider">
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
                      <tr key={quote._id} className="hover:bg-app-secondary/30 transition-colors">
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
                          <div className="font-semibold text-app-text">
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
                          <span className="font-semibold text-app-text">{date(quote.validUntil)}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${quoteStatusBadge(
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
                                <Button
                                  size="sm"
                                  onClick={() => action.mutate({ id: quote._id, action: 'publish' })}
                                  disabled={action.isPending}
                                >
                                  <Send size={12} />
                                  <span>Publish</span>
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => setDialog({ type: 'edit', quotation: quote })}
                                  className="rounded-xl p-1.5 text-app-text-muted hover:bg-app-secondary hover:text-brand-indigo dark:hover:text-brand-violet-light transition-colors"
                                  title="Edit draft"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Delete draft ${quote.quotationNumber}?`)) {
                                      removeDraft.mutate(quote._id);
                                    }
                                  }}
                                  className="rounded-xl p-1.5 text-app-text-muted hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                                  title="Delete draft"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                            {canManage && quote.status === 'QUOTATION' && (
                              <button
                                type="button"
                                disabled={email.isPending}
                                onClick={() => email.mutate({ id: quote._id, quotationNumber: quote.quotationNumber })}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-app-border bg-app-surface px-2.5 py-1 text-xs font-semibold text-app-text shadow-subtle hover:border-brand-indigo dark:hover:border-brand-violet hover:text-brand-indigo dark:hover:text-brand-violet-light transition-colors"
                              >
                                <Mail size={13} /> Email
                              </button>
                            )}
                            {quote.status === 'QUOTATION' && (
                              <>
                                <button
                                  type="button"
                                  disabled={action.isPending}
                                  onClick={() => action.mutate({ id: quote._id, action: 'accept' })}
                                  className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
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
                                  className="rounded-xl border border-app-border bg-app-surface px-2.5 py-1 text-xs font-semibold text-app-text hover:border-rose-500 hover:text-rose-500 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {canManage && quote.status === 'CONFIRMED' && (
                              <Button
                                size="sm"
                                disabled={action.isPending}
                                onClick={() => action.mutate({ id: quote._id, action: 'convert' })}
                              >
                                <span>Convert to Subscription</span>
                                <ArrowRight size={13} />
                              </Button>
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
              icon={FileText}
              title="No quotations found"
              description={
                search
                  ? 'No quotations match the active search query.'
                  : 'Create commercial proposals from plans or reusable template bundles.'
              }
            />
          )}
        </>
      )}

      {/* TAB 2: Quotation Templates */}
      {activeTab === 'templates' && canManage && (
        <>
          {rawTemplates.length ? (
            <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-subtle">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-app-border bg-app-secondary/50 text-app-text-muted uppercase font-bold tracking-wider">
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
                      <tr key={template._id} className="hover:bg-app-secondary/30 transition-colors">
                        <td className="p-4">
                          <strong className="text-sm font-bold text-app-text">{template.name}</strong>
                          <p className="mt-0.5 text-[11px] text-app-text-muted">
                            {template.paymentTerms || 'Standard Terms'}
                          </p>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-app-text">
                            {template.lines.map((l) => `${l.quantity} × ${l.plan?.name || l.planName || 'Plan'}`).join(', ')}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-app-text tabular-nums">{template.validityDays} days</td>
                        <td className="p-4 text-center">
                          <span
                            className={`status ${
                              template.status === 'ACTIVE' ? 'active' : 'inactive'
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
                              className="rounded-xl p-1.5 text-app-text-muted hover:bg-app-secondary hover:text-brand-indigo dark:hover:text-brand-violet-light transition-colors"
                              title="Edit Template"
                            >
                              <Edit size={14} />
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
                              className="rounded-xl border border-app-border bg-app-surface px-2.5 py-1 text-[11px] font-semibold text-app-text hover:bg-app-secondary transition-colors"
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
              icon={Layers}
              title="No templates created yet"
              description="Author reusable quote packages with pre-selected plans and standard conditions."
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
          <div className="rounded-xl border border-app-border bg-app-secondary/25 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-app-text">Plan Line Items</span>
              <button
                type="button"
                onClick={() => setForm((c) => ({ ...c, lines: [...c.lines, { plan: '', quantity: '1' }] }))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-indigo dark:text-brand-violet-light hover:underline"
              >
                <Plus size={13} /> Add Line
              </button>
            </div>

            {form.lines.map((line, index) => (
              <div key={index} className="grid gap-2.5 sm:grid-cols-[1fr_7rem_auto] items-end">
                <FormField label={index === 0 ? 'Plan' : undefined} required>
                  <FormSelect
                    value={line.plan}
                    onChange={(e) => updateLine(index, 'plan', e.target.value)}
                    required
                  >
                    <option value="">Select plan</option>
                    {plans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} · {money(p.billingPrice, p.currency)} / {p.billingFrequency?.toLowerCase()}
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
                  className="h-10 rounded-xl p-2 text-app-text-muted hover:bg-rose-500/10 hover:text-rose-500 transition-colors disabled:opacity-30 border border-app-border"
                  title="Remove Line"
                >
                  <Trash2 size={16} />
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

        <FormField label="Custom Payment Terms & Conditions">
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

        <div className="rounded-xl border border-app-border bg-app-secondary/25 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-app-text">Preset Plans</span>
            <button
              type="button"
              onClick={() => setForm((c) => ({ ...c, lines: [...c.lines, { plan: '', quantity: '1' }] }))}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-indigo dark:text-brand-violet-light hover:underline"
            >
              <Plus size={13} /> Add Plan
            </button>
          </div>

          {form.lines.map((line, index) => (
            <div key={index} className="grid gap-2.5 sm:grid-cols-[1fr_7rem_auto] items-end">
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
                className="h-10 rounded-xl p-2 text-app-text-muted hover:bg-rose-500/10 hover:text-rose-500 transition-colors disabled:opacity-30 border border-app-border"
              >
                <Trash2 size={16} />
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
        <div className="rounded-xl border border-app-border bg-app-secondary/25 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-app-text">Plan Line Items</span>
            <button
              type="button"
              onClick={() => setForm((c) => ({ ...c, lines: [...c.lines, { plan: '', quantity: '1' }] }))}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-indigo dark:text-brand-violet-light hover:underline"
            >
              <Plus size={13} /> Add Line
            </button>
          </div>

          {form.lines.map((line, index) => (
            <div key={index} className="grid gap-2.5 sm:grid-cols-[1fr_7rem_auto] items-end">
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
                className="h-10 rounded-xl p-2 text-app-text-muted hover:bg-rose-500/10 hover:text-rose-500 transition-colors disabled:opacity-30 border border-app-border"
              >
                <Trash2 size={16} />
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
