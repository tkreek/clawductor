<script lang="ts">
  import { enhance } from '$app/forms';

  let { form, data }: {
    form?: { error?: string; ok?: boolean };
    data: {
      values: {
        instanceName: string;
        gatewayUrl: string;
        gatewayToken: string;
        taskTimeoutSeconds: number;
        workspaceDir: string;
        cronDir: string;
        coreSkillsDir: string;
        workspaceSkillsDir: string;
      };
      defaults: {
        workspaceDir: string;
        cronDir: string;
        coreSkillsDir: string;
        workspaceSkillsDir: string;
      };
    };
  } = $props();
</script>

<div class="config-wrap">
  <div class="config-card">
    <div class="config-header">
      <img src="/logo.png" alt="Clawductor" class="config-logo" />
      <div>
        <div class="config-label">SETTINGS</div>
        <h1 class="config-title">Clawductor Config</h1>
        <p class="config-subtitle">Change mission name, gateway auth, paths, and task timeout.</p>
      </div>
    </div>

    {#if form?.error}
      <div class="error-banner">{form.error}</div>
    {/if}

    {#if form?.ok}
      <div class="success-banner">Saved.</div>
    {/if}

    <form method="POST" use:enhance class="config-form">
      <div class="field-grid">
        <div class="field">
          <label for="instance_name">Bot Name</label>
          <input id="instance_name" name="instance_name" type="text" value={data.values.instanceName} required />
          <span class="hint">Shown in the header and default agent chip.</span>
        </div>

        <div class="field">
          <label for="task_timeout_seconds">Bot Timeout (seconds)</label>
          <input id="task_timeout_seconds" name="task_timeout_seconds" type="number" min="0" step="1" value={data.values.taskTimeoutSeconds} required />
          <span class="hint">0 means no timeout. Used for dispatched subagent runs.</span>
        </div>
      </div>

      <div class="field">
        <label for="gateway_url">Gateway URL</label>
        <input id="gateway_url" name="gateway_url" type="url" value={data.values.gatewayUrl} required />
      </div>

      <div class="field">
        <label for="gateway_token">Gateway Token</label>
        <input id="gateway_token" name="gateway_token" type="password" value={data.values.gatewayToken} required />
      </div>

      <hr class="divider" />

      <div class="field">
        <label for="workspace_dir">Workspace Path</label>
        <input id="workspace_dir" name="workspace_dir" type="text" value={data.values.workspaceDir} required />
        <span class="hint">Default detected: {data.defaults.workspaceDir}</span>
      </div>

      <div class="field">
        <label for="cron_dir">Cron Path</label>
        <input id="cron_dir" name="cron_dir" type="text" value={data.values.cronDir} required />
        <span class="hint">Default detected: {data.defaults.cronDir}</span>
      </div>

      <div class="field">
        <label for="core_skills_dir">Core Skills Path</label>
        <input id="core_skills_dir" name="core_skills_dir" type="text" value={data.values.coreSkillsDir} required />
        <span class="hint">Default detected: {data.defaults.coreSkillsDir}</span>
      </div>

      <div class="field">
        <label for="workspace_skills_dir">Workspace Skills Path</label>
        <input id="workspace_skills_dir" name="workspace_skills_dir" type="text" value={data.values.workspaceSkillsDir} required />
        <span class="hint">Default detected: {data.defaults.workspaceSkillsDir}</span>
      </div>

      <button type="submit" class="submit-btn">Save Settings</button>
    </form>
  </div>
</div>

<style>
  .config-wrap {
    display: flex;
    justify-content: center;
  }

  .config-card {
    width: 100%;
    max-width: 760px;
    border: 3px solid var(--black);
    box-shadow: var(--shadow-lg);
    background: #fff;
    padding: 2rem;
  }

  .config-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .config-logo {
    width: 56px;
    height: 56px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .config-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    font-weight: 700;
    color: #888;
    letter-spacing: 0.12em;
  }

  .config-title {
    margin: 0.2rem 0;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.4rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .config-subtitle {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
  }

  .config-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--black);
  }

  .field input {
    background: #fff;
    border: 2px solid var(--black);
    padding: 0.65rem 0.875rem;
    font-size: 0.9rem;
    font-family: 'Space Grotesk', sans-serif;
    outline: none;
  }

  .field input:focus {
    box-shadow: 0 0 0 3px var(--yellow);
  }

  .hint {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    color: #888;
  }

  .divider {
    border: none;
    border-top: 2px dashed #ddd;
    margin: 0.25rem 0;
  }

  .error-banner,
  .success-banner {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    padding: 0.75rem 1rem;
    border: 2px solid var(--black);
    margin-bottom: 1rem;
  }

  .error-banner {
    background: var(--red);
    color: #fff;
  }

  .success-banner {
    background: var(--green);
    color: var(--black);
  }

  .submit-btn {
    margin-top: 0.5rem;
    padding: 0.875rem;
    background: var(--yellow);
    border: 2px solid var(--black);
    box-shadow: var(--shadow);
    font-size: 0.9rem;
    font-weight: 800;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
  }

  .submit-btn:hover {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 var(--black);
  }

  @media (max-width: 640px) {
    .config-card {
      padding: 1.25rem;
    }

    .config-header {
      align-items: flex-start;
    }

    .field-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
