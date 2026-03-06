import { json } from '@sveltejs/kit';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const JOBS_PATH = '/home/tkreek/.openclaw/cron/jobs.json';
const JOBS_BAK  = '/home/tkreek/.openclaw/cron/jobs.json.bak';

export async function GET() {
  try {
    if (!existsSync(JOBS_PATH)) {
      return json({ version: 1, jobs: [] });
    }
    const raw = await readFile(JOBS_PATH, 'utf-8');
    return json(JSON.parse(raw));
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT({ request }) {
  try {
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
