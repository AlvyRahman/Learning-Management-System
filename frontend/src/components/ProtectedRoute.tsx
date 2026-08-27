'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Role } from '@/lib/types';

export default function ProtectedRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (role && !roles.includes(role)) {
      router.replace('/');
      return;
    }
  }, [user, loading, role, router, roles]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (role && !roles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}