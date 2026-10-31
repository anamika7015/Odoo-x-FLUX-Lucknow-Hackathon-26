import { FiFile } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageTransition } from '../components/PageTransition.jsx';

export function InvoicesPage() {
  return (
    <PageTransition>
      <PageHeader eyebrow="BILLING" title="Invoices" description="Generate, confirm, and track invoices and outstanding balances." />
      <EmptyState icon={FiFile} title="Invoice engine backend pending" description="Automated invoice generation, PDF export, and tax snapshots will connect here." />
    </PageTransition>
  );
}
