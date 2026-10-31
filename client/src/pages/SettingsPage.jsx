import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Edit3,
  Search,
  Settings,
  ShieldCheck,
  Lock,
  Users,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '../components/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Modal, FormField, FormInput, FormSelect, ModalFooter } from '../components/ui/Modal.jsx';
import { api, errorMessage, unwrap } from '../services/api.js';

const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export function SettingsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const queryClient = useQueryClient();

  const users = useQuery({
    queryKey: ['users', page, search, status, role],
    queryFn: async () => {
      const response = await api.get('/users', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          status: status || undefined,
          role: role || undefined,
        },
      });
      return { ...unwrap(response), meta: response.data.meta };
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const createStaff = useMutation({
    mutationFn: (payload) => api.post('/auth/staff', payload),
    onSuccess: () => {
      refresh();
      setDialog(null);
      toast.success('Staff account created.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/users/${id}`, payload),
    onSuccess: () => {
      refresh();
      setDialog(null);
      toast.success('User account updated.');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const setAccountStatus = (user) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!window.confirm(`${nextStatus === 'SUSPENDED' ? 'Suspend' : 'Activate'} ${user.fullName}'s account?`)) return;
    updateUser.mutate({ id: user._id, payload: { status: nextStatus } });
  };

  const roleBadgeStyle = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-brand-indigo/10 text-brand-indigo dark:text-brand-softPurple border-brand-indigo/25';
      case 'STAFF':
        return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <PageTransition>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <PageHeader
          eyebrow="WORKSPACE ACCESS & GOVERNANCE"
          title="Workspace Settings"
          description="Manage workspace team members, role assignments, security, and staff accounts."
          actions={
            <Button
              onClick={() => setDialog({ type: 'create' })}
              className="bg-brand-indigo hover:bg-brand-deepIndigo dark:bg-brand-violet text-white shadow-btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Staff Account</span>
            </Button>
          }
        />

        <Card className="shadow-subtle">
          <CardHeader className="border-b border-app-border pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-lavender/30 dark:bg-brand-violet/15 flex items-center justify-center text-brand-indigo dark:text-brand-violet">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-app-text">Workspace Users & Access</CardTitle>
                  <p className="text-xs text-app-muted mt-0.5">
                    Only administrators can provision staff credentials or modify role hierarchies.
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-app-muted pointer-events-none" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-app-border bg-app-card text-app-text placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 dark:focus:ring-brand-violet/30 transition-all"
                  aria-label="Search users"
                  placeholder="Search user by name or email…"
                  value={search}
                  onChange={(event) => {
                    setPage(1);
                    setSearch(event.target.value);
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="h-10 rounded-xl border border-app-border bg-app-card px-3 text-xs font-semibold text-app-text focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 dark:focus:ring-brand-violet/30"
                  aria-label="Filter users by role"
                  value={role}
                  onChange={(event) => {
                    setPage(1);
                    setRole(event.target.value);
                  }}
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="STAFF">Staff</option>
                  <option value="CUSTOMER">Customer</option>
                </select>

                <select
                  className="h-10 rounded-xl border border-app-border bg-app-card px-3 text-xs font-semibold text-app-text focus:outline-none focus:ring-2 focus:ring-brand-indigo/30 dark:focus:ring-brand-violet/30"
                  aria-label="Filter users by status"
                  value={status}
                  onChange={(event) => {
                    setPage(1);
                    setStatus(event.target.value);
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {users.isLoading ? (
              <div className="h-48 rounded-xl bg-app-secondary/50 animate-pulse flex items-center justify-center text-app-muted text-sm font-medium">
                Loading accounts…
              </div>
            ) : users.isError ? (
              <div role="alert" className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-sm text-red-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage(users.error)}</span>
              </div>
            ) : users.data.users.length ? (
              <div className="data-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-app-border bg-app-secondary/40 text-xs uppercase font-semibold text-app-muted tracking-wider">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Email Address</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Last Login</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border">
                      {users.data.users.map((item) => {
                        const isActive = item.status === 'ACTIVE';
                        return (
                          <tr
                            key={item._id}
                            className="hover:bg-brand-indigo/5 dark:hover:bg-brand-violet/5 transition-colors group"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-lavender/40 dark:bg-brand-violet/20 flex items-center justify-center text-xs font-bold text-brand-indigo dark:text-brand-softPurple border border-brand-indigo/20">
                                  {item.fullName?.slice(0, 2).toUpperCase() || 'U'}
                                </div>
                                <span className="font-semibold text-app-text">{item.fullName}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-app-muted font-mono text-xs">{item.email}</td>
                            <td className="py-3.5 px-4">
                              <button
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${roleBadgeStyle(
                                  item.role
                                )} hover:scale-105 transition-transform`}
                                onClick={() => setDialog({ type: 'edit', user: item })}
                                title="Click to change role"
                              >
                                {item.role}
                              </button>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                  isActive
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isActive ? 'bg-emerald-500' : 'bg-amber-500'
                                  }`}
                                />
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-app-muted">
                              {item.lastLoginAt
                                ? new Date(item.lastLoginAt).toLocaleString('en-IN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })
                                : 'Never logged in'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDialog({ type: 'edit', user: item })}
                                  className="h-8 text-xs flex items-center gap-1.5 border-app-border hover:border-brand-indigo dark:hover:border-brand-violet"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-app-muted" />
                                  <span>Edit</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant={isActive ? 'destructive' : 'outline'}
                                  disabled={updateUser.isPending}
                                  onClick={() => setAccountStatus(item)}
                                  className="h-8 text-xs"
                                >
                                  {isActive ? 'Suspend' : 'Activate'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No users found"
                description={
                  search ? 'No users matched your search criteria.' : 'Create a staff account to grant team access.'
                }
              />
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between pt-2 text-xs text-app-muted">
              <span>{users.data?.meta?.total ?? 0} total accounts</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || users.isFetching}
                  onClick={() => setPage((current) => current - 1)}
                  className="h-8 text-xs flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Button>
                <span className="px-2 font-medium">
                  Page {page} of {Math.max(users.data?.meta?.totalPages || 1, 1)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= (users.data?.meta?.totalPages || 1) || users.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                  className="h-8 text-xs flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Staff Modal */}
        {dialog?.type === 'create' && (
          <StaffForm
            busy={createStaff.isPending}
            close={() => setDialog(null)}
            submit={createStaff.mutate}
          />
        )}

        {/* Edit User Modal */}
        {dialog?.type === 'edit' && (
          <EditUserForm
            user={dialog.user}
            busy={updateUser.isPending}
            close={() => setDialog(null)}
            submit={(payload) => updateUser.mutate({ id: dialog.user._id, payload })}
          />
        )}
      </div>
    </PageTransition>
  );
}

function StaffForm({ busy, close, submit }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const send = (event) => {
    event.preventDefault();
    if (!strongPassword.test(form.password)) {
      return setError('Password must be at least 8 characters and include uppercase, lowercase, and a symbol.');
    }
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }
    setError('');
    submit(form);
  };

  return (
    <Modal
      title="Create Staff Account"
      subtitle="Provision access credentials for internal team members"
      close={close}
      maxWidth="max-w-md"
    >
      <form onSubmit={send} className="space-y-4">
        <FormField label="Full Name" required>
          <FormInput
            name="fullName"
            placeholder="e.g. Eleanor Vance"
            value={form.fullName}
            onChange={update}
            required
          />
        </FormField>

        <FormField label="Email Address" required>
          <FormInput
            name="email"
            type="email"
            placeholder="eleanor@brightloop.io"
            value={form.email}
            onChange={update}
            required
          />
        </FormField>

        <FormField label="Temporary Password" required hint="Must have 8+ characters, uppercase, lowercase, and symbol">
          <FormInput
            name="password"
            type="password"
            value={form.password}
            onChange={update}
            required
          />
        </FormField>

        <FormField label="Confirm Password" required>
          <FormInput
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={update}
            required
          />
        </FormField>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <ModalFooter
          busy={busy}
          close={close}
          submitText="Create Staff Account"
        />
      </form>
    </Modal>
  );
}

function EditUserForm({ user, busy, close, submit }) {
  const [form, setForm] = useState({ fullName: user.fullName, role: user.role });

  return (
    <Modal
      title={`Edit Account: ${user.fullName}`}
      subtitle="Update identity name and role permission tier"
      close={close}
      maxWidth="max-w-md"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(form);
        }}
        className="space-y-4"
      >
        <FormField label="Full Name" required>
          <FormInput
            name="fullName"
            value={form.fullName}
            onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            required
          />
        </FormField>

        <FormField label="Account Role" required>
          <FormSelect
            name="role"
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
          >
            <option value="ADMIN">Admin (Full workspace control)</option>
            <option value="STAFF">Staff (Operational management)</option>
            <option value="CUSTOMER">Customer (Self-service portal)</option>
          </FormSelect>
        </FormField>

        <ModalFooter
          busy={busy}
          close={close}
          submitText="Save Changes"
        />
      </form>
    </Modal>
  );
}
