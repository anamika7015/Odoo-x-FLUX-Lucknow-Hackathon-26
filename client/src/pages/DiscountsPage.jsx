import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Percent,
  Plus,
  Search,
  Edit,
  Tag,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Modal, FormField, FormInput, FormSelect, ModalFooter } from '../components/ui/Modal.jsx';

const money = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format((value || 0) / 100);
const date = (value) => (value ? new Date(value).toLocaleDateString('en-IN') : '—');

export function DiscountsPage() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user } = useSelector((state) => state.auth);
  const queryClient = useQueryClient();

  const discounts = useQuery({
    queryKey: ['discounts', search],
    queryFn: () =>
      api
        .get('/discounts', { params: { limit: 100, ...(search ? { search } : {}) } })
        .then(unwrap),
  });

  const products = useQuery({
    queryKey: ['products', 'discount-form'],
    queryFn: () => api.get('/products', { params: { limit: 100, status: 'ACTIVE' } }).then(unwrap),
    enabled: Boolean(open),
  });

  const create = useMutation({
    mutationFn: (payload) => api.post('/discounts', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      setOpen(false);
      toast.success('Discount rule created.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/discounts/${id}`, payload),
    onSuccess: (_response, { closeEditor }) => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      if (closeEditor) setOpen(false);
      toast.success('Discount rule updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const admin = user.role === 'ADMIN';

  if (discounts.isLoading) {
    return (
      <section className="page-wrap space-y-4">
        <div className="skeleton tall" />
      </section>
    );
  }

  if (discounts.isError) {
    return (
      <section className="page-wrap">
        <EmptyState icon={Percent} title="Discounts could not load" description={errorMessage(discounts.error)} />
      </section>
    );
  }

  const rows = discounts.data?.discounts || [];

  return (
    <PageTransition className="page-wrap">
      <PageHeader
        eyebrow="COMMERCIAL INCENTIVES"
        title="Discount Rules"
        description="Configure percentage or flat price concessions, promotional coupon codes, and subscriber eligibility thresholds."
        actions={
          admin && (
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} />
              <span>New Discount Rule</span>
            </Button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-subtle">
        <div className="relative min-w-72">
          <Search className="absolute left-3 top-2.5 text-app-text-muted" size={15} />
          <input
            aria-label="Search discounts"
            placeholder="Search by rule title or coupon code…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full rounded-xl border border-app-border bg-app-surface pl-9 pr-3 text-xs text-app-text placeholder:text-app-text-muted/60 transition-colors focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
          />
        </div>

        <div className="text-xs text-app-text-muted font-semibold">
          Total: <span className="font-bold text-app-text tabular-nums">{rows.length}</span> active rules
        </div>
      </div>

      {rows.length ? (
        <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-app-border bg-app-secondary/50 text-app-text-muted uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Value</th>
                  <th className="p-4">Applies To</th>
                  <th className="p-4">Eligibility</th>
                  <th className="p-4">Usage</th>
                  <th className="p-4">Active Dates</th>
                  <th className="p-4 text-center">Status</th>
                  {admin && <th className="p-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {rows.map((item) => (
                  <tr key={item._id} className="hover:bg-app-secondary/30 transition-colors">
                    <td className="p-4">
                      <strong className="text-sm font-bold text-app-text">{item.name}</strong>
                      <small className="text-app-text-muted">
                        Code: <span className="font-mono text-brand-indigo dark:text-brand-violet-light font-bold">{item.code}</span> · Priority {item.priority}
                      </small>
                    </td>
                    <td className="p-4 tabular-nums font-bold text-brand-indigo dark:text-brand-violet-light text-sm">
                      {item.type === 'FIXED' ? money(item.value) : `${(item.value / 100).toFixed(2)}%`}
                    </td>
                    <td className="p-4 font-semibold text-app-text">
                      {item.targetType === 'SUBSCRIPTION'
                        ? 'Whole subscription'
                        : item.appliesTo?.map((product) => product.name).join(', ') || 'Selected items'}
                    </td>
                    <td className="p-4">
                      <span>Min {money(item.minimumPurchase)} · {item.minimumQuantity} unit(s)</span>
                      <small className="text-app-text-muted">
                        {item.autoApply ? 'Auto-applied when eligible' : 'Requires promo code'}
                      </small>
                    </td>
                    <td className="p-4 tabular-nums font-medium">
                      {item.usageCount}
                      {item.maxUses ? ` / ${item.maxUses}` : ' / unlimited'}
                    </td>
                    <td className="p-4 text-app-text-muted font-medium">
                      {date(item.startsAt)} – {date(item.endsAt)}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`status ${item.status === 'ACTIVE' ? 'active' : 'inactive'}`}>
                        {item.status}
                      </span>
                    </td>
                    {admin && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            title="Edit rule"
                            onClick={() => setOpen(item)}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={update.isPending}
                            onClick={() =>
                              update.mutate({
                                id: item._id,
                                payload: { status: item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
                              })
                            }
                          >
                            {item.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
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
          icon={Percent}
          title="No discounts found"
          description={
            search ? 'Try another search query.' : 'Create a discount rule for eligible future invoices.'
          }
          action={
            admin && (
              <Button onClick={() => setOpen(true)}>
                <Plus size={16} />
                <span>New Discount Rule</span>
              </Button>
            )
          }
        />
      )}

      {open && (
        <DiscountForm
          discount={open?._id ? open : null}
          products={products.data?.products || []}
          busy={open?._id ? update.isPending : create.isPending}
          close={() => setOpen(false)}
          submit={(payload) =>
            open?._id
              ? update.mutate({ id: open._id, payload, closeEditor: true })
              : create.mutate(payload)
          }
        />
      )}
    </PageTransition>
  );
}

function DiscountForm({ discount, products, busy, close, submit }) {
  const [form, setForm] = useState(() =>
    discount
      ? {
          name: discount.name,
          code: discount.code,
          type: discount.type,
          value: String(discount.value / 100),
          targetType: discount.targetType,
          appliesTo: (discount.appliesTo || []).map((product) => product._id || product),
          minimumPurchase: String(discount.minimumPurchase / 100),
          minimumQuantity: String(discount.minimumQuantity),
          startsAt: discount.startsAt ? new Date(discount.startsAt).toISOString().slice(0, 10) : '',
          endsAt: discount.endsAt ? new Date(discount.endsAt).toISOString().slice(0, 10) : '',
          maxUses: discount.maxUses ? String(discount.maxUses) : '',
          priority: String(discount.priority),
          autoApply: discount.autoApply,
        }
      : {
          name: '',
          code: '',
          type: 'PERCENTAGE',
          value: '',
          targetType: 'SUBSCRIPTION',
          appliesTo: [],
          minimumPurchase: '0',
          minimumQuantity: '1',
          startsAt: '',
          endsAt: '',
          maxUses: '',
          priority: '100',
          autoApply: true,
        }
  );

  const update = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const send = (event) => {
    event.preventDefault();
    const value = Math.round(Number(form.value) * 100);
    submit({
      name: form.name,
      code: form.code.toUpperCase(),
      type: form.type,
      value,
      targetType: form.targetType,
      appliesTo: form.targetType === 'PRODUCT' ? form.appliesTo : [],
      minimumPurchase: Math.round(Number(form.minimumPurchase) * 100),
      minimumQuantity: Number(form.minimumQuantity),
      priority: Number(form.priority),
      autoApply: form.autoApply,
      ...(discount
        ? {
            startsAt: form.startsAt || null,
            endsAt: form.endsAt || null,
            maxUses: form.maxUses ? Number(form.maxUses) : null,
          }
        : {
            ...(form.startsAt ? { startsAt: form.startsAt } : {}),
            ...(form.endsAt ? { endsAt: form.endsAt } : {}),
            ...(form.maxUses ? { maxUses: Number(form.maxUses) } : {}),
          }),
    });
  };

  return (
    <Modal
      title={discount ? `Edit Discount · ${discount.name}` : 'Create Discount Concession Rule'}
      description="Define promotional percentage or fixed amount discounts with eligibility criteria."
      badge="PRICING"
      size="md"
      close={close}
    >
      <form className="space-y-4" onSubmit={send}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Rule Title" required>
            <FormInput name="name" value={form.name} onChange={update} placeholder="e.g. Summer Promo 20%" required />
          </FormField>
          <FormField label="Discount Code" required>
            <FormInput
              name="code"
              value={form.code}
              onChange={update}
              pattern="[A-Za-z0-9_-]+"
              placeholder="e.g. SUMMER20"
              required
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Discount Type" required>
            <FormSelect name="type" value={form.type} onChange={update}>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (₹)</option>
            </FormSelect>
          </FormField>
          <FormField label={form.type === 'FIXED' ? 'Concession Value (₹)' : 'Percentage (%)'} required>
            <FormInput
              name="value"
              type="number"
              min="0.01"
              max={form.type === 'PERCENTAGE' ? '100' : undefined}
              step="0.01"
              value={form.value}
              onChange={update}
              placeholder="e.g. 15.00"
              required
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Target Scope" required>
            <FormSelect name="targetType" value={form.targetType} onChange={update}>
              <option value="SUBSCRIPTION">Whole Subscription</option>
              <option value="PRODUCT">Selected Products</option>
            </FormSelect>
          </FormField>
          <FormField label="Minimum Purchase (₹)" required>
            <FormInput
              name="minimumPurchase"
              type="number"
              min="0"
              step="0.01"
              value={form.minimumPurchase}
              onChange={update}
              required
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
          <FormField label="Execution Priority (Lower = First)" required>
            <FormInput
              name="priority"
              type="number"
              min="0"
              value={form.priority}
              onChange={update}
              required
            />
          </FormField>
        </div>

        {form.targetType === 'PRODUCT' && (
          <FormField label="Eligible Products" required>
            <select
              multiple
              required
              className="h-28 w-full rounded-xl border border-app-border bg-app-surface p-2.5 text-xs text-app-text focus:border-brand-indigo dark:focus:border-brand-violet-light focus:outline-none focus:ring-2 focus:ring-app-ring"
              value={form.appliesTo}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  appliesTo: [...event.target.selectedOptions].map((option) => option.value),
                }))
              }
            >
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Valid From">
            <FormInput name="startsAt" type="date" value={form.startsAt} onChange={update} />
          </FormField>
          <FormField label="Valid Until">
            <FormInput name="endsAt" type="date" min={form.startsAt || undefined} value={form.endsAt} onChange={update} />
          </FormField>
          <FormField label="Max Uses (Blank = Unlimited)">
            <FormInput name="maxUses" type="number" min="1" value={form.maxUses} onChange={update} placeholder="∞" />
          </FormField>
        </div>

        <div className="rounded-xl border border-app-border bg-app-secondary/25 p-3">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-app-text">
            <input
              type="checkbox"
              name="autoApply"
              checked={form.autoApply}
              onChange={update}
              className="h-4 w-4 rounded border-app-border text-brand-indigo focus:ring-brand-indigo"
            />
            <span>Automatically apply concession when threshold is met</span>
          </label>
        </div>

        <ModalFooter
          onCancel={close}
          cancelLabel="Discard"
          submitLabel={discount ? 'Save Discount' : 'Create Discount'}
          busy={busy}
          submitDisabled={form.targetType === 'PRODUCT' && !products.length}
        />
      </form>
    </Modal>
  );
}
