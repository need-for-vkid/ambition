import { Task, WorkType, DayPlan, ScheduledBlock } from '../types/task';

// === Configuration ===

const DURATION_DEFAULTS: Record<WorkType, number> = {
  deep: 90,
  learning: 60,
  social: 45,
  body: 60,
  admin: 30,
};

// Preferred windows per work type (minutes from midnight)
// Soft preferences — overflow allowed if window is full.
const PREFERRED_WINDOWS: Record<WorkType, { start: number; end: number }> = {
  deep:     { start:  9 * 60, end: 12 * 60 },  // morning peak
  learning: { start: 13 * 60, end: 15 * 60 },  // post-lunch
  social:   { start: 11 * 60, end: 16 * 60 },  // mid-day
  body:     { start: 17 * 60, end: 20 * 60 },  // evening
  admin:    { start: 15 * 60, end: 18 * 60 },  // afternoon
};

const DAY_START = 9 * 60;
const DAY_END = 19 * 60;
const LUNCH_START = 12 * 60 + 30;
const LUNCH_END = 13 * 60 + 30;

// Buffer between tasks (minutes) — prevents back-to-back scheduling.
const TASK_BUFFER = 5;
// Larger buffer for context switches (e.g., deep → social).
const CONTEXT_SWITCH_BUFFER = 15;

// === Scoring ===

function importanceScore(imp: Task['importance']): number {
  return { must: 100, should: 75, could: 40, would: 20 }[imp];
}

/**
 * Urgency from concrete deadline (hours-based decay).
 * If no concrete deadline, falls back to label-based scoring.
 */
function urgencyScore(task: Task, now: Date): number {
  if (task.deadline) {
    const deadlineDate = new Date(task.deadline);
    const hoursLeft = (deadlineDate.getTime() - now.getTime()) / 3600000;

    if (hoursLeft <= 0) return 200;          // overdue — top priority
    if (hoursLeft <= 6) return 180;          // critical — within hours
    if (hoursLeft <= 24) return 150;         // due today
    if (hoursLeft <= 48) return 110;         // due tomorrow
    if (hoursLeft <= 168) {                  // due this week
      return Math.max(60, 100 - (hoursLeft - 48) * 0.33);
    }
    if (hoursLeft <= 720) {                  // due this month
      return Math.max(20, 50 - (hoursLeft - 168) * 0.05);
    }
    return 15;                               // distant deadline
  }

  if (!task.deadlineLabel) return 0;
  return { today: 150, tomorrow: 110, this_week: 60, later: 25 }[task.deadlineLabel];
}

function totalScore(task: Task, now: Date): number {
  return importanceScore(task.importance) * 0.45 + urgencyScore(task, now) * 0.55;
}

function taskDuration(task: Task): number {
  return task.durationMins ?? DURATION_DEFAULTS[task.workType];
}

// === Time helpers ===

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Determine buffer between two work types
function bufferBetween(prevType: WorkType | null, nextType: WorkType): number {
  if (prevType === null) return 0;
  if (prevType === nextType) return TASK_BUFFER;
  // Context switch buffers — bigger transitions
  const heavySwitch = (
    (prevType === 'deep' && (nextType === 'social' || nextType === 'body')) ||
    (prevType === 'social' && nextType === 'deep') ||
    (prevType === 'body' && nextType === 'deep')
  );
  return heavySwitch ? CONTEXT_SWITCH_BUFFER : TASK_BUFFER;
}

// === Main scheduling ===

export interface PlanSummary {
  totalTasks: number;
  scheduledCount: number;
  deferredCount: number;
  criticalCount: number;
  overdueCount: number;
  totalFocusMins: number;
  utilizationPct: number;
}

