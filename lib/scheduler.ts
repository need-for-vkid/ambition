import { Task, WorkType, DayPlan, ScheduledBlock, DayMode, ScheduleReason } from '../types/task';

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

// Type ordering for ties in same time slot
const TYPE_PRIORITY: Record<WorkType, number> = {
  deep: 5,
  learning: 4,
  social: 3,
  body: 2,
  admin: 1,
};

const DAY_START = 9 * 60;
const DAY_END = 20 * 60;
const LUNCH_START = 12 * 60 + 30;
const LUNCH_END = 13 * 60 + 30;
const LUNCH_DURATION = LUNCH_END - LUNCH_START;

// Buffer between tasks (minutes) — prevents back-to-back scheduling.
const TASK_BUFFER = 5;
// Larger buffer for context switches (e.g., deep → social).
const CONTEXT_SWITCH_BUFFER = 15;

// Day capacity per mode (minutes of pure focus time)
export const DAY_CAPACITY: Record<DayMode, number> = {
  light: 240,       // 4h
  normal: 360,      // 6h
  productive: 480,  // 8h
};

// Carry-over urgency boost — accumulates per day deferred
const CARRY_OVER_BOOST_PER_DAY = 10;
const CARRY_OVER_INITIAL_BOOST = 20;

// === Scoring ===

function importanceScore(imp: Task['importance']): number {
  return { must: 100, should: 75, could: 40, would: 20 }[imp];
}

/**
 * Hours left until deadline. Uses deadlineTime if set, otherwise end-of-day.
 */
function hoursUntilDeadline(task: Task, now: Date): number | null {
  if (!task.deadline) return null;
  const d = new Date(task.deadline);
  if (task.deadlineTime) {
    const [h, m] = task.deadlineTime.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(23, 59, 59, 0);
  }
  return (d.getTime() - now.getTime()) / 3600000;
}

/**
 * Urgency from concrete deadline (hours-based decay).
 * If no concrete deadline, falls back to label-based scoring.
 * Adds carry-over boost.
 */
export function urgencyScore(task: Task, now: Date): number {
  let base = 0;
  const hoursLeft = hoursUntilDeadline(task, now);

  if (hoursLeft !== null) {
    if (hoursLeft <= 0) base = 200;              // overdue — top priority
    else if (hoursLeft <= 6) base = 180;         // critical — within hours
    else if (hoursLeft <= 24) base = 150;        // due today
    else if (hoursLeft <= 48) base = 110;        // due tomorrow
    else if (hoursLeft <= 168) base = Math.max(60, 100 - (hoursLeft - 48) * 0.33);
    else if (hoursLeft <= 720) base = Math.max(20, 50 - (hoursLeft - 168) * 0.05);
    else base = 15;
  } else if (task.deadlineLabel) {
    base = { today: 150, tomorrow: 110, this_week: 60, later: 25 }[task.deadlineLabel];
  }

  // Carry-over boost
  if (task.carryOverCount && task.carryOverCount > 0) {
    base += CARRY_OVER_INITIAL_BOOST + (task.carryOverCount - 1) * CARRY_OVER_BOOST_PER_DAY;
  }

  return base;
}

/**
 * Selection score — used in Phase 1 to decide which tasks make it into the day.
 * Urgency dominates here: getting overdue/critical work done > preferences.
 */
export function selectionScore(task: Task, now: Date): number {
  return urgencyScore(task, now) * 0.55 + importanceScore(task.importance) * 0.45;
}

