import * as THREE from 'three';
import { isOwnMeshEntry, type RegistryEntry } from './registry';

/**
 * Combined AABB across own-mesh entries, plus a camera-frame helper.
 *
 * BodyParts3D source units are millimetres. The scene scales the loaded glb
 * group down by `SCENE_SCALE` so camera distances and three-point lighting
 * read in "human-sized" units (~1.7m tall). Bounds returned here are pre-scale
 * mesh-space values; consumers apply SCENE_SCALE.
 */
export const SCENE_SCALE = 0.001; // mm -> m

export interface CombinedBounds {
  min: THREE.Vector3;
  max: THREE.Vector3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  /** Diagonal length of the AABB in source units. */
  diagonal: number;
}

export function computeCombinedBounds(entries: RegistryEntry[]): CombinedBounds {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  let counted = 0;
  for (const entry of entries) {
    if (!isOwnMeshEntry(entry)) {
      continue;
    }
    const b = entry.bounds;
    min.x = Math.min(min.x, b.min[0]);
    min.y = Math.min(min.y, b.min[1]);
    min.z = Math.min(min.z, b.min[2]);
    max.x = Math.max(max.x, b.max[0]);
    max.y = Math.max(max.y, b.max[1]);
    max.z = Math.max(max.z, b.max[2]);
    counted += 1;
  }
  if (counted === 0) {
    throw new Error('engine/bounds: no own-mesh entries to compute bounds from');
  }
  const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
  const size = new THREE.Vector3().subVectors(max, min);
  return {
    min,
    max,
    center,
    size,
    diagonal: size.length(),
  };
}

export interface CameraFrame {
  /** World-space target the camera looks at (after SCENE_SCALE applied). */
  target: THREE.Vector3;
  /** World-space camera position (after SCENE_SCALE applied). */
  position: THREE.Vector3;
  /** Suggested near plane for the perspective camera. */
  near: number;
  /** Suggested far plane for the perspective camera. */
  far: number;
}

/**
 * Computes a 3/4-front camera frame that fits the combined bounds. The
 * loaded skeleton group is recentred at origin and scaled by SCENE_SCALE
 * (see SkeletalScene). So this helper operates in the post-transform
 * coordinate system: target at origin, camera offset along a 3/4 vector.
 *
 * fovDeg is the perspective vertical FOV. Adds `padding` (default 1.35)
 * so the model doesn't kiss the viewport edges.
 */
export function computeCameraFrame(
  bounds: CombinedBounds,
  options: { fovDeg?: number; padding?: number } = {},
): CameraFrame {
  const fovDeg = options.fovDeg ?? 35;
  const padding = options.padding ?? 1.35;

  // Post-scale size of the model.
  const scaledSize = bounds.size.clone().multiplyScalar(SCENE_SCALE);
  // Largest of (width, height) governs how far we need to back up.
  const maxDim = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
  const fovRad = (fovDeg * Math.PI) / 180;
  const distance = (maxDim / 2 / Math.tan(fovRad / 2)) * padding;

  // 3/4 view from front-right-above. The skeleton's primary axis in source
  // data is Z (feet at low Z, skull at high Z). After SCENE_SCALE the group
  // is recentred at origin so target = origin.
  const direction = new THREE.Vector3(0.55, 0.35, 1.0).normalize();
  const position = direction.multiplyScalar(distance);

  // Wide near/far so initial framing never clips even before fit-on-load.
  const near = Math.max(0.01, distance * 0.01);
  const far = distance * 20;

  return {
    target: new THREE.Vector3(0, 0, 0),
    position,
    near,
    far,
  };
}
