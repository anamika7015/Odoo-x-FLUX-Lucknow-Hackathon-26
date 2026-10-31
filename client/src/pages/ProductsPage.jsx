import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiEdit, FiPlus, FiPackage, FiSearch, FiSliders } from 'react-icons/fi';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { api, errorMessage, unwrap } from '../services/api.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Modal } from '../components/ui/Modal.jsx';

const rupees = (value, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((value || 0) / 100);

const toForm = (product) =>
  product
    ? {
        name: product.name,
        productType: product.productType,
        salesPrice: product.salesPrice / 100,
        costPrice: product.costPrice / 100,
        description: product.description || '',
        notes: product.notes || '',
        status: product.status,
      }
    : {
        name: '',
        productType: '',
        salesPrice: '',
        costPrice: '',
        description: '',
        notes: '',
        status: 'ACTIVE',
      };

export function ProductsPage() {
  const [productEditor, setProductEditor] = useState(null);
  const [variantsFor, setVariantsFor] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { user } = useSelector((state) => state.auth);
  const admin = user.role === 'ADMIN';
  const queryClient = useQueryClient();

  const products = useQuery({
    queryKey: ['products', page, search, status],
    queryFn: async () => {
      const response = await api.get('/products', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          status: status || undefined,
        },
      });
      return { ...unwrap(response), meta: response.data.meta };
    },
  });

  const saveProduct = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? api.patch(`/products/${id}`, payload) : api.post('/products', payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setProductEditor(null);
      toast.success(id ? 'Product updated.' : 'Product created.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (products.isLoading) {
    return (
      <section className="page-wrap">
        <div className="skeleton tall animate-pulse rounded-2xl bg-app-secondary/50" />
      </section>
    );
  }

  if (products.isError) {
    return (
      <section className="page-wrap">
        <EmptyState
          icon={FiPackage}
          title="Catalog could not load"
          description={errorMessage(products.error)}
        />
      </section>
    );
  }

  const items = products.data?.products || [];
  const meta = products.data?.meta || { total: items.length, totalPages: 1 };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="COMMERCIAL CATALOG"
        title="Products & Services"
        description="Manage subscription products, cost structures, and edition variants."
        actions={
          admin && (
            <Button onClick={() => setProductEditor({})}>
              <FiPlus size={16} /> New Product
            </Button>
          )
        }
      />

      {/* Search & Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <FiSearch className="absolute left-3 top-3 text-app-text-muted" size={15} />
          <input
            className="h-10 w-full rounded-xl border border-app-border bg-app-surface pl-9 pr-3 text-sm text-app-text placeholder:text-app-text-muted/60 transition-all focus:border-app-accent focus:ring-2 focus:ring-app-ring focus:outline-none"
            aria-label="Search products"
            placeholder="Search product name or type…"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
          />
        </div>
        <select
          className="h-10 rounded-xl border border-app-border bg-app-surface px-3 text-sm text-app-text transition-all focus:border-app-accent focus:ring-2 focus:ring-app-ring focus:outline-none"
          aria-label="Filter products by status"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {items.length ? (
        <div className="data-card">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Sales Price</th>
                <th>Cost Price</th>
                <th>Status</th>
                {admin && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((product) => (
                <tr key={product._id}>
                  <td>
                    <strong>{product.name}</strong>
                    <small>{product.description || 'No description provided'}</small>
                  </td>
                  <td>
                    <span className="rounded-md bg-app-secondary px-2 py-0.5 text-xs font-medium text-app-text">
                      {product.productType}
                    </span>
                  </td>
                  <td className="tabular-nums font-semibold text-app-text">
                    {rupees(product.salesPrice, product.currency)}
                  </td>
                  <td className="tabular-nums text-app-text-muted">
                    {rupees(product.costPrice, product.currency)}
                  </td>
                  <td>
                    <Status value={product.status} />
                  </td>
                  {admin && (
                    <td>
                      <div className="row-actions">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setVariantsFor(product)}
                          title="Manage edition variants"
                        >
                          <FiSliders size={14} /> Variants
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setProductEditor(product)}
                          title="Edit product"
                        >
                          <FiEdit size={14} /> Edit
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={FiPackage}
          title="No products found"
          description={
            search || status
              ? 'Try adjusting your search or status filters.'
              : 'Create your first product to begin building your commercial subscription catalog.'
          }
          action={
            admin && (
              <Button onClick={() => setProductEditor({})}>
                <FiPlus size={16} /> New Product
              </Button>
            )
          }
        />
      )}

      {/* Pagination */}
      <div className="mt-5 flex items-center justify-between text-xs text-app-text-muted">
        <span>Total: {meta.total} products</span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1 || products.isFetching}
            onClick={() => setPage((v) => v - 1)}
          >
            Previous
          </Button>
          <span className="px-2 font-medium text-app-text">
            Page {page} of {Math.max(meta.totalPages, 1)}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= meta.totalPages || products.isFetching}
            onClick={() => setPage((v) => v + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Global Viewport Centered Modals */}
      {productEditor && (
        <ProductForm
          product={productEditor._id ? productEditor : null}
          busy={saveProduct.isPending}
          close={() => setProductEditor(null)}
          submit={(payload) => saveProduct.mutate({ id: productEditor._id, payload })}
        />
      )}

      {variantsFor && (
        <VariantManager product={variantsFor} close={() => setVariantsFor(null)} />
      )}
    </PageTransition>
  );
}

