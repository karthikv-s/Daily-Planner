'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { rehydrateTaskStore } from '@/store/useTaskStore';
import { getCurrentUser } from '@/app/auth/actions';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;

    async function syncUserStore() {
      try {
        const user = await getCurrentUser();
        const userId = user?.id || user?.identifier || null;
        if (active) {
          await rehydrateTaskStore(userId);
          setIsReady(true);
        }
      } catch (err) {
        if (active) {
          await rehydrateTaskStore(null);
          setIsReady(true);
        }
      }
    }

    syncUserStore();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.id) {
        rehydrateTaskStore(session.user.id);
      } else {
        const user = await getCurrentUser();
        rehydrateTaskStore(user?.id || user?.identifier || null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center w-full bg-background text-foreground">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
