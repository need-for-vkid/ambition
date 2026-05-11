import * as SQLite from 'expo-sqlite';
import { Task, CompletedTask, DayMode } from '../types/task';

let _db: SQLite.SQLiteDatabase | null = null;

const SCHEMA_VERSION = 2;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('ambition.db');

  // Base table — created if not exists, untouched if already there
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
    CREATE TABLE IF NOT EXISTS completed_tasks (
      id TEXT PRIMARY KEY,
      task_json TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      pomos_count INTEGER DEFAULT 0,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Schema migrations — additive, idempotent
  const versionRow = await _db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 2) {
    // v2: add deadline_time + carry_over_count columns to tasks
    const cols = await _db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks)');
    const names = cols.map((c) => c.name);
    if (!names.includes('deadline_time')) {
      await _db.execAsync('ALTER TABLE tasks ADD COLUMN deadline_time TEXT');
    }
    if (!names.includes('carry_over_count')) {
      await _db.execAsync('ALTER TABLE tasks ADD COLUMN carry_over_count INTEGER DEFAULT 0');
    }
  }

  await _db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
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
    deadlineTime: (row.deadline_time as string) ?? null,
    scheduledDate: (row.scheduled_date as string) ?? null,
    scheduledTime: (row.scheduled_time as string) ?? null,
    blocked: row.blocked === 1,
    createdAt: row.created_at as string,
    carryOverCount: (row.carry_over_count as number) ?? 0,
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
     (id, text, importance, work_type, duration_mins, deadline_label, deadline, deadline_time,
      scheduled_date, scheduled_time, blocked, created_at, carry_over_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.text,
      task.importance,
      task.workType,
      task.durationMins ?? null,
      task.deadlineLabel ?? null,
      task.deadline ?? null,
      task.deadlineTime ?? null,
      task.scheduledDate ?? null,
      task.scheduledTime ?? null,
      task.blocked ? 1 : 0,
      task.createdAt,
      task.carryOverCount ?? 0,
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
  if (patch.deadlineTime !== undefined) { fields.push('deadline_time = ?'); values.push(patch.deadlineTime); }
  if (patch.scheduledDate !== undefined) { fields.push('scheduled_date = ?'); values.push(patch.scheduledDate); }
  if (patch.scheduledTime !== undefined) { fields.push('scheduled_time = ?'); values.push(patch.scheduledTime); }
  if (patch.blocked !== undefined) { fields.push('blocked = ?'); values.push(patch.blocked ? 1 : 0); }
  if (patch.carryOverCount !== undefined) { fields.push('carry_over_count = ?'); values.push(patch.carryOverCount); }

  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values as SQLite.SQLiteBindValue[]);
}

export async function clearAllTasks(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM tasks');
}

// === Completed tasks (archive) ===

export async function saveCompletedTask(
  task: Task,
  pomosCount: number,
  notes: string | null
): Promise<void> {
  const db = await getDb();
  const completedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO completed_tasks (id, task_json, completed_at, pomos_count, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [task.id, JSON.stringify(task), completedAt, pomosCount, notes]
  );
}

export async function loadCompletedTasks(): Promise<CompletedTask[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM completed_tasks ORDER BY completed_at DESC'
  );
  return rows.map((r) => ({
    id: r.id as string,
    task: JSON.parse(r.task_json as string) as Task,
    completedAt: r.completed_at as string,
    pomosCount: (r.pomos_count as number) ?? 0,
    notes: (r.notes as string) ?? null,
  }));
}

export async function deleteCompletedTask(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM completed_tasks WHERE id = ?', [id]);
}

// === Settings ===

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function getDayMode(): Promise<DayMode> {
  const v = await getSetting('day_mode');
  if (v === 'light' || v === 'productive') return v;
  return 'normal';
}

export async function setDayMode(mode: DayMode): Promise<void> {
  await setSetting('day_mode', mode);
}

export async function getLastPlanDate(): Promise<string | null> {
  return getSetting('last_plan_date');
}

export async function setLastPlanDate(isoDate: string): Promise<void> {
  await setSetting('last_plan_date', isoDate);
}
