import { json } from '@sveltejs/kit';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const OUTPUT_DIR = () => process.env.OUTPUT_DIR ?? '/task-output';

const SUPPORTED_EXTS = new Set(['.md', '.html', '.htm', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.csv', '.json']);

export async function GET({ params }) {
  const dir = join(OUTPUT_DIR(), params.id);
  const files: { name: string; ext: string; size: number }[] = [];

  if (existsSync(dir) && statSync(dir).isDirectory()) {
    for (const name of readdirSync(dir)) {
      const ext = extname(name).toLowerCase();
      if (!SUPPORTED_EXTS.has(ext)) continue;
      const stat = statSync(join(dir, name));
      if (stat.isFile()) files.push({ name, ext, size: stat.size });
    }
  }

  return json({ files });
}
