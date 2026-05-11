import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { computeCameraFrame, type CombinedBounds } from '../engine/bounds';
import {
  computeDivePose,
  DIVE_ANIMATION_DURATION_MS,
  easeInOutQuad,
  lerpCameraPose,
  type CameraPose,
} from '../engine/diveCamera';
import { isOwnMeshEntry, type RegistryEntry } from '../engine/registry';
import {
  selectDiveStartedAt,
  selectFocusedId,
  useDiveStore,
} from '../state/diveStore';

interface CameraRigProps {
  bounds: CombinedBounds;
  entries: RegistryEntry[];
}

/**
 * PerspectiveCamera + OrbitControls fitted to the combined skeletal bounds.
 *
 * P1.12 adds the dive-deeper animation. When the dive store's `focusedId`
 * changes, the rig captures the current camera pose, computes a target
 * pose from the entry's bounds (via `computeDivePose`), then lerps the
 * camera position + the OrbitControls target over `DIVE_ANIMATION_DURATION_MS`
 * using an ease-in-out-quad curve. While the lerp is running OrbitControls
 * is disabled so user drag doesn't fight the animation; it re-enables on
 * completion.
 *
 * Ascending (UI breadcrumb → `useDiveStore.getState().ascend()`) sets
 * `focusedId` back to either the previous frame on the stack or `null`.
 * `null` means "frame the full body" — the rig lerps to the initial
 * combined-bounds frame.
 */
export function CameraRig({ bounds, entries }: CameraRigProps) {
  const fovDeg = 35;
  const initialFrame = useMemo(
    () => computeCameraFrame(bounds, { fovDeg, padding: 1.35 }),
    [bounds],
  );

  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const set = useThree((s) => s.set);

  // Register the perspective camera as the default once it mounts so
  // OrbitControls picks it up.
  useEffect(() => {
    if (cameraRef.current) {
      set({ camera: cameraRef.current });
      cameraRef.current.lookAt(initialFrame.target);
      cameraRef.current.updateProjectionMatrix();
    }
    if (controlsRef.current) {
      controlsRef.current.target.copy(initialFrame.target);
      controlsRef.current.update();
    }
  }, [
    set,
    initialFrame.position.x,
    initialFrame.position.y,
    initialFrame.position.z,
    initialFrame.target.x,
    initialFrame.target.y,
    initialFrame.target.z,
  ]);

  // -- Dive animation -------------------------------------------------------
  //
  // Latched lerp state. We snapshot `from` (where the camera was when the
  // dive started) and `to` (the new target pose) once per dive transition,
  // then interpolate inside `useFrame`. After the lerp completes the camera
  // sits at `to.position` looking at `to.target` and OrbitControls is
  // re-enabled. Hand-off back to OrbitControls happens by writing
  // `controls.target` directly.

  const focusedId = useDiveStore(selectFocusedId);
  const diveStartedAt = useDiveStore(selectDiveStartedAt);

  // Index of own-mesh entries by id so the lerp lookup is O(1).
  const ownEntryById = useMemo(() => {
    const m = new Map<string, ReturnType<typeof firstIfOwn>>();
    for (const e of entries) {
      const v = firstIfOwn(e);
      if (v) m.set(e.id, v);
    }
    return m;
  }, [entries]);

  type DiveAnim = {
    from: CameraPose;
    to: CameraPose;
    startedAt: number;
    durationMs: number;
  };
  const animRef = useRef<DiveAnim | null>(null);
  // A temporary pose object reused every frame to avoid per-frame allocation.
  const scratch = useMemo<CameraPose>(
    () => ({
      position: new THREE.Vector3(),
      target: new THREE.Vector3(),
    }),
    [],
  );

  // Latch a new dive whenever `focusedId` (or its trigger timestamp) changes.
  // Reading the camera + controls at this exact moment means the lerp starts
  // from where the user actually is — including any orbit they did between
  // dives.
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) {
      return;
    }
    const fromPose: CameraPose = {
      position: new THREE.Vector3().copy(camera.position),
      target: new THREE.Vector3().copy(controls.target),
    };
    let toPose: CameraPose;
    if (focusedId === null) {
      // Ascended to root: lerp back to the initial whole-body frame.
      toPose = {
        position: new THREE.Vector3().copy(initialFrame.position),
        target: new THREE.Vector3().copy(initialFrame.target),
      };
    } else {
      const entry = ownEntryById.get(focusedId);
      if (!entry) {
        // Dive target is a composite or unknown id — no-op rather than
        // teleport the camera somewhere nonsensical.
        return;
      }
      toPose = computeDivePose(entry, {
        fovDeg,
        padding: 1.6,
        currentPosition: fromPose.position,
        combinedBounds: bounds,
      });
    }
    animRef.current = {
      from: fromPose,
      to: toPose,
      startedAt: performance.now(),
      durationMs: DIVE_ANIMATION_DURATION_MS,
    };
    // Pause OrbitControls user-input while animating so a stray drag
    // doesn't fight the lerp. Re-enabled on completion below.
    controls.enabled = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, diveStartedAt, bounds, initialFrame, ownEntryById]);

  useFrame(() => {
    const anim = animRef.current;
    if (!anim) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const elapsed = performance.now() - anim.startedAt;
    const tRaw = anim.durationMs > 0 ? elapsed / anim.durationMs : 1;
    const t = tRaw >= 1 ? 1 : tRaw;
    const eased = easeInOutQuad(t);
    lerpCameraPose(anim.from, anim.to, eased, scratch);
    camera.position.copy(scratch.position);
    controls.target.copy(scratch.target);
    camera.lookAt(scratch.target);
    controls.update();

    if (t >= 1) {
      animRef.current = null;
      controls.enabled = true;
    }
  });

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={fovDeg}
        near={initialFrame.near}
        far={initialFrame.far}
        position={[initialFrame.position.x, initialFrame.position.y, initialFrame.position.z]}
      />
      {/*
        OrbitControls: enableZoom + touch rotate/pan/zoom defaults are
        already true; we set them explicitly so the contract is clear at
        the callsite and a future refactor doesn't silently flip them.
        Damping factor 0.08 was chosen (P1.14) for iPad touch
        responsiveness — slightly snappier than the Three.js default 0.05
        without overshooting. See 3d-engine.state.md for the trade-off.
      */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={initialFrame.target}
        enableDamping
        dampingFactor={0.08}
        enableZoom
        enableRotate
        enablePan
        minDistance={initialFrame.near * 4}
        maxDistance={initialFrame.far * 0.6}
      />
    </>
  );
}

function firstIfOwn(entry: RegistryEntry) {
  return isOwnMeshEntry(entry) ? entry : null;
}
