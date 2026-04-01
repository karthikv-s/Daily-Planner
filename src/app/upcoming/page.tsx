'use client';
import { useTaskStore } from '@/store/useTaskStore';
import { TaskCard } from '@/components/features/task-card';
import { TaskDialog } from '@/components/features/task-dialog';
import { useState } from 'react';
import { Task } from '@/types/task';

export default function UpcomingPage() {
  const { tasks } = useTaskStore();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const upcomingTasks = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Upcoming Tasks</h1>
        <p className="text-muted-foreground mt-1">Your whole backlog in timeline order.</p>
      </header>
      <div className="space-y-3">
        {upcomingTasks.length === 0 ? (
          <p className="text-muted-foreground italic">No upcoming tasks.</p>
        ) : (
          upcomingTasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={setEditingTask} />
          ))
        )}
      </div>
      <TaskDialog task={editingTask} open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)} />
    </main>
  );
}
