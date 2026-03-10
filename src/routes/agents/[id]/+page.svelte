<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  type Agent = {
    id: string;
    name: string;
    icon: string;
    identity: string;
    memory: string;
    created_at: number;
    updated_at: number;
  };

  type Task = {
    id: string;
    title: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    output?: string;
    agent_id?: string;
    created_at: number;
    updated_at: number;
  };

  const agentId = $page.params.id;

  let agent: Agent | null = null;
  let tasks: Task[] = [];
  let expandedTask: string | null = null;
  let pollInterval: ReturnType<typeof setInterval>;

  // Edit fields
  let editName = '';
  let editIdentity = '';
  let editMemory = '';
  let saving = false;

  // New task
  let newTitle = '';
  let dispatching = false;

  function elapsed(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  async function loadAgent() {
    const res = await fetch(`/api/agents/${agentId}`);
    if (!res.ok) { goto('/agents'); return; }
    const data = await res.json();
    agent = data.agent;
    editName = agent!.name;
    editIdentity = agent!.identity;
    editMemory = agent!.memory;
  }

  async function loadTasks() {
    const res = await fetch(`/api/tasks?agent_id=${agentId}`);
    const data = await res.json();
    tasks = data.tasks ?? [];
  }

  async function saveAgent() {
    if (!agent || saving) return;
    saving = true;
    const res = await fetch(`/api/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, identity: editIdentity, memory: editMemory })
    });
    const data = await res.json();
    if (data.ok) agent = data.agent;
    saving = false;
  }

  async function deleteAgent() {
    if (!confirm(`Delete agent "${agent?.name}"? This cannot be undone.`)) return;
    await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
    goto('/agents');
  }

  async function dispatchTask() {
    if (!newTitle.trim() || dispatching) return;
    dispatching = true;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), agent_id: agentId })
    });
    newTitle = '';
    await loadTasks();
    dispatching = false;
  }

  async function pollRunning() {
    const running = tasks.filter(t => t.status === 'running');
    for (const t of running) {
      const res = await fetch(`/api/tasks/${t.id}`);
      const data = await res.json();
      if (data.task?.status !== 'running') {
        tasks = tasks.map(x => x.id === t.id ? data.task : x);
      }
    }
  }

  function toggleExpand(id: string) {
    expandedTask = expandedTask === id ? null : id;
  }

  function statusClass(status: Task['status']) {
    return {
      pending: 'badge-pending',
      running: 'badge-running',
      done: 'badge-done',
      failed: 'badge-failed'
    }[status];
  }

  onMount(async () => {
    await loadAgent();
    await loadTasks();
    pollInterval = setInterval(async () => {
      await pollRunning();
    }, 5000);
  });

  onDestroy(() => clearInterval(pollInterval));
</script>

<!-- Back link -->
<div class="back-row">
  <a href="/agents" class="back-link">← All Profiles</a>
</div>

{#if !agent}
  <p class="loading-msg">Loading…</p>
{:else}
  <div class="detail-grid">

    <!-- Left: Agent Info -->
    <div class="left-panel">
      <div class="panel-card">

        <!-- Agent identity header -->
        <div class="agent-identity-header">
          <div class="agent-big-icon">{agent.icon}</div>
          <div class="agent-name-block">
            <input
              bind:value={editName}
              on:blur={saveAgent}
              class="name-input"
              placeholder="Profile name"
            />
            <p class="agent-created">Created {elapsed(agent.created_at)}</p>
          </div>
        </div>

        <!-- Identity section -->
        <div class="section">
          <div class="section-header">
            <div class="section-accent" style="background: var(--blue)"></div>
            <span class="section-label">Identity</span>
          </div>
          <textarea
            bind:value={editIdentity}
            on:blur={saveAgent}
            rows="5"
            placeholder="Who is this subagent? Their expertise, personality, approach…"
            class="panel-textarea"
          ></textarea>
        </div>

        <!-- Memory section -->
        <div class="section">
          <div class="section-header">
            <div class="section-accent" style="background: var(--green)"></div>
            <span class="section-label">Memory / Context</span>
          </div>
          <textarea
            bind:value={editMemory}
            on:blur={saveAgent}
            rows="4"
            placeholder="Persistent context or notes this subagent should carry…"
            class="panel-textarea"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="panel-actions">
          <button
            on:click={saveAgent}
            disabled={saving}
            class="save-btn"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button on:click={deleteAgent} class="delete-btn">
            Delete Profile
          </button>
        </div>
      </div>
    </div>

    <!-- Right: Task Panel -->
    <div class="right-panel">

      <!-- Dispatch -->
      <div class="dispatch-card">
        <div class="dispatch-label">Dispatch Task to {agent.name}</div>
        <div class="dispatch-row">
          <input
            bind:value={newTitle}
            placeholder="Describe the task…"
            class="dispatch-input"
            on:keydown={(e) => e.key === 'Enter' && dispatchTask()}
          />
          <button
            on:click={dispatchTask}
            disabled={dispatching || !newTitle.trim()}
            class="run-btn"
          >
            {dispatching ? '…' : 'Run'}
          </button>
        </div>
      </div>

      <!-- Task history -->
      <div class="task-history">
        <div class="history-header">
          <span class="history-label">Task History</span>
          <span class="history-count">{tasks.length}</span>
        </div>

        {#if tasks.length === 0}
          <div class="no-tasks">No tasks yet.</div>
        {:else}
          <div class="task-list">
            {#each tasks as task (task.id)}
              <div class="task-row {task.status === 'running' ? 'task-running' : ''}">
                <button
                  on:click={() => toggleExpand(task.id)}
                  class="task-row-btn"
                >
                  <div class="task-row-main">
                    <p class="task-row-title">{task.title}</p>
                    <div class="task-row-right">
                      <span class="status-badge {statusClass(task.status)}">
                        {task.status.toUpperCase()}
                      </span>
                      <span class="task-row-time">{elapsed(task.created_at)}</span>
                      <span class="expand-icon">{expandedTask === task.id ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {#if task.status === 'running'}
                    <p class="running-indicator">working…</p>
                  {/if}
                </button>

                {#if expandedTask === task.id}
                  <div class="task-output">
                    {#if task.status === 'running'}
                      <p class="output-running">{agent.name} is working on this…</p>
                    {:else if task.output}
                      <pre class="output-pre">{task.output}</pre>
                    {:else if task.status === 'done'}
                      <p class="output-empty">Task completed — no output captured.</p>
                    {:else}
                      <p class="output-empty">Waiting…</p>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

  </div>
{/if}

<style>
  .back-row { margin-bottom: 1.5rem; }

  .back-link {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    color: #888;
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    transition: color 0.1s;
  }

  .back-link:hover { color: var(--black); }

  .loading-msg {
    font-family: 'Space Mono', monospace;
    color: #888;
    font-size: 0.875rem;
  }

  /* Grid layout */
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  @media (max-width: 768px) {
    .detail-grid { grid-template-columns: 1fr; }
  }

  /* Left panel */
  .left-panel { display: flex; flex-direction: column; gap: 1rem; }

  .panel-card {
    background: #fff;
    border: 2px solid var(--black);
    box-shadow: var(--shadow);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .agent-identity-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .agent-big-icon {
    font-size: 3rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .agent-name-block { flex: 1; }

  .name-input {
    width: 100%;
    background: transparent;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--black);
    outline: none;
    border: none;
    border-bottom: 2px solid transparent;
    padding-bottom: 0.25rem;
    transition: border-color 0.1s;
  }

  .name-input:focus {
    border-bottom-color: var(--black);
  }

  .agent-created {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    color: #aaa;
    margin: 0.25rem 0 0;
  }

  /* Sections */
  .section { display: flex; flex-direction: column; gap: 0.5rem; }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-accent {
    width: 4px;
    height: 14px;
    flex-shrink: 0;
  }

  .section-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--black);
  }

  .panel-textarea {
    width: 100%;
    background: #FFFDF5;
    border: 2px solid var(--black);
    padding: 0.75rem 0.875rem;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.825rem;
    color: var(--black);
    outline: none;
    resize: none;
    line-height: 1.5;
    transition: box-shadow 0.1s;
  }

  .panel-textarea::placeholder { color: #bbb; }

  .panel-textarea:focus {
    box-shadow: 0 0 0 3px var(--yellow);
  }

  .panel-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.25rem;
  }

  .save-btn {
    padding: 0.5rem 1.25rem;
    background: var(--yellow);
    border: 2px solid var(--black);
    box-shadow: var(--shadow);
    font-size: 0.8rem;
    font-weight: 800;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    color: var(--black);
    transition: transform 0.1s, box-shadow 0.1s;
  }

  .save-btn:hover:not(:disabled) {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px var(--black);
  }

  .save-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .delete-btn {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    color: var(--red);
    background: none;
    border: none;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-decoration: underline;
    transition: opacity 0.1s;
  }

  .delete-btn:hover { opacity: 0.7; }

  /* Right panel */
  .right-panel {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Dispatch card */
  .dispatch-card {
    background: #fff;
    border: 2px solid var(--black);
    box-shadow: var(--shadow);
    padding: 1.25rem;
  }

  .dispatch-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #666;
    margin-bottom: 0.75rem;
  }

  .dispatch-row {
    display: flex;
    gap: 0.625rem;
  }

  .dispatch-input {
    flex: 1;
    background: #FFFDF5;
    border: 2px solid var(--black);
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    font-family: 'Space Grotesk', sans-serif;
    color: var(--black);
    outline: none;
    transition: box-shadow 0.1s;
  }

  .dispatch-input::placeholder { color: #bbb; }

  .dispatch-input:focus {
    box-shadow: 0 0 0 3px var(--yellow);
  }

  .run-btn {
    padding: 0.625rem 1.25rem;
    background: var(--yellow);
    border: 2px solid var(--black);
    box-shadow: var(--shadow);
    font-size: 0.85rem;
    font-weight: 800;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    color: var(--black);
    transition: transform 0.1s, box-shadow 0.1s;
    white-space: nowrap;
  }

  .run-btn:hover:not(:disabled) {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px var(--black);
  }

  .run-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Task history */
  .history-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .history-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--black);
  }

  .history-count {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    color: #aaa;
  }

  .no-tasks {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    color: #bbb;
    padding: 0.5rem;
  }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Task rows */
  .task-row {
    background: #fff;
    border: 2px solid var(--black);
    overflow: hidden;
  }

  .task-running {
    border-color: var(--black);
    animation: running-pulse 2s ease-in-out infinite;
  }

  @keyframes running-pulse {
    0%, 100% { box-shadow: 2px 2px 0px var(--black); }
    50% { box-shadow: 4px 4px 0px #996600; border-color: #996600; }
  }

  .task-row-btn {
    width: 100%;
    text-align: left;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    transition: background 0.1s;
  }

  .task-row-btn:hover { background: #FFFDF5; }

  .task-row-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .task-row-title {
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--black);
    margin: 0;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-row-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .status-badge {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 0.15rem 0.4rem;
    border: 1.5px solid var(--black);
    letter-spacing: 0.04em;
  }

  .badge-pending { background: #eee; color: #666; }
  .badge-running { background: var(--yellow); color: #000; animation: pulse 1s infinite; }
  .badge-done { background: var(--green); color: #000; }
  .badge-failed { background: var(--red); color: #fff; }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  .task-row-time {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    color: #aaa;
  }

  .expand-icon {
    font-size: 0.55rem;
    color: #aaa;
    font-family: 'Space Mono', monospace;
  }

  .running-indicator {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    color: #996600;
    margin: 0.25rem 0 0;
    animation: pulse 1s infinite;
  }

  .task-output {
    border-top: 2px solid var(--black);
    padding: 0.875rem 1rem;
    background: #FFFDF5;
  }

  .output-running {
    font-family: 'Space Mono', monospace;
    font-size: 0.8rem;
    color: #996600;
    font-weight: 700;
    animation: pulse 1s infinite;
    margin: 0;
  }

  .output-pre {
    font-family: 'Space Mono', monospace;
    font-size: 0.725rem;
    color: var(--black);
    white-space: pre-wrap;
    line-height: 1.6;
    margin: 0;
  }

  .output-empty {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    color: #aaa;
    margin: 0;
  }

  @media (max-width: 480px) {
    .task-row-right {
      gap: 0.3rem;
    }

    .task-row-time {
      display: none;
    }

    .dispatch-row {
      flex-direction: column;
    }

    .run-btn {
      width: 100%;
    }

    .panel-card {
      padding: 1rem;
    }

    .dispatch-card {
      padding: 1rem;
    }

    .agent-big-icon {
      font-size: 2.25rem;
    }

    .name-input {
      font-size: 1rem;
    }

    .panel-actions {
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  }
</style>
