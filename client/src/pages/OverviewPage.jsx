import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiBox, FiLayers, FiUsers, FiCreditCard } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { ThreeDCard } from '../components/aceternity/ThreeDCard.jsx';
import { ThreeBackground } from '../components/ThreeBackground.jsx';
import { Spotlight } from '../components/aceternity/Spotlight.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { api, unwrap } from '../services/api.js';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const revenueData = [{ name: 'Mon', value: 0 }, { name: 'Tue', value: 0 }, { name: 'Wed', value: 0 }, { name: 'Thu', value: 0 }, { name: 'Fri', value: 0 }];

export function OverviewPage() {
  const products = useQuery({ queryKey: ['products', 'overview'], queryFn: () => api.get('/products', { params: { limit: 1 } }).then(unwrap) });
  const plans = useQuery({ queryKey: ['plans', 'overview'], queryFn: () => api.get('/plans').then(unwrap) });

  const stats = [
    { icon: FiBox, label: 'Products', value: products.data?.products?.length ?? '—' },
    { icon: FiLayers, label: 'Plans', value: plans.data?.plans?.length ?? '—' },
    { icon: FiUsers, label: 'Customers', value: '—' },
    { icon: FiCreditCard, label: 'MRR', value: '—' },
  ];

  return (
    <PageTransition className="relative">
      <ThreeBackground />
      <Spotlight />
      <PageHeader eyebrow="OVERVIEW" title="Workspace dashboard" description="Operational snapshot of your subscription business." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <ThreeDCard key={label}>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-app-muted">{label}</CardTitle>
                <Icon className="h-4 w-4 text-app-accent" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold text-app-text">{value}</p>
              </CardContent>
            </Card>
          </ThreeDCard>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--color-text-muted)" />
                <YAxis stroke="var(--color-text-muted)" />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="var(--color-accent)" fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Getting started</CardTitle></CardHeader>
          <CardContent>
            <EmptyState
              title="Build from the catalog outward"
              description="Create products and variants, configure billing plans, then quotations, subscriptions, invoices, and payments."
            />
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
