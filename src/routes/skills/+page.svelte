<script lang="ts">
  import { onMount } from 'svelte';

  type Skill = {
    name: string;
    description: string;
    location: string;
    source: 'openclaw-core' | 'workspace';
  };

  let skills: Skill[] = [];
  let query = '';
  let counts = { total: 0, core: 0, workspace: 0 };

  onMount(async () => {
    const res = await fetch('/api/skills');
    const data = await res.json();
    skills = data.skills ?? [];
    counts = data.counts ?? counts;
  });

  $: filtered = skills.filter(s => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.source.toLowerCase().includes(q)
    );
  });
</script>

<div class="skills-head">
  <div>
    <h2>Skills</h2>
    <p>{counts.total} total · {counts.core} core · {counts.workspace} workspace</p>
  </div>
  <input class="search" bind:value={query} placeholder="Search skills..." />
</div>

<div class="skills-grid">
  {#each filtered as skill}
    <article class="skill-card">
      <div class="skill-top">
        <h3>{skill.name}</h3>
        <span class="badge {skill.source === 'workspace' ? 'badge-workspace' : ''}">{skill.source}</span>
      </div>
      <p class="desc">{skill.description}</p>
      <p class="loc">{skill.location}</p>
    </article>
  {/each}
  {#if filtered.length === 0}
    <div class="empty">No skills match that filter.</div>
  {/if}
</div>

<style>
  .skills-head { display:flex; justify-content:space-between; align-items:end; gap:1rem; margin-bottom:1rem; flex-wrap: wrap; }
  h2 { margin:0; font-size:1.1rem; text-transform:uppercase; letter-spacing:.06em; }
  p { margin:.2rem 0 0; font-family:'Space Mono', monospace; font-size:.72rem; color:#666; }
  .search { min-width:200px; width: 100%; max-width: 320px; border:2px solid var(--black); background:#fff; padding:.55rem .7rem; font-size:.85rem; }
  .skills-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap:.8rem; }

  @media (max-width: 480px) {
    .skills-head { flex-direction: column; align-items: flex-start; }
    .search { max-width: 100%; }
    .skills-grid { grid-template-columns: 1fr; }
  }
  .skill-card { border:2px solid var(--black); background:#fff; box-shadow: var(--shadow); padding:.8rem; }
  .skill-top { display:flex; justify-content:space-between; align-items:center; gap:.7rem; }
  h3 { margin:0; font-size:.95rem; }
  .badge { border:2px solid var(--black); background:#e5e5e5; padding:.1rem .45rem; font-size:.62rem; font-family:'Space Mono', monospace; text-transform:uppercase; }
  .badge-workspace { background: var(--yellow); }
  .desc { font-size:.82rem; color:#111; margin:.5rem 0; font-family:'Space Grotesk', sans-serif; }
  .loc { font-size:.65rem; color:#666; word-break:break-all; }
  .empty { font-family:'Space Mono', monospace; color:#777; padding:1rem; }
</style>
