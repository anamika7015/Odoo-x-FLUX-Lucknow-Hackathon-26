import React from 'react';
import { FiFileText } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageTransition } from '../components/PageTransition.jsx';

export function QuotationsPage() {
  return (
    <PageTransition>
      <PageHeader eyebrow="SALES" title="Quotations" description="Create, send, and convert quotations into subscriptions." />
      <EmptyState icon={FiFileText} title="Quotation module backend pending" description="Quotation templates, status workflows, and conversion rules will connect here when the backend phase is delivered." />
    </PageTransition>
  );
}
