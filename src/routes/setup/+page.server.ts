import type { Actions } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { setupInstance, isSetupComplete } from '$lib/config.js';

export async function load() {
  if (isSetupComplete()) throw redirect(302, '/');
  return {};
}

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const instanceName = String(form.get('instance_name') ?? '').trim();
    const gatewayType  = String(form.get('gateway_type')  ?? '');
    const customUrl    = String(form.get('custom_url')    ?? '').trim();
    const token        = String(form.get('gateway_token') ?? '').trim();
    const password     = String(form.get('password')      ?? '');
    const confirm      = String(form.get('confirm')       ?? '');

    if (!instanceName) return fail(400, { error: 'Instance name is required.' });
    if (!token)        return fail(400, { error: 'Gateway token is required.' });
    if (!password)     return fail(400, { error: 'Password is required.' });
    if (password !== confirm) return fail(400, { error: 'Passwords do not match.' });
    if (password.length < 8)  return fail(400, { error: 'Password must be at least 8 characters.' });

    const gatewayUrl = gatewayType === 'local'
      ? 'http://127.0.0.1:18789'
      : customUrl;

    if (!gatewayUrl) return fail(400, { error: 'Gateway URL is required.' });

    setupInstance({ instanceName, gatewayUrl, gatewayToken: token, password });
    throw redirect(302, '/login');
  }
};
