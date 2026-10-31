import React, { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api, initializeCsrf } from './services/api.js';
import { clearUser, setUser } from './store/store.js';
import { Loading } from './components/Loading.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';
import { AuthPage } from './pages/AuthPage.jsx';
import { OverviewPage } from './pages/OverviewPage.jsx';
import { ProductsPage } from './pages/ProductsPage.jsx';
import { PlansPage } from './pages/PlansPage.jsx';
import { CustomersPage } from './pages/CustomersPage.jsx';
import { QuotationsPage } from './pages/QuotationsPage.jsx';
import { SubscriptionsPage } from './pages/SubscriptionsPage.jsx';
import { InvoicesPage } from './pages/InvoicesPage.jsx';
import { PaymentsPage } from './pages/PaymentsPage.jsx';
import { DiscountsPage } from './pages/DiscountsPage.jsx';
import { TaxesPage } from './pages/TaxesPage.jsx';
import { ReportsPage } from './pages/ReportsPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { CustomerPortalPage } from './pages/CustomerPortalPage.jsx';

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
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route element={<Protected><AppLayout /></Protected>}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/quotations" element={<QuotationsPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/discounts" element={<DiscountsPage />} />
        <Route path="/taxes" element={<TaxesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/portal" element={<CustomerPortalPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return <Bootstrap />;
}
