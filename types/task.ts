export type Importance = 'must' | 'should' | 'could' | 'would';
export type WorkType = 'deep' | 'learning' | 'social' | 'body' | 'admin';
export type DeadlineLabel = 'today' | 'tomorrow' | 'this_week' | 'later' | null;

export interface Task {
  id: string;
  text: string;
  importance: Importance;
  workType: WorkType;
  durationMins: number | null;
  deadlineLabel: DeadlineLabel;
  deadline: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  blocked: boolean;
  createdAt: string;
}

export interface ScheduledBlock {
  task: Task;
  startTime: string;
  durationMins: number;
}

export interface DayPlan {
  plan: ScheduledBlock[];
  deferred: Task[];
}
