import type { Metadata } from 'next';
import { SfxTable } from '@/components/features/audio-library/SfxTable';

export const metadata: Metadata = {
  title: 'SFX Library'
};

export default function SfxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sound Effects</h1>
        <p className="text-muted-foreground">Manage SFX audio assets</p>
      </div>

      <SfxTable />
    </div>
  );
}
