import type { Actions } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';
import {
  detectDefaultPaths,
  getGatewayUrl,
  getGatewayToken,
  getInstanceName,
  getPaths,
  getTaskTimeoutSeconds,
  updateInstanceConfig
} from '$lib/config.js';

export async function load() {
  return {
    values: {
      instanceName: getInstanceName(),
      gatewayUrl: getGatewayUrl(),
      gatewayToken: getGatewayToken(),
      taskTimeoutSeconds: getTaskTimeoutSeconds(),
      ...getPaths()
    },
    defaults: detectDefaultPaths()
  };
}

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const instanceName = String(form.get('instance_name') ?? '').trim();
    const gatewayUrl = String(form.get('gateway_url') ?? '').trim();
    const gatewayToken = String(form.get('gateway_token') ?? '').trim();
    const workspaceDir = String(form.get('workspace_dir') ?? '').trim();
    const cronDir = String(form.get('cron_dir') ?? '').trim();
    const coreSkillsDir = String(form.get('core_skills_dir') ?? '').trim();
    const workspaceSkillsDir = String(form.get('workspace_skills_dir') ?? '').trim();
    const timeoutRaw = String(form.get('task_timeout_seconds') ?? '').trim();
    const taskTimeoutSeconds = Number(timeoutRaw);

    if (!instanceName) return fail(400, { error: 'Bot name is required.' });
    if (!gatewayUrl) return fail(400, { error: 'Gateway URL is required.' });
    if (!gatewayToken) return fail(400, { error: 'Gateway token is required.' });
    if (!workspaceDir) return fail(400, { error: 'Workspace path is required.' });
    if (!cronDir) return fail(400, { error: 'Cron path is required.' });
    if (!coreSkillsDir) return fail(400, { error: 'Core skills path is required.' });
    if (!workspaceSkillsDir) return fail(400, { error: 'Workspace skills path is required.' });
    if (!Number.isFinite(taskTimeoutSeconds) || taskTimeoutSeconds < 0) {
      return fail(400, { error: 'Bot timeout must be 0 or a positive number of seconds.' });
    }

    updateInstanceConfig({
      instanceName,
      gatewayUrl,
      gatewayToken,
      workspaceDir,
      cronDir,
      coreSkillsDir,
      workspaceSkillsDir,
      taskTimeoutSeconds
    });

    return { ok: true };
  }
};
