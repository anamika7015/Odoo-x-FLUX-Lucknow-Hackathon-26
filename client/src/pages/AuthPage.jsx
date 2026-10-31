import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FiSun, FiMoon } from 'react-icons/fi';
import { api, errorMessage } from '../services/api.js';
import { setUser } from '../store/store.js';
import { ThemeSelect } from '../components/ThemeSelect.jsx';
import { ThreeBackground } from '../components/ThreeBackground.jsx';
import { Spotlight } from '../components/aceternity/Spotlight.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Primitives.jsx';

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const registerSchema = z.object({ fullName: z.string().min(2), email: z.string().email(), password: z.string().regex(passwordRule, 'Use 9+ characters with upper, lower, and special characters.'), confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });

export function AuthPage() {
  const [registering, setRegistering] = useState(false);
  const schema = registering ? registerSchema : loginSchema;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const submit = async (values) => {
    try {
      const response = await api.post(registering ? '/auth/register' : '/auth/login', values);
      dispatch(setUser(response.data.data.user));
      toast.success(registering ? 'Account created.' : 'Welcome back.');
      navigate(location.state?.from?.pathname || '/');
    } catch (error) {
      toast.error(errorMessage(error));
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
                <h2 className="mt-1 text-2xl font-semibold text-app-text">{registering ? 'Create your workspace account' : 'Welcome back'}</h2>
                <p className="mt-1 text-sm text-app-muted">{registering ? 'Start managing your subscription business securely.' : 'Sign in to your Brightloop workspace.'}</p>
              </div>
              <ThemeSelect />
            </div>
            <form className="space-y-4" onSubmit={handleSubmit(submit)}>
              {registering && <Field label="Full name" error={errors.fullName}><Input {...register('fullName')} autoComplete="name" /></Field>}
              <Field label="Email" error={errors.email}><Input type="email" {...register('email')} autoComplete="email" /></Field>
              <Field label="Password" error={errors.password}><Input type="password" {...register('password')} autoComplete={registering ? 'new-password' : 'current-password'} /></Field>
              {registering && <Field label="Confirm password" error={errors.confirmPassword}><Input type="password" {...register('confirmPassword')} autoComplete="new-password" /></Field>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}</Button>
            </form>
            <button className="mt-4 text-sm text-app-muted hover:text-app-accent" onClick={() => setRegistering((value) => !value)}>
              {registering ? 'Already have an account? Sign in' : 'Need an account? Create one'}
            </button>
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
      {error && <em className="text-xs text-red-500">{error.message}</em>}
    </label>
  );
}
