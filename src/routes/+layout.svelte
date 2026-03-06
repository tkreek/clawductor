<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  let { data, children }: { data: { instanceName: string }, children: any } = $props();
</script>

<div class="site-wrapper">
  <header class="site-header">
    <div class="header-inner">
      <img src="/logo.png" alt="Clawductor" class="header-logo" />
      <h1 class="site-title">Clawductor</h1>
      <nav class="site-nav">
        <a
          href="/"
          class="nav-link {$page.url.pathname === '/' ? 'nav-active' : ''}"
        >Tasks</a>
        <a
          href="/agents"
          class="nav-link {$page.url.pathname.startsWith('/agents') ? 'nav-active' : ''}"
        >Agents</a>
        <a
          href="/files"
          class="nav-link {$page.url.pathname.startsWith('/files') ? 'nav-active' : ''}"
        >Files</a>
        <a
          href="/skills"
          class="nav-link {$page.url.pathname.startsWith('/skills') ? 'nav-active' : ''}"
        >Skills</a>
        <a
          href="/cron"
          class="nav-link {$page.url.pathname.startsWith('/cron') ? 'nav-active' : ''}"
        >Cron</a>
      </nav>
      <span class="mission-label">{data.instanceName}</span>
      <a href="/login" class="logout-btn" title="Log out">⏏</a>
    </div>
  </header>
  <main class="site-main">
    {@render children()}
  </main>
</div>

<style>
  .site-wrapper {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 1.5rem 3rem;
  }

  .site-header {
    border-bottom: 3px solid var(--black);
    margin-bottom: 2rem;
  }

  .header-inner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 0;
  }

  .header-logo {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .site-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 900;
    font-size: 1.25rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--black);
    margin: 0;
  }

  .site-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 1.5rem;
  }

  .nav-link {
    font-size: 0.8rem;
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
    padding: 0.375rem 0.875rem;
    border: 2px solid transparent;
    text-decoration: none;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    transition: border-color 0.1s, color 0.1s;
    display: inline-block;
  }

  .nav-link:hover {
    border-color: var(--black);
    color: var(--black);
  }

  .nav-active {
    background: var(--yellow);
    border: 2px solid var(--black) !important;
    box-shadow: 3px 3px 0px var(--black);
    color: var(--black) !important;
    transform: translate(-1px, -1px);
  }

  .mission-label {
    font-size: 0.7rem;
    font-family: 'Space Mono', monospace;
    color: #888;
    margin-left: auto;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .site-main {
    padding-top: 0.5rem;
  }
</style>
