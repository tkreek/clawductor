<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  let { data, children }: { data: { instanceName: string; gitBranch: string }, children: any } = $props();

  let menuOpen = $state(false);

  // Close menu on navigation
  $effect(() => {
    $page.url.pathname;
    menuOpen = false;
  });
</script>

<div class="site-wrapper">
  <header class="site-header">
    <div class="header-inner">
      <img src="/logo.png" alt="Clawductor" class="header-logo" />
      <h1 class="site-title">Clawductor</h1>
      <nav class="site-nav">
        <a href="/"       class="nav-link {$page.url.pathname === '/' ? 'nav-active' : ''}">Tasks</a>
        <a href="/agents" class="nav-link {$page.url.pathname.startsWith('/agents') ? 'nav-active' : ''}">Agents</a>
        <a href="/files"  class="nav-link {$page.url.pathname.startsWith('/files') ? 'nav-active' : ''}">Files</a>
        <a href="/skills" class="nav-link {$page.url.pathname.startsWith('/skills') ? 'nav-active' : ''}">Skills</a>
        <a href="/cron"   class="nav-link {$page.url.pathname.startsWith('/cron') ? 'nav-active' : ''}">Cron</a>
      </nav>
      <span class="mission-label">{data.instanceName}</span>
      <a href="/login" class="logout-btn" title="Log out">⏏</a>
      <button
        class="hamburger"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onclick={() => menuOpen = !menuOpen}
      >
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar {menuOpen ? 'bar-hide' : ''}"></span>
      </button>
    </div>

    <!-- Mobile nav drawer -->
    {#if menuOpen}
      <nav class="mobile-nav">
        <a href="/"       class="mobile-nav-link {$page.url.pathname === '/' ? 'mobile-nav-active' : ''}">Tasks</a>
        <a href="/agents" class="mobile-nav-link {$page.url.pathname.startsWith('/agents') ? 'mobile-nav-active' : ''}">Agents</a>
        <a href="/files"  class="mobile-nav-link {$page.url.pathname.startsWith('/files') ? 'mobile-nav-active' : ''}">Files</a>
        <a href="/skills" class="mobile-nav-link {$page.url.pathname.startsWith('/skills') ? 'mobile-nav-active' : ''}">Skills</a>
        <a href="/cron"   class="mobile-nav-link {$page.url.pathname.startsWith('/cron') ? 'mobile-nav-active' : ''}">Cron</a>
      </nav>
    {/if}
  </header>

  <main class="site-main">
    {@render children()}
  </main>

  {#if data.gitBranch}
    <footer class="site-footer">
      <span class="git-branch">⎇ {data.gitBranch}</span>
    </footer>
  {/if}
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

  /* Hamburger — hidden on desktop */
  .hamburger {
    display: none;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    width: 36px;
    height: 36px;
    padding: 6px;
    background: none;
    border: 2px solid var(--black);
    cursor: pointer;
    flex-shrink: 0;
  }

  .bar {
    display: block;
    width: 100%;
    height: 2px;
    background: var(--black);
    transition: opacity 0.15s;
  }

  .bar-hide {
    opacity: 0;
  }

  /* Mobile nav drawer */
  .mobile-nav {
    display: none;
    flex-direction: column;
    border-top: 2px solid var(--black);
  }

  .mobile-nav-link {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-decoration: none;
    color: var(--black);
    padding: 0.875rem 0.5rem;
    border-bottom: 1px solid #e0e0d8;
    transition: background 0.1s;
  }

  .mobile-nav-link:hover {
    background: #f5f5ee;
  }

  .mobile-nav-active {
    background: var(--yellow);
    border-left: 4px solid var(--black);
    padding-left: calc(0.5rem - 2px);
  }

  .mobile-nav-active:hover {
    background: var(--yellow);
  }

  .site-main {
    padding-top: 0.5rem;
  }

  .site-footer {
    margin-top: 3rem;
    padding: 0.75rem 0;
    border-top: 1px solid #e0e0d8;
    text-align: right;
  }

  .git-branch {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    color: #bbb;
    letter-spacing: 0.06em;
  }

  @media (max-width: 640px) {
    .site-nav {
      display: none;
    }

    .mission-label {
      display: none;
    }

    .hamburger {
      display: flex;
      margin-left: auto;
    }

    .mobile-nav {
      display: flex;
    }

    .header-inner {
      padding: 0.875rem 0;
    }

    .site-title {
      font-size: 1rem;
    }
  }
</style>
