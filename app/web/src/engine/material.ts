import * as THREE from 'three';

/**
 * Shared bone material for Phase 1 (P1.10).
 *
 * One instance is reused across all 79 own-mesh entries — per-mesh materials
 * are deliberately deferred until P1.11 when selection highlighting needs
 * per-object material overrides. The visual target is the matte off-white
 * tone seen in `scratch/preview/femur.png`.
 *
 * MeshStandardMaterial (not MeshPhysicalMaterial) keeps Phase 1 light;
 * subsurface scattering on organs is a later quality bar (per agent
 * operating principles).
 */
export const BONE_COLOR = '#ebe0c9';

let cached: THREE.MeshStandardMaterial | null = null;

export function getBoneMaterial(): THREE.MeshStandardMaterial {
  if (cached) {
    return cached;
  }
  cached = new THREE.MeshStandardMaterial({
    color: BONE_COLOR,
    roughness: 0.55,
    metalness: 0.0,
    side: THREE.FrontSide,
  });
  cached.name = 'bone-shared-p1';
  return cached;
}

/**
 * Resolves the right shared material for a `material_hint`. Phase 1 only
 * implements `bone`; other hints fall back to the bone material with a
 * warning so unexpected hints surface in dev rather than silently
 * mis-rendering. Per-tissue materials arrive in later phases.
 */
export function getMaterialForHint(hint: string | undefined): THREE.MeshStandardMaterial {
  if (hint && hint !== 'bone') {
    // eslint-disable-next-line no-console
    console.warn(
      `[engine/material] material_hint "${hint}" not yet implemented; falling back to bone material (P1.10)`,
    );
  }
  return getBoneMaterial();
}

export function disposeSharedMaterials(): void {
  if (cached) {
    cached.dispose();
    cached = null;
  }
}
