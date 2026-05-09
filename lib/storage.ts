import * as SQLite from 'expo-sqlite';
import { Task } from '../types/task';

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('ambition.db');
    await _db.execAsync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        importance TEXT NOT NULL,
        work_type TEXT NOT NULL,
        duration_mins INTEGER,
        deadline_label TEXT,
        deadline TEXT,
        scheduled_date TEXT,
        scheduled_time TEXT,
        blocked INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);
  }
  return _db;
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    text: row.text as string,
    importance: row.importance as Task['importance'],
    workType: row.work_type as Task['workType'],
    durationMins: row.duration_mins != null ? (row.duration_mins as number) : null,
    deadlineLabel: (row.deadline_label as Task['deadlineLabel']) ?? null,
    deadline: (row.deadline as string) ?? null,
    scheduledDate: (row.scheduled_date as string) ?? null,
    scheduledTime: (row.scheduled_time as string) ?? null,
    blocked: row.blocked === 1,
    createdAt: row.created_at as string,
  };
}

export async function loadTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM tasks ORDER BY created_at ASC');
  return rows.map((r) => rowToTask(r as Record<string, unknown>));
}

export async function saveTask(task: Task): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO tasks
     (id, text, importance, work_type, duration_mins, deadline_label, deadline,
      scheduled_date, scheduled_time, blocked, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.text,
      task.importance,
      task.workType,
      task.durationMins ?? null,
      task.deadlineLabel ?? null,
      task.deadline ?? null,
      task.scheduledDate ?? null,
      task.scheduledTime ?? null,
      task.blocked ? 1 : 0,
      task.createdAt,
    ]
  );
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (patch.text !== undefined) { fields.push('text = ?'); values.push(patch.text); }
  if (patch.importance !== undefined) { fields.push('importance = ?'); values.push(patch.importance); }
  if (patch.workType !== undefined) { fields.push('work_type = ?'); values.push(patch.workType); }
  if (patch.durationMins !== undefined) { fields.push('duration_mins = ?'); values.push(patch.durationMins); }
  if (patch.deadlineLabel !== undefined) { fields.push('deadline_label = ?'); values.push(patch.deadlineLabel); }
  if (patch.deadline !== undefined) { fields.push('deadline = ?'); values.push(patch.deadline); }
  if (patch.scheduledDate !== undefined) { fields.push('scheduled_date = ?'); values.push(patch.scheduledDate); }
  if (patch.scheduledTime !== undefined) { fields.push('scheduled_time = ?'); values.push(patch.scheduledTime); }
  if (patch.blocked !== undefined) { fields.push('blocked = ?'); values.push(patch.blocked ? 1 : 0); }

  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values as SQLite.SQLiteBindValue[]);
}

export async function clearAllTasks(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks');
}
