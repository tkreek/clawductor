import { json } from '@sveltejs/kit';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';

const RUNS_DIR = '/home/tkreek/.openclaw/cron/runs';

interface RunSummary {
  jobId: string;
  status: string;
  summary: string;
  ts: number;
  nextRunAtMs: number | null;
  durationMs: number | null;
}

export async function GET() {
  try {
    if (!existsSync(RUNS_DIR)) {
      return json({ runs: [] });
    }

    const files = await readdir(RUNS_DIR);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

    const results: RunSummary[] = [];

    for (const file of jsonlFiles) {
      try {
        const raw = await readFile(`${RUNS_DIR}/${file}`, 'utf-8');
        const lines = raw.trim().split('\n').filter(Boolean);
        if (lines.length === 0) continue;

        // Find last "finished" entry, or fall back to last line
        let entry: Record<string, unknown> | null = null;
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(lines[i]) as Record<string, unknown>;
            if (parsed.action === 'finished') {
              entry = parsed;
              break;
            }
          } catch { /* skip malformed */ }
        }
        if (!entry) {
          try { entry = JSON.parse(lines[lines.length - 1]) as Record<string, unknown>; } catch { continue; }
        }
        if (!entry) continue;

        results.push({
          jobId:       String(entry.jobId ?? file.replace('.jsonl', '')),
          status:      String(entry.status ?? 'unknown'),
          summary:     String(entry.summary ?? ''),
          ts:          Number(entry.ts ?? 0),
          nextRunAtMs: entry.nextRunAtMs != null ? Number(entry.nextRunAtMs) : null,
          durationMs:  entry.durationMs  != null ? Number(entry.durationMs)  : null,
        });
      } catch { /* skip unreadable file */ }
    }

    results.sort((a, b) => b.ts - a.ts);
    return json({ runs: results });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
}
