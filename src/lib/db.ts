import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'clawductor.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    output TEXT,
    output_path TEXT,
    session_key TEXT,
    run_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

// lightweight migration for existing DBs
const cols = db.prepare(`PRAGMA table_info(tasks)`).all() as Array<{ name: string }>;
const colNames = new Set(cols.map(c => c.name));
if (!colNames.has('run_id')) {
  db.exec('ALTER TABLE tasks ADD COLUMN run_id TEXT');
}

export type Task = {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  output?: string;
  output_path?: string;
  session_key?: string;
  run_id?: string;
  created_at: number;
  updated_at: number;
};

export const tasksDb = {
  list: (): Task[] => db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as Task[],

  get: (id: string): Task | undefined =>
    db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined,

  create: (task: Omit<Task, 'created_at' | 'updated_at'>): Task => {
    const now = Date.now();
    db.prepare(
      'INSERT INTO tasks (id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(task.id, task.title, task.status, now, now);
    return tasksDb.get(task.id)!;
  },

  update: (id: string, fields: Partial<Task>): Task => {
    const now = Date.now();
    const keys = Object.keys(fields);
    if (keys.length === 0) return tasksDb.get(id)!;
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const vals = [...Object.values(fields), now, id];
    db.prepare(`UPDATE tasks SET ${sets}, updated_at = ? WHERE id = ?`).run(...vals);
    return tasksDb.get(id)!;
  }
};

export default db;
