import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Search,
  Edit,
  Calendar,
  Check,
  X,
  Package,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Modal, FormField, FormInput, FormSelect, FormTextarea, ModalFooter } from '../components/ui/Modal.jsx';

const rupees = (value, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((value || 0) / 100);

const dateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const freqColorMap = {
  DAILY: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  WEEKLY: 'bg-brand-violet/15 text-brand-violet dark:text-brand-violet-light border-brand-violet/25',
  MONTHLY: 'bg-brand-indigo/10 text-brand-indigo dark:text-brand-violet-light border-brand-indigo/25',
  YEARLY: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
};

export function PlansPage() {
  const [editor, setEditor] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();

  const plans = useQuery({
    queryKey: ['plans', search, status],
    queryFn: () =>
      api
        .get('/plans', {
          params: { limit: 100, search: search || undefined, status: status || undefined },
        })
        .then(unwrap),
  });

  const products = useQuery({
    queryKey: ['products', 'plan-form'],
    queryFn: () => api.get('/products', { params: { status: 'ACTIVE', limit: 100 } }).then(unwrap),
    enabled: Boolean(editor),
  });

  const savePlan = useMutation({
    mutationFn: ({ id, payload }) => (id ? api.patch(`/plans/${id}`, payload) : api.post('/plans', payload)),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setEditor(null);
      toast.success(id ? 'Plan updated successfully.' : 'Plan created successfully.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (plans.isLoading) {
    return (
      <PageTransition className="page-wrap space-y-4">
        <div className="h-24 w-full rounded-2xl bg-app-surface/60 animate-pulse border border-app-border" />
        <div className="h-96 w-full rounded-2xl bg-app-surface/60 animate-pulse border border-app-border" />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="page-wrap">
      <PageHeader
        eyebrow="COMMERCIAL CONFIGURATION"
        title="Subscription Plans"
        description="Establish recurring billing intervals, price schedules, and subscriber lifecycle policies."
        actions={
          user.role === 'ADMIN' && (
            <Button onClick={() => setEditor({})}>
              <Plus size={16} />
              <span>Create Plan</span>
            </Button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-subtle">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-72">
            <Search className="absolute left-3 top-2.5 text-app-text-muted" size={15} />
            <input
              aria-label="Search plans"
              placeholder="Search by plan name or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-app-border bg-app-surface pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-muted/60 transition-colors focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
            />
          </div>
          <select
            aria-label="Filter plans by status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-xl border border-app-border bg-app-surface px-3 text-xs font-semibold text-app-text cursor-pointer transition-colors focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="text-xs text-app-text-muted font-semibold">
          Total: <span className="font-bold text-app-text tabular-nums">{plans.data?.plans?.length ?? 0}</span> plans
        </div>
      </div>

      {/* Plans Table / Directory */}
      {plans.data?.plans?.length ? (
        <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-app-border bg-app-secondary/50 text-app-text-muted uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4">Plan Name & Details</th>
                  <th className="p-4">Product Association</th>
                  <th className="p-4 text-center">Frequency</th>
                  <th className="p-4 text-right">Billing Price</th>
                  <th className="p-4">Policies</th>
                  <th className="p-4 text-center">Status</th>
                  {user.role === 'ADMIN' && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {plans.data.plans.map((plan) => (
                  <tr key={plan._id} className="hover:bg-app-secondary/30 transition-colors">
                    <td className="p-4">
                      <strong className="text-sm font-bold text-app-text">{plan.name}</strong>
                      <p className="mt-0.5 text-app-text-muted text-[11px] line-clamp-1">
                        Min Quantity: {plan.minimumQuantity} {plan.description ? `· ${plan.description}` : ''}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-app-text">{plan.product?.name || '—'}</span>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          freqColorMap[plan.billingFrequency] || 'bg-app-secondary text-app-text'
                        }`}
                      >
                        {plan.billingFrequency}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-sm font-bold text-app-text tabular-nums">
                        {rupees(plan.billingPrice, plan.currency)}
                      </span>
                      <span className="block text-[10px] text-app-text-muted uppercase font-medium">
                        per {plan.billingFrequency.toLowerCase().replace('ly', '')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {plan.allowPause && (
                          <span className="rounded-md bg-app-secondary px-2 py-0.5 text-app-text-muted border border-app-border font-medium">Pause</span>
                        )}
                        {plan.allowRenewal && (
                          <span className="rounded-md bg-app-secondary px-2 py-0.5 text-app-text-muted border border-app-border font-medium">Renew</span>
                        )}
                        {plan.allowEarlyClosure && (
                          <span className="rounded-md bg-app-secondary px-2 py-0.5 text-app-text-muted border border-app-border font-medium">Early Close</span>
                        )}
                        {plan.autoClose && (
                          <span className="rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 font-bold border border-amber-500/20">Auto-Close</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`status ${
                          plan.status === 'ACTIVE' ? 'active' : 'inactive'
                        }`}
                      >
                        {plan.status}
                      </span>
                    </td>
                    {user.role === 'ADMIN' && (
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setEditor(plan)}
                          aria-label={`Edit ${plan.name}`}
                          className="rounded-xl p-1.5 text-app-text-muted hover:bg-app-secondary hover:text-brand-indigo dark:hover:text-brand-violet-light transition-colors"
                        >
                          <Edit size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Layers}
          title="No subscription plans found"
          description={
            search || status
              ? 'No plans match the selected search query or status filter.'
              : 'Create recurring billing plans to start selling subscriptions.'
          }
          action={
            user.role === 'ADMIN' && (
              <Button onClick={() => setEditor({})}>
                <Plus size={16} />
                <span>Create Plan</span>
              </Button>
            )
          }
        />
      )}

      {/* Global Viewport Centered Plan Form Modal */}
      {editor && (
        <PlanForm
          plan={editor._id ? editor : null}
          products={products.data?.products || []}
          busy={savePlan.isPending}
          close={() => setEditor(null)}
          submit={(payload) => savePlan.mutate({ id: editor._id, payload })}
        />
      )}
    </PageTransition>
  );
}

function PlanForm({ plan, products, close, submit, busy }) {
  const [form, setForm] = useState(() => ({
    name: plan?.name || '',
    product: plan?.product?._id || plan?.product || '',
    billingPrice: plan ? String(plan.billingPrice / 100) : '',
    currency: plan?.currency || 'INR',
    billingFrequency: plan?.billingFrequency || 'MONTHLY',
    minimumQuantity: String(plan?.minimumQuantity || 1),
    description: plan?.description || '',
    availabilityStartDate: dateInput(plan?.availabilityStartDate),
    availabilityEndDate: dateInput(plan?.availabilityEndDate),
    status: plan?.status || 'ACTIVE',
    allowPause: Boolean(plan?.allowPause),
    allowRenewal: plan?.allowRenewal ?? true,
    allowEarlyClosure: Boolean(plan?.allowEarlyClosure),
    autoClose: Boolean(plan?.autoClose),
  }));

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const send = (event) => {
    event.preventDefault();
    submit({
      ...form,
      billingPrice: Math.round(Number(form.billingPrice) * 100),
      minimumQuantity: Number(form.minimumQuantity),
      availabilityStartDate: form.availabilityStartDate || null,
      availabilityEndDate: form.availabilityEndDate || null,
    });
  };

  return (
    <Modal
      title={plan ? `Edit Plan · ${plan.name}` : 'Create Subscription Plan'}
      description="Configure billing cadence, pricing schedule, and subscriber lifecycle policies."
      badge={plan ? plan.status : 'NEW'}
      size="lg"
      close={close}
    >
      <form onSubmit={send} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Plan Name" required>
            <FormInput
              name="name"
              value={form.name}
              onChange={update}
              placeholder="e.g. Enterprise Monthly"
              required
            />
          </FormField>
          <FormField label="Associated Product" required>
            <FormSelect name="product" value={form.product} onChange={update} required>
              <option value="">Choose a product</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name} ({product.type || product.productType})
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Billing Price (Subunits)" required>
            <FormInput
              name="billingPrice"
              type="number"
              min="0"
              step="0.01"
              value={form.billingPrice}
              onChange={update}
              placeholder="e.g. 4999.00"
              required
            />
          </FormField>
          <FormField label="Currency" required>
            <FormInput
              name="currency"
              maxLength="3"
              value={form.currency}
              onChange={update}
              placeholder="INR"
              required
            />
          </FormField>
          <FormField label="Billing Frequency" required>
            <FormSelect name="billingFrequency" value={form.billingFrequency} onChange={update}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </FormSelect>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Minimum Quantity" required>
            <FormInput
              name="minimumQuantity"
              type="number"
              min="1"
              value={form.minimumQuantity}
              onChange={update}
              required
            />
          </FormField>
          <FormField label="Available From">
            <FormInput
              name="availabilityStartDate"
              type="date"
              value={form.availabilityStartDate}
              onChange={update}
            />
          </FormField>
          <FormField label="Available Until">
            <FormInput
              name="availabilityEndDate"
              type="date"
              value={form.availabilityEndDate}
              onChange={update}
            />
          </FormField>
        </div>

        {plan && (
          <FormField label="Plan Status">
            <FormSelect name="status" value={form.status} onChange={update}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </FormSelect>
          </FormField>
        )}

        <FormField label="Internal Description">
          <FormTextarea
            name="description"
            value={form.description}
            onChange={update}
            rows={2}
            placeholder="Commercial terms, SLA tier, or target customer profile."
          />
        </FormField>

        {/* Lifecycle Permissions */}
        <div className="rounded-xl border border-app-border bg-app-secondary/25 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-3">
            Lifecycle & Self-Service Policies
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['allowPause', 'Allow customer to pause subscription'],
              ['allowRenewal', 'Allow automatic and manual renewals'],
              ['allowEarlyClosure', 'Allow early cancellation by customer'],
              ['autoClose', 'Auto-close upon expiry (non-renewing)'],
            ].map(([name, label]) => (
              <label key={name} className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-app-text">
                <input
                  type="checkbox"
                  name={name}
                  checked={form[name]}
                  onChange={update}
                  className="h-4 w-4 rounded border-app-border text-brand-indigo focus:ring-brand-indigo"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        <ModalFooter
          onCancel={close}
          cancelLabel="Discard"
          submitLabel={plan ? 'Save Changes' : 'Create Plan'}
          busy={busy}
          submitDisabled={!products.length}
        />
      </form>
    </Modal>
  );
}
