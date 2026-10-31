import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  FileText,
  ShoppingBag,
  Receipt,
  CreditCard,
  Percent,
  Tag,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Search,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { ThemeSelect } from '../components/ThemeSelect.jsx';
import { api, errorMessage } from '../services/api.js';
import { clearUser } from '../store/store.js';
import { cn } from '../lib/utils.js';

const navGroups = [
  {
    group: 'CORE',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
    ],
  },
  {
    group: 'COMMERCIAL',
    items: [
      { to: '/customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'STAFF'] },
      { to: '/products', label: 'Products', icon: Package, roles: ['ADMIN', 'STAFF'] },
      { to: '/plans', label: 'Plans', icon: Layers, roles: ['ADMIN', 'STAFF'] },
    ],
  },
  {
    group: 'SALES & CONTRACTS',
    items: [
      { to: '/quotations', label: 'Quotations', icon: FileText, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
      { to: '/subscriptions', label: 'Subscriptions', icon: ShoppingBag, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
    ],
  },
  {
    group: 'BILLING & FINANCE',
    items: [
      { to: '/invoices', label: 'Invoices', icon: Receipt, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
      { to: '/payments', label: 'Payments', icon: CreditCard, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
      { to: '/discounts', label: 'Discounts', icon: Percent, roles: ['ADMIN'] },
      { to: '/taxes', label: 'Tax Configuration', icon: Tag, roles: ['ADMIN'] },
    ],
  },
  {
    group: 'SYSTEM & INSIGHTS',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'STAFF'] },
      { to: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
    ],
  },
];

export function AppLayout() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const { data: notificationData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data.data,
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      dispatch(clearUser());
      navigate('/login');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  // Breadcrumb determination
  const currentPath = location.pathname;
  let activeSection = 'Dashboard';
  let activeTitle = 'Workspace Performance';

  for (const grp of navGroups) {
    for (const item of grp.items) {
      if (item.to === currentPath || (item.to !== '/' && currentPath.startsWith(item.to))) {
        activeSection = grp.group;
        activeTitle = user?.role === 'CUSTOMER' && item.to === '/' ? 'Customer Portal' : item.label;
      }
    }
  }

  return (
    <div className="workspace min-h-screen flex bg-app-background text-app-text font-sans antialiased">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 dark:bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          role="presentation"
        />
      )}

      {/* Enterprise Obsidian Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-dvh shrink-0 flex-col border-r border-app-border bg-app-surface dark:bg-brand-obsidian transition-all duration-300 ease-in-out shadow-sm lg:sticky lg:top-0 lg:bottom-auto',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className={cn(
          'flex h-16 items-center border-b border-app-border',
          collapsed ? 'justify-center gap-1 px-1.5' : 'justify-between px-4'
        )}>
          <div className={cn('flex items-center overflow-hidden', collapsed ? '' : 'gap-3')}>
            <div className={cn(
              'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-indigo to-brand-violet text-white shadow-md shadow-brand-indigo/30',
              collapsed ? 'h-8 w-8' : 'h-10 w-10'
            )}>
              <span className="font-extrabold text-lg tracking-wider text-white">B</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="block truncate font-extrabold text-base tracking-tight text-app-text">
                    Brightloop
                  </span>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-brand-violet animate-pulse" />
                </div>
                <span className="block text-[10px] font-bold tracking-widest text-brand-violet dark:text-brand-violet-light uppercase">
                  BILLING SAAS
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'hidden place-items-center rounded-lg border border-app-border text-app-text-muted hover:bg-app-secondary hover:text-app-text transition-colors lg:grid',
              collapsed ? 'h-7 w-7 shrink-0' : 'h-7 w-7'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-app-text-muted hover:text-app-text rounded-lg hover:bg-app-secondary transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links Grouped */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((grp) => {
            const visibleItems = grp.items.filter((item) => item.roles.includes(user?.role));
            if (!visibleItems.length) return null;

            return (
              <div key={grp.group} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 pb-1 text-[10px] font-bold tracking-widest text-app-text-muted/70 uppercase">
                    {grp.group}
                  </p>
                )}
                {visibleItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-180',
                        collapsed ? 'justify-center px-2' : '',
                        isActive
                          ? 'bg-brand-indigo dark:bg-brand-indigo-bright text-white shadow-btn-primary dark:shadow-btn-primary-dark font-semibold'
                          : 'text-app-text-muted hover:bg-app-secondary hover:text-app-text'
                      )
                    }
                    title={collapsed ? label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={18}
                          strokeWidth={isActive ? 2.2 : 1.8}
                          className={cn(
                            'shrink-0 transition-transform duration-180 group-hover:scale-110',
                            isActive ? 'text-white' : 'text-app-text-muted group-hover:text-app-text'
                          )}
                        />
                        {!collapsed && (
                          <span className="truncate">
                            {user?.role === 'CUSTOMER' && to === '/' ? 'My Account' : label}
                          </span>
                        )}
                        {isActive && !collapsed && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-lavender shadow-glow" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="border-t border-app-border p-3 space-y-2.5">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border border-app-border/70 bg-app-secondary/50 p-2.5 transition-colors',
              collapsed ? 'justify-center p-2' : ''
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-indigo to-brand-violet text-white font-bold text-sm shadow-sm">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-app-text">{user?.fullName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-brand-violet dark:text-brand-violet-light uppercase tracking-wider">
                    {user?.role}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={cn('flex items-center gap-2', collapsed ? 'justify-center' : 'justify-between px-1')}>
            <ThemeSelect compact={collapsed} />
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-app-text-muted hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-500/10"
              title="Sign Out"
            >
              <LogOut size={16} />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        {/* Global Executive Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-app-border bg-app-surface/90 dark:bg-brand-obsidian/90 px-4 sm:px-8 backdrop-blur-md transition-colors">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-app-text-muted hover:text-app-text rounded-xl border border-app-border hover:bg-app-secondary transition-colors"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-app-text-muted">
                <span className="hover:text-app-text transition-colors">Brightloop</span>
                <span>/</span>
                <span className="font-semibold text-brand-violet dark:text-brand-violet-light">{activeSection}</span>
              </div>
              <h1 className="text-base font-bold text-app-text tracking-tight sm:text-lg">
                {activeTitle}
              </h1>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* User Email Pill */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-app-text-muted bg-app-secondary/60 border border-app-border rounded-xl px-3 py-1.5 shadow-subtle">
              <ShieldCheck size={14} className="text-brand-indigo dark:text-brand-violet-light" />
              <span className="truncate max-w-[200px]">{user?.email}</span>
            </div>

            {/* Notifications Menu */}
            <div className="relative">
              <button
                type="button"
                className="relative grid h-9 w-9 place-items-center rounded-xl border border-app-border bg-app-surface text-app-text-muted hover:bg-app-secondary hover:text-app-text transition-colors shadow-subtle"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell size={17} />
                {notificationData?.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-violet text-white px-1 text-[10px] font-bold shadow-glow">
                    {notificationData.unreadCount > 9 ? '9+' : notificationData.unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <section
                  className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-app-border bg-app-surface text-app-text shadow-xl overflow-hidden animate-scale-in"
                  aria-label="Notifications"
                >
                  <header className="flex items-center justify-between border-b border-app-border bg-app-secondary/40 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bell size={14} className="text-brand-violet" />
                      <strong className="text-xs font-bold text-app-text uppercase tracking-wider">
                        Workspace Notifications
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="text-xs text-brand-indigo dark:text-brand-violet-light hover:underline disabled:opacity-50 font-semibold"
                      onClick={() => markAllRead.mutate()}
                      disabled={!notificationData?.unreadCount}
                    >
                      Mark all read
                    </button>
                  </header>

                  <div className="max-h-80 overflow-y-auto divide-y divide-app-border">
                    {!notificationData?.items?.length ? (
                      <p className="p-6 text-center text-xs text-app-text-muted">You’re all caught up.</p>
                    ) : (
                      notificationData.items.map((item) => (
                        <button
                          type="button"
                          key={item._id}
                          className={cn(
                            'flex w-full items-start justify-between gap-3 p-3.5 text-left transition-colors hover:bg-app-secondary/60',
                            !item.readAt ? 'bg-brand-indigo/5 dark:bg-brand-violet/10' : ''
                          )}
                          onClick={() => {
                            if (!item.readAt) markRead.mutate(item._id);
                            setNotificationsOpen(false);
                            if (item.href) navigate(item.href);
                          }}
                        >
                          <div className="space-y-1">
                            <strong className="block text-xs font-semibold text-app-text">
                              {item.title}
                            </strong>
                            <p className="text-[11px] text-app-text-muted leading-relaxed">
                              {item.message}
                            </p>
                          </div>
                          {!item.readAt && (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-violet shadow-glow" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>
        </header>

        {/* Routed Page Container */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
