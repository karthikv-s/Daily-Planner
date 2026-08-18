import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Task, Priority } from '../types/task';
import { toast } from 'sonner';

interface TaskState {
  tasks: Task[];
  xp: number;
  streak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  badges: string[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  moveTask: (taskId: string, destPriority: Priority, destIndex: number) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  isCloudSyncEnabled: boolean;
  setCloudSync: (enabled: boolean) => void;
  loadServerState: (data: Partial<TaskState>) => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      xp: 0,
      streak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      badges: [],
      isCloudSyncEnabled: true,
      setCloudSync: (enabled) => set({ isCloudSyncEnabled: enabled }),
      loadServerState: (data) => set((state) => ({ ...state, ...data })),
      addTask: (task) => {
        set((state) => {
          const newTasks = [
            { ...task, id: crypto.randomUUID(), createdAt: new Date().toISOString(), completed: false },
            ...state.tasks,
          ];
          if (newTasks.length === 1 && !state.badges.includes('First Task')) {
            toast.success('Badge Unlocked: First Task! 🏆', { duration: 4000 });
            return { tasks: newTasks, badges: [...state.badges, 'First Task'] };
          }
          return { tasks: newTasks };
        });
      },
      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),
      moveTask: (taskId, destPriority, destIndex) => {
        set((state) => {
          const newTasks = [...state.tasks];
          const taskIndex = newTasks.findIndex((t) => t.id === taskId);
          if (taskIndex === -1) return state;
          const [task] = newTasks.splice(taskIndex, 1);
          task.priority = destPriority;
          let count = 0;
          let inserted = false;
          for (let i = 0; i < newTasks.length; i++) {
            if (newTasks[i].priority === destPriority && !newTasks[i].completed) {
              if (count === destIndex) {
                newTasks.splice(i, 0, task);
                inserted = true;
                break;
              }
              count++;
            }
          }
          if (!inserted) newTasks.push(task);
          return { tasks: newTasks };
        });
      },
      toggleComplete: (id) => {
        set((state) => {
          let gainedXp = 0;
          let newStreak = state.streak;
          let newBestStreak = state.bestStreak;
          let newLastCompleted = state.lastCompletedDate;
          const newBadges = [...state.badges];

          const updatedTasks = state.tasks.map((t) => {
            if (t.id === id) {
              const completing = !t.completed;
              if (completing) {
                gainedXp = 10;
                const today = new Date().toISOString().split('T')[0];
                if (state.lastCompletedDate !== today) {
                  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                  if (state.lastCompletedDate === yesterday || state.lastCompletedDate === null) {
                    newStreak += 1;
                    if (newStreak > 1) toast.success(`Streak extended to ${newStreak} days! 🔥`);
                  } else if (state.lastCompletedDate !== today) {
                    newStreak = 1; 
                  }
                  if (newStreak > newBestStreak) {
                    newBestStreak = newStreak;
                  }
                  newLastCompleted = today;
                  
                  if (newStreak === 5 && !newBadges.includes('5-Day Streak')) {
                    newBadges.push('5-Day Streak');
                    toast.success('Badge Unlocked: 5-Day Streak! 🌟', { duration: 4000 });
                  }
                }
              } else {
                gainedXp = -10;
              }
              return { ...t, completed: completing };
            }
            return t;
          });
          
          return { tasks: updatedTasks, xp: state.xp + gainedXp, streak: newStreak, bestStreak: newBestStreak, lastCompletedDate: newLastCompleted, badges: newBadges };
        });
      },
    }),
    {
      name: 'daily-planner-storage',
      skipHydration: true,
    }
  )
);


export const rehydrateTaskStore = async (userId: string | null) => {
  if (typeof window === 'undefined') return;

  const sanitizedId = userId ? userId.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_') : 'guest';
  const targetKey = `daily-planner-storage-${sanitizedId}`;

  // If user-specific key is empty but legacy shared storage exists, migrate it for this user
  if (!localStorage.getItem(targetKey) && localStorage.getItem('daily-planner-storage') && userId) {
    const legacyData = localStorage.getItem('daily-planner-storage');
    if (legacyData) {
      localStorage.setItem(targetKey, legacyData);
    }
  }

  // 1. Change storage key FIRST so persist middleware binds to targetKey
  useTaskStore.persist.setOptions({
    name: targetKey,
  });

  const savedRaw = localStorage.getItem(targetKey);
  if (savedRaw) {
    // 2. Rehydrate stored state from targetKey
    await useTaskStore.persist.rehydrate();
  } else {
    // 3. Brand new account without saved tasks: reset to initial empty state
    useTaskStore.setState({
      tasks: [],
      xp: 0,
      streak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      badges: [],
    });
  }
};
