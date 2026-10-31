import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit3, Tag, Search, Percent, Calendar, CheckCircle2, XCircle, ShieldCheck, Layers } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Modal, FormField, FormInput, FormSelect, ModalFooter } from '../components/ui/Modal.jsx';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No end date');

export function TaxesPage() {
  const [editor, setEditor] = useState(null);
  const [search, setSearch] = useState('');
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();

  const taxes = useQuery({
    queryKey: ['taxes', search],
    queryFn: () => api.get('/taxes', { params: { limit: 100, ...(search ? { search } : {}) } }).then(unwrap),
  });

  const products = useQuery({
    queryKey: ['products', 'tax-form'],
    queryFn: () => api.get('/products', { params: { limit: 100, status: 'ACTIVE' } }).then(unwrap),
    enabled: Boolean(editor),
  });

  const save = useMutation({
    mutationFn: ({ id, payload }) => (id ? api.patch(`/taxes/${id}`, payload) : api.post('/taxes', payload)),
    onSuccess: (_response, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
      setEditor(null);
      toast.success(id ? 'Tax rule updated.' : 'Tax rule created.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/taxes/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxes'] });
      toast.success('Tax rule status updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const admin = user?.role === 'ADMIN';

  if (taxes.isLoading) {
    return (
      <section className="page p-6 max-w-7xl mx-auto">
        <div className="h-64 rounded-2xl bg-app-card border border-app-border animate-pulse flex items-center justify-center text-app-muted text-sm font-medium">
          Loading tax configurations…
        </div>
      </section>
    );
  }

  if (taxes.isError) {
    return (
      <section className="page p-6 max-w-7xl mx-auto">
        <EmptyState
          icon={Tag}
          title="Tax rules could not load"
          description={errorMessage(taxes.error)}
        />
      </section>
    );
  }

  const rules = taxes.data?.taxes || [];

  return (
    <PageTransition>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          eyebrow="COMPLIANCE & FISCAL"
          title="Tax Configuration"
          description="Configure percentage tax rates, effective periods, and product tax rules across invoices."
          actions={
            admin && (
              <Button
                onClick={() => setEditor({})}
                className="bg-brand-indigo hover:bg-brand-deepIndigo dark:bg-brand-violet text-white shadow-btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Tax Rule</span>
              </Button>
            )
          }
        />

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none" />
            <input
              type="text"
              aria-label="Search tax rules"
              placeholder="Search tax rules by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-app-border bg-app-card text-app-text placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 dark:focus:ring-brand-violet/30 transition-all"
            />
          </div>
          <div className="text-xs text-app-muted font-medium flex items-center gap-1.5 self-center">
            <ShieldCheck className="w-4 h-4 text-brand-indigo dark:text-brand-violet" />
            <span>{rules.length} Tax {rules.length === 1 ? 'Rule' : 'Rules'} Configured</span>
          </div>
        </div>

        {/* Rules Table */}
        {rules.length > 0 ? (
          <div className="data-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-app-border bg-app-secondary/40 text-xs uppercase font-semibold text-app-muted tracking-wider">
                    <th className="py-3.5 px-4">Tax Rule</th>
                    <th className="py-3.5 px-4">Rate</th>
                    <th className="py-3.5 px-4">Scope / Applies To</th>
                    <th className="py-3.5 px-4">Effective Period</th>
                    <th className="py-3.5 px-4">Status</th>
                    {admin && <th className="py-3.5 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {rules.map((tax) => {
                    const isActive = tax.status === 'ACTIVE';
                    return (
                      <tr
                        key={tax._id}
                        className="hover:bg-brand-indigo/5 dark:hover:bg-brand-violet/5 transition-colors group"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-lavender/30 dark:bg-brand-violet/15 flex items-center justify-center text-brand-indigo dark:text-brand-violet">
                              <Percent className="w-4 h-4" />
                            </div>
                            <div>
                              <strong className="block text-app-text font-semibold">{tax.name}</strong>
                              <span className="text-xs text-app-muted font-mono">{tax._id.slice(-6)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono font-medium text-app-text">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-brand-lavender/40 dark:bg-brand-violet/20 text-brand-indigo dark:text-brand-softPurple border border-brand-indigo/20">
                            {(tax.rateBasisPoints / 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-4 px-4 text-app-muted text-xs max-w-xs">
                          {tax.appliesTo?.length ? (
                            <span className="line-clamp-2" title={tax.appliesTo.map((p) => p.name).join(', ')}>
                              {tax.appliesTo.map((p) => p.name).join(', ')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-app-muted font-medium">
                              <Layers className="w-3 h-3 text-app-muted" /> All Products
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs text-app-muted">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-app-muted" />
                            <span>
                              {formatDate(tax.effectiveFrom)} – {formatDate(tax.effectiveUntil)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-zinc-400'}`}
                            />
                            {tax.status}
                          </span>
                        </td>
                        {admin && (
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditor(tax)}
                                className="h-8 text-xs flex items-center gap-1.5 border-app-border hover:border-brand-indigo dark:hover:border-brand-violet"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-app-muted" />
                                <span>Edit</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={changeStatus.isPending}
                                onClick={() =>
                                  changeStatus.mutate({
                                    id: tax._id,
                                    status: isActive ? 'INACTIVE' : 'ACTIVE',
                                  })
                                }
                                className={`h-8 text-xs ${
                                  isActive
                                    ? 'hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30'
                                    : 'hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30'
                                }`}
                              >
                                {isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Tag}
            title="No tax rules found"
            description={
              search ? 'Try clearing or modifying your search query.' : 'Add a tax rule to calculate automatic taxes on invoice generation.'
            }
            action={
              admin && (
                <Button
                  onClick={() => setEditor({})}
                  className="bg-brand-indigo hover:bg-brand-deepIndigo dark:bg-brand-violet text-white shadow-btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Tax Rule</span>
                </Button>
              )
            }
          />
        )}

        {/* Tax Editor Modal */}
        {editor && (
          <TaxForm
            tax={editor._id ? editor : null}
            products={products.data?.products || []}
            busy={save.isPending}
            close={() => setEditor(null)}
            submit={(payload) => save.mutate({ id: editor._id, payload })}
          />
        )}
      </div>
    </PageTransition>
  );
}

function TaxForm({ tax, products, busy, close, submit }) {
  const [form, setForm] = useState(() => ({
    name: tax?.name || '',
    rate: tax ? String(tax.rateBasisPoints / 100) : '',
    effectiveFrom: tax?.effectiveFrom?.slice(0, 10) || '',
    effectiveUntil: tax?.effectiveUntil?.slice(0, 10) || '',
    appliesTo: tax?.appliesTo?.map((product) => product._id || product) || [],
    status: tax?.status || 'ACTIVE',
  }));

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const send = (event) => {
    event.preventDefault();
    submit({
      name: form.name,
      rateBasisPoints: Math.round(Number(form.rate) * 100),
      appliesTo: form.appliesTo,
      status: form.status,
      ...(tax
        ? { effectiveFrom: form.effectiveFrom || null, effectiveUntil: form.effectiveUntil || null }
        : {
            ...(form.effectiveFrom ? { effectiveFrom: form.effectiveFrom } : {}),
            ...(form.effectiveUntil ? { effectiveUntil: form.effectiveUntil } : {}),
          }),
    });
  };

  return (
    <Modal
      title={tax ? 'Edit Tax Rule' : 'Create Tax Rule'}
      subtitle="Define tax percentage and applicability scope"
      close={close}
      maxWidth="max-w-xl"
    >
      <form onSubmit={send} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Rule Name" required>
            <FormInput
              name="name"
              placeholder="e.g. GST Standard, VAT 18%"
              value={form.name}
              onChange={update}
              required
            />
          </FormField>

          <FormField label="Tax Rate (%)" required>
            <FormInput
              name="rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 18.00"
              value={form.rate}
              onChange={update}
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Effective From">
            <FormInput
              name="effectiveFrom"
              type="date"
              value={form.effectiveFrom}
              onChange={update}
            />
          </FormField>

          <FormField label="Effective Until">
            <FormInput
              name="effectiveUntil"
              type="date"
              min={form.effectiveFrom || undefined}
              value={form.effectiveUntil}
              onChange={update}
            />
          </FormField>
        </div>

        {tax && (
          <FormField label="Status">
            <FormSelect name="status" value={form.status} onChange={update}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </FormSelect>
          </FormField>
        )}

        <FormField
          label="Applies to Products"
          hint="Hold Ctrl or Cmd to select multiple products. Leave empty to apply to all products."
        >
          <select
            multiple
            value={form.appliesTo}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                appliesTo: [...event.target.selectedOptions].map((option) => option.value),
              }))
            }
            className="w-full h-32 rounded-xl border border-app-border bg-app-card px-3 py-2 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 dark:focus:ring-brand-violet/30 transition-all"
          >
            {products.map((product) => (
              <option key={product._id} value={product._id} className="py-1 px-2 rounded hover:bg-brand-indigo/10">
                {product.name}
              </option>
            ))}
          </select>
        </FormField>

        <ModalFooter
          busy={busy}
          close={close}
          submitText={tax ? 'Save Tax Rule' : 'Create Tax Rule'}
        />
      </form>
    </Modal>
  );
}
