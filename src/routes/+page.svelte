<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type Task = {
    id: string;
    title: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    output?: string;
    created_at: number;
    updated_at: number;
  };

  let gatewayStatus: 'checking' | 'online' | 'offline' = 'checking';
  let tasks: Task[] = [];
  let newTitle = '';
  let creating = false;
  let selectedTask: Task | null = null;
  let pollInterval: ReturnType<typeof setInterval>;

  const columns: { key: Task['status']; label: string; color: string }[] = [
    { key: 'pending',  label: 'Pending',  color: 'text-zinc-400' },
    { key: 'running',  label: 'Running',  color: 'text-yellow-400' },
    { key: 'done',     label: 'Done',     color: 'text-emerald-400' },
    { key: 'failed',   label: 'Failed',   color: 'text-red-400' },
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

  async function checkStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      gatewayStatus = data.ok ? 'online' : 'offline';
    } catch { gatewayStatus = 'offline'; }
  }

  async function loadTasks() {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    tasks = data.tasks ?? [];
    // Refresh selected task if open
    if (selectedTask) {
      selectedTask = tasks.find(t => t.id === selectedTask!.id) ?? selectedTask;
    }
  }

  async function pollRunning() {
    const running = tasks.filter(t => t.status === 'running');
    for (const t of running) {
      const res = await fetch(`/api/tasks/${t.id}`);
      const data = await res.json();
      if (data.task?.status !== 'running') {
        tasks = tasks.map(x => x.id === t.id ? data.task : x);
        if (selectedTask?.id === t.id) selectedTask = data.task;
      }
    }
  }

  async function createTask() {
    if (!newTitle.trim() || creating) return;
    creating = true;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });
    newTitle = '';
    await loadTasks();
    creating = false;
  }

  async function cancelTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
  }

  onMount(() => {
    checkStatus();
    loadTasks();
    pollInterval = setInterval(async () => {
      await checkStatus();
      await pollRunning();
    }, 5000);
  });

  onDestroy(() => clearInterval(pollInterval));
</script>

<!-- Header -->
<div class="flex items-center justify-between mb-8">
  <div class="flex items-center gap-2">
    <span class="w-2 h-2 rounded-full {gatewayStatus === 'online' ? 'bg-emerald-400' : gatewayStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'}"></span>
    <span class="text-xs text-zinc-500 capitalize">{gatewayStatus}</span>
  </div>
  <span class="text-xs text-zinc-600">{tasks.length} total tasks</span>
</div>

<!-- New Task -->
<div class="mb-8">
  <div class="flex gap-2">
    <input
      bind:value={newTitle}
      placeholder="New task for Tegid..."
      class="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
      on:keydown={(e) => e.key === 'Enter' && createTask()}
    />
    <button
      on:click={createTask}
      disabled={creating || !newTitle.trim()}
      class="px-4 py-2.5 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-white transition-colors whitespace-nowrap"
    >
      {creating ? 'Dispatching…' : 'Dispatch'}
    </button>
  </div>
</div>

<!-- Kanban -->
<div class="grid grid-cols-2 gap-4">
  {#each columns as col}
    <div>
      <div class="flex items-center gap-2 mb-3">
        <h2 class="text-xs font-medium uppercase tracking-widest {col.color}">{col.label}</h2>
        <span class="text-xs text-zinc-600">{tasksFor(col.key).length}</span>
      </div>
      <div class="flex flex-col gap-2 min-h-[80px]">
        {#each tasksFor(col.key) as task (task.id)}
          <button
            on:click={() => selectedTask = task}
            class="text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl px-4 py-3 transition-colors"
          >
            <p class="text-sm text-zinc-100 leading-snug mb-1">{task.title}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-zinc-600">{elapsed(task.created_at)}</span>
              {#if task.status === 'running'}
                <span class="text-xs text-yellow-500 animate-pulse">working…</span>
              {:else if task.status === 'done'}
                <span class="text-xs text-emerald-500">✓ done</span>
              {:else if task.status === 'failed'}
                <span class="text-xs text-red-500">✗ failed</span>
              {/if}
            </div>
          </button>
        {/each}
        {#if tasksFor(col.key).length === 0}
          <div class="text-xs text-zinc-700 px-1">—</div>
        {/if}
      </div>
    </div>
  {/each}
</div>

<!-- Task Detail Modal -->
{#if selectedTask}
  <div class="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4" on:click|self={() => selectedTask = null}>
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col">
      <div class="flex items-start justify-between p-5 border-b border-zinc-800">
        <div>
          <p class="text-sm font-medium text-zinc-100">{selectedTask.title}</p>
          <p class="text-xs text-zinc-500 mt-0.5">{elapsed(selectedTask.created_at)} · {selectedTask.status}</p>
        </div>
        <div class="flex items-center gap-2">
          {#if selectedTask.status === 'running'}
            <button on:click={() => { cancelTask(selectedTask!.id); selectedTask = null; }} class="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-lg border border-red-900 hover:border-red-700 transition-colors">Cancel</button>
          {/if}
          <button on:click={() => selectedTask = null} class="text-zinc-500 hover:text-zinc-300 text-lg leading-none px-2">×</button>
        </div>
      </div>
      <div class="p-5 overflow-y-auto flex-1">
        {#if selectedTask.status === 'running'}
          <p class="text-sm text-yellow-400 animate-pulse">Tegid is working on this…</p>
        {:else if selectedTask.output}
          <pre class="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">{selectedTask.output}</pre>
        {:else if selectedTask.status === 'done'}
          <p class="text-sm text-zinc-500">Task completed — no output captured.</p>
        {:else}
          <p class="text-sm text-zinc-500">Waiting to be picked up…</p>
        {/if}
      </div>
    </div>
  </div>
{/if}
