import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import db from './db.js';

// ── Helpers ──────────────────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    const input = scryptSync(password, salt, 64);
    return timingSafeEqual(Buffer.from(hash, 'hex'), input);
  } catch {
    return false;
  }
}

// ── Config accessors ─────────────────────────────────────────────

export function getConfig(key: string): string | null {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
}

export function isSetupComplete(): boolean {
  return getConfig('setup_complete') === '1';
}

export function getGatewayUrl(): string {
  return getConfig('gateway_url') ?? 'http://127.0.0.1:18789';
}

export function getGatewayToken(): string {
  return getConfig('gateway_token') ?? '';
}

export function getTaskTimeoutSeconds(): number {
  const raw = getConfig('task_timeout_seconds');
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 120;
}

function candidateUsers(): string[] {
  const set = new Set<string>();
  const envUsers = [process.env.SUDO_USER, process.env.USER, process.env.LOGNAME].filter(Boolean) as string[];
  for (const u of envUsers) set.add(u);
  set.add('ubuntu');
  set.add('tkreek');
  return Array.from(set);
}

function firstExisting(candidates: string[], fallback: string): string {
  return candidates.find((p) => existsSync(p)) ?? fallback;
}

export function detectDefaultPaths() {
  const users = candidateUsers();
  const homeDirs = users.map((u) => `/home/${u}`);
  const workspaceDir = firstExisting(homeDirs.map((h) => `${h}/.openclaw/workspace`), '/workspace');
  const cronDir = firstExisting(homeDirs.map((h) => `${h}/.openclaw/cron`), join(dirname(workspaceDir), 'cron'));
  const coreSkillsDir = firstExisting([
    ...homeDirs.map((h) => `${h}/.npm-global/lib/node_modules/openclaw/skills`),
    '/usr/local/lib/node_modules/openclaw/skills',
    '/openclaw/skills'
  ], '/openclaw/skills');
  const workspaceSkillsDir = firstExisting([
    join(workspaceDir, 'skills'),
    '/workspace/skills'
  ], '/workspace/skills');

  return {
    workspaceDir,
    cronDir,
    coreSkillsDir,
    workspaceSkillsDir
  };
}

export function getPaths() {
  const defaults = detectDefaultPaths();
  return {
    workspaceDir: getConfig('workspace_dir') ?? process.env.WORKSPACE_DIR ?? defaults.workspaceDir,
    cronDir: getConfig('cron_dir') ?? process.env.OPENCLAW_CRON_DIR ?? defaults.cronDir,
    coreSkillsDir: getConfig('core_skills_dir') ?? process.env.OPENCLAW_SKILLS_DIR ?? defaults.coreSkillsDir,
    workspaceSkillsDir: getConfig('workspace_skills_dir') ?? process.env.WORKSPACE_SKILLS_DIR ?? defaults.workspaceSkillsDir
  };
}

export function getInstanceName(): string {
  return getConfig('instance_name') ?? 'Clawductor';
}

export function updateInstanceConfig(opts: {
  instanceName: string;
  gatewayUrl: string;
  gatewayToken: string;
  workspaceDir: string;
  cronDir: string;
  coreSkillsDir: string;
  workspaceSkillsDir: string;
  taskTimeoutSeconds: number;
}): void {
  setConfig('instance_name', opts.instanceName);
  setConfig('gateway_url', opts.gatewayUrl);
  setConfig('gateway_token', opts.gatewayToken);
  setConfig('workspace_dir', opts.workspaceDir);
  setConfig('cron_dir', opts.cronDir);
  setConfig('core_skills_dir', opts.coreSkillsDir);
  setConfig('workspace_skills_dir', opts.workspaceSkillsDir);
  setConfig('task_timeout_seconds', String(opts.taskTimeoutSeconds));
}

export function getCookieSecret(): string {
  let secret = getConfig('cookie_secret');
  if (!secret) {
    secret = randomBytes(32).toString('hex');
    setConfig('cookie_secret', secret);
  }
  return secret;
}

// ── Setup ────────────────────────────────────────────────────────

export function setupInstance(opts: {
  instanceName: string;
  gatewayUrl: string;
  gatewayToken: string;
  password: string;
  workspaceDir?: string;
  cronDir?: string;
  coreSkillsDir?: string;
  workspaceSkillsDir?: string;
  taskTimeoutSeconds?: number;
}): void {
  setConfig('instance_name', opts.instanceName);
  setConfig('gateway_url', opts.gatewayUrl);
  setConfig('gateway_token', opts.gatewayToken);
  setConfig('password_hash', hashPassword(opts.password));
  setConfig('cookie_secret', randomBytes(32).toString('hex'));
  if (opts.workspaceDir) setConfig('workspace_dir', opts.workspaceDir);
  if (opts.cronDir) setConfig('cron_dir', opts.cronDir);
  if (opts.coreSkillsDir) setConfig('core_skills_dir', opts.coreSkillsDir);
  if (opts.workspaceSkillsDir) setConfig('workspace_skills_dir', opts.workspaceSkillsDir);
  setConfig('task_timeout_seconds', String(opts.taskTimeoutSeconds ?? 120));
  setConfig('setup_complete', '1');
}

export function updatePassword(newPassword: string): void {
  setConfig('password_hash', hashPassword(newPassword));
  // Invalidate all existing sessions
  setConfig('cookie_secret', randomBytes(32).toString('hex'));
}
