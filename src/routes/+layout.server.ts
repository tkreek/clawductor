import { execSync } from 'child_process';
import { getInstanceName, isSetupComplete } from '$lib/config.js';

function getGitBranch(): string {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

export async function load() {
  return {
    instanceName: isSetupComplete() ? getInstanceName() : 'Clawductor',
    gitBranch: getGitBranch()
  };
}
