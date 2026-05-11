import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import {
  computeCombinedBounds,
  SCENE_SCALE,
  type CombinedBounds,
} from '../engine/bounds';
import { getMaterialForHint } from '../engine/material';
import { lodUrl, preloadOwnMeshes, useGLTF } from '../engine/loader';
import {
  isOwnMeshEntry,
  loadRegistry,
  type MeshRegistry,
  type OwnMeshEntry,
} from '../engine/registry';
import { CameraRig } from './CameraRig';

/**
 * Renders one own-mesh entry. drei's `useGLTF` returns a parsed scene graph;
 * traverse it and swap every Mesh's material to the shared bone material so
 * the source glb's default material is overridden uniformly. The original
 * material is preserved on `mesh.userData.originalMaterial` in case a later
 * dispatch (P1.11+) wants to revert.
 */
function EntryMesh({ entry }: { entry: OwnMeshEntry }) {
  const url = lodUrl(entry, 0);
  const gltf = useGLTF(url);

  // useGLTF returns the same gltf object on cache hits; the children of
  // gltf.scene are mounted directly via <primitive> so React Three Fiber
  // does not clone-then-render. We clone once to keep our material override
  // local to this instance — even though all 79 entries share one material,
  // not cloning means changing the material on one would mutate all (irrelevant
  // for P1.10 but matters once P1.11 adds per-mesh selection material).
  const node = useMemo(() => {
    const sharedMaterial = getMaterialForHint(entry.material_hint);
    const cloned = gltf.scene.clone(true);
    cloned.name = entry.id;
    cloned.userData.uberonId = entry.id;
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.userData.uberonId = entry.id;
        mesh.userData.originalMaterial = mesh.material;
        mesh.material = sharedMaterial;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    return cloned;
  }, [gltf.scene, entry.id, entry.material_hint]);

  return <primitive object={node} />;
}

/**
 * Group all 79 own-mesh entries. The group is recentred to origin and scaled
 * by SCENE_SCALE so downstream cameras/lights/controls operate in metres.
 */
function SkeletonGroup({
  entries,
  bounds,
}: {
  entries: OwnMeshEntry[];
  bounds: CombinedBounds;
}) {
  // Translation that brings the model's centroid to origin (pre-scale),
  // then SCENE_SCALE applied to the whole group.
  const translation = useMemo(
    () => new THREE.Vector3().copy(bounds.center).multiplyScalar(-1),
    [bounds.center],
  );

  return (
    <group scale={SCENE_SCALE}>
      <group position={translation}>
        {entries.map((entry) => (
          <Suspense fallback={null} key={entry.id}>
            <EntryMesh entry={entry} />
          </Suspense>
        ))}
      </group>
    </group>
  );
}

interface SceneContentProps {
  registry: MeshRegistry;
}

function SceneContent({ registry }: SceneContentProps) {
  const ownEntries = useMemo(
    () => registry.entries.filter(isOwnMeshEntry),
    [registry.entries],
  );
  const bounds = useMemo(() => computeCombinedBounds(ownEntries), [ownEntries]);

  // Preload every LOD0 so suspense fallbacks don't ripple sequentially.
  useEffect(() => {
    preloadOwnMeshes(ownEntries, 0);
  }, [ownEntries]);

  return (
    <>
      <CameraRig bounds={bounds} />
      <ambientLight intensity={0.4} color="#fff5e6" />
      <directionalLight
        position={[3, 4, 5]}
        intensity={0.8}
        color="#ffffff"
        castShadow={false}
      />
      <directionalLight
        position={[-4, 2, -3]}
        intensity={0.35}
        color="#cfd9ff"
      />
      <SkeletonGroup entries={ownEntries} bounds={bounds} />
    </>
  );
}

/**
 * Public scene entry point. Loads the registry on mount and renders the R3F
 * canvas once it resolves. The canvas is unmounted on registry failure so
 * the error message replaces the would-be 3D view rather than overlaying it.
 */
export function SkeletalScene() {
  const [registry, setRegistry] = useState<MeshRegistry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRegistry()
      .then((r) => {
        if (!cancelled) {
          setRegistry(r);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="scene-host scene-error" role="alert">
        <strong>Failed to load mesh registry.</strong>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!registry) {
    return (
      <div className="scene-host scene-loading" aria-busy="true">
        Loading skeletal registry…
      </div>
    );
  }

  return (
    <div className="scene-host" aria-label="3D skeletal atlas">
      <Canvas
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: false }}
        dpr={[1, 2]}
        flat={false}
        style={{ background: '#1c1816' }}
      >
        <color attach="background" args={['#1c1816']} />
        <Suspense fallback={null}>
          <SceneContent registry={registry} />
        </Suspense>
      </Canvas>
    </div>
  );
}
