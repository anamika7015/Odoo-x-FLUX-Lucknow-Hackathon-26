import React from 'react';
import { FiBarChart2 } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageTransition } from '../components/PageTransition.jsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const data = [{ name: 'Jan', revenue: 0 }, { name: 'Feb', revenue: 0 }, { name: 'Mar', revenue: 0 }];

export function ReportsPage() {
  return (
    <PageTransition>
      <PageHeader eyebrow="ANALYTICS" title="Reports" description="Revenue, subscription growth, and payment trends." />
      <Card className="mb-6">
        <CardHeader><CardTitle>Monthly revenue</CardTitle></CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="var(--color-text-muted)" />
              <YAxis stroke="var(--color-text-muted)" />
              <Tooltip />
              <Bar dataKey="revenue" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <EmptyState icon={FiBarChart2} title="Analytics backend pending" description="Server-side aggregations will populate these charts once reporting endpoints are delivered." />
    </PageTransition>
  );
}
