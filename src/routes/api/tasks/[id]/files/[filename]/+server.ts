import { error } from '@sveltejs/kit';
import { existsSync, readFileSync } from 'fs';
import { join, extname, basename } from 'path';

const OUTPUT_DIR = () => process.env.OUTPUT_DIR ?? '/task-output';

const MIME: Record<string, string> = {
  '.md':   'text/plain',
  '.html': 'text/html',
  '.htm':  'text/html',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.csv':  'text/csv',
  '.json': 'application/json',
};

export async function GET({ params }) {
  // Sanitize: no path traversal
  const filename = basename(params.filename);
  const ext = extname(filename).toLowerCase();

  if (!MIME[ext]) throw error(415, 'Unsupported file type');

  const filePath = join(OUTPUT_DIR(), params.id, filename);
  if (!existsSync(filePath)) throw error(404, 'File not found');

  const content = readFileSync(filePath);
  return new Response(content, {
    headers: {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${filename}"`,
      'X-Content-Type-Options': 'nosniff',
    }
  });
}
