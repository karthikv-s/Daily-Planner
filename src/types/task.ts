export type Priority = 'P0' | 'P1' | 'P2';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueTime?: string | null; // ISO string for persistence
  priority: Priority;
  completed: boolean;
  notes?: string;
  createdAt: string; // ISO string for persistence
}
