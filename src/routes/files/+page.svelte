<script lang="ts">
  import { onMount } from 'svelte';

  type FileMeta = { name: string; label: string; description: string };

  let files: FileMeta[] = [];
  let selected: FileMeta | null = null;
  let content = '';
  let original = '';
  let loading = false;
  let saving = false;
  let saved = false;
  let error = '';

  onMount(async () => {
    const res = await fetch('/api/files');
    const data = await res.json();
    files = data.files ?? [];
  });

  async function selectFile(f: FileMeta) {
    if (saving) return;
    selected = f;
    loading = true;
    error = '';
    saved = false;
    const res = await fetch(`/api/files/${f.name}`);
    const data = await res.json();
    content = data.content ?? '';
    original = content;
    loading = false;
  }

  async function save() {
    if (!selected || saving) return;
    saving = true;
    saved = false;
    error = '';
    try {
      const res = await fetch(`/api/files/${selected.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (data.ok) {
        original = content;
        saved = true;
        setTimeout(() => saved = false, 2500);
      } else {
        error = data.error ?? 'Save failed';
      }
    } catch (e) {
      error = String(e);
    }
    saving = false;
  }

  function discard() {
    content = original;
    saved = false;
    error = '';
  }

  $: isDirty = content !== original;

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="files-layout">
  <!-- Sidebar -->
  <div class="sidebar">
    <div class="sidebar-label">FILES</div>
    {#each files as f}
      <button
        on:click={() => selectFile(f)}
        class="file-btn {selected?.name === f.name ? 'file-active' : ''}"
      >
        <div class="file-label">{f.label}</div>
        <div class="file-desc">{f.description}</div>
      </button>
    {/each}
  </div>

  <!-- Editor -->
  <div class="editor-panel">
    {#if !selected}
      <div class="editor-empty">
        <span>Select a file to view or edit</span>
      </div>
    {:else}
      <!-- Toolbar -->
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <span class="file-name-label">{selected.label}</span>
          <span class="file-name-mono">{selected.name}</span>
          {#if isDirty}
            <span class="unsaved-badge">● UNSAVED</span>
          {/if}
        </div>
        <div class="toolbar-right">
          {#if error}
            <span class="error-msg">{error}</span>
          {/if}
          {#if saved}
            <span class="saved-msg">✓ SAVED</span>
          {/if}
          {#if isDirty}
            <button on:click={discard} class="discard-btn">Discard</button>
          {/if}
          <button
            on:click={save}
            disabled={saving || !isDirty}
            class="save-btn {isDirty ? 'save-active' : 'save-disabled'}"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <!-- Textarea -->
      {#if loading}
        <div class="editor-loading">Loading…</div>
      {:else}
        <textarea
          bind:value={content}
          class="editor-textarea"
          spellcheck="false"
        ></textarea>
        <div class="kbd-hint">⌘S to save</div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .files-layout {
    display: flex;
    gap: 1.25rem;
    height: calc(100vh - 140px);
  }

  /* Sidebar */
  .sidebar {
    width: 180px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 2px solid var(--black);
    overflow: hidden;
  }

  .sidebar-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.65rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0.5rem 0.75rem;
    background: var(--black);
    color: #FFFDF5;
  }

  .file-btn {
    text-align: left;
    padding: 0.75rem 0.875rem;
    cursor: pointer;
    border: none;
    border-top: 1px solid #ddd;
    background: #FFFDF5;
    transition: background 0.1s;
    width: 100%;
  }

  .file-btn:hover {
    background: #fff;
  }

  .file-active {
    background: var(--yellow) !important;
    border-left: 4px solid var(--black) !important;
  }

  .file-label {
    font-size: 0.825rem;
    font-weight: 700;
    color: var(--black);
    font-family: 'Space Grotesk', sans-serif;
    margin-bottom: 0.2rem;
  }

  .file-desc {
    font-size: 0.65rem;
    color: #888;
    font-family: 'Space Mono', monospace;
    line-height: 1.3;
  }

  /* Editor panel */
  .editor-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .editor-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed #ccc;
    color: #aaa;
    font-size: 0.875rem;
    font-family: 'Space Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .editor-loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    font-family: 'Space Mono', monospace;
    font-size: 0.875rem;
  }

  /* Toolbar */
  .editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    padding: 0.625rem 0.875rem;
    border: 2px solid var(--black);
    background: #fff;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .file-name-label {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--black);
    font-family: 'Space Grotesk', sans-serif;
  }

  .file-name-mono {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    color: #888;
  }

  .unsaved-badge {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--red);
    letter-spacing: 0.06em;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .error-msg {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    color: var(--red);
    font-weight: 700;
  }

  .saved-msg {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    color: var(--green);
    font-weight: 700;
    letter-spacing: 0.06em;
  }

  .discard-btn {
    font-size: 0.75rem;
    font-weight: 700;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    padding: 0.3rem 0.75rem;
    background: #fff;
    border: 2px solid var(--black);
    box-shadow: 2px 2px 0px var(--black);
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    color: var(--black);
    letter-spacing: 0.04em;
  }

  .discard-btn:hover {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0px var(--black);
  }

  .save-btn {
    font-size: 0.75rem;
    font-weight: 800;
    font-family: 'Space Grotesk', sans-serif;
    text-transform: uppercase;
    padding: 0.3rem 0.875rem;
    cursor: pointer;
    letter-spacing: 0.04em;
    transition: transform 0.1s, box-shadow 0.1s;
  }

  .save-active {
    background: var(--yellow);
    border: 2px solid var(--black);
    box-shadow: var(--shadow);
    color: var(--black);
  }

  .save-active:hover {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px var(--black);
  }

  .save-disabled {
    background: #eee;
    border: 2px solid #ccc;
    color: #aaa;
    cursor: not-allowed;
    box-shadow: none;
  }

  /* Textarea */
  .editor-textarea {
    flex: 1;
    width: 100%;
    background: #FFFDF5;
    border: 2px solid var(--black);
    padding: 1rem 1.25rem;
    font-family: 'Space Mono', monospace;
    font-size: 0.8rem;
    color: var(--black);
    line-height: 1.7;
    resize: none;
    outline: none;
    transition: box-shadow 0.1s;
  }

  .editor-textarea:focus {
    box-shadow: 0 0 0 3px var(--yellow);
  }

  .kbd-hint {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    color: #bbb;
    text-align: right;
    margin-top: 0.4rem;
    letter-spacing: 0.04em;
  }
</style>
