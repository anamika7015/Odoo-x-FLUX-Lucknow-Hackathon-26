import React from 'react';
import { FiUser } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { PageTransition } from '../components/PageTransition.jsx';

export function CustomerPortalPage() {
  return (
    <PageTransition>
      <PageHeader eyebrow="CUSTOMER PORTAL" title="My account" description="View your subscription, invoices, and payment history." />
      <Card>
        <CardHeader><CardTitle>Customer self-service</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-app-muted">Customer-specific subscription, invoice, and payment views will be connected to dedicated endpoints.</p></CardContent>
      </Card>
    </PageTransition>
  );
}
