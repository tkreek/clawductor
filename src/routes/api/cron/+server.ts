import { json } from '@sveltejs/kit';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getPaths } from '$lib/config.js';

export async function GET() {
  try {
    const { cronDir } = getPaths();
    const JOBS_PATH = join(cronDir, 'jobs.json');
    if (!existsSync(JOBS_PATH)) {
      return json({ version: 1, jobs: [], path: JOBS_PATH });
    }
    const raw = await readFile(JOBS_PATH, 'utf-8');
    return json(JSON.parse(raw));
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT({ request }) {
  try {
    const { cronDir } = getPaths();
    const JOBS_PATH = join(cronDir, 'jobs.json');
    const JOBS_BAK  = join(cronDir, 'jobs.json.bak');
    const body = await request.json();
    if (typeof body !== 'object' || body === null || !Array.isArray(body.jobs)) {
      return json({ error: 'body must be an object with a jobs array' }, { status: 400 });
    }

    // Backup previous content
    if (existsSync(JOBS_PATH)) {
      const prev = await readFile(JOBS_PATH, 'utf-8');
      await writeFile(JOBS_BAK, prev, 'utf-8');
    }

    await writeFile(JOBS_PATH, JSON.stringify(body, null, 2), 'utf-8');
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
}
