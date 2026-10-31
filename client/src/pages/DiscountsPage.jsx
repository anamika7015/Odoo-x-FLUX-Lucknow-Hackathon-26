import React from 'react';
import { FiPercent } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageTransition } from '../components/PageTransition.jsx';

export function DiscountsPage() {
  return (
    <PageTransition>
      <PageHeader eyebrow="PRICING" title="Discounts" description="Manage discount codes, eligibility, and usage limits." />
      <EmptyState icon={FiPercent} title="Discount module backend pending" description="Discount validation and invoice application rules will connect here." />
    </PageTransition>
  );
}
