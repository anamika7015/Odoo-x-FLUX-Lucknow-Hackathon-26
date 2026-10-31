import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api, errorMessage } from '../services/api.js';
import { setUser } from '../store/store.js';
import { ThemeSelect } from '../components/ThemeSelect.jsx';
import { ThreeBackground } from '../components/ThreeBackground.jsx';
import { Spotlight } from '../components/aceternity/Spotlight.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Primitives.jsx';
import { FiShield, FiUser } from 'react-icons/fi';

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
const registerSchema = z.object({ fullName: z.string().trim().min(2, 'Enter your full name.'), email: z.string().trim().email('Enter a valid email address.'), password: z.string().regex(passwordRule, 'Use at least 9 characters with uppercase, lowercase, and a special character.'), confirmPassword: z.string().min(1, 'Confirm your password.') }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
const emailSchema = z.object({ email: z.string().trim().email('Enter a valid email address.') });
const resetSchema = z.object({ password: z.string().regex(passwordRule, 'Use at least 9 characters with uppercase, lowercase, and a special character.'), confirmPassword: z.string().min(1, 'Confirm your password.') }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });
const emptyForm = { fullName: '', email: '', password: '', confirmPassword: '' };

export function AuthPage({ mode: initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const registering = mode === 'register';
  const recovering = mode === 'forgot';
  const resetting = mode === 'reset';
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoAvailability, setDemoAvailability] = useState({ ADMIN: false, CUSTOMER: false, loading: true });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    api.get('/auth/demo-config').then((response) => setDemoAvailability({ ...response.data.data.roles, loading: false })).catch(() => setDemoAvailability({ ADMIN: false, CUSTOMER: false, loading: false }));
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const toggleMode = () => {
    setMode(registering ? 'login' : 'register');
    setForm(emptyForm);
    setErrors({});
  };

  const submit = async (event) => {
    event.preventDefault();
    const schema = registering ? registerSchema : recovering ? emailSchema : resetting ? resetSchema : loginSchema;
    const result = schema.safeParse(registering || resetting ? form : recovering ? { email: form.email } : { email: form.email, password: form.password });
    if (!result.success) {
      const nextErrors = Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
      setErrors(nextErrors);
      toast.error('Check the highlighted fields and try again.');
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      if (recovering) {
        await api.post('/auth/forgot-password', result.data);
        toast.success('If an active account exists, a reset link will be sent to its email address.');
        navigate('/login', { replace: true });
        return;
      }
      if (resetting) {
        await api.post('/auth/reset-password', { ...result.data, token: searchParams.get('token') || '' });
        toast.success('Password updated. Please sign in.');
        navigate('/login', { replace: true });
        return;
      }
      const { email, password } = result.data;
      const payload = registering ? { fullName: result.data.fullName, email, password, confirmPassword: result.data.confirmPassword } : { email, password };
      const response = await api.post(registering ? '/auth/register' : '/auth/login', payload);
      dispatch(setUser(response.data.data.user));
      toast.success(registering ? 'Account created.' : 'Welcome back.');
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (error) {
      const message = errorMessage(error);
      const details = error.response?.data?.error?.details?.fieldErrors;
      if (details) setErrors(Object.fromEntries(Object.entries(details).map(([field, messages]) => [field, messages[0]])));
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInToDemo = async (role) => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/demo-login', { role });
      dispatch(setUser(response.data.data.user));
      toast.success(`${role === 'ADMIN' ? 'Admin' : 'Customer'} demo account ready.`);
      navigate(role === 'CUSTOMER' ? '/portal' : (location.state?.from?.pathname || '/'), { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page relative min-h-screen overflow-hidden bg-app-background">
      <ThreeBackground />
      <Spotlight />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-between gap-10 px-6 py-10">
        <PageTransition className="hidden max-w-lg lg:block">
          <div className="space-y-6">
            <div className="brand text-2xl">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-app-accent text-white">B</span>
              <div>Brightloop <small className="block text-xs uppercase tracking-widest text-app-muted">Software</small></div>
            </div>
            <h1 className="text-4xl font-bold text-app-text">Subscription operations, beautifully orchestrated.</h1>
            <p className="text-app-muted">Manage products, plans, subscriptions, invoices, and revenue in one secure workspace.</p>
          </div>
        </PageTransition>
        <PageTransition className="w-full max-w-md">
          <section className="rounded-2xl border border-app-border bg-app-surface/90 p-8 shadow-xl backdrop-blur">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="eyebrow">SUBSCRIPTION OPERATIONS</p>
                <h2 className="mt-1 text-2xl font-semibold text-app-text">{registering ? 'Create your workspace account' : recovering ? 'Reset your password' : resetting ? 'Choose a new password' : 'Welcome back'}</h2>
                <p className="mt-1 text-sm text-app-muted">{registering ? 'Start managing your subscription business securely.' : recovering ? 'We will send a reset link if the account is active.' : resetting ? 'Reset links expire after one hour.' : 'Sign in to your Brightloop workspace.'}</p>
              </div>
              <ThemeSelect />
            </div>
            <form className="space-y-4" onSubmit={submit} noValidate>
              {registering && <Field label="Full name" error={errors.fullName}><Input name="fullName" value={form.fullName} onChange={updateField} autoComplete="name" required /></Field>}
              {!resetting && <Field label="Email" error={errors.email}><Input type="email" name="email" value={form.email} onChange={updateField} autoComplete="email" required /></Field>}
              {!recovering && <Field label="Password" error={errors.password}><Input type="password" name="password" value={form.password} onChange={updateField} autoComplete={registering || resetting ? 'new-password' : 'current-password'} required /></Field>}
              {(registering || resetting) && <Field label="Confirm password" error={errors.confirmPassword}><Input type="password" name="confirmPassword" value={form.confirmPassword} onChange={updateField} autoComplete="new-password" required /></Field>}
              {recovering && <p className="text-xs text-app-muted">Password reset email requires SMTP to be configured for the server.</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting || (resetting && !searchParams.get('token'))}>{isSubmitting ? 'Please wait…' : registering ? 'Create account' : recovering ? 'Send reset link' : resetting ? 'Update password' : 'Sign in'}</Button>
            </form>
            {mode === 'login' && <div className="mt-4 flex items-center justify-between gap-3"><button type="button" className="text-sm text-app-muted hover:text-app-accent" onClick={() => { setMode('register'); setForm(emptyForm); setErrors({}); }}>Need an account? Create one</button><button type="button" className="text-sm text-app-muted hover:text-app-accent" onClick={() => { setMode('forgot'); setForm(emptyForm); setErrors({}); }}>Forgot password?</button></div>}
            {mode === 'login' && <div className="mt-6 border-t border-app-border pt-5"><h3 className="text-sm font-semibold text-app-text">Explore Demo Accounts</h3><div className="mt-3 grid grid-cols-2 gap-3">
              {[['ADMIN', 'Admin demo', FiShield, 'Complete management dashboard'], ['CUSTOMER', 'Customer demo', FiUser, 'Customer self-service portal']].map(([role, label, Icon, description]) => <div key={role} className="rounded-xl border border-app-border bg-app-secondary/40 p-3"><div className="flex items-center gap-2 text-app-text"><Icon size={15} /><span className="text-xs font-semibold">{label}</span></div><p className="mt-1 min-h-8 text-[11px] leading-4 text-app-muted">{description}</p><Button type="button" variant="outline" size="sm" className="mt-2 w-full" disabled={isSubmitting || demoAvailability.loading || !demoAvailability[role]} onClick={() => signInToDemo(role)}>{demoAvailability.loading ? 'Checking…' : demoAvailability[role] ? 'Demo Login' : 'Unavailable'}</Button></div>)}
            </div>{!demoAvailability.loading && !demoAvailability.ADMIN && !demoAvailability.CUSTOMER && <p className="mt-2 text-xs text-app-muted">Demo access needs server demo credentials and a seeded database. Regular sign-in remains available.</p>}</div>}
            {mode === 'register' && <button type="button" className="mt-4 text-sm text-app-muted hover:text-app-accent" onClick={toggleMode}>Already have an account? Sign in</button>}
            {(recovering || resetting) && <button type="button" className="mt-4 text-sm text-app-muted hover:text-app-accent" onClick={() => navigate('/login')}>Back to sign in</button>}
          </section>
        </PageTransition>
      </div>
    </main>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-app-text">{label}</span>
      {children}
      {error && <em className="text-xs text-red-500">{error}</em>}
    </label>
  );
}
