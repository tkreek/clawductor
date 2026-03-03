import { json } from '@sveltejs/kit';
import { tasksDb } from '$lib/db';
import { env } from '$env/dynamic/private';
import { existsSync, readFileSync } from 'fs';

const GATEWAY_URL = () => env.GATEWAY_URL ?? 'http://127.0.0.1:18789';
const TOKEN = () => env.GATEWAY_TOKEN ?? '';

async function gatewayInvoke(tool: string, args: Record<string, unknown>) {
  const res = await fetch(`${GATEWAY_URL()}/tools/invoke`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, args }),
    signal: AbortSignal.timeout(10000)
  });
  return res.json();
}

export async function GET({ params }) {
  let task = tasksDb.get(params.id);
  if (!task) return json({ error: 'not found' }, { status: 404 });


  if (task.status === 'running' && !task.run_id) {
    const staleMs = Date.now() - task.updated_at;
    if (staleMs > 20000 && (!task.output_path || !existsSync(task.output_path))) {
      task = tasksDb.update(task.id, { status: 'failed', output: 'Dispatch failed (no run ID)' });
      return json({ task });
    }
  }

  // File-based completion check
  if (task.status === 'running' && task.output_path && existsSync(task.output_path)) {
    const output = readFileSync(task.output_path, 'utf-8');
    task = tasksDb.update(task.id, { status: 'done', output });
    return json({ task });
  }

  // Subagent status check
  if (task.status === 'running' && task.run_id) {
    try {
      const listRes = await gatewayInvoke('subagents', { action: 'list' });
      const recent = listRes?.result?.details?.recent ?? [];
      const active = listRes?.result?.details?.active ?? [];
      const match = [...active, ...recent].find((r: any) => r.runId === task!.run_id);

      if (match?.status === 'done') {
        let output = task.output ?? 'Task completed.';

        // Try to pull final assistant message from subagent session
        if (task.session_key) {
          const histRes = await gatewayInvoke('sessions_history', { sessionKey: task.session_key, limit: 20 });
          const messages = histRes?.result?.details?.messages ?? [];
          const lastAssistant = [...messages].reverse().find((m: any) => m.role === 'assistant');
          if (lastAssistant?.content?.[0]?.text) {
            output = lastAssistant.content[0].text;
          }
        }

        task = tasksDb.update(task.id, { status: 'done', output });
      } else if (match?.status === 'failed') {
        task = tasksDb.update(task.id, { status: 'failed', output: 'Subagent failed' });
      }
    } catch {
      // ignore transient polling errors
    }
  }

  return json({ task });
}

export async function DELETE({ params }) {
  const task = tasksDb.get(params.id);
  if (!task) return json({ error: 'not found' }, { status: 404 });
  tasksDb.update(params.id, { status: 'failed', output: 'Canceled by user' });
  return json({ ok: true });
}
