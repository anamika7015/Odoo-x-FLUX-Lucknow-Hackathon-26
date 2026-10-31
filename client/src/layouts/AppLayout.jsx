import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import {
  FiBarChart2, FiCreditCard, FiFile, FiFileText, FiGrid, FiLayers, FiLogOut, FiPackage, FiPercent,
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
  { to: '/quotations', label: 'Quotations', icon: FiFileText, roles: ['ADMIN', 'STAFF'] },
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
              <Icon size={18} />{label}
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
          </div>
        </header>
        <div className="page-wrap">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
