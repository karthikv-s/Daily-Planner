'use client';

import { TaskList } from '@/components/features/task-list';
import { Button } from '@/components/ui/button';
import { Plus, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { TaskDialog } from '@/components/features/task-dialog';
import { useTaskStore } from '@/store/useTaskStore';
import { DailyBriefing } from '@/components/features/daily-briefing';
import { DailySummaryCard } from '@/components/features/daily-summary-card';
import { useSyncTasks } from '@/hooks/useSyncTasks';

export default function Home() {
  const [createOpen, setCreateOpen] = useState(false);
  const { xp, tasks, streak, bestStreak } = useTaskStore();
  const [isClient, setIsClient] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  useSyncTasks();

  const completedTasks = tasks.filter(t => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);

  if (!isClient) return null; // Prevent hydration mismatch due to localStorage Zustand

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Daily Planner</h1>
          <p className="text-muted-foreground">Manage your tasks, track your streak, and level up!</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            className="p-2.5 rounded-xl bg-muted/50 border hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            <Sun className="h-5 w-5 block dark:hidden text-amber-500" />
            <Moon className="h-5 w-5 hidden dark:block text-violet-400" />
          </button>
          <div className="flex items-center gap-4 bg-muted/50 px-4 py-2 rounded-2xl border">
            <div className="text-sm font-medium">
              <span className="text-muted-foreground mr-1">XP:</span>
              <span className="text-violet-500 font-bold">{xp}</span>
            </div>
            <div className="w-px h-4 bg-border"></div>
            <div className="text-sm font-medium flex items-center gap-1">
              <span className="text-orange-500">🔥</span> Streak: {streak} <span className="text-muted-foreground ml-1 text-xs">(Best: {bestStreak})</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Daily Progress</span>
          <span className="text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <DailyBriefing />

      <div className="flex justify-between items-center pt-4">
        <h2 className="text-xl font-semibold">Your Tasks</h2>
        <Button id="new-task-btn" onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md rounded-full px-6">
          <Plus className="mr-2 h-4 w-4" /> New Task
        </Button>
      </div>

      <TaskList />

      <TaskDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DailySummaryCard />
    </main>
  );
}
