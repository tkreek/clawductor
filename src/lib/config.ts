import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';
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

export function getInstanceName(): string {
  return getConfig('instance_name') ?? 'Clawductor';
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
}): void {
  setConfig('instance_name', opts.instanceName);
  setConfig('gateway_url', opts.gatewayUrl);
  setConfig('gateway_token', opts.gatewayToken);
  setConfig('password_hash', hashPassword(opts.password));
  setConfig('cookie_secret', randomBytes(32).toString('hex'));
  setConfig('setup_complete', '1');
}

export function updatePassword(newPassword: string): void {
  setConfig('password_hash', hashPassword(newPassword));
  // Invalidate all existing sessions
  setConfig('cookie_secret', randomBytes(32).toString('hex'));
}
