import { LogOut, Package, LayoutDashboard, ReceiptText, Settings, Users, Layers3 } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'sonner';
import { ThemeSelect } from '../components/ThemeSelect.jsx';
import { api, errorMessage } from '../services/api.js';
import { clearUser } from '../store/store.js';
const links = [{ to: '/', label: 'Overview', icon: LayoutDashboard }, { to: '/products', label: 'Products', icon: Package }, { to: '/plans', label: 'Plans', icon: Layers3 }];
export function AppLayout() { const user = useSelector((state) => state.auth.user); const dispatch = useDispatch(); const navigate = useNavigate(); const logout = async () => { try { await api.post('/auth/logout'); dispatch(clearUser()); navigate('/login'); } catch (error) { toast.error(errorMessage(error)); } }; return <div className="workspace"><aside className="sidebar"><div className="brand"><span>B</span><div>Brightloop <small>Software</small></div></div><nav>{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'}><Icon size={18} />{label}</NavLink>)}</nav><div className="sidebar-bottom"><ThemeSelect /><div className="user-summary"><div className="avatar">{user.fullName?.slice(0, 1)}</div><div><strong>{user.fullName}</strong><small>{user.role}</small></div></div><button className="text-button" onClick={logout}><LogOut size={17} />Sign out</button></div></aside><main className="main-content"><header className="topbar"><div><p className="eyebrow">Brightloop workspace</p><h1>Subscription Operations</h1></div><div className="topbar-icons"><Users size={19} /><ReceiptText size={19} /><Settings size={19} /></div></header><Outlet /></main></div>; }
