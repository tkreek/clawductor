import { json } from '@sveltejs/kit';
import { profilesDb, getSubagentProfilePath } from '$lib/subagent-profiles.js';

export async function GET({ params }) {
  const agent = profilesDb.get(params.id);
  if (!agent) return json({ error: 'not found' }, { status: 404 });
  return json({ agent, source: 'workspace-profiles', path: getSubagentProfilePath() });
}

export async function PATCH({ params, request }) {
  const existing = profilesDb.get(params.id);
  if (!existing) return json({ error: 'not found' }, { status: 404 });

  const body = await request.json();
  const allowed = ['name', 'icon', 'identity', 'memory'] as const;
  const fields: Record<string, string> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) fields[key] = body[key];
  }

  const agent = profilesDb.update(params.id, fields);
  return json({ ok: true, agent, source: 'workspace-profiles' });
}

export async function DELETE({ params }) {
  const existing = profilesDb.get(params.id);
  if (!existing) return json({ error: 'not found' }, { status: 404 });
  profilesDb.delete(params.id);
  return json({ ok: true, source: 'workspace-profiles' });
}
