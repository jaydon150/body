import * as THREE from 'three';
import { SCENE_SCALE, type CombinedBounds } from './bounds';
import type { Bounds, OwnMeshEntry } from './registry';

/**
 * Dive-deeper camera framing (P1.12).
 *
 * Computes a target camera pose that frames a single entry's bounds, using
 * the same fit-to-FOV math as the initial-load camera frame in `bounds.ts`.
 * The CameraRig lerps from its current pose to this target over
 * `DIVE_ANIMATION_DURATION_MS`.
 *
 * Per the agent's hard rule "camera framing is animated, not snapped",
 * the rig uses `useFrame` + an easing function to interpolate position +
 * lookAt. No animation library is required; the lerp is a few lines.
 *
 * --- Why we use the entry's local bounds, not a globally-recentred copy ---
 *
 * `SkeletalScene` mounts the loaded meshes inside a nested group:
 *
 *   <group scale={SCENE_SCALE}>          // mm -> m
 *     <group position={-combinedCenter}> // recentre at origin
 *       <EntryMesh entry=... />
 *
 * Entry bounds are in raw mesh-space (mm), like everything else in the
 * registry. To convert an entry's bounds into the WORLD-space coordinates
 * the camera lives in:
 *
 *   worldCenter = (entryCenter - combinedCenter) * SCENE_SCALE
 *
 * We need the COMBINED bounds (the same one `SceneContent` already
 * computes) to do the recentring. We pass it through as an argument so
 * this util stays pure and doesn't reach into the registry singleton.
 */

/** Lerp duration in ms (also used by CameraRig to compute progress). */
export const DIVE_ANIMATION_DURATION_MS = 600;

/**
 * Easing function for the dive animation. Quadratic ease-in-out gives the
 * camera a polished accel/decel feel without depending on a library.
 *
 * t is the normalised time in [0, 1]; returns the eased value in [0, 1].
 */
export function easeInOutQuad(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * A camera "pose" — position + look-at target. The CameraRig lerps between
 * two of these and writes the result into PerspectiveCamera + OrbitControls.
 */
export interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

/**
 * Computes the world-space centre + half-extents of an entry's bounds,
 * after applying the SkeletalScene's recentre-then-scale transform.
 */
function worldSpaceFromBounds(
  raw: Bounds,
  combinedCenter: THREE.Vector3,
): { center: THREE.Vector3; size: THREE.Vector3 } {
  const min = new THREE.Vector3(raw.min[0], raw.min[1], raw.min[2]);
  const max = new THREE.Vector3(raw.max[0], raw.max[1], raw.max[2]);
  const center = new THREE.Vector3()
    .addVectors(min, max)
    .multiplyScalar(0.5)
    .sub(combinedCenter)
    .multiplyScalar(SCENE_SCALE);
  const size = new THREE.Vector3()
    .subVectors(max, min)
    .multiplyScalar(SCENE_SCALE);
  return { center, size };
}

export interface ComputeDivePoseOptions {
  /** Vertical FOV of the active camera, in degrees. Default 35 (matches CameraRig). */
  fovDeg?: number;
  /** Multiplier on the fit distance — > 1 backs the camera off so the entry doesn't kiss the edges. */
  padding?: number;
  /**
   * Current camera position; used as the direction-from-target reference
   * so the dive feels like "zooming in along the current view direction"
   * rather than teleporting to a new angle. Passed in by the rig.
   */
  currentPosition: THREE.Vector3;
  /** Combined bounds for the whole skeleton — needed to recentre the entry's local bounds into world space. */
  combinedBounds: CombinedBounds;
}

/**
 * Computes a target camera pose that frames `entry`. The result's
 * `target` is the entry's world-space centroid; `position` is along the
 * existing view direction at the distance required to fit the entry's
 * largest dimension within the FOV.
 *
 * On very small entries (single vertebrae, etc.) we floor the framing
 * distance so the camera doesn't dive through the bone — `minDistance`
 * is computed from the entry's size scaled by SCENE_SCALE.
 */
export function computeDivePose(
  entry: OwnMeshEntry,
  options: ComputeDivePoseOptions,
): CameraPose {
  const fovDeg = options.fovDeg ?? 35;
  const padding = options.padding ?? 1.6;
  const { center: target, size } = worldSpaceFromBounds(
    entry.bounds,
    options.combinedBounds.center,
  );

  // Largest dimension governs how far we back up to fit. Floor at a small
  // epsilon so a degenerate (point-like) bounds doesn't yield distance = 0.
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const fovRad = (fovDeg * Math.PI) / 180;
  const fitDistance = (maxDim / 2 / Math.tan(fovRad / 2)) * padding;

  // Direction: along the current view direction (current camera → previous
  // target). We don't have the previous target here, so we re-derive
  // direction from `currentPosition - sceneCenter`. Scene centre is origin
  // after the recentre-then-scale transform, so direction simply normalises
  // `currentPosition`. If the camera was looking at a previous dive target
  // off-origin, that's fine — the new direction smoothly interpolates over
  // the lerp.
  const direction = new THREE.Vector3()
    .copy(options.currentPosition)
    .sub(target)
    .normalize();
  // Guard against a zero-length direction (camera exactly on the target).
  // Fall back to the same 3/4 front-right-above used by the initial frame
  // so we don't divide by zero.
  if (direction.lengthSq() < 1e-8) {
    direction.set(0.55, 0.35, 1.0).normalize();
  }
  const position = target.clone().addScaledVector(direction, fitDistance);

  return { position, target };
}

/**
 * Linearly interpolates between two camera poses using the given eased
 * progress in [0, 1]. Both `out.position` and `out.target` are mutated in
 * place so the caller can reuse vectors and avoid allocation per frame.
 */
export function lerpCameraPose(
  from: CameraPose,
  to: CameraPose,
  easedT: number,
  out: CameraPose,
): void {
  out.position.lerpVectors(from.position, to.position, easedT);
  out.target.lerpVectors(from.target, to.target, easedT);
}
