<script lang="ts">
  import { enhance } from '$app/forms';

  let gatewayType = $state('local');
  let { form, data }: { form?: { error?: string }, data: { defaults: { workspaceDir: string; cronDir: string; coreSkillsDir: string; workspaceSkillsDir: string } } } = $props();
</script>

<div class="setup-wrap">
  <div class="setup-card">
    <div class="setup-header">
      <img src="/logo.png" alt="Clawductor" class="auth-logo" />
      <h1 class="setup-title">Clawductor Setup</h1>
      <p class="setup-subtitle">Configure your OpenClaw mission control.</p>
    </div>

    {#if form?.error}
      <div class="error-banner">{form.error}</div>
    {/if}

    <form method="POST" use:enhance class="setup-form">

      <div class="field">
        <label for="instance_name">Instance Name</label>
        <input id="instance_name" name="instance_name" type="text"
          placeholder="e.g. Thomas's Server" required />
        <span class="hint">Displayed in the header.</span>
      </div>

      <div class="field">
        <label>Gateway Location</label>
        <div class="radio-group">
          <label class="radio-option {gatewayType === 'local' ? 'radio-active' : ''}">
            <input type="radio" name="gateway_type" value="local"
              bind:group={gatewayType} />
            Local <span class="radio-sub">Same machine (127.0.0.1:18789)</span>
          </label>
          <label class="radio-option {gatewayType === 'remote' ? 'radio-active' : ''}">
            <input type="radio" name="gateway_type" value="remote"
              bind:group={gatewayType} />
            Remote <span class="radio-sub">EC2 or other server</span>
          </label>
        </div>
      </div>

      {#if gatewayType === 'remote'}
      <div class="field">
        <label for="custom_url">Gateway URL</label>
        <input id="custom_url" name="custom_url" type="url"
          placeholder="http://your-ec2-ip:18789" />
      </div>
      {/if}

      <div class="field">
        <label for="gateway_token">Gateway Token</label>
        <input id="gateway_token" name="gateway_token" type="password"
          placeholder="Your OpenClaw gateway token" required />
        <span class="hint">Found in your OpenClaw config.</span>
      </div>

      <hr class="divider" />

      <div class="field">
        <label for="workspace_dir">Workspace Path</label>
        <input id="workspace_dir" name="workspace_dir" type="text" value={data.defaults.workspaceDir} required />
        <span class="hint">Detected Ubuntu default. Used for workspace-relative features.</span>
      </div>

      <div class="field">
        <label for="cron_dir">Cron Path</label>
        <input id="cron_dir" name="cron_dir" type="text" value={data.defaults.cronDir} required />
        <span class="hint">Directory containing jobs.json.</span>
      </div>

      <div class="field">
        <label for="core_skills_dir">Core Skills Path</label>
        <input id="core_skills_dir" name="core_skills_dir" type="text" value={data.defaults.coreSkillsDir} required />
        <span class="hint">OpenClaw-installed skills directory.</span>
      </div>

      <div class="field">
        <label for="workspace_skills_dir">Workspace Skills Path</label>
        <input id="workspace_skills_dir" name="workspace_skills_dir" type="text" value={data.defaults.workspaceSkillsDir} required />
        <span class="hint">Custom skills inside your workspace.</span>
      </div>

      <div class="field">
        <label for="task_timeout_seconds">Bot Timeout (seconds)</label>
        <input id="task_timeout_seconds" name="task_timeout_seconds" type="number" min="0" step="1" value="120" required />
        <span class="hint">0 means no timeout for dispatched subagent runs.</span>
      </div>

      <hr class="divider" />

      <div class="field">
        <label for="password">Admin Password</label>
        <input id="password" name="password" type="password"
          placeholder="Min. 8 characters" required minlength="8" />
      </div>

      <div class="field">
        <label for="confirm">Confirm Password</label>
        <input id="confirm" name="confirm" type="password"
          placeholder="Repeat password" required />
      </div>

      <button type="submit" class="submit-btn">Set Up Clawductor →</button>
    </form>
  </div>
</div>

<style>
  .setup-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    background: #FFFDF5;
  }

  .setup-card {
    width: 100%;
    max-width: 480px;
    border: 3px solid var(--black);
    box-shadow: var(--shadow-lg);
    background: #fff;
    padding: 2.5rem;
  }

  .setup-header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .auth-logo { width: 64px; height: 64px; object-fit: contain; }

  .setup-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 900;
    font-size: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0.5rem 0 0.25rem;
  }

  .setup-subtitle {
    font-size: 0.85rem;
    color: #666;
    margin: 0;
  }

  .error-banner {
    background: var(--red);
    color: #fff;
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    padding: 0.75rem 1rem;
    border: 2px solid var(--black);
    margin-bottom: 1.5rem;
  }

  .setup-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
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

  .field input[type="text"],
  .field input[type="password"],
  .field input[type="url"] {
    background: #fff;
    border: 2px solid var(--black);
    padding: 0.65rem 0.875rem;
    font-size: 0.9rem;
    font-family: 'Space Grotesk', sans-serif;
    outline: none;
  }

  .field input:focus { box-shadow: 0 0 0 3px var(--yellow); }

  .hint {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    color: #888;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.65rem 0.875rem;
    border: 2px solid #ccc;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    transition: border-color 0.1s;
  }

  .radio-option input[type="radio"] { accent-color: var(--black); }
  .radio-active { border-color: var(--black); background: #f9f9f4; box-shadow: 3px 3px 0 var(--black); }

  .radio-sub {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    font-weight: 400;
    color: #888;
    margin-left: auto;
  }

  .divider {
    border: none;
    border-top: 2px dashed #ddd;
    margin: 0.25rem 0;
  }

  .submit-btn {
    padding: 0.875rem;
    background: var(--yellow);
    border: 2px solid var(--black);
    box-shadow: var(--shadow);
    font-size: 0.9rem;
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    margin-top: 0.5rem;
  }

  .submit-btn:hover {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 var(--black);
  }
</style>
