import { create } from 'zustand';
import { Task, DayPlan, ScheduledBlock, DayMode, CompletedTask } from '../types/task';
import {
  loadTasks,
  saveTask,
  deleteTask,
  updateTask,
  saveCompletedTask,
  loadCompletedTasks,
  deleteCompletedTask,
  getDayMode as getDayModeFromDb,
  setDayMode as setDayModeInDb,
  getLastPlanDate,
  setLastPlanDate,
} from '../lib/storage';
import { scheduleTasks } from '../lib/scheduler';

interface TasksState {
  tasks: Task[];
  dayPlan: DayPlan | null;
  focusTask: ScheduledBlock | null;
  isLoaded: boolean;
  dayMode: DayMode;
  forcedTodayIds: Set<string>;
  completed: CompletedTask[];

  hydrate: () => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  toggleBlocked: (id: string) => Promise<void>;
  toggleBlockedAndReschedule: (id: string) => Promise<void>;
  setDayPlan: (plan: DayPlan) => void;
  recomputePlan: () => void;
  setFocusTask: (block: ScheduledBlock | null) => void;
  markCurrentTaskDone: (opts?: { notes?: string; pomosCount?: number }) => Promise<void>;
  setDayMode: (mode: DayMode) => Promise<void>;
  addToToday: (id: string) => void;
  removeFromToday: (id: string) => void;
  restoreCompletedTask: (id: string) => Promise<void>;
  loadCompleted: () => Promise<void>;
  clearAll: () => Promise<void>;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useTaskStore = create<TasksState>((set, get) => ({
  tasks: [],
  dayPlan: null,
  focusTask: null,
  isLoaded: false,
  dayMode: 'normal',
  forcedTodayIds: new Set<string>(),
  completed: [],

  hydrate: async () => {
    const tasks = await loadTasks();
    const dayMode = await getDayModeFromDb();
    const lastDate = await getLastPlanDate();
    const today = todayDate();

    // Carry-over logic: if last plan was a previous day, bump deferred counters.
    // Tasks that exist in `tasks` but didn't fit in a previous day get +1 carryOverCount.
    // We approximate "carried over" as: task exists, was created before today, has no scheduledTime.
    let mutatedTasks = tasks;
    if (lastDate && lastDate !== today) {
      const now = new Date();
      const updates: Task[] = [];
      for (const t of tasks) {
        if (t.blocked) continue;
        const createdDate = t.createdAt.slice(0, 10);
        if (createdDate < today) {
          const nextCount = (t.carryOverCount ?? 0) + 1;
          updates.push({ ...t, carryOverCount: nextCount });
        }
      }
      if (updates.length > 0) {
        for (const u of updates) {
          await updateTask(u.id, { carryOverCount: u.carryOverCount });
        }
        mutatedTasks = tasks.map((t) => {
          const u = updates.find((x) => x.id === t.id);
          return u ?? t;
        });
      }
    }

    await setLastPlanDate(today);

    const plan = scheduleTasks(mutatedTasks, { dayMode });
    set({
      tasks: mutatedTasks,
      dayPlan: plan,
      dayMode,
      isLoaded: true,
    });
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
    const newPlan = scheduleTasks(newTasks, {
      dayMode: get().dayMode,
      forcedIds: get().forcedTodayIds,
    });
    set({ tasks: newTasks, dayPlan: newPlan });
  },

  setDayPlan: (plan) => set({ dayPlan: plan }),

  recomputePlan: () => {
    const newPlan = scheduleTasks(get().tasks, {
      dayMode: get().dayMode,
      forcedIds: get().forcedTodayIds,
    });
    set({ dayPlan: newPlan });
  },

  setFocusTask: (block) => set({ focusTask: block }),

  markCurrentTaskDone: async (opts = {}) => {
    const { dayPlan, focusTask } = get();
    if (!dayPlan || !focusTask) return;
    const { notes, pomosCount } = opts;
    // Save to archive, then remove from active
    await saveCompletedTask(focusTask.task, pomosCount ?? 0, notes ?? null);
    await deleteTask(focusTask.task.id);
    const newTasks = get().tasks.filter((t) => t.id !== focusTask.task.id);
    const remaining = dayPlan.plan.filter((b) => b.task.id !== focusTask.task.id);
    // Drop from forced too
    const forcedTodayIds = new Set(get().forcedTodayIds);
    forcedTodayIds.delete(focusTask.task.id);
    // Reload completed list
    const completed = await loadCompletedTasks();
    set({
      tasks: newTasks,
      dayPlan: { ...dayPlan, plan: remaining },
      focusTask: null,
      forcedTodayIds,
      completed,
    });
  },

  setDayMode: async (mode) => {
    await setDayModeInDb(mode);
    const newPlan = scheduleTasks(get().tasks, {
      dayMode: mode,
      forcedIds: get().forcedTodayIds,
    });
    set({ dayMode: mode, dayPlan: newPlan });
  },

  addToToday: (id) => {
    const forced = new Set(get().forcedTodayIds);
    forced.add(id);
    const newPlan = scheduleTasks(get().tasks, {
      dayMode: get().dayMode,
      forcedIds: forced,
    });
    set({ forcedTodayIds: forced, dayPlan: newPlan });
  },

  removeFromToday: (id) => {
    const forced = new Set(get().forcedTodayIds);
    forced.delete(id);
    const newPlan = scheduleTasks(get().tasks, {
      dayMode: get().dayMode,
      forcedIds: forced,
    });
    set({ forcedTodayIds: forced, dayPlan: newPlan });
  },

  restoreCompletedTask: async (id) => {
    const completed = get().completed.find((c) => c.id === id);
    if (!completed) return;
    // Reset carry-over and createdAt to now so it's fresh
    const restored: Task = {
      ...completed.task,
      createdAt: new Date().toISOString(),
      carryOverCount: 0,
      blocked: false,
    };
    await saveTask(restored);
    await deleteCompletedTask(id);
    const newTasks = [...get().tasks, restored];
    const newPlan = scheduleTasks(newTasks, {
      dayMode: get().dayMode,
      forcedIds: get().forcedTodayIds,
    });
    set({
      tasks: newTasks,
      dayPlan: newPlan,
      completed: get().completed.filter((c) => c.id !== id),
    });
  },

  loadCompleted: async () => {
    const completed = await loadCompletedTasks();
    set({ completed });
  },

  clearAll: async () => {
    set({ tasks: [], dayPlan: null, focusTask: null, forcedTodayIds: new Set(), completed: [] });
  },
}));
