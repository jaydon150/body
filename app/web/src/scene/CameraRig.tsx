import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { computeCameraFrame, type CombinedBounds } from '../engine/bounds';

interface CameraRigProps {
  bounds: CombinedBounds;
}

/**
 * PerspectiveCamera + OrbitControls fitted to the combined skeletal bounds.
 *
 * P1.10 sets the initial frame only — animated reframe-on-selection is a
 * Phase 2 concern (P1.11+) per the agent's "camera framing is animated, not
 * snapped" hard rule. The hooks here leave space for that follow-up: the
 * OrbitControls ref is exposed via R3F's state so a selection event handler
 * can later call `controls.target.lerpVectors(...)`.
 */
export function CameraRig({ bounds }: CameraRigProps) {
  const fovDeg = 35;
  const frame = computeCameraFrame(bounds, { fovDeg, padding: 1.35 });
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const set = useThree((s) => s.set);

  // Register the perspective camera as the default once it mounts so
  // OrbitControls (which defaults to `useThree(s => s.camera)`) picks it up.
  useEffect(() => {
    if (cameraRef.current) {
      set({ camera: cameraRef.current });
      cameraRef.current.lookAt(frame.target);
      cameraRef.current.updateProjectionMatrix();
    }
    if (controlsRef.current) {
      controlsRef.current.target.copy(frame.target);
      controlsRef.current.update();
    }
  }, [set, frame.position.x, frame.position.y, frame.position.z, frame.target.x, frame.target.y, frame.target.z]);

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        fov={fovDeg}
        near={frame.near}
        far={frame.far}
        position={[frame.position.x, frame.position.y, frame.position.z]}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={frame.target}
        enableDamping
        dampingFactor={0.08}
        minDistance={frame.near * 4}
        maxDistance={frame.far * 0.6}
      />
    </>
  );
}
