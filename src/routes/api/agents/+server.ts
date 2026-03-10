import { json } from '@sveltejs/kit';
import { profilesDb, getSubagentProfilePath } from '$lib/subagent-profiles.js';

export async function GET() {
  return json({ agents: profilesDb.list(), source: 'workspace-profiles', path: getSubagentProfilePath() });
}

export async function POST({ request }) {
  const { name, icon, identity, memory } = await request.json();
  if (!name?.trim()) return json({ ok: false, error: 'name required' }, { status: 400 });

  const agent = profilesDb.create({
    name: name.trim(),
    icon: icon?.trim() || '🤖',
    identity: identity ?? '',
    memory: memory ?? ''
  });

  return json({ ok: true, agent, source: 'workspace-profiles' });
}
