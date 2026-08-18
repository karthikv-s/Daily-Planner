'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { rehydrateTaskStore } from '@/store/useTaskStore';
import { getCurrentUser } from '@/app/auth/actions';

import { fetchUserTasksAction } from '@/app/tasks/actions';
import { useTaskStore } from '@/store/useTaskStore';

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
          if (userId) {
            const cloudRes = await fetchUserTasksAction();
            if (cloudRes.success && cloudRes.data) {
              useTaskStore.getState().loadServerState({
                tasks: cloudRes.data.tasks || [],
                xp: cloudRes.data.xp || 0,
                streak: cloudRes.data.streak || 0,
                bestStreak: cloudRes.data.bestStreak || 0,
                lastCompletedDate: cloudRes.data.lastCompletedDate || null,
                badges: cloudRes.data.badges || [],
              });
            }
          }
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
        await rehydrateTaskStore(session.user.id);
      } else {
        const user = await getCurrentUser();
        await rehydrateTaskStore(user?.id || user?.identifier || null);
      }
      const cloudRes = await fetchUserTasksAction();
      if (cloudRes.success && cloudRes.data) {
        useTaskStore.getState().loadServerState({
          tasks: cloudRes.data.tasks || [],
          xp: cloudRes.data.xp || 0,
          streak: cloudRes.data.streak || 0,
          bestStreak: cloudRes.data.bestStreak || 0,
          lastCompletedDate: cloudRes.data.lastCompletedDate || null,
          badges: cloudRes.data.badges || [],
        });
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
