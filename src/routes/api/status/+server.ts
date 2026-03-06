import { json } from '@sveltejs/kit';
import { getGatewayUrl, getGatewayToken } from '$lib/config.js';

export async function GET() {
  const GATEWAY_URL = getGatewayUrl();
  const TOKEN = getGatewayToken();

  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tool: 'sessions_list', args: { limit: 20 } }),
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

    // Find the main session to extract token usage
    const mainSession = (raw.sessions ?? []).find((s: any) => s.key === 'agent:main:main');
    const usage = mainSession
      ? {
          totalTokens: mainSession.totalTokens ?? null,
          contextTokens: mainSession.contextTokens ?? null,
          model: mainSession.model ?? null
        }
      : null;

    return json({ ok: true, sessions, usage });
  } catch (e) {
    return json({ ok: false, sessions: [], usage: null, error: String(e) });
  }
}
