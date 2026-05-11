import { useGLTF } from '@react-three/drei';
import type { OwnMeshEntry } from './registry';

/**
 * Resolves a registry-relative LOD path (`uberon_NNNNNNN/lod0.glb`) to the
 * absolute URL that the Vite dev middleware serves the glb at. See
 * `vite.config.ts` — `/meshes/<...>` maps to `data/canonical/meshes/<...>`.
 */
export const MESH_URL_PREFIX = '/meshes/';

export function lodUrl(entry: OwnMeshEntry, level = 0): string {
  const lod = entry.lods.find((l) => l.level === level) ?? entry.lods[0];
  if (!lod) {
    throw new Error(`engine/loader: entry ${entry.id} has no LOD ${level}`);
  }
  return `${MESH_URL_PREFIX}${lod.file}`;
}

/**
 * Preload every own-mesh entry's chosen LOD. Avoids suspense waterfalls in
 * `<SkeletalScene>` where 79 separate `useGLTF` calls would otherwise
 * trigger 79 sequential request bursts on first paint.
 *
 * Call this once after the registry resolves and before mounting the scene.
 */
export function preloadOwnMeshes(entries: OwnMeshEntry[], level = 0): void {
  for (const entry of entries) {
    useGLTF.preload(lodUrl(entry, level));
  }
}

/**
 * Re-export useGLTF for scene-side imports. Keeping a single touchpoint so a
 * later swap (e.g. to a custom loader for draco/meshopt) is a one-line edit.
 */
export { useGLTF };
