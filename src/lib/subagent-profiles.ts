import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';

export type SubagentProfile = {
  id: string;
  name: string;
  icon: string;
  identity: string;
  memory: string;
  created_at: number;
  updated_at: number;
};

type ProfileStore = {
  profiles: SubagentProfile[];
};

const WORKSPACE_DIR = process.env.WORKSPACE_DIR ?? '/home/tkreek/.openclaw/workspace';
const PROFILE_PATH = process.env.CLAWDUCTOR_SUBAGENT_PROFILES_PATH ?? join(WORKSPACE_DIR, 'clawductor', 'subagent-profiles.json');
const LEGACY_DB_PATH = process.env.DATA_DIR
  ? join(process.env.DATA_DIR, 'clawductor.db')
  : join(process.cwd(), 'data', 'clawductor.db');

function ensureDir() {
  mkdirSync(dirname(PROFILE_PATH), { recursive: true });
}

function migrateLegacyProfiles(): SubagentProfile[] {
  if (!existsSync(LEGACY_DB_PATH)) return [];
  try {
    const db = new Database(LEGACY_DB_PATH, { readonly: true });
    const rows = db.prepare('SELECT id, name, icon, identity, memory, created_at, updated_at FROM agents ORDER BY created_at ASC').all() as SubagentProfile[];
    db.close();
    return rows;
  } catch {
    return [];
  }
}

function ensureStore() {
  ensureDir();
  if (!existsSync(PROFILE_PATH)) {
    const profiles = migrateLegacyProfiles();
    const initial: ProfileStore = { profiles };
    writeFileSync(PROFILE_PATH, JSON.stringify(initial, null, 2));
  }
}

function readStore(): ProfileStore {
  ensureStore();
  try {
    const raw = readFileSync(PROFILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<ProfileStore>;
    return { profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [] };
  } catch {
    return { profiles: [] };
  }
}

function writeStore(store: ProfileStore) {
  ensureDir();
  writeFileSync(PROFILE_PATH, JSON.stringify(store, null, 2));
}

export function getSubagentProfilePath() {
  ensureStore();
  return PROFILE_PATH;
}

export const profilesDb = {
  list(): SubagentProfile[] {
    return readStore().profiles.sort((a, b) => a.created_at - b.created_at);
  },

  get(id: string): SubagentProfile | undefined {
    return readStore().profiles.find((profile) => profile.id === id);
  },

  create(input: { id?: string; name: string; icon?: string; identity?: string; memory?: string }): SubagentProfile {
    const now = Date.now();
    const profile: SubagentProfile = {
      id: input.id ?? randomUUID(),
      name: input.name,
      icon: input.icon?.trim() || '🤖',
      identity: input.identity ?? '',
      memory: input.memory ?? '',
      created_at: now,
      updated_at: now
    };
    const store = readStore();
    store.profiles.push(profile);
    writeStore(store);
    return profile;
  },

  update(id: string, fields: Partial<Pick<SubagentProfile, 'name' | 'icon' | 'identity' | 'memory'>>): SubagentProfile | undefined {
    const store = readStore();
    const idx = store.profiles.findIndex((profile) => profile.id === id);
    if (idx === -1) return undefined;
    const current = store.profiles[idx];
    const next: SubagentProfile = {
      ...current,
      ...fields,
      updated_at: Date.now()
    };
    store.profiles[idx] = next;
    writeStore(store);
    return next;
  },

  delete(id: string): boolean {
    const store = readStore();
    const nextProfiles = store.profiles.filter((profile) => profile.id !== id);
    if (nextProfiles.length === store.profiles.length) return false;
    writeStore({ profiles: nextProfiles });
    return true;
  }
};
