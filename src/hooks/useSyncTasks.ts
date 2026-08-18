'use client';

import { useEffect, useRef } from 'react';
import { useTaskStore } from '@/store/useTaskStore';
import { fetchUserTasksAction, syncUserTasksAction } from '@/app/tasks/actions';

export function useSyncTasks() {
  const { tasks, xp, streak, bestStreak, lastCompletedDate, badges, loadServerState, isCloudSyncEnabled } = useTaskStore();
  const isInitialMount = useRef(true);

  // 1. Initial fetch & Tab focus sync from server
  useEffect(() => {
    async function pullCloudTasks() {
      if (!isCloudSyncEnabled) return;
      const res = await fetchUserTasksAction();
      if (res.success && res.data) {
        loadServerState({
          tasks: res.data.tasks || [],
          xp: res.data.xp || 0,
          streak: res.data.streak || 0,
          bestStreak: res.data.bestStreak || 0,
          lastCompletedDate: res.data.lastCompletedDate || null,
          badges: res.data.badges || [],
        });
      }
    }

    pullCloudTasks();

    const handleFocus = () => {
      pullCloudTasks();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadServerState, isCloudSyncEnabled]);

  // 2. Automatically push local updates to server store when tasks/stats change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!isCloudSyncEnabled) return;

    const timer = setTimeout(() => {
      syncUserTasksAction({
        tasks,
        xp,
        streak,
        bestStreak,
        lastCompletedDate,
        badges,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [tasks, xp, streak, bestStreak, lastCompletedDate, badges, isCloudSyncEnabled]);
}

