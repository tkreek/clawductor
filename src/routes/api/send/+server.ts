import { json } from '@sveltejs/kit';

const GATEWAY_URL = 'http://127.0.0.1:18789';

export async function POST({ request }) {
  const { message } = await request.json();
  if (!message?.trim()) return json({ ok: false, error: 'empty message' });

  try {
    const res = await fetch(`${GATEWAY_URL}/api/sessions/main/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
      signal: AbortSignal.timeout(5000)
    });

    return json({ ok: res.ok });
  } catch (e) {
    return json({ ok: false, error: String(e) });
  }
}
