import React from 'react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FiBarChart2, FiBell, FiCheck, FiCreditCard, FiFile, FiFileText, FiGrid, FiLayers, FiLogOut, FiPackage, FiPercent,
  FiSettings, FiShoppingBag, FiTag, FiUsers,
} from 'react-icons/fi';
import { ThemeSelect } from '../components/ThemeSelect.jsx';
import { api, errorMessage } from '../services/api.js';
import { clearUser } from '../store/store.js';
import { Button } from '../components/ui/Button.jsx';

const links = [
  { to: '/', label: 'Overview', icon: FiGrid, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
  { to: '/customers', label: 'Customers', icon: FiUsers, roles: ['ADMIN', 'STAFF'] },
  { to: '/products', label: 'Products', icon: FiPackage, roles: ['ADMIN', 'STAFF'] },
  { to: '/plans', label: 'Plans', icon: FiLayers, roles: ['ADMIN', 'STAFF'] },
  { to: '/quotations', label: 'Quotations', icon: FiFileText, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
  { to: '/subscriptions', label: 'Subscriptions', icon: FiShoppingBag, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
  { to: '/invoices', label: 'Invoices', icon: FiFile, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
  { to: '/payments', label: 'Payments', icon: FiCreditCard, roles: ['ADMIN', 'STAFF', 'CUSTOMER'] },
  { to: '/discounts', label: 'Discounts', icon: FiPercent, roles: ['ADMIN'] },
  { to: '/taxes', label: 'Tax Configuration', icon: FiTag, roles: ['ADMIN'] },
  { to: '/reports', label: 'Reports', icon: FiBarChart2, roles: ['ADMIN', 'STAFF'] },
  { to: '/settings', label: 'Settings', icon: FiSettings, roles: ['ADMIN'] },
];

export function AppLayout() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
  const visibleLinks = links.filter((link) => link.roles.includes(user?.role));
  const logout = async () => {
    try {
      await api.post('/auth/logout');
      dispatch(clearUser());
      navigate('/login');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand">
          <span>B</span>
          <div>Brightloop <small>Software</small></div>
        </div>
        <nav>
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={18} />{user?.role === 'CUSTOMER' && to === '/' ? 'My account' : label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ThemeSelect />
          <div className="user-summary">
            <div className="avatar">{user?.fullName?.slice(0, 1)}</div>
            <div>
              <strong>{user?.fullName}</strong>
              <small>{user?.role}</small>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="justify-start px-0 text-app-muted">
            <FiLogOut size={17} />Sign out
          </Button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Brightloop workspace</p>
            <h1>Subscription Operations</h1>
          </div>
          <div className="topbar-icons">
            <span className="text-sm text-app-muted">{user?.email}</span>
            <div className="notification-area">
              <button className="notification-trigger" type="button" aria-label="Notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
                <FiBell size={18} />
                {notificationData?.unreadCount > 0 && <span className="notification-count">{notificationData.unreadCount > 9 ? '9+' : notificationData.unreadCount}</span>}
              </button>
              {notificationsOpen && <section className="notification-menu" aria-label="Notifications">
                <header><strong>Notifications</strong><button type="button" onClick={() => markAllRead.mutate()} disabled={!notificationData?.unreadCount}>Mark all read</button></header>
                {!notificationData?.items?.length ? <p className="notification-empty">You’re all caught up.</p> : notificationData.items.map((item) => (
                  <button className={`notification-item ${item.readAt ? '' : 'unread'}`} type="button" key={item._id} onClick={() => {
                    if (!item.readAt) markRead.mutate(item._id);
                    setNotificationsOpen(false);
                    if (item.href) navigate(item.href);
                  }}>
                    <span><strong>{item.title}</strong><small>{item.message}</small></span>
                    {!item.readAt && <FiCheck size={15} aria-label="Unread" />}
                  </button>
                ))}
              </section>}
            </div>
          </div>
        </header>
        <div className="page-wrap">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
