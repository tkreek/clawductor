<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form }: { data: { redirect: string }, form?: { error?: string } } = $props();
</script>

<div class="login-wrap">
  <div class="login-card">
    <div class="login-header">
      <img src="/logo-v2.png" alt="Clawductor" class="auth-logo" />
      <h1 class="login-title">Clawductor</h1>
      <p class="login-subtitle">Enter your password to continue.</p>
    </div>

    {#if form?.error}
      <div class="error-banner">{form.error}</div>
    {/if}

    <form method="POST" action="?redirect={encodeURIComponent(data.redirect)}" use:enhance class="login-form">
      <div class="field">
        <label for="password">Password</label>
        <input id="password" name="password" type="password"
          placeholder="••••••••" required autofocus />
      </div>
      <button type="submit" class="submit-btn">Unlock →</button>
    </form>
  </div>
</div>

<style>
  .login-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 2rem;
    background: #FFFDF5;
  }

  .login-card {
    width: 100%;
    max-width: 360px;
    border: 3px solid var(--black);
    box-shadow: var(--shadow-lg);
    background: #fff;
    padding: 2.5rem;
  }

  .login-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .auth-logo { width: 64px; height: 64px; object-fit: contain; }

  .login-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 900;
    font-size: 1.5rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0.5rem 0 0.25rem;
  }

  .login-subtitle {
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

  .login-form {
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
  }

  .field input {
    background: #fff;
    border: 2px solid var(--black);
    padding: 0.65rem 0.875rem;
    font-size: 0.9rem;
    font-family: 'Space Grotesk', sans-serif;
    outline: none;
  }

  .field input:focus { box-shadow: 0 0 0 3px var(--yellow); }

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
  }

  .submit-btn:hover {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 var(--black);
  }
</style>
