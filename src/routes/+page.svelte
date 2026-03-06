<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type Agent = { id: string; name: string; icon: string };
  type Task = {
    id: string;
    title: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    output?: string;
    agent_id?: string;
    agent?: { name: string; icon: string } | null;
    skill_used?: string;
    skill_reason?: string;
    created_at: number;
    updated_at: number;
  };

  let gatewayStatus: 'checking' | 'online' | 'offline' = 'checking';
  let usage: { totalTokens: number | null; contextTokens: number | null; model: string | null } | null = null;
  let tasks: Task[] = [];
  let agents: Agent[] = [];
  let newTitle = '';
  let selectedAgentId = '';
  let creating = false;
  let selectedTask: Task | null = null;
  let showArchived = false;
  let pollInterval: ReturnType<typeof setInterval>;

  const columns: { key: Task['status']; label: string; accentColor: string }[] = [
    { key: 'pending', label: 'Pending',  accentColor: '#aaa' },
    { key: 'running', label: 'Running',  accentColor: '#FFE500' },
    { key: 'done',    label: 'Done',     accentColor: '#00C853' },
    { key: 'failed',  label: 'Failed',   accentColor: '#FF3131' },
  ];

  function tasksFor(status: Task['status']) {
    return tasks.filter(t => t.status === status);
  }

  function elapsed(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    return `${Math.floor(s/3600)}h ago`;
  }

  function formatTokens(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  function usagePct(total: number, context: number): number {
    return Math.min(100, Math.round((total / context) * 100));
  }

  async function checkStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      gatewayStatus = data.ok ? 'online' : 'offline';
      usage = data.usage ?? null;
    } catch { gatewayStatus = 'offline'; usage = null; }
  }

  async function loadTasks() {
    const res = await fetch(`/api/tasks${showArchived ? '?archived=1' : ''}`);
    const data = await res.json();
    tasks = data.tasks ?? [];
    if (selectedTask) {
      selectedTask = tasks.find(t => t.id === selectedTask!.id) ?? selectedTask;
    }
  }

  async function loadAgents() {
    const res = await fetch('/api/agents');
    const data = await res.json();
    agents = data.agents ?? [];
  }

  async function pollRunning() {
    if (showArchived) return;
    const running = tasks.filter(t => t.status === 'running');
    for (const t of running) {
      const res = await fetch(`/api/tasks/${t.id}`);
      const data = await res.json();
      if (data.task?.status !== 'running') {
        tasks = tasks.map(x => x.id === t.id ? { ...data.task, agent: x.agent } : x);
        if (selectedTask?.id === t.id) selectedTask = { ...data.task, agent: selectedTask.agent };
      }
    }
  }

  async function createTask() {
    if (!newTitle.trim() || creating) return;
    creating = true;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        agent_id: selectedAgentId || undefined
      })
    });
    newTitle = '';
    await loadTasks();
    creating = false;
  }

  async function cancelTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
  }

  async function archiveTask(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: true })
    });
    selectedTask = null;
    await loadTasks();
  }

  async function unarchiveTask(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: false })
    });
    selectedTask = null;
    await loadTasks();
  }

  async function toggleView() {
    showArchived = !showArchived;
    await loadTasks();
  }

  onMount(() => {
    checkStatus();
    loadTasks();
    loadAgents();
    pollInterval = setInterval(async () => {
      await checkStatus();
      await pollRunning();
    }, 5000);
  });

  onDestroy(() => clearInterval(pollInterval));
</script>

