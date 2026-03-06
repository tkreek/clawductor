import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DATA_DIR = process.env.DATA_DIR ?? join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'clawductor.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

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

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '🤖',
    identity TEXT NOT NULL DEFAULT '',
    memory TEXT NOT NULL DEFAULT '',
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
if (!colNames.has('agent_id')) {
  db.exec('ALTER TABLE tasks ADD COLUMN agent_id TEXT');
}
if (!colNames.has('archived')) {
  db.exec('ALTER TABLE tasks ADD COLUMN archived INTEGER NOT NULL DEFAULT 0');
}
if (!colNames.has('skill_used')) {
  db.exec('ALTER TABLE tasks ADD COLUMN skill_used TEXT');
}
if (!colNames.has('skill_reason')) {
  db.exec('ALTER TABLE tasks ADD COLUMN skill_reason TEXT');
}

export type Task = {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  output?: string;
  output_path?: string;
  session_key?: string;
  run_id?: string;
  agent_id?: string;
  archived: number; // 0 = active, 1 = archived
  skill_used?: string;
  skill_reason?: string;
  created_at: number;
  updated_at: number;
};

export type Agent = {
  id: string;
  name: string;
  icon: string;
  identity: string;
  memory: string;
  created_at: number;
  updated_at: number;
};

export const tasksDb = {
  list: (agent_id?: string): Task[] => {
    if (agent_id) {
      return db.prepare('SELECT * FROM tasks WHERE agent_id = ? AND archived = 0 ORDER BY created_at DESC').all(agent_id) as Task[];
    }
    return db.prepare('SELECT * FROM tasks WHERE archived = 0 ORDER BY created_at DESC').all() as Task[];
  },

  listArchived: (agent_id?: string): Task[] => {
    if (agent_id) {
      return db.prepare('SELECT * FROM tasks WHERE agent_id = ? AND archived = 1 ORDER BY created_at DESC').all(agent_id) as Task[];
    }
    return db.prepare('SELECT * FROM tasks WHERE archived = 1 ORDER BY created_at DESC').all() as Task[];
  },

  get: (id: string): Task | undefined =>
    db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined,

  create: (task: Omit<Task, 'created_at' | 'updated_at' | 'archived'>): Task => {
    const now = Date.now();
    db.prepare(
      'INSERT INTO tasks (id, title, status, agent_id, archived, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)'
    ).run(task.id, task.title, task.status, task.agent_id ?? null, now, now);
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

export const agentsDb = {
  list: (): Agent[] =>
    db.prepare('SELECT * FROM agents ORDER BY created_at ASC').all() as Agent[],

  get: (id: string): Agent | undefined =>
    db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Agent | undefined,

  create: (agent: { id: string; name: string; icon: string; identity: string; memory: string }): Agent => {
    const now = Date.now();
    db.prepare(
      'INSERT INTO agents (id, name, icon, identity, memory, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(agent.id, agent.name, agent.icon, agent.identity, agent.memory, now, now);
    return agentsDb.get(agent.id)!;
  },

  update: (id: string, fields: Partial<Omit<Agent, 'id' | 'created_at' | 'updated_at'>>): Agent => {
    const now = Date.now();
    const keys = Object.keys(fields);
    if (keys.length === 0) return agentsDb.get(id)!;
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const vals = [...Object.values(fields), now, id];
    db.prepare(`UPDATE agents SET ${sets}, updated_at = ? WHERE id = ?`).run(...vals);
    return agentsDb.get(id)!;
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  }
};

export default db;
