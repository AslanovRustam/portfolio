/**
 * Dev/test-only window into the live scene: components register readers for values the e2e tests
 * check (applied pole yaw, lens intensities, camera…), so tests assert what is drawn, not what was asked.
 */
const probes = new Map<string, () => unknown>();

export function registerProbe(name: string, read: () => unknown): () => void {
  probes.set(name, read);
  return () => {
    if (probes.get(name) === read) probes.delete(name);
  };
}

export function readProbe(name: string): unknown {
  return probes.get(name)?.();
}
