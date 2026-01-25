'use client';

import { useRouter } from 'next/navigation';
import { AdminLayout, type AdminLayoutProps } from '@mio/shared/ui';
import { createClient } from '@/lib/supabase/client';

interface AdminLayoutWrapperProps {
  children: React.ReactNode;
  user: AdminLayoutProps['user'];
}

export function AdminLayoutWrapper({ children, user }: AdminLayoutWrapperProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <AdminLayout user={user} onSignOut={handleSignOut}>
      {children}
    </AdminLayout>
  );
}
