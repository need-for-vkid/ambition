import { create } from 'zustand';
import { Task, DayPlan, ScheduledBlock } from '../types/task';
import {
  loadTasks,
  saveTask,
  deleteTask,
  updateTask,
} from '../lib/storage';

interface TasksState {
  tasks: Task[];
  dayPlan: DayPlan | null;
  focusTask: ScheduledBlock | null;
  isLoaded: boolean;

  hydrate: () => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleBlocked: (id: string) => Promise<void>;
  setDayPlan: (plan: DayPlan) => void;
  setFocusTask: (block: ScheduledBlock | null) => void;
  markCurrentTaskDone: () => void;
  clearAll: () => void;
}

export const useTaskStore = create<TasksState>((set, get) => ({
  tasks: [],
  dayPlan: null,
  focusTask: null,
  isLoaded: false,

  hydrate: async () => {
    const tasks = await loadTasks();
    set({ tasks, isLoaded: true });
  },

  addTask: async (task) => {
    await saveTask(task);
    set((s) => ({ tasks: [...s.tasks, task] }));
  },

  removeTask: async (id) => {
    await deleteTask(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  toggleBlocked: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const blocked = !task.blocked;
    await updateTask(id, { blocked });
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, blocked } : t)),
    }));
  },

  setDayPlan: (plan) => set({ dayPlan: plan }),

  setFocusTask: (block) => set({ focusTask: block }),

  markCurrentTaskDone: () => {
    const { dayPlan, focusTask } = get();
    if (!dayPlan || !focusTask) return;
    const remaining = dayPlan.plan.filter((b) => b.task.id !== focusTask.task.id);
    set({
      dayPlan: { ...dayPlan, plan: remaining },
      focusTask: null,
    });
  },

  clearAll: () => set({ tasks: [], dayPlan: null, focusTask: null }),
}));
