export const WORKSPACE = process.env.WORKSPACE_DIR ?? '/home/tkreek/.openclaw/workspace';

export const FILES: { name: string; label: string; description: string }[] = [
  { name: 'SOUL.md',      label: '🪶 Soul',      description: 'Personality & core identity' },
  { name: 'MEMORY.md',    label: '🧠 Memory',    description: 'Long-term memory & context' },
  { name: 'USER.md',      label: '👤 User',      description: 'About Thomas' },
  { name: 'AGENTS.md',    label: '⚙️ Agents',    description: 'Workspace rules & conventions' },
  { name: 'HEARTBEAT.md', label: '💓 Heartbeat', description: 'Periodic check-in tasks' },
  { name: 'TOOLS.md',     label: '🔧 Tools',     description: 'Local setup notes' },
  { name: 'IDENTITY.md',  label: '🏷️ Identity',  description: 'Name, avatar, vibe' },
];
