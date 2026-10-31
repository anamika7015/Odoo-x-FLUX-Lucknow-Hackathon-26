import { FiSettings } from 'react-icons/fi';
import { PageHeader } from '../components/PageHeader.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx';
import { PageTransition } from '../components/PageTransition.jsx';

export function SettingsPage() {
  return (
    <PageTransition>
      <PageHeader eyebrow="CONFIGURATION" title="Settings" description="Application and billing configuration." />
      <Card>
        <CardHeader><CardTitle>Workspace settings</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-app-muted">Settings management will be connected to backend configuration endpoints in a later phase.</p></CardContent>
      </Card>
    </PageTransition>
  );
}
