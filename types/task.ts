export type Importance = 'must' | 'should' | 'could' | 'would';
export type WorkType = 'deep' | 'learning' | 'social' | 'body' | 'admin';
export type DeadlineLabel = 'today' | 'tomorrow' | 'this_week' | 'later' | null;
export type DayMode = 'light' | 'normal' | 'productive';

export interface Task {
  id: string;
  text: string;
  importance: Importance;
  workType: WorkType;
  durationMins: number | null;
  deadlineLabel: DeadlineLabel;
  deadline: string | null;        // ISO date string
  deadlineTime: string | null;    // HH:MM (optional, only if deadline is set)
  scheduledDate: string | null;
  scheduledTime: string | null;
  blocked: boolean;
  createdAt: string;
  carryOverCount?: number;        // how many days this task has been deferred
}

export interface ScheduledBlock {
  task: Task;
  startTime: string;
  durationMins: number;
  kind?: 'task' | 'lunch';        // 'lunch' for the lunch break, default 'task'
  reason?: ScheduleReason;        // why-now context for focus screen
}

export type ScheduleReason =
  | { type: 'peak_window' }
  | { type: 'urgent_hours'; hoursLeft: number }
  | { type: 'overdue' }
  | { type: 'carry_over'; days: number }
  | { type: 'high_importance' }
  | { type: 'forced' };

export interface DayPlan {
  plan: ScheduledBlock[];
  deferred: Task[];
}

export interface CompletedTask {
  id: string;
  task: Task;
  completedAt: string;            // ISO timestamp
  pomosCount: number;
  notes: string | null;
}
