import { json, error } from '@sveltejs/kit';
import { readFile, writeFile } from 'fs/promises';
import { FILES, WORKSPACE } from '$lib/files';

function allowed(name: string) {
  return FILES.some(f => f.name === name);
}

export async function GET({ params }) {
  const { name } = params;
  if (!allowed(name)) throw error(403, 'Not allowed');

  try {
    const content = await readFile(`${WORKSPACE}/${name}`, 'utf-8');
    return json({ ok: true, name, content });
  } catch (e) {
    return json({ ok: false, name, content: '', error: String(e) });
  }
}

export async function PUT({ params, request }) {
  const { name } = params;
  if (!allowed(name)) throw error(403, 'Not allowed');

  const { content } = await request.json();
  if (typeof content !== 'string') throw error(400, 'content required');

  await writeFile(`${WORKSPACE}/${name}`, content, 'utf-8');
  return json({ ok: true });
}
