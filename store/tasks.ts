import { create } from 'zustand';
import { Task, DayPlan, ScheduledBlock, DayMode, CompletedTask, DaySummary } from '../types/task';
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
  saveDaySummary as saveDaySummaryInDb,
  loadDaySummaries as loadDaySummariesFromDb,
} from '../lib/storage';
import { scheduleTasks } from '../lib/scheduler';
import { syncTaskNotifications } from '../lib/notifications';

interface TasksState {
  tasks: Task[];
  dayPlan: DayPlan | null;
  focusTask: ScheduledBlock | null;
  isLoaded: boolean;
  dayMode: DayMode;
  forcedTodayIds: Set<string>;
  completed: CompletedTask[];
  daySummaries: DaySummary[];
  planningTomorrow: boolean;

  hydrate: () => Promise<void>;
  addTask: (task: Task) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  updateTaskFields: (task: Task) => Promise<void>;
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
  setPlanningTomorrow: (val: boolean) => void;
  loadDaySummaries: () => Promise<void>;
  saveDaySummary: (summary: DaySummary) => Promise<void>;
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
  daySummaries: [],
  planningTomorrow: false,

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

    const now = new Date();
    let plan = scheduleTasks(mutatedTasks, { dayMode, now });
    let planningTomorrow = false;

    // Late-day fallback: if it's evening and nothing fits today, default to tomorrow.
    // This avoids opening to a barely-empty plan after 6pm when the user clearly
    // can't realistically start anything today.
    const taskBlocks = plan.plan.filter((b) => b.kind !== 'lunch');
    const hasActiveTasks = mutatedTasks.some((t) => !t.blocked);
    if (taskBlocks.length === 0 && hasActiveTasks && now.getHours() >= 18) {
      planningTomorrow = true;
      plan = scheduleTasks(mutatedTasks, { dayMode, now, planningTomorrow: true });
    }

    const summaries = await loadDaySummariesFromDb();

    set({
      tasks: mutatedTasks,
      dayPlan: plan,
      dayMode,
      isLoaded: true,
      planningTomorrow,
      daySummaries: summaries,
    });
    void syncTaskNotifications(plan.plan);
  },

  addTask: async (task) => {
    await saveTask(task);
    set((s) => ({ tasks: [...s.tasks, task] }));
  },

  removeTask: async (id) => {
    await deleteTask(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  updateTaskFields: async (task) => {
    // Persist the full set of editable fields, then reschedule so changes appear in plan.
    await updateTask(task.id, {
      text: task.text,
      importance: task.importance,
      workType: task.workType,
      durationMins: task.durationMins,
      deadlineLabel: task.deadlineLabel,
      deadline: task.deadline,
      deadlineTime: task.deadlineTime,
      scheduledDate: task.scheduledDate,
      scheduledTime: task.scheduledTime,
    });
    const newTasks = get().tasks.map((t) => (t.id === task.id ? task : t));
    const newPlan = scheduleTasks(newTasks, {
      dayMode: get().dayMode,
      forcedIds: get().forcedTodayIds,
      now: new Date(),
      planningTomorrow: get().planningTomorrow,
    });
    set({ tasks: newTasks, dayPlan: newPlan });
    void syncTaskNotifications(newPlan.plan);
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
      now: new Date(),
      planningTomorrow: get().planningTomorrow,
    });
    set({ tasks: newTasks, dayPlan: newPlan });
    void syncTaskNotifications(newPlan.plan);
  },

  setDayPlan: (plan) => set({ dayPlan: plan }),

  recomputePlan: () => {
    const newPlan = scheduleTasks(get().tasks, {
      dayMode: get().dayMode,
      forcedIds: get().forcedTodayIds,
      now: new Date(),
      planningTomorrow: get().planningTomorrow,
    });
    set({ dayPlan: newPlan });
    void syncTaskNotifications(newPlan.plan);
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
      now: new Date(),
      planningTomorrow: get().planningTomorrow,
    });
    set({ dayMode: mode, dayPlan: newPlan });
    void syncTaskNotifications(newPlan.plan);
  },

  addToToday: (id) => {
    const forced = new Set(get().forcedTodayIds);
    forced.add(id);
    const newPlan = scheduleTasks(get().tasks, {
      dayMode: get().dayMode,
      forcedIds: forced,
      now: new Date(),
      planningTomorrow: get().planningTomorrow,
    });
    set({ forcedTodayIds: forced, dayPlan: newPlan });
    void syncTaskNotifications(newPlan.plan);
  },

  removeFromToday: (id) => {
    const forced = new Set(get().forcedTodayIds);
    forced.delete(id);
    const newPlan = scheduleTasks(get().tasks, {
      dayMode: get().dayMode,
      forcedIds: forced,
      now: new Date(),
      planningTomorrow: get().planningTomorrow,
    });
    set({ forcedTodayIds: forced, dayPlan: newPlan });
    void syncTaskNotifications(newPlan.plan);
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
      now: new Date(),
      planningTomorrow: get().planningTomorrow,
    });
    set({
      tasks: newTasks,
      dayPlan: newPlan,
      completed: get().completed.filter((c) => c.id !== id),
    });
    void syncTaskNotifications(newPlan.plan);
  },

  loadCompleted: async () => {
    const completed = await loadCompletedTasks();
    set({ completed });
  },

  clearAll: async () => {
    set({ tasks: [], dayPlan: null, focusTask: null, forcedTodayIds: new Set(), completed: [] });
  },

  loadDaySummaries: async () => {
    const summaries = await loadDaySummariesFromDb();
    set({ daySummaries: summaries });
  },

  saveDaySummary: async (summary) => {
    await saveDaySummaryInDb(summary);
    const summaries = await loadDaySummariesFromDb();
    set({ daySummaries: summaries });
  },

  setPlanningTomorrow: (val) => {
    const newPlan = scheduleTasks(get().tasks, {
      dayMode: get().dayMode,
      forcedIds: get().forcedTodayIds,
      now: new Date(),
      planningTomorrow: val,
    });
    set({ planningTomorrow: val, dayPlan: newPlan });
    void syncTaskNotifications(newPlan.plan);
  },
}));
