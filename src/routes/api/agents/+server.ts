import { json } from '@sveltejs/kit';
import { agentsDb } from '$lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  return json({ agents: agentsDb.list() });
}

export async function POST({ request }) {
  const { name, icon, identity, memory } = await request.json();
  if (!name?.trim()) return json({ ok: false, error: 'name required' }, { status: 400 });

  const agent = agentsDb.create({
    id: randomUUID(),
    name: name.trim(),
    icon: icon?.trim() || '🤖',
    identity: identity ?? '',
    memory: memory ?? ''
  });

  return json({ ok: true, agent });
}
