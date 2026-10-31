import { FiShoppingBag } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageTransition } from '../components/PageTransition.jsx';

export function SubscriptionsPage() {
  return (
    <PageTransition>
      <PageHeader eyebrow="LIFECYCLE" title="Subscriptions" description="Manage subscription status, pause, resume, renew, and closure operations." />
      <EmptyState icon={FiShoppingBag} title="Subscription engine backend pending" description="Lifecycle workflows and recurring billing integration will be enabled in the next backend phase." />
    </PageTransition>
  );
}
