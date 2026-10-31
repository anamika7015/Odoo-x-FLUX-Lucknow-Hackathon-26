import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiClock, FiEdit, FiPlus, FiSearch, FiUsers } from 'react-icons/fi';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Input, Modal, Status } from './ProductsPage.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';

const toForm = (customer) => customer ? {
  fullName: customer.fullName, email: customer.email, phone: customer.phone || '', companyName: customer.companyName || '',
  billingAddress: customer.billingAddress || '', taxId: customer.taxId || '', status: customer.status,
} : { fullName: '', email: '', phone: '', companyName: '', billingAddress: '', taxId: '', status: 'ACTIVE' };

export function CustomersPage() {
  const [editor, setEditor] = useState(null);
  const [history, setHistory] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { user } = useSelector((state) => state.auth);
  const adminOrStaff = user.role === 'ADMIN' || user.role === 'STAFF';
  const queryClient = useQueryClient();
  const customers = useQuery({ queryKey: ['customers', page, search, status], queryFn: () => api.get('/customers', { params: { page, limit: 20, search: search || undefined, status: status || undefined } }).then(unwrap) });
  const save = useMutation({
    mutationFn: ({ id, payload }) => id ? api.patch(`/customers/${id}`, payload) : api.post('/customers', payload),
    onSuccess: (_data, { id }) => { queryClient.invalidateQueries({ queryKey: ['customers'] }); setEditor(null); toast.success(id ? 'Customer updated.' : 'Customer created.'); },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (customers.isLoading) return <section className="page"><div className="skeleton tall" /></section>;
  if (customers.isError) return <section className="page"><EmptyState icon={FiUsers} title="Customers could not load" description={errorMessage(customers.error)} /></section>;

  return (
    <PageTransition>
      <PageHeader eyebrow="CUSTOMER MANAGEMENT" title="Customers" description="Manage customer accounts and billing profiles." actions={adminOrStaff && <Button onClick={() => setEditor({})}><FiPlus size={16} />New customer</Button>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-56 flex-1"><FiSearch className="absolute left-3 top-3 text-app-muted" size={16} /><input className="h-10 w-full rounded-lg border border-app-border bg-app-surface pl-9 pr-3 text-sm text-app-text" aria-label="Search customers" placeholder="Search name, email, or company…" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} /></label>
        <select className="h-10 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text" aria-label="Filter customers by status" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
      </div>
      {customers.data.items.length ? (
        <Card>
          <CardContent className="p-0">
            <div className="data-card">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Status</th><th>History</th><th /></tr></thead>
                <tbody>
                  {customers.data.items.map((customer) => (
                    <tr key={customer._id}>
                      <td><strong>{customer.fullName}</strong><small>{customer.phone || 'No phone'}</small></td>
                      <td>{customer.email}</td>
                      <td>{customer.companyName || '—'}</td>
                      <td><Status value={customer.status} /></td>
                      <td><Button size="sm" variant="outline" onClick={() => setHistory(customer)}><FiClock size={14} />View history</Button></td>
                      <td><button className="icon-button" onClick={() => setEditor(customer)} title="Edit"><FiEdit size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState icon={FiUsers} title="No customers found" description={search || status ? 'Try changing your search or status filter.' : 'Create your first customer to begin managing subscriptions.'} />
      )}
      <div className="mt-4 flex items-center justify-between text-sm text-app-muted"><span>{customers.data.meta.total} customers</span><div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || customers.isFetching} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {page} of {Math.max(customers.data.meta.totalPages, 1)}</span><Button size="sm" variant="outline" disabled={page >= customers.data.meta.totalPages || customers.isFetching} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
      {editor && <CustomerForm customer={editor._id ? editor : null} busy={save.isPending} close={() => setEditor(null)} submit={(payload) => { if (payload.status === 'INACTIVE' && editor._id && editor.status !== 'INACTIVE' && !window.confirm('Deactivate this customer? Customers with an open subscription or unpaid invoice cannot be deactivated.')) return; save.mutate({ id: editor._id, payload }); }} />}
      {history && <CustomerHistory customer={history} close={() => setHistory(null)} />}
    </PageTransition>
  );
}

function CustomerHistory({ customer, close }) {
  const query = useQuery({ queryKey: ['customer-history', customer._id], queryFn: () => api.get(`/customers/${customer._id}/history`).then(unwrap) });
  const historyData = query.data;
  const money = (amount, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format((amount || 0) / 100);
  const download = async (invoice) => {
    try {
      const response = await api.get(`/invoices/${invoice._id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${invoice.invoiceNumber}.pdf`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (error) { toast.error(errorMessage(error)); }
  };
  return <Modal title={`${customer.fullName} · Account history`} close={close}>
    {query.isLoading ? <div className="h-40 animate-pulse rounded-lg bg-app-secondary" /> : query.isError ? <p role="alert" className="text-sm text-red-500">{errorMessage(query.error)}</p> : <div className="max-h-[70vh] space-y-6 overflow-y-auto">
      <section><h4 className="mb-2 font-semibold text-app-text">Subscriptions</h4>{historyData.subscriptions.length ? historyData.subscriptions.map((item) => <p key={item._id} className="border-b border-app-border py-2 text-sm text-app-muted">{item.subscriptionNumber} · {item.status} · {money(item.subtotal, item.currency)}</p>) : <p className="text-sm text-app-muted">No subscriptions.</p>}</section>
      <section><h4 className="mb-2 font-semibold text-app-text">Invoices</h4>{historyData.invoices.length ? historyData.invoices.map((item) => <div key={item._id} className="flex items-center justify-between gap-3 border-b border-app-border py-2 text-sm"><span className="text-app-muted">{item.invoiceNumber} · {item.status} · {money(item.total, item.currency)} · outstanding {money(item.outstanding, item.currency)}</span><Button size="sm" variant="outline" onClick={() => download(item)}>PDF</Button></div>) : <p className="text-sm text-app-muted">No invoices.</p>}</section>
      <section><h4 className="mb-2 font-semibold text-app-text">Payments</h4>{historyData.payments.length ? historyData.payments.map((item) => <p key={item._id} className="border-b border-app-border py-2 text-sm text-app-muted">{item.invoice?.invoiceNumber || 'Invoice'} · {item.method} · {money(item.amount, item.invoice?.currency)} · {new Date(item.paymentDate).toLocaleDateString('en-IN')}</p>) : <p className="text-sm text-app-muted">No payments.</p>}</section>
    </div>}
  </Modal>;
}

function CustomerForm({ customer, close, submit, busy }) {
  const [form, setForm] = useState(toForm(customer));
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const send = (event) => { event.preventDefault(); submit(form); };
  return (
    <Modal title={customer ? 'Edit customer' : 'Create customer'} close={close}>
      <form className="form-grid" onSubmit={send}>
        <Input label="Full name" name="fullName" value={form.fullName} onChange={update} required />
        <Input label="Email" name="email" type="email" value={form.email} onChange={update} required />
        <Input label="Phone" name="phone" value={form.phone} onChange={update} />
        <Input label="Company" name="companyName" value={form.companyName} onChange={update} />
        <Input label="Tax ID" name="taxId" value={form.taxId} onChange={update} />
        <label className="field"><span>Status</span><select name="status" value={form.status} onChange={update}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
        <label className="field full"><span>Billing address</span><textarea name="billingAddress" value={form.billingAddress} onChange={update} /></label>
        <button className="primary-button full" disabled={busy}>{busy ? 'Saving…' : customer ? 'Save customer' : 'Create customer'}</button>
      </form>
    </Modal>
  );
}
