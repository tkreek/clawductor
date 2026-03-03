import { json } from '@sveltejs/kit';

const GATEWAY_URL = 'http://127.0.0.1:18789';

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/api/sessions`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    
    const sessions = (data.sessions ?? []).map((s: any) => ({
      id: s.id,
      label: s.label ?? s.agentId ?? s.id,
      kind: s.kind,
      lastMessage: s.lastMessage?.text?.slice(0, 100),
      updatedAt: s.updatedAt ?? s.lastMessage?.createdAt
    }));

    return json({ ok: true, sessions });
  } catch {
    return json({ ok: false, sessions: [] });
  }
}
