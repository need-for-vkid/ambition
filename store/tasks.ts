import { create } from 'zustand';
import { Task, DayPlan, ScheduledBlock } from '../types/task';
import {
  loadTasks,
  saveTask,
  deleteTask,
  updateTask,
} from '../lib/storage';
import { scheduleTasks } from '../lib/scheduler';

interface TasksState {
  tasks: Task[];
  dayPlan: DayPlan | null;
  focusTask: ScheduledBlock | null;
  isLoaded: boolean;

  hydrate: () => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleBlocked: (id: string) => Promise<void>;
  toggleBlockedAndReschedule: (id: string) => Promise<void>;
  setDayPlan: (plan: DayPlan) => void;
  recomputePlan: () => void;
  setFocusTask: (block: ScheduledBlock | null) => void;
  markCurrentTaskDone: () => Promise<void>;
  clearAll: () => Promise<void>;
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

  toggleBlockedAndReschedule: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const blocked = !task.blocked;
    await updateTask(id, { blocked });
    const newTasks = get().tasks.map((t) => (t.id === id ? { ...t, blocked } : t));
    const newPlan = scheduleTasks(newTasks);
    set({ tasks: newTasks, dayPlan: newPlan });
  },

  setDayPlan: (plan) => set({ dayPlan: plan }),

  recomputePlan: () => {
    const newPlan = scheduleTasks(get().tasks);
    set({ dayPlan: newPlan });
  },

  setFocusTask: (block) => set({ focusTask: block }),

  markCurrentTaskDone: async () => {
    const { dayPlan, focusTask } = get();
    if (!dayPlan || !focusTask) return;
    // Remove the task from storage and tasks array
    await deleteTask(focusTask.task.id);
    const newTasks = get().tasks.filter((t) => t.id !== focusTask.task.id);
    const remaining = dayPlan.plan.filter((b) => b.task.id !== focusTask.task.id);
    set({
      tasks: newTasks,
      dayPlan: { ...dayPlan, plan: remaining },
      focusTask: null,
    });
  },

  clearAll: async () => {
    set({ tasks: [], dayPlan: null, focusTask: null });
  },
}));