export function scheduleTasks(tasks: Task[], now: Date = new Date()): DayPlan {
  const unblocked = tasks.filter((t) => !t.blocked);

  // Separate fixed-time tasks from floating
  const fixed = unblocked
    .filter((t) => t.scheduledTime !== null)
    .sort((a, b) => toMinutes(a.scheduledTime!) - toMinutes(b.scheduledTime!));

  const floating = unblocked
    .filter((t) => t.scheduledTime === null)
    .sort((a, b) => totalScore(b, now) - totalScore(a, now));

  // Track occupied intervals as a sorted list
  type Interval = { start: number; end: number; type: WorkType | null };
  const occupied: Interval[] = [
    { start: LUNCH_START, end: LUNCH_END, type: null }, // lunch break
  ];

  const plan: ScheduledBlock[] = [];

  // 1) Slot fixed-time blocks first (immovable)
  for (const task of fixed) {
    const start = toMinutes(task.scheduledTime!);
    const dur = taskDuration(task);
    occupied.push({ start, end: start + dur, type: task.workType });
    plan.push({ task, startTime: task.scheduledTime!, durationMins: dur });
  }
  occupied.sort((a, b) => a.start - b.start);

  /**
   * Find earliest slot for a task respecting:
   * - day bounds (DAY_START → DAY_END)
   * - lunch break + other occupied intervals
   * - buffer between adjacent tasks (depends on work-type transition)
   * - preferred window (soft — try first, then fall back to anywhere)
   */
  function findSlot(workType: WorkType, dur: number, urgent: boolean): number | null {
    const pref = PREFERRED_WINDOWS[workType];
    const attempts = urgent
      ? [{ start: DAY_START, end: DAY_END }] // urgent → ignore preference, take earliest
      : [pref, { start: DAY_START, end: DAY_END }];

    for (const window of attempts) {
      let cursor = Math.max(window.start, DAY_START);
      const limit = Math.min(window.end, DAY_END);

      while (cursor + dur <= limit) {
        // Find first conflict at or after cursor
        const conflict = occupied.find(
          (iv) => cursor < iv.end && cursor + dur > iv.start
        );
        if (!conflict) {
          // Check if a buffer is needed before this slot (based on previous task)
          const prev = [...occupied]
            .filter((iv) => iv.end <= cursor)
            .sort((a, b) => b.end - a.end)[0];
          const buffer = bufferBetween(prev?.type ?? null, workType);
          const adjustedCursor = prev ? Math.max(cursor, prev.end + buffer) : cursor;

          // Re-check conflict after applying buffer
          if (adjustedCursor + dur > limit) break;
          const recheck = occupied.find(
            (iv) => adjustedCursor < iv.end && adjustedCursor + dur > iv.start
          );
          if (!recheck) return adjustedCursor;
          cursor = recheck.end;
        } else {
          cursor = conflict.end;
        }
      }
    }
    return null;
  }

  // 2) Slot floating tasks. Mark high-urgency tasks (overdue or <6h) as `urgent`
  //    so they get earliest slot regardless of preferred window.
  const deferred: Task[] = [];
  for (const task of floating) {
    const dur = taskDuration(task);
    const urgency = urgencyScore(task, now);
    const isUrgent = urgency >= 150; // overdue, critical, or due-today
    const slot = findSlot(task.workType, dur, isUrgent);

    if (slot === null) {
      deferred.push(task);
    } else {
      occupied.push({ start: slot, end: slot + dur, type: task.workType });
      occupied.sort((a, b) => a.start - b.start);
      plan.push({ task, startTime: fromMinutes(slot), durationMins: dur });
    }
  }

  // Sort final plan by start time
  plan.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  return { plan, deferred };
}

// Computes day-level summary for UI display
export function planSummary(plan: DayPlan, tasks: Task[], now: Date = new Date()): PlanSummary {
  const totalFocusMins = plan.plan.reduce((acc, b) => acc + b.durationMins, 0);
  const dayMins = DAY_END - DAY_START - (LUNCH_END - LUNCH_START);
  const criticalCount = tasks.filter((t) => !t.blocked && urgencyScore(t, now) >= 150).length;
  const overdueCount = tasks.filter((t) => {
    if (t.blocked || !t.deadline) return false;
    return new Date(t.deadline).getTime() < now.getTime();
  }).length;

  return {
    totalTasks: tasks.filter((t) => !t.blocked).length,
    scheduledCount: plan.plan.length,
    deferredCount: plan.deferred.length,
    criticalCount,
    overdueCount,
    totalFocusMins,
    utilizationPct: Math.min(100, Math.round((totalFocusMins / dayMins) * 100)),
  };
}
