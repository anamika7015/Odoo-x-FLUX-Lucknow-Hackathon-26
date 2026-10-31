import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiEdit, FiPlus, FiUsers } from 'react-icons/fi';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { api, errorMessage, unwrap } from '../services/api.js';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Primitives.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { Modal, Status } from './ProductsPage.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageTransition } from '../components/PageTransition.jsx';

const toForm = (customer) => customer ? {
  fullName: customer.fullName, email: customer.email, phone: customer.phone || '', companyName: customer.companyName || '',
  billingAddress: customer.billingAddress || '', taxId: customer.taxId || '', status: customer.status,
} : { fullName: '', email: '', phone: '', companyName: '', billingAddress: '', taxId: '', status: 'ACTIVE' };

export function CustomersPage() {
  const [editor, setEditor] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const adminOrStaff = user.role === 'ADMIN' || user.role === 'STAFF';
  const queryClient = useQueryClient();
  const customers = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/customers', { params: { limit: 100 } }).then(unwrap) });
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
      {customers.data.items.length ? (
        <Card>
          <CardContent className="p-0">
            <div className="data-card">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Company</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {customers.data.items.map((customer) => (
                    <tr key={customer._id}>
                      <td><strong>{customer.fullName}</strong><small>{customer.phone || 'No phone'}</small></td>
                      <td>{customer.email}</td>
                      <td>{customer.companyName || '—'}</td>
                      <td><Status value={customer.status} /></td>
                      <td><button className="icon-button" onClick={() => setEditor(customer)} title="Edit"><FiEdit size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState icon={FiUsers} title="No customers yet" description="Create your first customer to begin managing subscriptions." />
      )}
      {editor && <CustomerForm customer={editor._id ? editor : null} busy={save.isPending} close={() => setEditor(null)} submit={(payload) => save.mutate({ id: editor._id, payload })} />}
    </PageTransition>
  );
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
