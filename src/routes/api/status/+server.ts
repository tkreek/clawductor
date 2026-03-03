import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET() {
  const GATEWAY_URL = env.GATEWAY_URL ?? 'http://127.0.0.1:18789';
  const TOKEN = env.GATEWAY_TOKEN ?? '';

  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tool: 'sessions_list', args: { limit: 10 } }),
      signal: AbortSignal.timeout(4000)
    });

    const data = await res.json();
    const raw = data?.result?.details ?? {};
    const sessions = (raw.sessions ?? []).map((s: any) => ({
      id: s.sessionId,
      label: s.displayName ?? s.key,
      kind: s.kind,
      channel: s.channel,
      model: s.model,
      updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : null
    }));

    return json({ ok: true, sessions });
  } catch (e) {
    return json({ ok: false, sessions: [], error: String(e) });
  }
}
