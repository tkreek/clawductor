import { json } from '@sveltejs/kit';
import { agentsDb } from '$lib/db';

export async function GET({ params }) {
  const agent = agentsDb.get(params.id);
  if (!agent) return json({ error: 'not found' }, { status: 404 });
  return json({ agent });
}

export async function PATCH({ params, request }) {
  const existing = agentsDb.get(params.id);
  if (!existing) return json({ error: 'not found' }, { status: 404 });

  const body = await request.json();
  const allowed = ['name', 'icon', 'identity', 'memory'] as const;
  const fields: Record<string, string> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) fields[key] = body[key];
  }

  const agent = agentsDb.update(params.id, fields);
  return json({ ok: true, agent });
}

export async function DELETE({ params }) {
  const existing = agentsDb.get(params.id);
  if (!existing) return json({ error: 'not found' }, { status: 404 });
  agentsDb.delete(params.id);
  return json({ ok: true });
}
