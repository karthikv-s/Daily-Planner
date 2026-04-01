'use client';

import { Task, Priority } from '@/types/task';
import { useTaskStore } from '@/store/useTaskStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';

interface TaskDialogProps {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDialog({ task, open, onOpenChange }: TaskDialogProps) {
  const { addTask, updateTask } = useTaskStore();
  const isEditing = !!task;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('P1');
  const [dueTime, setDueTime] = useState('');

  useEffect(() => {
    if (open) {
      if (isEditing && task) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle(task.title);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDescription(task.description || '');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPriority(task.priority);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDueTime(task.dueTime ? new Date(task.dueTime).toISOString().slice(0, 16) : '');
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle('');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDescription('');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPriority('P1');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDueTime('');
      }
    }
  }, [open, isEditing, task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title,
      description,
      priority,
      dueTime: dueTime ? new Date(dueTime).toISOString() : null,
    };

    if (isEditing && task) {
      updateTask(task.id, payload);
    } else {
      addTask(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Add more details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="P0">P0 - Urgent</option>
                <option value="P1">P1 - High</option>
                <option value="P2">P2 - Normal</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueTime">Due Date</Label>
              <Input
                id="dueTime"
                type="datetime-local"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md">
              {isEditing ? 'Save Changes' : 'Add Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
