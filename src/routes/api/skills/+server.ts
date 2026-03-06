import { json } from '@sveltejs/kit';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

type SkillInfo = {
  name: string;
  description: string;
  location: string;
  source: 'openclaw-core' | 'workspace';
};

async function listSkillsFrom(baseDir: string, source: SkillInfo['source']): Promise<SkillInfo[]> {
  try {
    const entries = await readdir(baseDir, { withFileTypes: true });
    const skills: SkillInfo[] = [];

    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const skillDir = join(baseDir, ent.name);
      const skillFile = join(skillDir, 'SKILL.md');
      try {
        await stat(skillFile);
        const raw = await readFile(skillFile, 'utf-8');
        const desc = raw.match(/\bdescription:\s*"?([^"\n]+)"?/i)?.[1]?.trim() ?? 'No description';
        skills.push({
          name: ent.name,
          description: desc,
          location: skillFile,
          source
        });
      } catch {
        // skip folders without SKILL.md
      }
    }

    return skills;
  } catch {
    return [];
  }
}

export async function GET() {
  const coreBase = '/home/tkreek/.npm-global/lib/node_modules/openclaw/skills';
  const workspaceBase = '/home/tkreek/.openclaw/workspace/skills';

  const [core, workspace] = await Promise.all([
    listSkillsFrom(coreBase, 'openclaw-core'),
    listSkillsFrom(workspaceBase, 'workspace')
  ]);

  const skills = [...core, ...workspace].sort((a, b) => a.name.localeCompare(b.name));
  return json({ skills, counts: { total: skills.length, core: core.length, workspace: workspace.length } });
}
