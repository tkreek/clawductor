<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  type Agent = {
    id: string;
    name: string;
    icon: string;
    identity: string;
    memory: string;
    created_at: number;
  };

  let agents: Agent[] = [];
  let showModal = false;
  let creating = false;

  // Form fields
  let formIcon = '🤖';
  let formName = '';
  let formIdentity = '';
  let formMemory = '';

  async function loadAgents() {
    const res = await fetch('/api/agents');
    const data = await res.json();
    agents = data.agents ?? [];
  }

  async function createAgent() {
    if (!formName.trim() || creating) return;
    creating = true;
    await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formName.trim(),
        icon: formIcon.trim() || '🤖',
        identity: formIdentity,
        memory: formMemory
      })
    });
    formIcon = '🤖';
    formName = '';
    formIdentity = '';
    formMemory = '';
    showModal = false;
    creating = false;
    await loadAgents();
  }

  function openModal() {
    formIcon = '🤖';
    formName = '';
    formIdentity = '';
    formMemory = '';
    showModal = true;
  }

  onMount(loadAgents);
</script>

<!-- Header -->
<div class="agents-header">
  <h2 class="agents-title">Subagent Profiles</h2>
  <button on:click={openModal} class="new-agent-btn">
    + New Profile
  </button>
</div>

<!-- Agent Grid -->
{#if agents.length === 0}
  <div class="agents-empty">
    <p class="empty-icon">🤖</p>
    <p class="empty-msg">No subagent profiles yet. Create one to get started.</p>
  </div>
{:else}
  <div class="agents-grid">
    {#each agents as agent (agent.id)}
      <button
        on:click={() => goto(`/agents/${agent.id}`)}
        class="agent-card"
      >
        <div class="agent-icon">{agent.icon}</div>
        <p class="agent-name">{agent.name}</p>
        {#if agent.identity}
          <p class="agent-identity">{agent.identity}</p>
        {:else}
          <p class="agent-no-identity">No identity defined</p>
        {/if}
      </button>
    {/each}
  </div>
{/if}

<!-- Create Modal -->
{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click|self={() => showModal = false}>
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">New Subagent Profile</h3>
        <button on:click={() => showModal = false} class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <div class="form-row">
          <div class="icon-field">
            <label class="field-label" for="form-icon">Icon</label>
            <input
              id="form-icon"
              bind:value={formIcon}
              maxlength="4"
              class="icon-input"
            />
          </div>
          <div class="name-field">
            <label class="field-label" for="form-name">Name</label>
            <input
              id="form-name"
              bind:value={formName}
              placeholder="e.g. Research Assistant"
              class="text-input"
            />
          </div>
        </div>

        <div class="field-group">
          <label class="field-label" for="form-identity">Identity</label>
          <textarea
            id="form-identity"
            bind:value={formIdentity}
            placeholder="Describe who this agent is — their expertise, personality, and approach…"
            rows="4"
            class="textarea"
          ></textarea>
        </div>

        <div class="field-group">
          <label class="field-label" for="form-memory">Memory / Context</label>
          <textarea
            id="form-memory"
            bind:value={formMemory}
            placeholder="Initial context, notes, or background this agent should know…"
            rows="3"
            class="textarea"
          ></textarea>
        </div>
      </div>

      <div class="modal-footer">
        <button on:click={() => showModal = false} class="cancel-btn">Cancel</button>
        <button
          on:click={createAgent}
          disabled={creating || !formName.trim()}
          class="create-btn"
        >
          {creating ? 'Creating…' : 'Create Profile'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .agents-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2rem;
  }

  .agents-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--black);
    margin: 0;
  }

  .new-agent-btn {
    padding: 0.625rem 1.25rem;
    background: var(--yellow);
    border: 2px solid var(--black);
    box-shadow: var(--shadow);
    font-size: 0.85rem;
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    cursor: pointer;
    color: var(--black);
    transition: transform 0.1s, box-shadow 0.1s;
  }

  .new-agent-btn:hover {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px var(--black);
  }

  /* Empty state */
  .agents-empty {
    text-align: center;
    padding: 5rem 1rem;
  }

  .empty-icon { font-size: 3rem; margin: 0 0 1rem; }

  .empty-msg {
    font-size: 0.875rem;
    color: #888;
    font-family: 'Space Mono', monospace;
  }

  /* Grid */
  .agents-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  @media (max-width: 640px) {
    .agents-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 400px) {
    .agents-grid { grid-template-columns: 1fr; }
  }

  .agent-card {
    text-align: left;
    background: #fff;
    border: 2px solid var(--black);
    box-shadow: var(--shadow);
    padding: 1.25rem;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    width: 100%;
  }

  .agent-card:hover {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px var(--black);
  }

  .agent-icon {
    font-size: 2.5rem;
    margin-bottom: 0.75rem;
    line-height: 1;
  }

  .agent-name {
    font-weight: 800;
    font-size: 0.9rem;
    font-family: 'Space Grotesk', sans-serif;
    color: var(--black);
    margin: 0 0 0.4rem;
  }

  .agent-identity {
    font-size: 0.75rem;
    color: #555;
    line-height: 1.5;
    margin: 0;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .agent-no-identity {
    font-size: 0.75rem;
    color: #bbb;
    font-style: italic;
    margin: 0;
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
    max-width: 520px;
    overflow: hidden;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 2px solid var(--black);
    background: var(--black);
  }

  .modal-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.875rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #FFFDF5;
    margin: 0;
  }

  .close-btn {
    font-size: 1.5rem;
    line-height: 1;
    padding: 0 0.25rem;
    background: none;
    border: none;
    cursor: pointer;
    color: #888;
    font-weight: 300;
  }

  .close-btn:hover { color: var(--black); }

  .modal-body {
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-row {
    display: flex;
    gap: 0.75rem;
  }

  .icon-field { width: 80px; flex-shrink: 0; }
  .name-field { flex: 1; }

  .field-label {
    display: block;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #666;
    margin-bottom: 0.4rem;
  }

  .field-group { display: flex; flex-direction: column; }

  .icon-input {
    width: 100%;
    background: #fff;
    border: 2px solid var(--black);
    padding: 0.625rem;
    text-align: center;
    font-size: 1.5rem;
    outline: none;
    transition: box-shadow 0.1s;
  }

  .icon-input:focus {
    box-shadow: 0 0 0 3px var(--yellow);
  }

  .text-input {
    width: 100%;
    background: #fff;
    border: 2px solid var(--black);
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    font-family: 'Space Grotesk', sans-serif;
    color: var(--black);
    outline: none;
    transition: box-shadow 0.1s;
  }

  .text-input::placeholder { color: #bbb; }

  .text-input:focus {
    box-shadow: 0 0 0 3px var(--yellow);
  }

  .textarea {
    width: 100%;
    background: #fff;
    border: 2px solid var(--black);
    padding: 0.625rem 0.875rem;
    font-size: 0.875rem;
    font-family: 'Space Grotesk', sans-serif;
    color: var(--black);
    outline: none;
    resize: none;
    line-height: 1.5;
    transition: box-shadow 0.1s;
  }

  .textarea::placeholder { color: #bbb; }

  .textarea:focus {
    box-shadow: 0 0 0 3px var(--yellow);
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-top: 2px solid var(--black);
  }

  .cancel-btn {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    background: none;
    border: 2px solid #ccc;
    cursor: pointer;
    color: #888;
    transition: border-color 0.1s, color 0.1s;
    letter-spacing: 0.04em;
  }

  .cancel-btn:hover {
    border-color: var(--black);
    color: var(--black);
  }

  .create-btn {
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

  .create-btn:hover:not(:disabled) {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px var(--black);
  }

  .create-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    .modal {
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-body {
      padding: 1rem;
    }

    .form-row {
      flex-direction: column;
    }

    .icon-field {
      width: 100%;
    }

    .icon-input {
      text-align: left;
    }

    .modal-footer {
      flex-wrap: wrap;
      justify-content: stretch;
    }

    .create-btn,
    .cancel-btn {
      flex: 1;
    }
  }
</style>
