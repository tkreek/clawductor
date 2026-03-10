import type { Handle } from '@sveltejs/kit';
import { redirect, json } from '@sveltejs/kit';
import { isSetupComplete, getCookieSecret } from '$lib/config.js';

const PUBLIC_PATHS = ['/setup', '/login'];

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname;

  // ── Setup gate ────────────────────────────────────────────────
  if (!isSetupComplete()) {
    if (!path.startsWith('/setup')) {
      throw redirect(302, '/setup');
    }
    const response = await resolve(event);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  // ── Auth gate ─────────────────────────────────────────────────
  const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p));
  if (isPublic) {
    const response = await resolve(event);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  const session = event.cookies.get('session');
  const secret  = getCookieSecret();

  if (session !== secret) {
    // API routes return 401, pages redirect to login
    if (path.startsWith('/api/')) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }
    throw redirect(302, `/login?redirect=${encodeURIComponent(path)}`);
  }

  const response = await resolve(event);
  response.headers.set('Cache-Control', 'no-store');
  return response;
};
