import React, { useEffect, useState } from 'react';
import { z } from 'zod';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Shield, User, Users, Sparkles, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { api, errorMessage } from '../services/api.js';
import { setUser } from '../store/store.js';
import { ThemeSelect } from '../components/ThemeSelect.jsx';
import { ThreeBackground } from '../components/ThreeBackground.jsx';
import { Spotlight } from '../components/aceternity/Spotlight.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Primitives.jsx';

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name.'),
    email: z.string().trim().email('Enter a valid email address.'),
    password: z.string().regex(passwordRule, 'Use at least 8 characters with uppercase, lowercase, and a special character.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
const emailSchema = z.object({ email: z.string().trim().email('Enter a valid email address.') });
const resetSchema = z
  .object({
    password: z.string().regex(passwordRule, 'Use at least 8 characters with uppercase, lowercase, and a special character.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
const emptyForm = { fullName: '', email: '', password: '', confirmPassword: '' };

export function AuthPage({ mode: initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const registering = mode === 'register';
  const recovering = mode === 'forgot';
  const resetting = mode === 'reset';
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoAvailability, setDemoAvailability] = useState({ ADMIN: false, STAFF: false, CUSTOMER: false, loading: true });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    api
      .get('/auth/demo-config')
      .then((response) => setDemoAvailability({ ...response.data.data.roles, loading: false }))
      .catch(() => setDemoAvailability({ ADMIN: false, STAFF: false, CUSTOMER: false, loading: false }));
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
    const result = schema.safeParse(
      registering || resetting ? form : recovering ? { email: form.email } : { email: form.email, password: form.password }
    );
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
      const payload = registering
        ? { fullName: result.data.fullName, email, password, confirmPassword: result.data.confirmPassword }
        : { email, password };
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
      toast.success(`${role === 'ADMIN' ? 'Admin' : role === 'STAFF' ? 'Staff' : 'Customer'} demo account ready.`);
      navigate(role === 'CUSTOMER' ? '/portal' : location.state?.from?.pathname || '/', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page relative min-h-screen overflow-hidden bg-app-background flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <ThreeBackground variant="hero" />
      <Spotlight />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-12">
        {/* Left Hero Branded Showcase */}
        <PageTransition className="hidden max-w-lg lg:block">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-indigo to-brand-violet text-white shadow-btn-primary shadow-brand-indigo/30">
                <span className="font-extrabold text-xl tracking-wider text-white">B</span>
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tight text-app-text">Brightloop</span>
                <span className="block text-[11px] font-bold uppercase tracking-widest text-brand-violet dark:text-brand-violet-light">
                  Enterprise Billing SaaS
                </span>
              </div>
            </div>

            <h1 className="text-4xl font-extrabold text-app-text tracking-tight leading-tight">
              Subscription operations,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-indigo to-brand-violet">
                beautifully orchestrated.
              </span>
            </h1>

            <p className="text-sm text-app-text-muted leading-relaxed max-w-md">
              Manage multi-tier plans, dynamic recurring subscriptions, tax compliance, itemized invoices, and real-time revenue analytics in one unified fintech workspace.
            </p>

            <div className="pt-2 space-y-2.5">
              {[
                'Automated recurring billing cycles & pro-rata calculations',
                'Enterprise tax and discount rules engine',
                'Client self-service portal with instant PDF generation',
              ].map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-app-text font-medium">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-violet/15 text-brand-violet">
                    <CheckCircle2 size={13} strokeWidth={2.5} />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </PageTransition>

        {/* Right Form Card */}
        <PageTransition className="w-full max-w-md mx-auto lg:mx-0">
          <section className="rounded-2xl border border-app-border bg-app-surface/95 p-7 sm:p-8 shadow-modal backdrop-blur-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold tracking-widest text-brand-violet dark:text-brand-violet-light uppercase">
                  OBSIDIAN ACCESS
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-app-text tracking-tight">
                  {registering
                    ? 'Create workspace account'
                    : recovering
                    ? 'Reset your password'
                    : resetting
                    ? 'Choose new password'
                    : 'Welcome back'}
                </h2>
                <p className="mt-1 text-xs text-app-text-muted leading-relaxed">
                  {registering
                    ? 'Start managing subscription operations securely.'
                    : recovering
                    ? 'We will send a reset link if the account is registered.'
                    : resetting
                    ? 'Reset tokens expire after one hour.'
                    : 'Sign in to access your Brightloop workspace.'}
                </p>
              </div>
              <ThemeSelect />
            </div>

            <form className="space-y-4" onSubmit={submit} noValidate>
              {registering && (
                <Field label="Full name" error={errors.fullName}>
                  <Input name="fullName" value={form.fullName} onChange={updateField} autoComplete="name" required />
                </Field>
              )}
              {!resetting && (
                <Field label="Email address" error={errors.email}>
                  <Input type="email" name="email" value={form.email} onChange={updateField} autoComplete="email" required />
                </Field>
              )}
              {!recovering && (
                <Field label="Password" error={errors.password}>
                  <Input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={updateField}
                    autoComplete={registering || resetting ? 'new-password' : 'current-password'}
                    required
                  />
                </Field>
              )}
              {(registering || resetting) && (
                <Field label="Confirm password" error={errors.confirmPassword}>
                  <Input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={updateField}
                    autoComplete="new-password"
                    required
                  />
                </Field>
              )}
              {recovering && (
                <p className="text-[11px] text-app-text-muted">
                  Password reset email delivery requires server SMTP credentials.
                </p>
              )}

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={isSubmitting || (resetting && !searchParams.get('token'))}
              >
                {isSubmitting ? (
                  'Please wait…'
                ) : registering ? (
                  'Create Account'
                ) : recovering ? (
                  'Send Reset Link'
                ) : resetting ? (
                  'Update Password'
                ) : (
                  'Sign In to Workspace'
                )}
              </Button>
            </form>

            {mode === 'login' && (
              <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  className="font-semibold text-app-text-muted hover:text-brand-indigo dark:hover:text-brand-violet-light transition-colors"
                  onClick={() => {
                    setMode('register');
                    setForm(emptyForm);
                    setErrors({});
                  }}
                >
                  Need an account? Register
                </button>
                <button
                  type="button"
                  className="font-semibold text-app-text-muted hover:text-brand-indigo dark:hover:text-brand-violet-light transition-colors"
                  onClick={() => {
                    setMode('forgot');
                    setForm(emptyForm);
                    setErrors({});
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {mode === 'login' && (
              <div className="mt-6 border-t border-app-border pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted">
                    Instant Demo Accounts
                  </h3>
                  <span className="text-[10px] font-semibold text-brand-violet bg-brand-violet/10 px-2 py-0.5 rounded-full">
                    1-Click Access
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    ['ADMIN', 'Admin demo', Shield, 'Complete control'],
                    ['STAFF', 'Staff demo', Users, 'Daily operations'],
                    ['CUSTOMER', 'Client demo', User, 'Customer portal'],
                  ].map(([role, label, Icon, description]) => (
                    <div
                      key={role}
                      className="rounded-xl border border-app-border bg-app-secondary/40 p-2.5 transition-colors hover:border-brand-violet/40"
                    >
                      <div className="flex items-center gap-1.5 text-app-text">
                        <Icon size={14} className="text-brand-indigo dark:text-brand-violet-light shrink-0" />
                        <span className="text-xs font-bold truncate">{label}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-app-text-muted truncate">{description}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full text-[11px] h-7 px-2"
                        disabled={isSubmitting || demoAvailability.loading || !demoAvailability[role]}
                        onClick={() => signInToDemo(role)}
                      >
                        {demoAvailability.loading ? 'Checking…' : demoAvailability[role] ? 'Launch' : 'Unavailable'}
                      </Button>
                    </div>
                  ))}
                </div>
                {!demoAvailability.loading &&
                  !demoAvailability.ADMIN &&
                  !demoAvailability.STAFF &&
                  !demoAvailability.CUSTOMER && (
                    <p className="mt-2.5 text-[11px] text-app-text-muted text-center">
                      Demo accounts available once server database is seeded. Regular sign-in remains active.
                    </p>
                  )}
              </div>
            )}

            {mode === 'register' && (
              <button
                type="button"
                className="mt-4 text-xs font-semibold text-app-text-muted hover:text-brand-indigo dark:hover:text-brand-violet-light transition-colors block text-center w-full"
                onClick={toggleMode}
              >
                Already have an account? Sign in
              </button>
            )}

            {(recovering || resetting) && (
              <button
                type="button"
                className="mt-4 text-xs font-semibold text-app-text-muted hover:text-brand-indigo dark:hover:text-brand-violet-light transition-colors block text-center w-full"
                onClick={() => navigate('/login')}
              >
                Back to sign in
              </button>
            )}
          </section>
        </PageTransition>
      </div>
    </main>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-app-text">{label}</span>
      {children}
      {error && <span className="text-[11px] font-medium text-rose-500 block">{error}</span>}
    </label>
  );
}
