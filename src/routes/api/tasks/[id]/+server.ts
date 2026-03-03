import { json } from '@sveltejs/kit';
import { tasksDb } from '$lib/db';
import { existsSync, readFileSync } from 'fs';

export async function GET({ params }) {
  const task = tasksDb.get(params.id);
  if (!task) return json({ error: 'not found' }, { status: 404 });

  // If running, check if output file appeared
  if (task.status === 'running' && task.output_path && existsSync(task.output_path)) {
    const output = readFileSync(task.output_path, 'utf-8');
    tasksDb.update(task.id, { status: 'done', output });
    return json({ task: tasksDb.get(task.id) });
  }

  return json({ task });
}

export async function DELETE({ params }) {
  const task = tasksDb.get(params.id);
  if (!task) return json({ error: 'not found' }, { status: 404 });
  tasksDb.update(params.id, { status: 'failed' });
  return json({ ok: true });
}
