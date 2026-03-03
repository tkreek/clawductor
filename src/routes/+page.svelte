<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  type Session = {
    id: string;
    label?: string;
    kind?: string;
    lastMessage?: string;
    updatedAt?: string;
  };

  let gatewayStatus: 'checking' | 'online' | 'offline' = 'checking';
  let sessions: Session[] = [];
  let message = '';
  let sending = false;
  let sendResult = '';
  let interval: ReturnType<typeof setInterval>;

  async function checkStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      gatewayStatus = data.ok ? 'online' : 'offline';
      sessions = data.sessions ?? [];
    } catch {
      gatewayStatus = 'offline';
    }
  }

  async function sendMessage() {
    if (!message.trim()) return;
    sending = true;
    sendResult = '';
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      sendResult = data.ok ? '✓ Sent' : '✗ Failed';
      message = '';
    } catch {
      sendResult = '✗ Error';
    }
    sending = false;
    setTimeout(() => (sendResult = ''), 3000);
  }

  onMount(() => {
    checkStatus();
    interval = setInterval(checkStatus, 10000);
  });

  onDestroy(() => clearInterval(interval));
</script>

<!-- Gateway Status -->
<section class="mb-8">
  <h2 class="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Gateway</h2>
  <div class="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
    <span class="w-2.5 h-2.5 rounded-full {gatewayStatus === 'online' ? 'bg-emerald-400' : gatewayStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'}"></span>
    <span class="text-sm font-medium capitalize">{gatewayStatus}</span>
    <span class="text-xs text-zinc-500 ml-auto">ws://127.0.0.1:18789</span>
  </div>
</section>

<!-- Sessions -->
<section class="mb-8">
  <h2 class="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Active Sessions</h2>
  {#if sessions.length === 0}
    <div class="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-sm text-zinc-500">
      No sessions found.
    </div>
  {:else}
    <div class="flex flex-col gap-2">
      {#each sessions as s}
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
          <div class="flex items-center justify-between mb-1">
            <span class="text-sm font-medium">{s.label ?? s.id}</span>
            {#if s.kind}
              <span class="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{s.kind}</span>
            {/if}
          </div>
          {#if s.lastMessage}
            <p class="text-xs text-zinc-400 truncate">{s.lastMessage}</p>
          {/if}
          {#if s.updatedAt}
            <p class="text-xs text-zinc-600 mt-1">{new Date(s.updatedAt).toLocaleTimeString()}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<!-- Send Message -->
<section>
  <h2 class="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-3">Message Tegid</h2>
  <div class="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
    <textarea
      bind:value={message}
      placeholder="Say something..."
      rows="3"
      class="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-600 resize-none outline-none"
      on:keydown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
    ></textarea>
    <div class="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
      <span class="text-xs text-zinc-500">Enter to send · Shift+Enter for newline</span>
      <div class="flex items-center gap-3">
        {#if sendResult}
          <span class="text-xs {sendResult.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}">{sendResult}</span>
        {/if}
        <button
          on:click={sendMessage}
          disabled={sending || !message.trim()}
          class="text-sm px-4 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg font-medium disabled:opacity-40 hover:bg-white transition-colors"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  </div>
</section>
