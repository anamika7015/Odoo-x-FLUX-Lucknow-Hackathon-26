import React from 'react';
import { FiCreditCard } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageTransition } from '../components/PageTransition.jsx';

export function PaymentsPage() {
  return (
    <PageTransition>
      <PageHeader eyebrow="RECONCILIATION" title="Payments" description="Record and reconcile payments against invoices." />
      <EmptyState icon={FiCreditCard} title="Payment module backend pending" description="Payment recording, partial payments, and reconciliation rules will be enabled next." />
    </PageTransition>
  );
}
