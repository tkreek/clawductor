<script lang="ts">
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import { onMount } from 'svelte';

  let { taskId, filename, onClose }: {
    taskId: string;
    filename: string;
    onClose: () => void;
  } = $props();

  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const fileUrl = `/api/tasks/${taskId}/files/${encodeURIComponent(filename)}`;

  type ViewState = 'loading' | 'ready' | 'error';
  let state: ViewState = $state('loading');
  let htmlContent = $state('');
  let errorMsg = $state('');
  let csvRows: string[][] = $state([]);

  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext);
  const isHtml  = ['html', 'htm'].includes(ext);
  const isText  = ['md', 'csv', 'json'].includes(ext);

  onMount(async () => {
    if (isImage) { state = 'ready'; return; }
    if (isHtml)  { state = 'ready'; return; }

    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      if (ext === 'md') {
        const raw = await marked.parse(text, { breaks: true });
        htmlContent = DOMPurify.sanitize(raw);
      } else if (ext === 'json') {
        htmlContent = JSON.stringify(JSON.parse(text), null, 2);
      } else if (ext === 'csv') {
        csvRows = text.trim().split('\n').map(line =>
          line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim())
        );
      }
      state = 'ready';
    } catch (e) {
      errorMsg = String(e);
      state = 'error';
    }
  });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="viewer-overlay" on:click|self={onClose}>
  <div class="viewer-modal">
    <div class="viewer-header">
      <span class="viewer-filename">{filename}</span>
      <a href={fileUrl} download={filename} class="download-btn" title="Download">↓</a>
      <button class="close-btn" on:click={onClose}>×</button>
    </div>

    <div class="viewer-body">
      {#if state === 'loading'}
        <div class="viewer-loading">Loading…</div>

      {:else if state === 'error'}
        <div class="viewer-error">Failed to load: {errorMsg}</div>

      {:else if isImage}
        <div class="viewer-image-wrap">
          <img src={fileUrl} alt={filename} class="viewer-image" />
        </div>

      {:else if isHtml}
        <iframe
          src={fileUrl}
          class="viewer-iframe"
          sandbox="allow-scripts"
          title={filename}
        ></iframe>

      {:else if ext === 'md'}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="viewer-markdown markdown-body">
          {@html htmlContent}
        </div>

      {:else if ext === 'csv'}
        <div class="viewer-table-wrap">
          <table class="viewer-table">
            {#if csvRows.length > 0}
              <thead><tr>{#each csvRows[0] as cell}<th>{cell}</th>{/each}</tr></thead>
            {/if}
            <tbody>
              {#each csvRows.slice(1) as row}
                <tr>{#each row as cell}<td>{cell}</td>{/each}</tr>
              {/each}
            </tbody>
          </table>
        </div>

      {:else if ext === 'json'}
        <pre class="viewer-json">{htmlContent}</pre>
      {/if}
    </div>
  </div>
</div>

<style>
  .viewer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.82);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1rem;
  }

  .viewer-modal {
    background: #FFFDF5;
    border: 3px solid var(--black);
    box-shadow: 8px 8px 0 var(--black);
    width: 100%;
    max-width: 860px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .viewer-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border-bottom: 2px solid var(--black);
    background: var(--black);
    color: #FFFDF5;
  }

  .viewer-filename {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .download-btn {
    font-family: 'Space Mono', monospace;
    font-size: 0.85rem;
    color: #FFFDF5;
    text-decoration: none;
    padding: 0.1rem 0.4rem;
    border: 1.5px solid #666;
    transition: border-color 0.1s;
  }

  .download-btn:hover { border-color: #FFFDF5; }

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

  .close-btn:hover { color: #FFFDF5; }

  .viewer-body {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  .viewer-loading,
  .viewer-error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    font-family: 'Space Mono', monospace;
    font-size: 0.8rem;
    color: #888;
  }

  .viewer-error { color: var(--red); }

  /* Image */
  .viewer-image-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: #f5f5ee;
    min-height: 200px;
  }

  .viewer-image {
    max-width: 100%;
    max-height: 70vh;
    object-fit: contain;
    border: 2px solid var(--black);
  }

  /* HTML iframe */
  .viewer-iframe {
    width: 100%;
    height: 70vh;
    border: none;
    display: block;
  }

  /* Markdown */
  .viewer-markdown {
    padding: 1.5rem 2rem;
    max-width: 720px;
    margin: 0 auto;
  }

  :global(.markdown-body h1),
  :global(.markdown-body h2),
  :global(.markdown-body h3) {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 1.5rem 0 0.5rem;
    padding-bottom: 0.3rem;
    border-bottom: 2px solid var(--black);
  }

  :global(.markdown-body h1) { font-size: 1.3rem; }
  :global(.markdown-body h2) { font-size: 1.05rem; }
  :global(.markdown-body h3) { font-size: 0.9rem; }

  :global(.markdown-body p)  { margin: 0.75rem 0; line-height: 1.65; font-size: 0.9rem; }
  :global(.markdown-body ul),
  :global(.markdown-body ol) { padding-left: 1.5rem; margin: 0.75rem 0; }
  :global(.markdown-body li) { margin: 0.3rem 0; font-size: 0.9rem; line-height: 1.5; }

  :global(.markdown-body code) {
    font-family: 'Space Mono', monospace;
    font-size: 0.78rem;
    background: #f0efe8;
    border: 1px solid #ddd;
    padding: 0.1rem 0.35rem;
  }

  :global(.markdown-body pre) {
    background: #1a1a1a;
    border: 2px solid var(--black);
    padding: 1rem 1.25rem;
    overflow-x: auto;
    margin: 1rem 0;
  }

  :global(.markdown-body pre code) {
    background: none;
    border: none;
    color: #e0e0d8;
    font-size: 0.78rem;
    padding: 0;
  }

  :global(.markdown-body blockquote) {
    border-left: 4px solid var(--yellow);
    margin: 1rem 0;
    padding: 0.5rem 1rem;
    background: #fffce8;
  }

  :global(.markdown-body table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    font-size: 0.85rem;
  }

  :global(.markdown-body th) {
    background: var(--black);
    color: #FFFDF5;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.5rem 0.75rem;
    text-align: left;
  }

  :global(.markdown-body td) {
    border: 1px solid #ddd;
    padding: 0.5rem 0.75rem;
  }

  :global(.markdown-body tr:nth-child(even) td) { background: #f8f8f0; }

  :global(.markdown-body a) {
    color: var(--blue);
    font-weight: 600;
  }

  :global(.markdown-body hr) {
    border: none;
    border-top: 2px solid var(--black);
    margin: 1.5rem 0;
  }

  /* CSV table */
  .viewer-table-wrap {
    padding: 1rem;
    overflow: auto;
  }

  .viewer-table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.82rem;
  }

  .viewer-table :global(thead th) {
    background: var(--black);
    color: #FFFDF5;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.5rem 0.75rem;
    text-align: left;
    white-space: nowrap;
  }

  .viewer-table :global(td) {
    border: 1px solid #ddd;
    padding: 0.4rem 0.75rem;
    font-family: 'Space Mono', monospace;
  }

  .viewer-table :global(tr:nth-child(even) td) { background: #f8f8f0; }

  /* JSON */
  .viewer-json {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    color: var(--black);
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.6;
    margin: 0;
    padding: 1.5rem;
  }

  @media (max-width: 640px) {
    .viewer-modal {
      max-height: 92vh;
    }
    .viewer-markdown {
      padding: 1rem;
    }
  }
</style>
