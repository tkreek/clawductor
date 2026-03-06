import { getInstanceName, isSetupComplete } from '$lib/config.js';

export async function load() {
  return {
    instanceName: isSetupComplete() ? getInstanceName() : 'Clawductor'
  };
}
