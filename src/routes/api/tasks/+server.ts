import { json } from '@sveltejs/kit';
import { tasksDb } from '$lib/db';
import { profilesDb, getSubagentProfilePath } from '$lib/subagent-profiles.js';
import { getGatewayUrl, getGatewayToken, getTaskTimeoutSeconds } from '$lib/config.js';
import { randomUUID } from 'crypto';

const GATEWAY_URL = () => getGatewayUrl();
const TOKEN = () => getGatewayToken();
const OUTPUT_DIR      = () => process.env.OUTPUT_DIR      ?? '/home/tkreek/development/task-output';
const AGENT_OUTPUT_DIR = () => process.env.AGENT_OUTPUT_DIR ?? OUTPUT_DIR();

async function gatewayInvoke(tool: string, args: Record<string, unknown>) {
  const res = await fetch(`${GATEWAY_URL()}/tools/invoke`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool, args }),
    signal: AbortSignal.timeout(12000)
  });
  return res.json();
}

export async function GET({ url }) {
  const agent_id = url.searchParams.get('agent_id') ?? undefined;
  const archived = url.searchParams.get('archived') === '1';
  const tasks = archived ? tasksDb.listArchived(agent_id) : tasksDb.list(agent_id);
  const profiles = profilesDb.list();
  const agentMap = Object.fromEntries(profiles.map(a => [a.id, { name: a.name, icon: a.icon }]));
  const enriched = tasks.map(t => ({ ...t, agent: t.agent_id ? (agentMap[t.agent_id] ?? null) : null }));
  return json({ tasks: enriched, profilePath: getSubagentProfilePath() });
}

export async function POST({ request }) {
  const { title, agent_id } = await request.json();
  if (!title?.trim()) return json({ ok: false, error: 'title required' }, { status: 400 });

  const id = randomUUID();
  const outputPath     = `${OUTPUT_DIR()}/${id}.md`;
  const attachmentsDir = `${OUTPUT_DIR()}/${id}`;
  // Paths the agent (running on host) should use
  const agentOutputPath     = `${AGENT_OUTPUT_DIR()}/${id}.md`;
  const agentAttachmentsDir = `${AGENT_OUTPUT_DIR()}/${id}`;
  tasksDb.create({ id, title, status: 'pending', agent_id: agent_id ?? undefined });

  // Build the agent task prompt
  let agentTask: string;

  if (agent_id) {
    const agent = profilesDb.get(agent_id);
    if (agent) {
      agentTask = `You are ${agent.name}.

## Shared Subagent Profile
This profile is shared between OpenClaw and Clawductor.
Profile store: ${getSubagentProfilePath()}
Profile ID: ${agent.id}

## Your Identity
${agent.identity}

## Your Memory / Context
${agent.memory}

---

## Task
${title}

---

Produce the result as markdown and save it to this file: ${agentOutputPath}

You may also save additional files (images, HTML, CSV, JSON, SVG) to the attachments directory: ${agentAttachmentsDir}/
Create that directory first if you need it. Reference attachments in your markdown output using relative links, e.g. [report.csv](report.csv) or ![chart.png](chart.png).
Supported attachment types: .md, .html, .png, .jpg, .gif, .svg, .csv, .json

IMPORTANT: Do NOT send Telegram/messages, do NOT ask follow-up questions, do NOT perform external side effects.
After any code/config update, you must run a build before reporting completion (e.g., npm run build), and include the build/restart status in your output.
If task asks for messaging, include the message content in the markdown output instead.

At the very top of your final markdown output, include exactly these two lines:
SKILL_SELECTED: <skill-name-or-none>
SKILL_REASON: <one-line-why>`;
    } else {
      agentTask = `You are executing a background task for Clawductor.\nProduce the result as markdown and save it to this file: ${agentOutputPath}\n\nYou may also save additional files (images, HTML, CSV, JSON, SVG) to: ${agentAttachmentsDir}/\nReference attachments in your markdown using relative links, e.g. [file.csv](file.csv) or ![img.png](img.png).\n\nIMPORTANT: Do NOT send Telegram/messages, do NOT ask follow-up questions, do NOT perform external side effects.\nAfter any code/config update, you must run a build before reporting completion (e.g., npm run build), and include the build/restart status in your output.\nIf task asks for messaging, include the message content in the markdown output instead.\n\nAt the very top of your final markdown output, include exactly these two lines:\nSKILL_SELECTED: <skill-name-or-none>\nSKILL_REASON: <one-line-why>\n\nTask:\n${title}`;
    }
  } else {
    agentTask = `You are executing a background task for Clawductor.\nProduce the result as markdown and save it to this file: ${agentOutputPath}\n\nYou may also save additional files (images, HTML, CSV, JSON, SVG) to: ${agentAttachmentsDir}/\nReference attachments in your markdown using relative links, e.g. [file.csv](file.csv) or ![img.png](img.png).\n\nIMPORTANT: Do NOT send Telegram/messages, do NOT ask follow-up questions, do NOT perform external side effects.\nAfter any code/config update, you must run a build before reporting completion (e.g., npm run build), and include the build/restart status in your output.\nIf task asks for messaging, include the message content in the markdown output instead.\n\nAt the very top of your final markdown output, include exactly these two lines:\nSKILL_SELECTED: <skill-name-or-none>\nSKILL_REASON: <one-line-why>\n\nTask:\n${title}`;
  }

  try {
    const result = await gatewayInvoke('sessions_spawn', {
      task: agentTask,
      mode: 'run',
      runtime: 'subagent',
      label: title.slice(0, 64),
      runTimeoutSeconds: getTaskTimeoutSeconds()
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
