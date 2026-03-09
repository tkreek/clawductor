import type { Actions } from '@sveltejs/kit';
import { fail, redirect } from '@sveltejs/kit';
import { setupInstance, isSetupComplete, detectDefaultPaths } from '$lib/config.js';

export async function load() {
  if (isSetupComplete()) throw redirect(302, '/');
  return { defaults: detectDefaultPaths() };
}

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const instanceName = String(form.get('instance_name') ?? '').trim();
    const gatewayType  = String(form.get('gateway_type')  ?? '');
    const customUrl    = String(form.get('custom_url')    ?? '').trim();
    const token        = String(form.get('gateway_token') ?? '').trim();
    const workspaceDir = String(form.get('workspace_dir') ?? '').trim();
    const cronDir      = String(form.get('cron_dir') ?? '').trim();
    const coreSkillsDir = String(form.get('core_skills_dir') ?? '').trim();
    const workspaceSkillsDir = String(form.get('workspace_skills_dir') ?? '').trim();
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

    setupInstance({
      instanceName,
      gatewayUrl,
      gatewayToken: token,
      password,
      workspaceDir,
      cronDir,
      coreSkillsDir,
      workspaceSkillsDir
    });
    throw redirect(302, '/login');
  }
};
