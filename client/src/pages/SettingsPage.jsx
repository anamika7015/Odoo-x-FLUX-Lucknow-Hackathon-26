import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FiEdit, FiSearch, FiSettings, FiUserPlus } from 'react-icons/fi';
import { toast } from 'sonner';
import { PageHeader } from '../components/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Primitives.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Modal } from './ProductsPage.jsx';
import { api, errorMessage, unwrap } from '../services/api.js';

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export function SettingsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ['users', page, search, status, role], queryFn: async () => { const response = await api.get('/users', { params: { page, limit: 20, search: search || undefined, status: status || undefined, role: role || undefined } }); return { ...unwrap(response), meta: response.data.meta }; } });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] });
  const createStaff = useMutation({ mutationFn: (payload) => api.post('/auth/staff', payload), onSuccess: () => { refresh(); setDialog(null); toast.success('Staff account created.'); }, onError: (error) => toast.error(errorMessage(error)) });
  const updateUser = useMutation({ mutationFn: ({ id, payload }) => api.patch(`/users/${id}`, payload), onSuccess: () => { refresh(); setDialog(null); toast.success('User account updated.'); }, onError: (error) => toast.error(errorMessage(error)) });

  const setAccountStatus = (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!window.confirm(`${nextStatus === 'SUSPENDED' ? 'Suspend' : 'Activate'} ${user.fullName}'s account?`)) return;
    updateUser.mutate({ id: user._id, payload: { status: nextStatus } });
  };

  return (
    <PageTransition>
      <PageHeader eyebrow="CONFIGURATION" title="Settings" description="Manage workspace access and staff accounts." actions={<Button onClick={() => setDialog({ type: 'create' })}><FiUserPlus size={16} />Create staff account</Button>} />
      <Card>
        <CardHeader><div className="flex items-center gap-2"><FiSettings className="text-app-accent" /><CardTitle>Workspace users</CardTitle></div><p className="text-sm text-app-muted">Only administrators can create staff or change account roles.</p></CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <label className="relative min-w-56 flex-1"><FiSearch className="absolute left-3 top-3 text-app-muted" size={16} /><input className="h-10 w-full rounded-lg border border-app-border bg-app-surface pl-9 pr-3 text-sm text-app-text" aria-label="Search users" placeholder="Search name or email…" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} /></label>
            <select className="h-10 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text" aria-label="Filter users by role" value={role} onChange={(event) => { setPage(1); setRole(event.target.value); }}><option value="">All roles</option><option value="ADMIN">Admin</option><option value="STAFF">Staff</option><option value="CUSTOMER">Customer</option></select>
            <select className="h-10 rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text" aria-label="Filter users by status" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select>
          </div>
          {users.isLoading ? <div className="h-36 animate-pulse rounded-lg bg-app-secondary" /> : users.isError ? <p role="alert" className="text-sm text-red-500">{errorMessage(users.error)}</p> : users.data.users.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-app-muted"><tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Last login</th><th className="p-3" /></tr></thead><tbody>{users.data.users.map((user) => <tr key={user._id} className="border-t border-app-border"><td className="p-3 font-medium text-app-text">{user.fullName}</td><td className="p-3 text-app-muted">{user.email}</td><td className="p-3"><button className="rounded-md px-2 py-1 text-xs text-app-accent hover:bg-app-secondary" onClick={() => setDialog({ type: 'edit', user })}>{user.role}</button></td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${user.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>{user.status}</span></td><td className="p-3 text-app-muted">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('en-IN') : 'Never'}</td><td className="p-3"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setDialog({ type: 'edit', user })}><FiEdit size={14} />Edit</Button><Button size="sm" variant={user.status === 'ACTIVE' ? 'destructive' : 'outline'} disabled={updateUser.isPending} onClick={() => setAccountStatus(user)}>{user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</Button></div></td></tr>)}</tbody></table></div> : <EmptyState title="No users found" description="Change the filters or create a staff account." />}
          <div className="mt-4 flex items-center justify-between text-sm text-app-muted"><span>{users.data?.meta?.total ?? 0} users</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || users.isFetching} onClick={() => setPage((current) => current - 1)}>Previous</Button><span className="px-2 py-2">Page {page} of {Math.max(users.data?.meta?.totalPages || 1, 1)}</span><Button size="sm" variant="outline" disabled={page >= (users.data?.meta?.totalPages || 1) || users.isFetching} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div>
        </CardContent>
      </Card>
      {dialog?.type === 'create' && <StaffForm busy={createStaff.isPending} close={() => setDialog(null)} submit={createStaff.mutate} />}
      {dialog?.type === 'edit' && <EditUserForm user={dialog.user} busy={updateUser.isPending} close={() => setDialog(null)} submit={(payload) => updateUser.mutate({ id: dialog.user._id, payload })} />}
    </PageTransition>
  );
}

function StaffForm({ busy, close, submit }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const send = (event) => {
    event.preventDefault();
    if (!strongPassword.test(form.password)) return setError('Use at least 9 characters with uppercase, lowercase, and a special character.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setError('');
    submit(form);
  };
  return <Modal title="Create staff account" close={close}><form className="space-y-4" onSubmit={send}><Input label="Full name" name="fullName" value={form.fullName} onChange={update} required /><Input label="Email" name="email" type="email" value={form.email} onChange={update} required /><Input label="Password" name="password" type="password" value={form.password} onChange={update} required /><Input label="Confirm password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={update} required />{error && <p className="text-sm text-red-500">{error}</p>}<Button type="submit" className="w-full" disabled={busy}>{busy ? 'Creating…' : 'Create staff account'}</Button></form></Modal>;
}

function EditUserForm({ user, busy, close, submit }) {
  const [form, setForm] = useState({ fullName: user.fullName, role: user.role });
  return <Modal title={`Edit ${user.fullName}`} close={close}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); submit(form); }}><Input label="Full name" name="fullName" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} required /><label className="block space-y-1"><span className="text-sm font-medium text-app-text">Role</span><select className="h-10 w-full rounded-lg border border-app-border bg-app-surface px-3 text-sm text-app-text" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}><option value="ADMIN">Admin</option><option value="STAFF">Staff</option><option value="CUSTOMER">Customer</option></select></label><Button type="submit" className="w-full" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button></form></Modal>;
}
