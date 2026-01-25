import type { Metadata } from 'next';
import { StoriesTable } from '@/components/features/stories/StoriesTable';

export const metadata: Metadata = {
  title: 'Stories'
};

export default function StoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Stories</h1>
        <p className="text-muted-foreground text-gray-600">Manage generated stories</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg">
        <StoriesTable />
      </div>
    </div>
  );
}
