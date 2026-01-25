import type { Metadata } from 'next';
import { VoicesTable } from '@/components/features/voices/VoicesTable';

export const metadata: Metadata = {
  title: 'Voices'
};

export default function VoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Voices</h1>
        <p className="text-muted-foreground">Manage ElevenLabs voice registry</p>
      </div>

      <VoicesTable />
    </div>
  );
}
