import type { Metadata } from 'next';
import { MusicTable } from '@/components/features/audio-library/MusicTable';

export const metadata: Metadata = {
  title: 'Music Library'
};

export default function MusicPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Music</h1>
        <p className="text-muted-foreground">Manage music audio assets</p>
      </div>

      <MusicTable />
    </div>
  );
}
