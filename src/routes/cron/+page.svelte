<script lang="ts">
  import { onMount } from 'svelte';

  type Schedule = {
    kind: string;
    expr: string;
    tz?: string;
  };

  type Prompt = {
    text: string;
  };

  type CronJob = {
    id: string;
    enabled: boolean;
    schedule: Schedule;
    prompt?: Prompt;
    payload?: { kind?: string; text?: string; [key: string]: unknown };
    [key: string]: unknown;
  };

  type CronDoc = {
    version: number;
    jobs: CronJob[];
    [key: string]: unknown;
  };

  type RunSummary = {
    jobId: string;
    status: string;
    summary: string;
    ts: number;
    nextRunAtMs: number | null;
    durationMs: number | null;
  };

  let doc: CronDoc = { version: 1, jobs: [] };
  let runs: RunSummary[] = [];
  let selectedJob: CronJob | null = null;
  let loading = true;
  let saveStatus: '' | 'saving' | 'saved' | 'error' = '';
  let saveError = '';
  let validationError = '';

  // Editable scratch fields for selected job
  let editEnabled = true;
  let editKind = 'cron';
  let editExpr = '';
  let editTz = '';
  let editPromptText = '';

  function promptText(job: CronJob): string {
    return job.prompt?.text ?? job.payload?.text ?? '';
  }

  function jobLabel(job: CronJob): string {
    if (job.name) return String(job.name);
    const text = promptText(job);
    const firstLine = text.split('\n')[0].trim();
    return firstLine.length > 60 ? firstLine.slice(0, 57) + '…' : firstLine || job.id;
  }

  function scheduleLabel(job: CronJob): string {
    const s = job.schedule;
    if (!s) return '—';
    const tz = s.tz ? ` (${s.tz})` : '';
    return `${s.expr ?? ''}${tz}`;
  }

  function runForJob(jobId: string): RunSummary | undefined {
    return runs.find(r => r.jobId === jobId);
  }

  function fmtTs(ms: number | null): string {
    if (!ms) return '—';
    return new Date(ms).toLocaleString();
  }

  function fmtDuration(ms: number | null): string {
    if (ms == null) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  async function loadData() {
    loading = true;
    try {
      const [docRes, runsRes] = await Promise.all([
        fetch('/api/cron'),
        fetch('/api/cron/runs')
      ]);
      const docData = await docRes.json();
      const runsData = await runsRes.json();
      doc = docData;
      runs = runsData.runs ?? [];

      // Refresh selected job reference if we had one
      if (selectedJob) {
        const updated = doc.jobs.find(j => j.id === selectedJob!.id);
        if (updated) selectJob(updated);
        else selectedJob = null;
      }
    } catch (e) {
      console.error('Failed to load cron data', e);
    } finally {
      loading = false;
    }
  }

  function selectJob(job: CronJob) {
    selectedJob = job;
    editEnabled     = job.enabled ?? true;
    editKind        = job.schedule?.kind ?? 'cron';
    editExpr        = job.schedule?.expr ?? '';
    editTz          = job.schedule?.tz ?? '';
    editPromptText  = promptText(job);
    validationError = '';
  }

  function validate(): boolean {
    if (!editExpr.trim()) {
      validationError = 'Schedule expression is required.';
      return false;
    }
    if (!editPromptText.trim()) {
      validationError = 'Prompt text is required.';
      return false;
    }
    validationError = '';
    return true;
  }

  async function saveSelected() {
    if (!selectedJob || !validate()) return;
    const idx = doc.jobs.findIndex(j => j.id === selectedJob!.id);
    if (idx < 0) return;

    const updated: CronJob = {
      ...doc.jobs[idx],
      enabled: editEnabled,
      schedule: {
        ...doc.jobs[idx].schedule,
        kind: editKind,
        expr: editExpr,
        ...(editTz.trim() ? { tz: editTz.trim() } : {}),
      },
      prompt: { ...(doc.jobs[idx].prompt ?? {}), text: editPromptText },
      payload: {
        ...(doc.jobs[idx].payload ?? {}),
        kind: String(doc.jobs[idx].payload?.kind ?? 'systemEvent'),
        text: editPromptText
      },
    };

    // Remove tz if cleared
    if (!editTz.trim() && updated.schedule.tz) delete updated.schedule.tz;

    doc = { ...doc, jobs: doc.jobs.map((j, i) => (i === idx ? updated : j)) };
    selectedJob = updated;
    await saveDoc();
  }

  async function deleteSelected() {
    if (!selectedJob) return;
    if (!confirm(`Delete job "${jobLabel(selectedJob)}"?`)) return;
    doc = { ...doc, jobs: doc.jobs.filter(j => j.id !== selectedJob!.id) };
    selectedJob = null;
    await saveDoc();
  }

  function addNewJob() {
    const id = crypto.randomUUID();
    const job: CronJob = {
      id,
      enabled: true,
      schedule: { kind: 'cron', expr: '0 9 * * *', tz: 'America/Los_Angeles' },
      prompt: { text: 'New job prompt…' },
      payload: { kind: 'systemEvent', text: 'New job prompt…' },
    };
    doc = { ...doc, jobs: [...doc.jobs, job] };
    selectJob(job);
  }

  async function saveDoc() {
    saveStatus = 'saving';
    saveError = '';
    try {
      const res = await fetch('/api/cron', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        saveStatus = 'saved';
        setTimeout(() => { if (saveStatus === 'saved') saveStatus = ''; }, 2500);
      } else {
        saveStatus = 'error';
        saveError = data.error ?? 'Unknown error';
      }
    } catch (e) {
      saveStatus = 'error';
      saveError = String(e);
    }
  }

  onMount(loadData);
</script>

<div class="cron-page">
  <!-- Page header -->
  <div class="page-header">
    <div class="header-left">
      <h1 class="page-title">Cron Jobs</h1>
      <span class="job-count">{doc.jobs.length} JOB{doc.jobs.length !== 1 ? 'S' : ''}</span>
    </div>
    <div class="header-actions">
      {#if saveStatus === 'saving'}
        <span class="status-msg status-saving">SAVING…</span>
      {:else if saveStatus === 'saved'}
        <span class="status-msg status-saved">✓ SAVED</span>
      {:else if saveStatus === 'error'}
        <span class="status-msg status-error" title={saveError}>✗ ERROR</span>
      {/if}
      <button class="btn btn-ghost" on:click={loadData} disabled={loading}>
        {loading ? '↻' : '⟳'} RELOAD
      </button>
      <button class="btn btn-primary" on:click={addNewJob}>+ NEW JOB</button>
      <button class="btn btn-secondary" on:click={saveDoc} disabled={saveStatus === 'saving'}>
        SAVE ALL
      </button>
    </div>
  </div>

  <!-- Split pane -->
  <div class="split-pane">
    <!-- Left: job list -->
    <div class="job-list-pane">
      {#if loading}
        <div class="empty-state">Loading…</div>
      {:else if doc.jobs.length === 0}
        <div class="empty-state">No cron jobs. Hit <strong>+ NEW JOB</strong> to create one.</div>
      {:else}
        {#each doc.jobs as job (job.id)}
          {@const run = runForJob(job.id)}
          <button
            class="job-row"
            class:job-row-selected={selectedJob?.id === job.id}
            class:job-disabled={!job.enabled}
            on:click={() => selectJob(job)}
          >
            <div class="job-row-main">
              <span class="job-name">{jobLabel(job)}</span>
              <span class="job-status-pill" class:pill-enabled={job.enabled} class:pill-disabled={!job.enabled}>
                {job.enabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <div class="job-row-sub">
              <span class="job-id">{job.id.slice(0, 8)}…</span>
              <span class="job-schedule">{scheduleLabel(job)}</span>
            </div>
            {#if run}
              <div class="job-row-run">
                <span class="run-badge run-badge-{run.status}">{run.status.toUpperCase()}</span>
                <span class="run-time">{fmtTs(run.ts)}</span>
                <span class="run-dur">{fmtDuration(run.durationMs)}</span>
              </div>
            {/if}
          </button>
        {/each}
      {/if}
    </div>

    <!-- Right: editor -->
    <div class="editor-pane">
      {#if !selectedJob}
        <div class="empty-state editor-empty">← Select a job to edit</div>
      {:else}
        <div class="editor-inner">
          <div class="editor-header">
            <span class="editor-title">{jobLabel(selectedJob)}</span>
            <span class="editor-id">{selectedJob.id}</span>
          </div>

          {#if validationError}
            <div class="validation-error">{validationError}</div>
          {/if}

          <div class="field-group">
            <label class="field-label">ENABLED</label>
            <label class="toggle-wrap">
              <input type="checkbox" bind:checked={editEnabled} class="toggle-input" />
              <span class="toggle-track" class:toggle-on={editEnabled}>
                <span class="toggle-thumb"></span>
              </span>
              <span class="toggle-label">{editEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          <div class="field-group">
            <label class="field-label" for="sched-kind">SCHEDULE KIND</label>
            <input
              id="sched-kind"
              class="field-input"
              bind:value={editKind}
              placeholder="cron"
            />
          </div>

          <div class="field-group">
            <label class="field-label" for="sched-expr">CRON EXPRESSION</label>
            <input
              id="sched-expr"
              class="field-input field-mono"
              bind:value={editExpr}
              placeholder="0 9 * * *"
            />
          </div>

          <div class="field-group">
            <label class="field-label" for="sched-tz">TIMEZONE</label>
            <input
              id="sched-tz"
              class="field-input"
              bind:value={editTz}
              placeholder="America/Los_Angeles (leave blank for UTC)"
            />
          </div>

          <div class="field-group field-group-grow">
            <label class="field-label" for="prompt-text">PROMPT TEXT</label>
            <textarea
              id="prompt-text"
              class="field-textarea"
              bind:value={editPromptText}
              rows={10}
              placeholder="Enter the prompt text…"
            ></textarea>
          </div>

          <!-- Run info if available -->
          {#if runForJob(selectedJob.id)}
            {@const run = runForJob(selectedJob.id)}
            <div class="run-info-box">
              <div class="run-info-header">LAST RUN</div>
              <div class="run-info-row">
                <span class="run-badge run-badge-{run!.status}">{run!.status.toUpperCase()}</span>
                <span class="run-info-time">{fmtTs(run!.ts)}</span>
                <span class="run-info-dur">{fmtDuration(run!.durationMs)}</span>
              </div>
              {#if run!.nextRunAtMs}
                <div class="run-info-next">Next: {fmtTs(run!.nextRunAtMs)}</div>
              {/if}
              {#if run!.summary}
                <div class="run-summary">{run!.summary.slice(0, 200)}{run!.summary.length > 200 ? '…' : ''}</div>
              {/if}
            </div>
          {/if}

          <div class="editor-actions">
            <button class="btn btn-primary" on:click={saveSelected} disabled={saveStatus === 'saving'}>
              SAVE
            </button>
            <button class="btn btn-danger" on:click={deleteSelected}>
              DELETE
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .cron-page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Header */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .header-left {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .page-title {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 900;
    font-size: 1.4rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0;
    color: var(--black);
  }

  .job-count {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    color: #888;
    letter-spacing: 0.1em;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .status-msg {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 0.2rem 0.5rem;
    border: 1.5px solid;
  }

  .status-saving { color: #996600; border-color: #996600; background: #fffce0; }
  .status-saved  { color: #005c2e; border-color: var(--green); background: #e6fff2; }
  .status-error  { color: #900; border-color: var(--red); background: #ffe6e6; cursor: help; }

  /* Buttons */
  .btn {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.4rem 0.875rem;
    border: 2px solid var(--black);
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    white-space: nowrap;
  }

  .btn:hover:not(:disabled) {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 var(--black);
  }

  .btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-primary   { background: var(--yellow); color: var(--black); box-shadow: var(--shadow); }
  .btn-secondary { background: #fff; color: var(--black); box-shadow: var(--shadow); }
  .btn-ghost     { background: transparent; border-color: #aaa; color: #555; box-shadow: none; }
  .btn-danger    { background: var(--red); color: #fff; box-shadow: var(--shadow); }

  /* Split pane */
  .split-pane {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 1.5rem;
    align-items: start;
    min-height: 500px;
  }

  /* Job list */
  .job-list-pane {
    border: 2px solid var(--black);
    background: #fff;
    display: flex;
    flex-direction: column;
    max-height: 75vh;
    overflow-y: auto;
  }

  .empty-state {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    color: #aaa;
    padding: 2rem 1rem;
    text-align: center;
    line-height: 1.6;
  }

  .job-row {
    width: 100%;
    text-align: left;
    background: #fff;
    border: none;
    border-bottom: 2px solid var(--black);
    padding: 0.875rem 1rem;
    cursor: pointer;
    transition: background 0.1s;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .job-row:last-child { border-bottom: none; }

  .job-row:hover { background: #f7f7f0; }

  .job-row-selected { background: color-mix(in srgb, var(--yellow) 25%, #fff) !important; }

  .job-disabled { opacity: 0.55; }

  .job-row-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .job-name {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--black);
    line-height: 1.3;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .job-status-pill {
    font-family: 'Space Mono', monospace;
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 0.1rem 0.4rem;
    border: 1.5px solid var(--black);
    flex-shrink: 0;
  }

  .pill-enabled  { background: var(--green); color: #003015; }
  .pill-disabled { background: #ddd; color: #555; }

  .job-row-sub {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .job-id {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    color: #aaa;
  }

  .job-schedule {
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem;
    color: #666;
  }

  .job-row-run {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .run-badge {
    font-family: 'Space Mono', monospace;
    font-size: 0.55rem;
    font-weight: 700;
    padding: 0.1rem 0.35rem;
    border: 1.5px solid var(--black);
    letter-spacing: 0.06em;
  }

  .run-badge-ok      { background: var(--green); color: #003015; }
  .run-badge-error   { background: var(--red); color: #fff; }
  .run-badge-running { background: var(--yellow); }
  .run-badge-unknown { background: #eee; }

  .run-time, .run-dur {
    font-family: 'Space Mono', monospace;
    font-size: 0.58rem;
    color: #999;
  }

  /* Editor pane */
  .editor-pane {
    border: 2px solid var(--black);
    background: #fff;
    min-height: 400px;
    max-height: 75vh;
    overflow-y: auto;
  }

  .editor-empty { min-height: 400px; display: flex; align-items: center; justify-content: center; }

  .editor-inner {
    padding: 1.25rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .editor-header {
    border-bottom: 2px solid var(--black);
    padding-bottom: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .editor-title {
    font-size: 1rem;
    font-weight: 800;
    color: var(--black);
    line-height: 1.3;
    word-break: break-word;
  }

  .editor-id {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    color: #aaa;
  }

  .validation-error {
    background: color-mix(in srgb, var(--red) 10%, #fff);
    border: 2px solid var(--red);
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #900;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field-group-grow { flex: 1; }

  .field-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #666;
  }

  .field-input {
    background: #fafaf5;
    border: 2px solid var(--black);
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-family: 'Space Grotesk', sans-serif;
    color: var(--black);
    outline: none;
    width: 100%;
    box-sizing: border-box;
    transition: box-shadow 0.1s;
  }

  .field-input:focus { box-shadow: 0 0 0 3px var(--yellow); }

  .field-mono { font-family: 'Space Mono', monospace; font-size: 0.8rem; }

  .field-textarea {
    background: #fafaf5;
    border: 2px solid var(--black);
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    font-family: 'Space Mono', monospace;
    color: var(--black);
    outline: none;
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    line-height: 1.6;
    transition: box-shadow 0.1s;
  }

  .field-textarea:focus { box-shadow: 0 0 0 3px var(--yellow); }

  /* Toggle */
  .toggle-wrap {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    user-select: none;
  }

  .toggle-input { display: none; }

  .toggle-track {
    width: 40px;
    height: 22px;
    background: #ccc;
    border: 2px solid var(--black);
    position: relative;
    transition: background 0.15s;
    display: inline-block;
    flex-shrink: 0;
    box-shadow: 2px 2px 0 var(--black);
  }

  .toggle-on { background: var(--green); }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    background: #fff;
    border: 1.5px solid var(--black);
    transition: transform 0.15s;
  }

  .toggle-on .toggle-thumb { transform: translateX(18px); }

  .toggle-label {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--black);
  }

  /* Run info box */
  .run-info-box {
    background: #f5f5ee;
    border: 2px solid var(--black);
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .run-info-header {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #666;
  }

  .run-info-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .run-info-time, .run-info-dur {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    color: #555;
  }

  .run-info-next {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    color: #777;
  }

  .run-summary {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    color: #555;
    line-height: 1.5;
    word-break: break-word;
  }

  /* Editor actions */
  .editor-actions {
    display: flex;
    gap: 0.75rem;
    padding-top: 0.5rem;
    border-top: 2px solid #e0e0d8;
    flex-wrap: wrap;
  }
</style>
