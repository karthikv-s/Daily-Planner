'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useTaskStore } from '@/store/useTaskStore';
import { Trophy, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

export function DailySummaryCard() {
  const { tasks, xp, streak, bestStreak } = useTaskStore();
  const [open, setOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  const activeTasks = tasks.filter(t => !t.completed);

  useEffect(() => {
    // Show summary if there are no active tasks, at least 1 completed task, and we haven't shown it yet
    if (tasks.length > 0 && activeTasks.length === 0 && !hasShown) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
      setHasShown(true);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#6366f1', '#ec4899']
      });
    }
  }, [tasks, activeTasks.length, hasShown]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <div className="mx-auto bg-violet-100 dark:bg-violet-900/30 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-violet-600 dark:text-violet-400" />
          </div>
          <DialogTitle className="text-2xl font-bold">All Tasks Complete! 🎉</DialogTitle>
          <DialogDescription className="text-base mt-2">
            You&apos;ve crushed it today. Here&apos;s your daily summary:
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-6">
          <div className="bg-muted/50 rounded-xl p-4 flex flex-col items-center justify-center border">
            <span className="text-3xl font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
              <Star className="w-5 h-5 fill-violet-600" /> {xp}
            </span>
            <span className="text-sm text-muted-foreground font-medium mt-1">Total XP Earned</span>
          </div>
          <div className="bg-muted/50 rounded-xl p-4 flex flex-col items-center justify-center border">
            <span className="text-3xl font-bold text-orange-500 flex items-center gap-1">
              🔥 {streak}
            </span>
            <span className="text-sm text-muted-foreground font-medium mt-1">Day Streak (Best: {bestStreak})</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground italic border-t pt-4">
          &quot;Success is the sum of small efforts, repeated day in and day out.&quot;
        </p>
      </DialogContent>
    </Dialog>
  );
}
