import { json } from '@sveltejs/kit';
import { FILES } from '$lib/files';

export async function GET() {
  return json({ files: FILES });
}