<!-- Page Header -->
<div class="page-header">
  <div class="gateway-status">
    <span
      class="status-dot"
      class:status-online={gatewayStatus === 'online'}
      class:status-offline={gatewayStatus === 'offline'}
      class:status-checking={gatewayStatus === 'checking'}
    ></span>
    <span class="status-label">{gatewayStatus.toUpperCase()}</span>
    {#if usage && usage.totalTokens !== null && usage.contextTokens !== null}
      <span class="usage-divider">|</span>
      <div class="usage-info" title="{usage.totalTokens.toLocaleString()} / {usage.contextTokens.toLocaleString()} tokens used ({usagePct(usage.totalTokens, usage.contextTokens)}%)">
        <div class="usage-bar-wrap">
          <div
            class="usage-bar-fill"
            class:usage-bar-warn={usagePct(usage.totalTokens, usage.contextTokens) >= 70}
            class:usage-bar-danger={usagePct(usage.totalTokens, usage.contextTokens) >= 90}
            style="width: {usagePct(usage.totalTokens, usage.contextTokens)}%"
          ></div>
        </div>
        <span class="usage-label">
          {formatTokens(usage.contextTokens - usage.totalTokens)} left
        </span>
      </div>
    {/if}
  </div>
  <div class="header-right">
    <span class="task-count">{tasks.length} {showArchived ? 'ARCHIVED' : 'ACTIVE'}</span>
    <button class="archive-toggle" on:click={toggleView}>
      {showArchived ? '← ACTIVE' : 'ARCHIVE →'}
    </button>
  </div>
</div>

<!-- Dispatch Bar (only in active view) -->
{#if !showArchived}
<div class="dispatch-section">
  <div class="dispatch-bar">
    <input
      bind:value={newTitle}
      placeholder="New task…"
      class="task-input"
      on:keydown={(e) => e.key === 'Enter' && createTask()}
    />
    <button
      on:click={createTask}
      disabled={creating || !newTitle.trim()}
      class="dispatch-btn"
    >
      {creating ? 'Dispatching…' : 'Dispatch'}
    </button>
  </div>
  {#if agents.length > 0}
  <div class="agent-selector">
    <span class="agent-selector-label">AGENT:</span>
    <button
      class="agent-chip {selectedAgentId === '' ? 'agent-chip-active' : ''}"
      on:click={() => selectedAgentId = ''}
    >🪶 Tegid</button>
    {#each agents as agent}
      <button
        class="agent-chip {selectedAgentId === agent.id ? 'agent-chip-active' : ''}"
        on:click={() => selectedAgentId = agent.id}
      >{agent.icon} {agent.name}</button>
    {/each}
  </div>
  {/if}
</div>
{/if}

<!-- Kanban Board (active) or Archive List -->
{#if !showArchived}
<div class="kanban-grid">
  {#each columns as col}
    <div class="kanban-col">
      <div class="col-header" style="border-left: 4px solid {col.accentColor}">
        <h2 class="col-title">{col.label}</h2>
        <span class="col-count">{tasksFor(col.key).length}</span>
      </div>
      <div class="task-list">
        {#each tasksFor(col.key) as task (task.id)}
          <button
            on:click={() => selectedTask = task}
            class="task-card task-card-{task.status}"
          >
            {#if task.agent}
              <div class="task-agent">{task.agent.icon} {task.agent.name}</div>
            {/if}
            <p class="task-title">{task.title}</p>
            <div class="task-meta">
              <span class="task-time">{elapsed(task.created_at)}</span>
              {#if task.status === 'running'}
                <span class="task-badge badge-running">WORKING…</span>
              {:else if task.status === 'done'}
                <span class="task-badge badge-done">✓ DONE</span>
              {:else if task.status === 'failed'}
                <span class="task-badge badge-failed">✗ FAILED</span>
              {/if}
            </div>
          </button>
        {/each}
        {#if tasksFor(col.key).length === 0}
          <div class="empty-col">—</div>
        {/if}
      </div>
    </div>
  {/each}
</div>

{:else}
<!-- Archive list -->
<div class="archive-list">
  {#if tasks.length === 0}
    <div class="archive-empty">No archived tasks.</div>
  {/if}
  {#each tasks as task (task.id)}
    <button class="archive-row task-card-{task.status}" on:click={() => selectedTask = task}>
      <div class="archive-row-left">
        {#if task.agent}
          <span class="archive-agent">{task.agent.icon} {task.agent.name}</span>
        {/if}
        <span class="archive-title">{task.title}</span>
      </div>
      <div class="archive-row-right">
        <span class="task-badge badge-{task.status}">{task.status.toUpperCase()}</span>
        <span class="task-time">{elapsed(task.created_at)}</span>
      </div>
    </button>
  {/each}
</div>
{/if}

<!-- Task Detail Modal -->
{#if selectedTask}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click|self={() => selectedTask = null}>
    <div class="modal">
      <div class="modal-header">
        <div>
          {#if selectedTask.agent}
            <div class="modal-agent">{selectedTask.agent.icon} {selectedTask.agent.name}</div>
          {/if}
          <p class="modal-title">{selectedTask.title}</p>
          <p class="modal-meta">{elapsed(selectedTask.created_at)} · {selectedTask.status.toUpperCase()}</p>
          {#if selectedTask.skill_used}
            <p class="modal-skill">Skill: <strong>{selectedTask.skill_used}</strong>{#if selectedTask.skill_reason} — {selectedTask.skill_reason}{/if}</p>
          {/if}
        </div>
        <div class="modal-actions">
          {#if selectedTask.status === 'running'}
            <button
              on:click={() => { cancelTask(selectedTask!.id); selectedTask = null; }}
              class="action-btn btn-red"
            >CANCEL</button>
          {/if}
          {#if selectedTask.status === 'done' || selectedTask.status === 'failed'}
            {#if showArchived}
              <button on:click={() => unarchiveTask(selectedTask!.id)} class="action-btn btn-blue">RESTORE</button>
            {:else}
              <button on:click={() => archiveTask(selectedTask!.id)} class="action-btn btn-gray">ARCHIVE</button>
            {/if}
          {/if}
          <button on:click={() => selectedTask = null} class="close-btn">×</button>
        </div>
      </div>
      <div class="modal-body">
        {#if selectedTask.status === 'running'}
          <p class="running-msg">Working on this…</p>
        {:else if selectedTask.output}
          <pre class="output-pre">{selectedTask.output}</pre>
        {:else if selectedTask.status === 'done'}
          <p class="empty-msg">Task completed — no output captured.</p>
        {:else}
          <p class="empty-msg">Waiting to be picked up…</p>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .gateway-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border: 2px solid var(--black);
    display: inline-block;
  }

  .status-online { background: var(--green); }
  .status-offline { background: var(--red); }
  .status-checking { background: var(--yellow); animation: pulse 1s infinite; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .status-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  .usage-divider {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    color: #ccc;
    margin: 0 0.1rem;
  }

  .usage-info {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: default;
  }

  .usage-bar-wrap {
    width: 48px;
    height: 6px;
    background: #e0e0d8;
    border: 1.5px solid var(--black);
    overflow: hidden;
    flex-shrink: 0;
  }

  .usage-bar-fill {
    height: 100%;
    background: var(--green);
    transition: width 0.4s ease;
  }

  .usage-bar-warn { background: var(--yellow); }
  .usage-bar-danger { background: var(--red); }

  .usage-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    color: #555;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .task-count {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    color: #888;
    letter-spacing: 0.08em;
  }

  .archive-toggle {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 0.25rem 0.75rem;
    background: #fff;
    border: 2px solid var(--black);
    box-shadow: 2px 2px 0 var(--black);
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
  }

  .archive-toggle:hover {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 var(--black);
  }

  /* Dispatch */
  .dispatch-section {
    margin-bottom: 2rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .dispatch-bar {
    display: flex;
    gap: 0.75rem;
  }

  .task-input {
    flex: 1;
    background: #fff;
    border: 2px solid var(--black);
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    font-family: 'Space Grotesk', sans-serif;
    color: var(--black);
    outline: none;
    transition: box-shadow 0.1s;
  }

  .task-input::placeholder { color: #aaa; }
  .task-input:focus { box-shadow: 0 0 0 3px var(--yellow); }

  .dispatch-btn {
    padding: 0.75rem 1.5rem;
    background: var(--yellow);
    border: 2px solid var(--black);
    box-shadow: var(--shadow);
    font-size: 0.85rem;
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    white-space: nowrap;
    color: var(--black);
  }

  .dispatch-btn:hover:not(:disabled) {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px var(--black);
  }

  .dispatch-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Agent selector */
  .agent-selector {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .agent-selector-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #888;
    white-space: nowrap;
  }

  .agent-chip {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    background: #fff;
    border: 2px solid var(--black);
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s, background 0.1s;
  }

  .agent-chip:hover {
    background: #f5f5f0;
    box-shadow: 2px 2px 0 var(--black);
    transform: translate(-1px, -1px);
  }

  .agent-chip-active {
    background: var(--yellow);
    box-shadow: 3px 3px 0 var(--black);
    transform: translate(-1px, -1px);
  }

  /* Kanban */
  .kanban-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .kanban-col { display: flex; flex-direction: column; gap: 0.75rem; }

  .col-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-left: 0.75rem;
    margin-bottom: 0.25rem;
  }

  .col-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--black);
    margin: 0;
  }

  .col-count {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    color: #888;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 80px;
  }

  /* Task cards */
  .task-card {
    text-align: left;
    background: #fff;
    border: 2px solid var(--black);
    box-shadow: var(--shadow);
    padding: 0.875rem 1rem;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    width: 100%;
  }

  .task-card:hover {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px var(--black);
  }

  .task-card-running { background: color-mix(in srgb, var(--yellow) 20%, #fff); }
  .task-card-done    { background: color-mix(in srgb, var(--green) 10%, #fff); }
  .task-card-failed  { background: color-mix(in srgb, var(--red) 10%, #fff); }

  .task-agent {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 0.35rem;
    padding: 0.1rem 0.4rem;
    background: #f0f0e8;
    border: 1px solid #ccc;
    display: inline-block;
  }

  .task-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--black);
    margin: 0 0 0.5rem;
    line-height: 1.4;
  }

  .task-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .task-time {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    color: #888;
  }

  .task-badge {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border: 1.5px solid var(--black);
    letter-spacing: 0.06em;
  }

  .badge-running { background: var(--yellow); animation: pulse 1s infinite; }
  .badge-done    { background: var(--green); }
  .badge-failed  { background: var(--red); color: #fff; }
  .badge-pending { background: #eee; }

  .empty-col {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    color: #ccc;
    padding: 0.5rem;
  }

  /* Archive list */
  .archive-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .archive-empty {
    font-family: 'Space Mono', monospace;
    font-size: 0.8rem;
    color: #aaa;
    padding: 2rem 0;
    text-align: center;
  }

  .archive-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    text-align: left;
    padding: 0.75rem 1rem;
  }

  .archive-row-left {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .archive-agent {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    color: #888;
    text-transform: uppercase;
  }

  .archive-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--black);
  }

  .archive-row-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 1rem;
  }

  .modal {
    background: #FFFDF5;
    border: 3px solid var(--black);
    box-shadow: var(--shadow-lg);
    width: 100%;
    max-width: 700px;
    max-height: 70vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 2px solid var(--black);
  }

  .modal-agent {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 0.35rem;
  }

  .modal-title {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--black);
    margin: 0 0 0.25rem;
  }

  .modal-meta {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    color: #888;
    margin: 0;
    text-transform: uppercase;
  }

  .modal-skill {
    margin: 0.4rem 0 0;
    font-size: 0.72rem;
    color: #333;
    font-family: 'Space Mono', monospace;
  }

  .modal-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .action-btn {
    font-size: 0.7rem;
    font-weight: 800;
    font-family: 'Space Grotesk', sans-serif;
    letter-spacing: 0.06em;
    padding: 0.25rem 0.75rem;
    border: 2px solid var(--black);
    box-shadow: 2px 2px 0px var(--black);
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
  }

  .action-btn:hover {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0px var(--black);
  }

  .btn-red  { background: var(--red); color: #fff; }
  .btn-blue { background: var(--blue); color: #fff; }
  .btn-gray { background: #eee; color: var(--black); }

  .close-btn {
    font-size: 1.5rem;
    line-height: 1;
    padding: 0 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    color: #666;
    font-weight: 300;
  }

  .close-btn:hover { color: var(--black); }

  .modal-body {
    padding: 1.25rem 1.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .running-msg {
    font-weight: 700;
    color: #996600;
    font-size: 0.875rem;
    animation: pulse 1s infinite;
  }

  .output-pre {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    color: var(--black);
    white-space: pre-wrap;
    line-height: 1.6;
    margin: 0;
  }

  .empty-msg {
    font-size: 0.875rem;
    color: #888;
    margin: 0;
  }
</style>
