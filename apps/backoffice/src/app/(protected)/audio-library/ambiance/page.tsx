import type { Metadata } from 'next';
import { AmbianceTable } from '@/components/features/audio-library/AmbianceTable';

export const metadata: Metadata = {
  title: 'Ambiance Library'
};

export default function AmbiancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ambiance</h1>
        <p className="text-muted-foreground">Manage ambient audio assets</p>
      </div>

      <AmbianceTable />
    </div>
  );
}
