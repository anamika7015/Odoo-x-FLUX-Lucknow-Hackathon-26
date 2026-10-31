import React from 'react';
import { FiTag } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageTransition } from '../components/PageTransition.jsx';

export function TaxesPage() {
  return (
    <PageTransition>
      <PageHeader eyebrow="COMPLIANCE" title="Tax Configuration" description="Configure tax rates and effective date ranges." />
      <EmptyState icon={FiTag} title="Tax module backend pending" description="Tax calculation and invoice snapshots will be enabled in a later phase." />
    </PageTransition>
  );
}
