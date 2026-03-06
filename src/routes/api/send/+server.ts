import { json } from '@sveltejs/kit';
import { getGatewayUrl, getGatewayToken } from '$lib/config.js';

export async function POST({ request }) {
  const { message } = await request.json();
  if (!message?.trim()) return json({ ok: false, error: 'empty message' });

  const GATEWAY_URL = getGatewayUrl();
  const TOKEN = getGatewayToken();

  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: {
          sessionKey: 'agent:main:main',
          message
        }
      }),
      signal: AbortSignal.timeout(10000)
    });

    const data = await res.json();
    return json({ ok: data?.result != null });
  } catch (e) {
    return json({ ok: false, error: String(e) });
  }
}
