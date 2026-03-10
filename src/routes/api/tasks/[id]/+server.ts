import { json } from '@sveltejs/kit';
import { tasksDb } from '$lib/db';
import { getGatewayUrl, getGatewayToken, getTaskTimeoutSeconds } from '$lib/config.js';
import { existsSync, readFileSync } from 'fs';

const GATEWAY_URL = () => getGatewayUrl();
const TOKEN = () => getGatewayToken();

async function gatewayInvoke(tool: string, args: Record<string, unknown>) {
  const res = await fetch(`${GATEWAY_URL()}/tools/invoke`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, args }),
    signal: AbortSignal.timeout(10000)
  });
  return res.json();
}

function extractSkillMeta(output: string): { skill_used?: string; skill_reason?: string } {
  const skillMatch = output.match(/(^|\n)SKILL_SELECTED:\s*(.+)/i);
  const reasonMatch = output.match(/(^|\n)SKILL_REASON:\s*(.+)/i);
  const skill_used = skillMatch?.[2]?.trim();
  const skill_reason = reasonMatch?.[2]?.trim();
  const out: { skill_used?: string; skill_reason?: string } = {};
  if (skill_used) out.skill_used = skill_used;
  if (skill_reason) out.skill_reason = skill_reason;
  return out;
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
    const meta = extractSkillMeta(output);
    task = tasksDb.update(task.id, { status: 'done', output, ...meta });
    return json({ task });
  }


  // Timeout guard for stuck runs
  if (task.status === 'running' && task.run_id) {
    const timeoutSeconds = getTaskTimeoutSeconds();
    const maxMs = timeoutSeconds > 0 ? timeoutSeconds * 1000 : 0;
    if (maxMs > 0 && Date.now() - task.created_at > maxMs) {
      try {
        await gatewayInvoke('subagents', { action: 'kill', target: task.run_id });
      } catch {}
      task = tasksDb.update(task.id, { status: 'failed', output: `Timed out after ${timeoutSeconds} seconds` });
      return json({ task });
    }
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

        const meta = extractSkillMeta(output);
        task = tasksDb.update(task.id, { status: 'done', output, ...meta });
      } else if (match?.status === 'failed') {
        task = tasksDb.update(task.id, { status: 'failed', output: 'Subagent failed' });
      }
    } catch {
      // ignore transient polling errors
    }
  }

  return json({ task });
}

export async function PATCH({ params, request }) {
  const task = tasksDb.get(params.id);
  if (!task) return json({ error: 'not found' }, { status: 404 });
  const body = await request.json();
  if ('archived' in body) {
    tasksDb.update(params.id, { archived: body.archived ? 1 : 0 });
  }
  return json({ ok: true, task: tasksDb.get(params.id) });
}

export async function DELETE({ params }) {
  const task = tasksDb.get(params.id);
  if (!task) return json({ error: 'not found' }, { status: 404 });
  tasksDb.update(params.id, { status: 'failed', output: 'Canceled by user' });
  return json({ ok: true });
}
