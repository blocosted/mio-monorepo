import type { Metadata } from 'next';
import { ProfilesTable } from '@/components/features/profiles/ProfilesTable';

export const metadata: Metadata = {
  title: 'Profiles'
};

export default function ProfilesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Profiles</h1>
        <p className="text-muted-foreground text-gray-600">Manage child profiles</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg">
        <ProfilesTable />
      </div>
    </div>
  );
}
