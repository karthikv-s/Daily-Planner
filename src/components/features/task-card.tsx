'use client';

import { Task, Priority } from '@/types/task';
import { useTaskStore } from '@/store/useTaskStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { CheckCircle2, Circle, MoreVertical, Trash, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import confetti from 'canvas-confetti';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

const priorityColors: Record<Priority, string> = {
  P0: 'bg-[var(--color-priority-0)] text-white shadow-sm',
  P1: 'bg-[var(--color-priority-1)] text-white shadow-sm',
  P2: 'bg-[var(--color-priority-2)] text-white shadow-sm',
};

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const { toggleComplete, deleteTask } = useTaskStore();

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.completed) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x, y },
        colors: ['#a855f7', '#ec4899', '#3b82f6'],
      });
    }
    toggleComplete(task.id);
  };

  const isOverdue = task.dueTime && new Date(task.dueTime) < new Date() && !task.completed;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`group relative p-4 transition-all hover:shadow-md ${task.completed ? 'opacity-60 bg-muted/50' : 'bg-card'} ${isOverdue ? 'border-destructive/50' : ''}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={handleComplete}
            className="mt-1 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
            aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
          >
            {task.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5" />}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>
              <h3 className={`font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </h3>
            </div>
            
            {task.description && (
              <p className={`text-sm line-clamp-2 mb-2 ${task.completed ? 'text-muted-foreground/70 line-through' : 'text-muted-foreground'}`}>
                {task.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {task.dueTime && (
                <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                  Due: {format(new Date(task.dueTime), 'MMM d, h:mm a')}
                </span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100">
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit2 className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    </motion.div>
  );
}
