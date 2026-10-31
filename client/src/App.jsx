import React, { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api, initializeCsrf } from './services/api.js';
import { clearUser, setUser } from './store/store.js';
import { Loading } from './components/Loading.jsx';
const AppLayout = lazy(() => import('./layouts/AppLayout.jsx').then((module) => ({ default: module.AppLayout })));
const AuthPage = lazy(() => import('./pages/AuthPage.jsx').then((module) => ({ default: module.AuthPage })));
const OverviewPage = lazy(() => import('./pages/OverviewPage.jsx').then((module) => ({ default: module.OverviewPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage.jsx').then((module) => ({ default: module.ProductsPage })));
const PlansPage = lazy(() => import('./pages/PlansPage.jsx').then((module) => ({ default: module.PlansPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage.jsx').then((module) => ({ default: module.CustomersPage })));
const QuotationsPage = lazy(() => import('./pages/QuotationsPage.jsx').then((module) => ({ default: module.QuotationsPage })));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage.jsx').then((module) => ({ default: module.SubscriptionsPage })));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage.jsx').then((module) => ({ default: module.InvoicesPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage.jsx').then((module) => ({ default: module.PaymentsPage })));
const DiscountsPage = lazy(() => import('./pages/DiscountsPage.jsx').then((module) => ({ default: module.DiscountsPage })));
const TaxesPage = lazy(() => import('./pages/TaxesPage.jsx').then((module) => ({ default: module.TaxesPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx').then((module) => ({ default: module.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx').then((module) => ({ default: module.SettingsPage })));
const CustomerPortalPage = lazy(() => import('./pages/CustomerPortalPage.jsx').then((module) => ({ default: module.CustomerPortalPage })));

function Protected({ children }) {
  const { user, initialized } = useSelector((state) => state.auth);
  const location = useLocation();
  if (!initialized) return <Loading />;
  return user ? children : <Navigate to="/login" replace state={{ from: location }} />;
}

function Bootstrap() {
  const dispatch = useDispatch();
  useEffect(() => {
    const expire = () => dispatch(clearUser());
    window.addEventListener('brightloop:session-expired', expire);
    (async () => {
      try {
        await initializeCsrf();
        const response = await api.get('/auth/me');
        dispatch(setUser(response.data.data.user));
      } catch {
        dispatch(clearUser());
      }
    })();
    return () => window.removeEventListener('brightloop:session-expired', expire);
  }, [dispatch]);

  return (
    <Suspense fallback={<Loading />}><Routes>
      <Route path="/login" element={<AuthPage key="login" />} />
      <Route path="/forgot-password" element={<AuthPage key="forgot" mode="forgot" />} />
      <Route path="/reset-password" element={<AuthPage key="reset" mode="reset" />} />
      <Route element={<Protected><AppLayout /></Protected>}>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/customers" element={<RolesOnly roles={['ADMIN', 'STAFF']}><CustomersPage /></RolesOnly>} />
        <Route path="/products" element={<RolesOnly roles={['ADMIN', 'STAFF']}><ProductsPage /></RolesOnly>} />
        <Route path="/plans" element={<RolesOnly roles={['ADMIN', 'STAFF']}><PlansPage /></RolesOnly>} />
        <Route path="/quotations" element={<QuotationsPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/discounts" element={<RolesOnly roles={['ADMIN']}><DiscountsPage /></RolesOnly>} />
        <Route path="/taxes" element={<RolesOnly roles={['ADMIN']}><TaxesPage /></RolesOnly>} />
        <Route path="/reports" element={<RolesOnly roles={['ADMIN', 'STAFF']}><ReportsPage /></RolesOnly>} />
        <Route path="/settings" element={<RolesOnly roles={['ADMIN']}><SettingsPage /></RolesOnly>} />
        <Route path="/portal" element={<RolesOnly roles={['CUSTOMER']}><CustomerPortalPage /></RolesOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></Suspense>
  );
}

function HomeRoute() {
  const user = useSelector((state) => state.auth.user);
  return user?.role === 'CUSTOMER' ? <CustomerPortalPage /> : <OverviewPage />;
}

function RolesOnly({ children, roles }) {
  const user = useSelector((state) => state.auth.user);
  return roles.includes(user?.role) ? children : <Navigate to="/" replace />;
}

export function App() {
  return <Bootstrap />;
}
