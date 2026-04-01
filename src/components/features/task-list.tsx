'use client';

import { useTaskStore } from '@/store/useTaskStore';
import { TaskCard } from './task-card';
import { Task, Priority } from '@/types/task';
import { useState, useEffect } from 'react';
import { TaskDialog } from './task-dialog';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const PRIORITIES: Priority[] = ['P0', 'P1', 'P2'];

export function TaskList() {
  const { tasks, moveTask } = useTaskStore();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setIsMounted(true); }, []);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const taskId = result.draggableId;
    const destPriority = result.destination.droppableId as Priority;
    const destIndex = result.destination.index;
    moveTask(taskId, destPriority, destIndex);
  };

  if (!isMounted) return null; // Avoid SSR hydration issues with DnD

  const completedTasks = tasks.filter((t) => t.completed).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-8">
      <TaskDialog task={editingTask} open={!!editingTask} onOpenChange={(open: boolean) => !open && setEditingTask(null)} />
      
      <DragDropContext onDragEnd={onDragEnd}>
        {PRIORITIES.map((priority) => {
          const pTasks = tasks.filter((t) => t.priority === priority && !t.completed);
          if (pTasks.length === 0 && priority !== 'P0') return null; // Always show P0 to encourage filling it

          return (
            <div key={priority} className="space-y-3">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1">
                {priority === 'P0' ? '🚨 P0 - Urgent' : priority === 'P1' ? '⚡ P1 - High' : '☕ P2 - Normal'}
              </h3>
              <Droppable droppableId={priority}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="min-h-[10px]">
                    {pTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 ${snapshot.isDragging ? 'z-50 opacity-90 scale-[1.02] shadow-xl' : ''}`}
                          >
                            <TaskCard task={task} onEdit={setEditingTask} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </DragDropContext>

      {completedTasks.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-dashed">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1">Completed</h3>
          {completedTasks.map((task) => (
            <div key={task.id} className="mb-3 opacity-60 hover:opacity-100 transition-opacity">
              <TaskCard task={task} onEdit={setEditingTask} />
            </div>
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl border-muted">
          <p className="font-medium text-foreground">No tasks yet</p>
          <p className="text-sm">Create one to get started!</p>
        </div>
      )}
    </div>
  );
}
