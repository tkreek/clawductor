import type { Actions } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { verifyPassword, getConfig, getCookieSecret } from '$lib/config.js';

export async function load({ url }) {
  return { redirect: url.searchParams.get('redirect') ?? '/' };
}

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const form     = await request.formData();
    const password = String(form.get('password') ?? '');
    const target   = url.searchParams.get('redirect') ?? '/';

    const stored = getConfig('password_hash');
    if (!stored || !verifyPassword(password, stored)) {
      return fail(401, { error: 'Incorrect password.' });
    }

    const secret = getCookieSecret();
    cookies.set('session', secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30  // 30 days
    });

    throw redirect(302, target);
  }
};
