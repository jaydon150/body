import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
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
import {
  modeFromModifiers,
  modifierKeysFromEvent,
  pickFromIntersections,
} from '../engine/picking';
import { HOVER_OUTLINE, SELECTION_OUTLINE } from '../engine/outline';
import {
  selectHoveredId,
  selectSelectedIds,
  useSelectionStore,
} from '../state/selectionStore';
import { CameraRig } from './CameraRig';

interface ExtractedSubMesh {
  /** Stable key for React reconciliation. */
  key: string;
  geometry: THREE.BufferGeometry;
  /** World transform of this sub-mesh relative to the EntryMesh root. */
  matrix: THREE.Matrix4;
  /** Original material — preserved for reference; render uses the shared bone material. */
  originalMaterial: THREE.Material | THREE.Material[];
}

/**
 * Walk a loaded glb scene and pull out every Mesh into a flat list, baking
 * the local transform chain into each mesh's matrix. The cloned source
 * scene graph is otherwise discarded — we render React-owned `<mesh>`
 * elements so drei's `<Outlines>` can attach as a child and grab the
 * parent geometry.
 */
function extractSubMeshes(gltfScene: THREE.Group, entryId: string): ExtractedSubMesh[] {
  // Clone-then-traverse so we don't mutate drei's cached scene.
  const cloned = gltfScene.clone(true);
  cloned.updateMatrixWorld(true);

  const out: ExtractedSubMesh[] = [];
  let i = 0;
  cloned.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    // Bake the world matrix relative to the cloned root so the sub-mesh
    // renders at the same place when we mount it as a JSX <mesh> child of
    // our own group (we apply the matrix via matrixAutoUpdate=false).
    const localMatrix = new THREE.Matrix4().copy(mesh.matrixWorld);
    out.push({
      key: `${entryId}::${i}`,
      geometry: mesh.geometry,
      matrix: localMatrix,
      originalMaterial: mesh.material,
    });
    i += 1;
  });
  return out;
}

interface EntryMeshProps {
  entry: OwnMeshEntry;
  isSelected: boolean;
  isHovered: boolean;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}

/**
 * Renders one own-mesh entry. The entry's glb is loaded via drei's
 * `useGLTF`, its meshes are extracted into a flat list, and each is
 * mounted as a React-owned `<mesh>` element. Pointer events fire on the
 * group; the selection store reads the picked entry id from
 * `userData.entryId`, which we set on both the group and every sub-mesh.
 *
 * When the entry is selected or hovered, drei's `<Outlines>` is rendered
 * as a child of every sub-mesh — its `useLayoutEffect` walks up to find
 * the parent mesh's geometry, then renders an inverted-hull shell.
 *
 * Paired-bone behaviour (Option A, P1.11): both sub-meshes share the
 * single `entry.id`, so clicking either half outlines the whole entry.
 */
function EntryMesh({
  entry,
  isSelected,
  isHovered,
  onPointerOver,
  onPointerOut,
  onPointerDown,
}: EntryMeshProps) {
  const url = lodUrl(entry, 0);
  const gltf = useGLTF(url);
  const material = useMemo(() => getMaterialForHint(entry.material_hint), [entry.material_hint]);

  const subMeshes = useMemo(() => extractSubMeshes(gltf.scene, entry.id), [gltf.scene, entry.id]);

  // Tag the group's userData with the entry id so the picker can resolve
  // either the group itself or any sub-mesh up the parent chain.
  return (
    <group userData={{ entryId: entry.id, uberonId: entry.id }} name={entry.id}>
      {subMeshes.map((sm) => (
        <mesh
          key={sm.key}
          geometry={sm.geometry}
          material={material}
          matrix={sm.matrix}
          matrixAutoUpdate={false}
          userData={{ entryId: entry.id, uberonId: entry.id, originalMaterial: sm.originalMaterial }}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onPointerDown={onPointerDown}
        >
          {isSelected && (
            <Outlines
              color={SELECTION_OUTLINE.color}
              thickness={SELECTION_OUTLINE.thickness}
              opacity={SELECTION_OUTLINE.opacity}
              transparent={SELECTION_OUTLINE.opacity < 1}
              screenspace
              renderOrder={SELECTION_OUTLINE.renderOrder}
              toneMapped={false}
            />
          )}
          {!isSelected && isHovered && (
            <Outlines
              color={HOVER_OUTLINE.color}
              thickness={HOVER_OUTLINE.thickness}
              opacity={HOVER_OUTLINE.opacity}
              transparent
              screenspace
              renderOrder={HOVER_OUTLINE.renderOrder}
              toneMapped={false}
            />
          )}
        </mesh>
      ))}
    </group>
  );
}

