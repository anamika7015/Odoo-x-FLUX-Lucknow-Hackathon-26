import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FiBarChart2, FiBell, FiCheck, FiChevronLeft, FiChevronRight, FiCreditCard,
  FiFile, FiFileText, FiGrid, FiLayers, FiLogOut, FiMenu, FiPackage,
  FiPercent, FiSearch, FiSettings, FiShoppingBag, FiTag, FiUsers, FiX
} from 'react-icons/fi';
import { ThemeSelect } from '../components/ThemeSelect.jsx';
import { api, errorMessage } from '../services/api.js';
import { clearUser } from '../store/store.js';
import { Button } from '../components/ui/Button.jsx';
import { cn } from '../lib/utils.js';

const navGroups = [
  {
    group: 'CORE',
    items: [
      { to: '/', label: 'Overview', icon: FiGrid, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
    ],
  },
  {
    group: 'COMMERCIAL',
    items: [
      { to: '/customers', label: 'Customers', icon: FiUsers, roles: ['ADMIN', 'STAFF'] },
      { to: '/products', label: 'Products', icon: FiPackage, roles: ['ADMIN', 'STAFF'] },
      { to: '/plans', label: 'Plans', icon: FiLayers, roles: ['ADMIN', 'STAFF'] },
    ],
  },
  {
    group: 'SALES & CONTRACTS',
    items: [
      { to: '/quotations', label: 'Quotations', icon: FiFileText, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
      { to: '/subscriptions', label: 'Subscriptions', icon: FiShoppingBag, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
    ],
  },
  {
    group: 'BILLING & FINANCE',
    items: [
      { to: '/invoices', label: 'Invoices', icon: FiFile, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
      { to: '/payments', label: 'Payments', icon: FiCreditCard, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
      { to: '/discounts', label: 'Discounts', icon: FiPercent, roles: ['ADMIN'] },
      { to: '/taxes', label: 'Tax Configuration', icon: FiTag, roles: ['ADMIN'] },
    ],
  },
  {
    group: 'SYSTEM & INSIGHTS',
    items: [
      { to: '/reports', label: 'Reports', icon: FiBarChart2, roles: ['ADMIN', 'STAFF'] },
      { to: '/settings', label: 'Settings', icon: FiSettings, roles: ['ADMIN'] },
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
  let activeSection = 'Brightloop';
  let activeTitle = 'Dashboard';

  for (const grp of navGroups) {
    for (const item of grp.items) {
      if (item.to === currentPath || (item.to !== '/' && currentPath.startsWith(item.to))) {
        activeSection = grp.group;
        activeTitle = user?.role === 'CUSTOMER' && item.to === '/' ? 'Customer Portal' : item.label;
      }
    }
  }

  return (
    <div className="workspace min-h-screen flex bg-app-background text-app-text font-sans">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          role="presentation"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-app-border bg-app-surface transition-all duration-300 lg:static',
          collapsed ? 'w-20' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-app-border px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-white shadow-md border border-brand-teal-light/30">
              <span className="font-bold text-lg tracking-wider text-brand-gold">B</span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="block truncate font-bold text-base tracking-tight text-app-text">
                  Brightloop
                </span>
                <span className="block text-[10px] font-semibold tracking-widest text-brand-gold uppercase">
                  ENTERPRISE
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:grid h-7 w-7 place-items-center rounded-lg border border-app-border text-app-text-muted hover:bg-app-secondary hover:text-app-text transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-app-text-muted hover:text-app-text"
          >
            <FiX size={20} />
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
                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        collapsed ? 'justify-center px-2' : '',
                        isActive
                          ? 'bg-brand-teal text-white shadow-sm font-semibold'
                          : 'text-app-text-muted hover:bg-app-secondary hover:text-app-text'
                      )
                    }
                    title={collapsed ? label : undefined}
                  >
                    <Icon size={18} className="shrink-0 transition-transform group-hover:scale-105" />
                    {!collapsed && (
                      <span className="truncate">
                        {user?.role === 'CUSTOMER' && to === '/' ? 'My Account' : label}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer User Card */}
        <div className="border-t border-app-border p-3 space-y-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border border-app-border/60 bg-app-secondary/40 p-2.5',
              collapsed ? 'justify-center p-2' : ''
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-teal/20 text-brand-teal font-bold text-sm">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-app-text">{user?.fullName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-brand-gold uppercase tracking-wider">
                    {user?.role}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'justify-between px-1')}>
            <ThemeSelect />
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-medium text-app-text-muted hover:text-rose-500 transition-colors p-1"
              title="Sign Out"
            >
              <FiLogOut size={16} />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        {/* Global Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-app-border bg-app-surface/90 px-4 sm:px-8 backdrop-blur-md transition-colors">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-app-text-muted hover:text-app-text rounded-lg border border-app-border"
              aria-label="Open menu"
            >
              <FiMenu size={18} />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-app-text-muted">
                <span>Brightloop</span>
                <span>/</span>
                <span className="font-semibold text-brand-gold">{activeSection}</span>
              </div>
              <h1 className="text-base font-bold text-app-text tracking-tight sm:text-lg">
                {activeTitle}
              </h1>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center text-xs font-medium text-app-text-muted bg-app-secondary/60 border border-app-border rounded-lg px-2.5 py-1.5">
              <span>{user?.email}</span>
            </div>

            {/* Notifications Menu */}
            <div className="relative">
              <button
                type="button"
                className="relative grid h-9 w-9 place-items-center rounded-lg border border-app-border text-app-text-muted hover:bg-app-secondary hover:text-app-text transition-colors"
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <FiBell size={17} />
                {notificationData?.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-gold px-1 text-[10px] font-bold text-brand-midnight">
                    {notificationData.unreadCount > 9 ? '9+' : notificationData.unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <section
                  className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl border border-app-border bg-app-surface p-0 shadow-xl overflow-hidden animate-scale-in"
                  aria-label="Notifications"
                >
                  <header className="flex items-center justify-between border-b border-app-border bg-app-secondary/40 px-4 py-3">
                    <strong className="text-xs font-bold text-app-text uppercase tracking-wider">
                      Workspace Notifications
                    </strong>
                    <button
                      type="button"
                      className="text-xs text-brand-teal hover:underline disabled:opacity-50 font-medium"
                      onClick={() => markAllRead.mutate()}
                      disabled={!notificationData?.unreadCount}
                    >
                      Mark all as read
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
                            !item.readAt ? 'bg-brand-teal/5' : ''
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
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-gold" />
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
