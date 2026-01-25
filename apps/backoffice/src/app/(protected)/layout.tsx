import { redirect } from 'next/navigation';
import { AdminLayoutWrapper } from '@/components/AdminLayoutWrapper';
import { createClient } from '@/lib/supabase/server';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check admin role
  const isAdmin = user.user_metadata?.role === 'admin';
  if (!isAdmin) {
    redirect('/login');
  }

  return (
    <AdminLayoutWrapper
      user={{
        email: user.email ?? '',
        name: user.user_metadata?.name as string | undefined
      }}
    >
      {children}
    </AdminLayoutWrapper>
  );
}
