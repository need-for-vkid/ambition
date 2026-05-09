import { Task, WorkType, DayPlan, ScheduledBlock } from '../types/task';

const DURATION_DEFAULTS: Record<WorkType, number> = {
  deep: 90,
  learning: 60,
  social: 45,
  body: 60,
  admin: 30,
};

// Preferred start window per work type (minutes from midnight)
const PREFERRED_WINDOW_START: Record<WorkType, number> = {
  deep: 9 * 60,
  learning: 13 * 60,
  social: 12 * 60,
  body: 17 * 60,
  admin: 15 * 60,
};

const PREFERRED_WINDOW_END: Record<WorkType, number> = {
  deep: 12 * 60,
  learning: 15 * 60,
  social: 15 * 60,
  body: 18 * 60,
  admin: 17 * 60,
};

const DAY_START = 9 * 60;
const DAY_END = 18 * 60;
const LUNCH_START = 12 * 60;
const LUNCH_END = 13 * 60;

function importanceScore(imp: Task['importance']): number {
  return { must: 100, should: 75, could: 40, would: 20 }[imp];
}

function deadlineScore(label: Task['deadlineLabel']): number {
  if (!label) return 0;
  return { today: 100, tomorrow: 80, this_week: 50, later: 20 }[label] ?? 0;
}

function totalScore(task: Task): number {
  return importanceScore(task.importance) * 0.65 + deadlineScore(task.deadlineLabel) * 0.35;
}

function taskDuration(task: Task): number {
  return task.durationMins ?? DURATION_DEFAULTS[task.workType];
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function scheduleTasks(tasks: Task[]): DayPlan {
  const unblocked = tasks.filter((t) => !t.blocked);

  // Separate fixed-time tasks from floating
  const fixed = unblocked
    .filter((t) => t.scheduledTime !== null)
    .sort((a, b) => {
      const at = toMinutes(a.scheduledTime!);
      const bt = toMinutes(b.scheduledTime!);
      return at - bt;
    });

  const floating = unblocked
    .filter((t) => t.scheduledTime === null)
    .sort((a, b) => totalScore(b) - totalScore(a));

  // Build timeline as a sorted list of occupied intervals
  type Interval = { start: number; end: number };
  const occupied: Interval[] = [{ start: LUNCH_START, end: LUNCH_END }];

  // Slot fixed blocks
  const plan: ScheduledBlock[] = [];
  for (const task of fixed) {
    const start = toMinutes(task.scheduledTime!);
    const dur = taskDuration(task);
    occupied.push({ start, end: start + dur });
    plan.push({ task, startTime: task.scheduledTime!, durationMins: dur });
  }

  occupied.sort((a, b) => a.start - b.start);

  function findSlot(preferStart: number, preferEnd: number, dur: number): number | null {
    // Try preferred window first
    for (const pStart of [preferStart, DAY_START]) {
      let cursor = Math.max(pStart, DAY_START);
      const windowEnd = pStart === preferStart ? preferEnd : DAY_END;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cursor + dur > Math.min(windowEnd, DAY_END)) break;
        if (cursor >= LUNCH_START && cursor < LUNCH_END) {
          cursor = LUNCH_END;
          continue;
        }
        const conflict = occupied.find(
          (iv) => cursor < iv.end && cursor + dur > iv.start
        );
        if (!conflict) return cursor;
        cursor = conflict.end;
        if (cursor >= LUNCH_START && cursor < LUNCH_END) cursor = LUNCH_END;
      }
    }
    return null;
  }

  const deferred: Task[] = [];
  for (const task of floating) {
    const dur = taskDuration(task);
    const prefStart = PREFERRED_WINDOW_START[task.workType];
    const prefEnd = PREFERRED_WINDOW_END[task.workType];
    const slot = findSlot(prefStart, prefEnd, dur);
    if (slot === null) {
      deferred.push(task);
    } else {
      occupied.push({ start: slot, end: slot + dur });
      occupied.sort((a, b) => a.start - b.start);
      plan.push({ task, startTime: fromMinutes(slot), durationMins: dur });
    }
  }

  // Sort final plan by start time
  plan.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

  return { plan, deferred };
}