/**
 * Group all own-mesh entries. The group is recentred to origin and scaled
 * by SCENE_SCALE so downstream cameras/lights/controls operate in metres.
 * Pointer events bubble up to the group; one handler dispatches selection
 * intent to the store. Hover events use a tracked-entry pattern so we only
 * notify the store when the entry actually changes (not on every mouse
 * move within the same mesh).
 */
function SkeletonGroup({
  entries,
  bounds,
}: {
  entries: OwnMeshEntry[];
  bounds: CombinedBounds;
}) {
  const translation = useMemo(
    () => new THREE.Vector3().copy(bounds.center).multiplyScalar(-1),
    [bounds.center],
  );

  const setHovered = useSelectionStore((s) => s.setHovered);
  const clearHover = useSelectionStore((s) => s.clearHover);
  const select = useSelectionStore((s) => s.select);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const hoveredId = useSelectionStore(selectHoveredId);
  const selectedIds = useSelectionStore(selectSelectedIds);

  // -- Pointer handlers -------------------------------------------------
  //
  // R3F gives us the full intersection list pre-sorted near-to-far. We pick
  // the front-most visible entry; pick-through-transparency is a Phase 2
  // enhancement.

  const onPointerOver = useMemo(
    () => (e: ThreeEvent<PointerEvent>) => {
      const hit = pickFromIntersections(e.intersections);
      if (!hit) return;
      e.stopPropagation();
      setHovered(hit.entryId);
    },
    [setHovered],
  );

  const onPointerOut = useMemo(
    () => (_e: ThreeEvent<PointerEvent>) => {
      // R3F fires pointerOut per leaf as the cursor leaves it; the simplest
      // correct behaviour is to clear hover on out — if the cursor moved to
      // a sibling mesh, pointerOver on the sibling will reset the hover id
      // in the same frame.
      clearHover();
    },
    [clearHover],
  );

  const onPointerDown = useMemo(
    () => (e: ThreeEvent<PointerEvent>) => {
      // Only react to primary (left) button. R3F passes the native event
      // through; `button === 0` is the left button. We also gate on
      // `pointerType` so a touch tap still works (touch reports button 0).
      const native = e.nativeEvent;
      if (native.button !== 0) return;

      const hit = pickFromIntersections(e.intersections);
      if (!hit) return;
      e.stopPropagation();

      const mods = modifierKeysFromEvent(e);
      const mode = modeFromModifiers(mods);
      select(hit.entryId, { mode });
    },
    [select],
  );

  // Empty-space click on the canvas (registered on the group's pointermissed
  // event) clears the selection. This matches the "click on background to
  // deselect" UX every 3D viewer ships.
  const onPointerMissed = useMemo(
    () => (e: MouseEvent) => {
      // Only react to primary button to avoid eating right-click pans.
      if ((e as MouseEvent).button !== 0) return;
      clearSelection();
    },
    [clearSelection],
  );

  return (
    <group scale={SCENE_SCALE} onPointerMissed={onPointerMissed}>
      <group position={translation}>
        {entries.map((entry) => (
          <Suspense fallback={null} key={entry.id}>
            <EntryMesh
              entry={entry}
              isSelected={selectedIds.has(entry.id)}
              isHovered={hoveredId === entry.id}
              onPointerOver={onPointerOver}
              onPointerOut={onPointerOut}
              onPointerDown={onPointerDown}
            />
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
