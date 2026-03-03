import { json } from '@sveltejs/kit';
import { tasksDb } from '$lib/db';
import { env } from '$env/dynamic/private';
import { randomUUID } from 'crypto';

const GATEWAY_URL = () => env.GATEWAY_URL ?? 'http://127.0.0.1:18789';
const TOKEN = () => env.GATEWAY_TOKEN ?? '';
const OUTPUT_DIR = () => env.OUTPUT_DIR ?? '/home/tkreek/development/task-output';

async function gatewayInvoke(tool: string, args: Record<string, unknown>) {
  const res = await fetch(`${GATEWAY_URL()}/tools/invoke`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, args }),
    signal: AbortSignal.timeout(12000)
  });
  return res.json();
}

export async function GET() {
  return json({ tasks: tasksDb.list() });
}

export async function POST({ request }) {
  const { title } = await request.json();
  if (!title?.trim()) return json({ ok: false, error: 'title required' }, { status: 400 });

  const id = randomUUID();
  const outputPath = `${OUTPUT_DIR()}/${id}.md`;
  tasksDb.create({ id, title, status: 'pending' });

  const agentTask = `Complete this task and save your final output as markdown to this file: ${outputPath}\n\nTask:\n${title}`;

  try {
    const result = await gatewayInvoke('sessions_spawn', {
      task: agentTask,
      mode: 'run',
      runtime: 'subagent',
      label: title.slice(0, 64)
    });

    if (!result?.ok) {
      tasksDb.update(id, { status: 'failed', output: result?.error?.message ?? 'dispatch failed' });
      return json({ ok: false, task: tasksDb.get(id) }, { status: 500 });
    }

    const details = result?.result?.details ?? {};
    tasksDb.update(id, {
      status: 'running',
      output_path: outputPath,
      session_key: details.childSessionKey ?? null,
      run_id: details.runId ?? null
    });

    return json({ ok: true, task: tasksDb.get(id) });
  } catch (e) {
    tasksDb.update(id, { status: 'failed', output: String(e) });
    return json({ ok: false, task: tasksDb.get(id) }, { status: 500 });
  }
}