function ProductForm({ product, close, submit, busy }) {
  const [form, setForm] = useState(toForm(product));
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const send = (event) => {
    event.preventDefault();
    submit({
      ...form,
      salesPrice: Math.round(Number(form.salesPrice) * 100),
      costPrice: Math.round(Number(form.costPrice) * 100),
    });
  };

  return (
    <Modal
      title={product ? 'Edit Commercial Product' : 'Create Commercial Product'}
      description="Configure core product pricing and operational parameters."
      badge="Catalog"
      size="md"
      close={close}
    >
      <form className="form-grid" onSubmit={send}>
        <Input label="Product Name" name="name" value={form.name} onChange={update} placeholder="e.g. CRM Professional Suite" required />
        <Input label="Product Type" name="productType" value={form.productType} onChange={update} placeholder="e.g. SAAS, CLOUD, SERVICE" required />
        <Input label="Sales Price (₹)" name="salesPrice" type="number" min="0" step="0.01" value={form.salesPrice} onChange={update} placeholder="499.00" required />
        <Input label="Cost Price (₹)" name="costPrice" type="number" min="0" step="0.01" value={form.costPrice} onChange={update} placeholder="125.00" required />

        <label className="field">
          <span>Status</span>
          <select name="status" value={form.status} onChange={update}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>

        <label className="field full">
          <span>Public Description</span>
          <textarea name="description" value={form.description} onChange={update} placeholder="Brief summary displayed on quotations..." />
        </label>

        <label className="field full">
          <span>Internal Operations Notes</span>
          <textarea name="notes" value={form.notes} onChange={update} placeholder="Private notes visible to internal staff only..." />
        </label>

        <div className="full flex justify-end gap-2.5 pt-4 border-t border-app-border mt-2">
          <Button type="button" variant="outline" onClick={close} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : product ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function VariantManager({ product, close }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const variants = useQuery({
    queryKey: ['variants', product._id],
    queryFn: () => api.get(`/products/${product._id}/variants`).then(unwrap),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['variants', product._id] });

  const create = useMutation({
    mutationFn: (payload) => api.post(`/products/${product._id}/variants`, payload),
    onSuccess: () => {
      refresh();
      setAdding(false);
      toast.success('Variant created.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/products/${product._id}/variants/${id}`, payload),
    onSuccess: () => {
      refresh();
      setEditing(null);
      toast.success('Variant updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Modal
      title={`${product.name} · Variants`}
      description="Manage editions, tier add-ons, and variant surcharges."
      badge="Variants"
      size="md"
      close={close}
    >
      {variants.isLoading ? (
        <div className="skeleton h-32 rounded-xl bg-app-secondary/50 animate-pulse" />
      ) : (
        <div className="space-y-4">
          <div className="space-y-2.5">
            {variants.data?.variants?.length ? (
              variants.data.variants.map((variant) => (
                <div
                  key={variant._id}
                  className="flex items-center justify-between rounded-xl border border-app-border bg-app-secondary/30 p-3.5 transition-colors"
                >
                  <div>
                    <strong className="text-sm font-semibold text-app-text">{variant.name}</strong>
                    <p className="text-xs text-app-text-muted">
                      {variant.attribute} · +{rupees(variant.additionalPrice, variant.currency)} add-on
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Status value={variant.status} />
                    <span className="tabular-nums font-bold text-sm text-app-accent">
                      {rupees(variant.finalPrice, variant.currency)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      title={`Edit ${variant.name}`}
                      onClick={() => {
                        setAdding(false);
                        setEditing(variant);
                      }}
                    >
                      <FiEdit size={13} />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-app-text-muted py-2">No variants defined yet for this product.</p>
            )}
          </div>

          {editing ? (
            <div className="border-t border-app-border pt-4">
              <h4 className="text-xs font-bold uppercase text-app-text-muted mb-3">Edit Variant</h4>
              <VariantForm
                variant={editing}
                busy={update.isPending}
                onCancel={() => setEditing(null)}
                submit={(payload) => update.mutate({ id: editing._id, payload })}
              />
            </div>
          ) : adding ? (
            <div className="border-t border-app-border pt-4">
              <h4 className="text-xs font-bold uppercase text-app-text-muted mb-3">Add New Variant</h4>
              <VariantForm
                busy={create.isPending}
                onCancel={() => setAdding(false)}
                submit={create.mutate}
              />
            </div>
          ) : (
            <Button size="sm" onClick={() => setAdding(true)}>
              <FiPlus size={15} /> Add Variant
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}

function VariantForm({ variant, submit, onCancel, busy }) {
  const [form, setForm] = useState(() => ({
    name: variant?.name || '',
    attribute: variant?.attribute || '',
    additionalPrice: variant ? String(variant.additionalPrice / 100) : '0',
    status: variant?.status || 'ACTIVE',
  }));

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        submit({ ...form, additionalPrice: Math.round(Number(form.additionalPrice) * 100) });
      }}
    >
      <Input label="Variant Name" name="name" value={form.name} onChange={update} placeholder="e.g. Enterprise Edition" required />
      <Input label="Attribute" name="attribute" value={form.attribute} onChange={update} placeholder="e.g. Tier" required />
      <Input label="Additional Surcharge (₹)" name="additionalPrice" type="number" min="0" step="0.01" value={form.additionalPrice} onChange={update} required />
      <label className="field">
        <span>Status</span>
        <select name="status" value={form.status} onChange={update}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </label>
      <div className="full flex justify-end gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>Cancel</Button>}
        <Button size="sm" type="submit" disabled={busy}>
          {busy ? 'Saving…' : variant ? 'Save Variant' : 'Add Variant'}
        </Button>
      </div>
    </form>
  );
}

// Re-export common design system primitives so existing module imports stay 100% compatible
export { Modal } from '../components/ui/Modal.jsx';

export function Input({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  );
}

export function Status({ value }) {
  const statusLower = (value || '').toLowerCase();
  const isPositive = ['active', 'paid', 'confirmed', 'converted'].includes(statusLower);
  const isWarning = ['paused', 'overdue', 'draft', 'pending'].includes(statusLower);
  return (
    <span className={`status ${isPositive ? 'active' : isWarning ? 'warning' : 'inactive'}`}>
      {value}
    </span>
  );
}

export function Empty({ icon: Icon, title, detail }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={32} className="mx-auto mb-3 text-app-text-muted" />}
      <h3 className="text-base font-semibold text-app-text">{title}</h3>
      <p className="mt-1 text-xs text-app-text-muted">{detail}</p>
    </div>
  );
}