export function taskDuration(task: Task): number {
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

function bufferBetween(prevType: WorkType | null, nextType: WorkType): number {
  if (prevType === null) return 0;
  if (prevType === nextType) return TASK_BUFFER;
  const heavySwitch = (
    (prevType === 'deep' && (nextType === 'social' || nextType === 'body')) ||
    (prevType === 'social' && nextType === 'deep') ||
    (prevType === 'body' && nextType === 'deep')
  );
  return heavySwitch ? CONTEXT_SWITCH_BUFFER : TASK_BUFFER;
}

// === Synthetic lunch task ===

const LUNCH_TASK: Task = {
  id: '__lunch__',
  text: 'Lunch',
  importance: 'must',
  workType: 'admin',
  durationMins: LUNCH_DURATION,
  deadlineLabel: null,
  deadline: null,
  deadlineTime: null,
  scheduledDate: null,
  scheduledTime: '12:30',
  blocked: false,
  createdAt: '',
};

// === Schedule reason (why-now context) ===

function explainPlacement(
  task: Task,
  startMins: number,
  now: Date
): ScheduleReason {
  if (task.carryOverCount && task.carryOverCount > 0) {
    return { type: 'carry_over', days: task.carryOverCount };
  }
  const hoursLeft = hoursUntilDeadline(task, now);
  if (hoursLeft !== null && hoursLeft <= 0) return { type: 'overdue' };
  if (hoursLeft !== null && hoursLeft <= 6) {
    return { type: 'urgent_hours', hoursLeft: Math.max(0, Math.round(hoursLeft)) };
  }
  const pref = PREFERRED_WINDOWS[task.workType];
  if (startMins >= pref.start && startMins < pref.end) {
    return { type: 'peak_window' };
  }
  if (task.importance === 'must') return { type: 'high_importance' };
  return { type: 'peak_window' };
}

// === Main scheduling (Phase 1 selection + Phase 2 ordering) ===

export interface PlanSummary {
  totalTasks: number;
  scheduledCount: number;
  deferredCount: number;
  criticalCount: number;
  overdueCount: number;
  totalFocusMins: number;
  utilizationPct: number;
  capacityMins: number;
  overloadedBy: number;
}

export interface ScheduleOptions {
  dayMode?: DayMode;
  now?: Date;
  forcedIds?: Set<string>;   // tasks the user pinned to today
}

export function scheduleTasks(tasks: Task[], options: ScheduleOptions = {}): DayPlan {
  const dayMode = options.dayMode ?? 'normal';
  const now = options.now ?? new Date();
  const forcedIds = options.forcedIds ?? new Set<string>();
  const capacity = DAY_CAPACITY[dayMode];

  const unblocked = tasks.filter((t) => !t.blocked);

  // ──────────── PHASE 1: SELECTION ────────────
  // Decide which tasks fit into the day's capacity.
  // - Tasks with scheduledTime are always selected (immovable commitments)
  // - Tasks with urgencyScore ≥ 150 (overdue/critical/due-today) are forced in
  // - Tasks in forcedIds are forced in
  // - Remaining sorted by selectionScore, pack until capacity reached

  const fixedTime = unblocked.filter((t) => t.scheduledTime !== null);
  const floating = unblocked.filter((t) => t.scheduledTime === null);

  const selected: Task[] = [];
  const deferred: Task[] = [];
  let usedMins = 0;

  // 1a) Fixed-time tasks always go in (they're already committed)
  for (const t of fixedTime) {
    selected.push(t);
    usedMins += taskDuration(t);
  }

  // 1b) Sort floating tasks by selection score (descending)
  const sortedFloating = [...floating].sort(
    (a, b) => selectionScore(b, now) - selectionScore(a, now)
  );

  // 1c) Forced-in tasks (urgent + user-forced)
  for (const t of sortedFloating) {
    const urgency = urgencyScore(t, now);
    const isMustInclude = urgency >= 150 || forcedIds.has(t.id);
    if (isMustInclude) {
      selected.push(t);
      usedMins += taskDuration(t);
    }
  }

  // 1d) Fill remaining capacity with non-must tasks by score
  for (const t of sortedFloating) {
    if (selected.includes(t)) continue;
    const dur = taskDuration(t);
    if (usedMins + dur <= capacity) {
      selected.push(t);
      usedMins += dur;
    } else {
      deferred.push(t);
    }
  }

  // ──────────── PHASE 2: ORDERING ────────────
  // Inside the day, place selected tasks by work-type preference.
  // Type matters more than urgency here (deep work in the morning, etc).
  // Exceptions: anchored, overdue, hard-deadline-with-time.

  type Interval = { start: number; end: number; type: WorkType | null };
  const occupied: Interval[] = [
    { start: LUNCH_START, end: LUNCH_END, type: null },
  ];
  const plan: ScheduledBlock[] = [];

  // Add lunch as a visible block in plan
  plan.push({
    task: LUNCH_TASK,
    startTime: '12:30',
    durationMins: LUNCH_DURATION,
    kind: 'lunch',
  });

  // 2a) Anchored: tasks with scheduledTime — place them first as immovable
  const anchored = selected
    .filter((t) => t.scheduledTime !== null)
    .sort((a, b) => toMinutes(a.scheduledTime!) - toMinutes(b.scheduledTime!));

  for (const task of anchored) {
    const start = toMinutes(task.scheduledTime!);
    const dur = taskDuration(task);
    occupied.push({ start, end: start + dur, type: task.workType });
    plan.push({
      task,
      startTime: task.scheduledTime!,
      durationMins: dur,
      kind: 'task',
      reason: explainPlacement(task, start, now),
    });
  }
  occupied.sort((a, b) => a.start - b.start);

  // 2b) Categorize remaining: hard-deadline-today, overdue, normal floating
  const remaining = selected.filter((t) => t.scheduledTime === null);

  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowMidnight = new Date(todayMidnight.getTime() + 86400000);

  const overdueOnes: Task[] = [];
  const hardToday: Task[] = []; // deadline today with specific deadlineTime
  const normal: Task[] = [];

  for (const t of remaining) {
    if (t.deadline) {
      const d = new Date(t.deadline);
      if (d < todayMidnight) {
        overdueOnes.push(t);
        continue;
      }
      if (t.deadlineTime && d < tomorrowMidnight) {
        hardToday.push(t);
        continue;
      }
    }
    normal.push(t);
  }

  /**
   * Find earliest slot for a task within optional time bounds.
   * - Respects occupied intervals and buffers
   * - Tries preferred window first (unless force-anywhere)
   * - maxEndMins: hard upper bound for slot end (for hard-deadline tasks)
   */
  function findSlot(
    workType: WorkType,
    dur: number,
    options: {
      forceAnywhere?: boolean;
      maxEndMins?: number;
      earliestStart?: number;
    } = {}
  ): number | null {
    const pref = PREFERRED_WINDOWS[workType];
    const upperBound = Math.min(options.maxEndMins ?? DAY_END, DAY_END);
    const lowerBound = Math.max(options.earliestStart ?? DAY_START, DAY_START);

    const attempts = options.forceAnywhere
      ? [{ start: lowerBound, end: upperBound }]
      : [
          {
            start: Math.max(pref.start, lowerBound),
            end: Math.min(pref.end, upperBound),
          },
          { start: lowerBound, end: upperBound },
        ];

    for (const window of attempts) {
      if (window.start >= window.end) continue;
      let cursor = window.start;
      const limit = window.end;

      while (cursor + dur <= limit) {
        const conflict = occupied.find(
          (iv) => cursor < iv.end && cursor + dur > iv.start
        );
        if (!conflict) {
          const prev = [...occupied]
            .filter((iv) => iv.end <= cursor)
            .sort((a, b) => b.end - a.end)[0];
          const buffer = bufferBetween(prev?.type ?? null, workType);
          const adjustedCursor = prev ? Math.max(cursor, prev.end + buffer) : cursor;

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

  function placeTask(
    task: Task,
    slotOpts: Parameters<typeof findSlot>[2] = {}
  ): boolean {
    const dur = taskDuration(task);
    const slot = findSlot(task.workType, dur, slotOpts);
    if (slot === null) return false;
    occupied.push({ start: slot, end: slot + dur, type: task.workType });
    occupied.sort((a, b) => a.start - b.start);
    plan.push({
      task,
      startTime: fromMinutes(slot),
      durationMins: dur,
      kind: 'task',
      reason: explainPlacement(task, slot, now),
    });
    return true;
  }

  // 2c) Overdue — earliest available slot, ignore preferences
  for (const t of overdueOnes) {
    if (!placeTask(t, { forceAnywhere: true })) {
      deferred.push(t);
    }
  }

  // 2d) Hard-deadline-today — must end before deadlineTime
  for (const t of hardToday) {
    const d = new Date(t.deadline!);
    const [h, m] = t.deadlineTime!.split(':').map(Number);
    const maxEnd = h * 60 + m;
    if (!placeTask(t, { maxEndMins: maxEnd, forceAnywhere: true })) {
      deferred.push(t);
    }
  }

  // 2e) Normal floating — by work-type preference
  // Sort by: preferred-window-start ASC, then type priority, then importance
  const normalSorted = [...normal].sort((a, b) => {
    const aPref = PREFERRED_WINDOWS[a.workType].start;
    const bPref = PREFERRED_WINDOWS[b.workType].start;
    if (aPref !== bPref) return aPref - bPref;
    const typeDelta = TYPE_PRIORITY[b.workType] - TYPE_PRIORITY[a.workType];
    if (typeDelta !== 0) return typeDelta;
    return importanceScore(b.importance) - importanceScore(a.importance);
  });

  for (const t of normalSorted) {
    if (!placeTask(t)) {
      deferred.push(t);
    }
  }

  // Sort final plan by start time
  plan.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  return { plan, deferred };
}

// Computes day-level summary for UI display
export function planSummary(
  plan: DayPlan,
  tasks: Task[],
  now: Date = new Date(),
  dayMode: DayMode = 'normal'
): PlanSummary {
  const taskBlocks = plan.plan.filter((b) => b.kind !== 'lunch');
  const totalFocusMins = taskBlocks.reduce((acc, b) => acc + b.durationMins, 0);
  const capacity = DAY_CAPACITY[dayMode];
  const criticalCount = tasks.filter((t) => !t.blocked && urgencyScore(t, now) >= 150).length;
  const overdueCount = tasks.filter((t) => {
    if (t.blocked || !t.deadline) return false;
    const h = hoursUntilDeadline(t, now);
    return h !== null && h <= 0;
  }).length;
  const overloadedBy = Math.max(0, totalFocusMins - capacity);

  return {
    totalTasks: tasks.filter((t) => !t.blocked).length,
    scheduledCount: taskBlocks.length,
    deferredCount: plan.deferred.length,
    criticalCount,
    overdueCount,
    totalFocusMins,
    utilizationPct: Math.min(100, Math.round((totalFocusMins / capacity) * 100)),
    capacityMins: capacity,
    overloadedBy,
  };
}
