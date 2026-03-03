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
    signal: AbortSignal.timeout(10000)
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

  const task = tasksDb.create({ id, title, status: 'pending' });

  // Spawn sub-agent
  const agentTask = `You are Tegid, a personal AI assistant. Complete the following task and write your full output as markdown to the file: ${outputPath}

After writing the file, respond with: TASK_COMPLETE

Task:
${title}`;

  try {
    const result = await gatewayInvoke('sessions_spawn', {
      task: agentTask,
      mode: 'run',
      label: title.slice(0, 50)
    });

    const sessionKey = result?.result?.details?.sessionKey ?? result?.result?.details?.id;
    tasksDb.update(id, { status: 'running', output_path: outputPath, session_key: sessionKey });
  } catch (e) {
    tasksDb.update(id, { status: 'failed', output: String(e) });
  }

  return json({ ok: true, task: tasksDb.get(id) });
}
