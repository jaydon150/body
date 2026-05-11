import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
  selectFirstSelectedId,
  selectHoveredId,
  selectSelectedIds,
  useSelectionStore,
} from '../state/selectionStore';
import {
  isMeshVisibleForPreset,
  selectPeelPreset,
  usePeelStore,
} from '../state/peelStore';
import { selectFocusedId, useDiveStore } from '../state/diveStore';
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
 * the local transform chain into each mesh's matrix.
 */
function extractSubMeshes(gltfScene: THREE.Group, entryId: string): ExtractedSubMesh[] {
  const cloned = gltfScene.clone(true);
  cloned.updateMatrixWorld(true);

  const out: ExtractedSubMesh[] = [];
  let i = 0;
  cloned.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
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

/**
 * Opacity used for non-focused entries during a dive. Picked to remain
 * recognisable as a silhouette without competing for attention with the
 * focused entry.
 */
const SIBLING_DIM_OPACITY = 0.18;

interface EntryMeshProps {
  entry: OwnMeshEntry;
  isSelected: boolean;
  isHovered: boolean;
  /**
   * True when this entry is the dive focus (or no dive is active). False
   * when another entry is focused; the mesh renders dimmed.
   *
   * (P1.12 — sibling-dimming rule: when `focusedId` is set, all entries
   * OTHER than the focused one render with reduced opacity. Phase 1 has
   * no `constitutional_part_of` children in the registry, so every dive
   * focuses a single leaf and dims all others. Phase 2 will need to
   * include the focused entry's constitutional_part_of descendants in the
   * "stay bright" set; that's a one-line filter change here when the
   * ontology resolver lands.)
   */
  isBright: boolean;
  /** True if this entry passes the active peel-mode preset. */
  isVisible: boolean;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
}

/**
 * Renders one own-mesh entry.
 *
 * --- Sibling dimming technique (P1.12) ---
 *
 * The shared bone material is a single instance reused across all 79 entries
 * (P1.10 decision; P1.11 outlines live outside the material so they didn't
 * disturb this). Dimming siblings requires per-entry opacity, which means
 * either (a) cloning the material per entry, or (b) using a dedicated
 * "dim" material instance toggled at render time.
 *
 * We chose (b) — TWO shared materials (`bright`, `dim`), swapped via the
 * `material` prop on each render. This keeps the bone material count flat
 * regardless of how many entries are in the scene (vs cloning, which is
 * O(N)) and works with R3F's declarative model without per-frame material
 * allocation. The dim material is a clone of the bright one with
 * `transparent: true` + `opacity: SIBLING_DIM_OPACITY` + `depthWrite: false`
 * to avoid the standard transparent-sorting issues without ditching depth
 * test entirely.
 */
function EntryMesh({
  entry,
  isSelected,
  isHovered,
  isBright,
  isVisible,
  onPointerOver,
  onPointerOut,
  onPointerDown,
}: EntryMeshProps) {
  const url = lodUrl(entry, 0);
  const gltf = useGLTF(url);
  const brightMaterial = useMemo(
    () => getMaterialForHint(entry.material_hint),
    [entry.material_hint],
  );
  // Per-render dim variant — see comment block above.
  const dimMaterial = useMemo(() => {
    const m = brightMaterial.clone();
    m.transparent = true;
    m.opacity = SIBLING_DIM_OPACITY;
    m.depthWrite = false;
    m.name = 'bone-dim-p1';
    return m;
  }, [brightMaterial]);
  // Free the cloned dim material if the entry unmounts.
  useEffect(() => () => dimMaterial.dispose(), [dimMaterial]);

  const subMeshes = useMemo(() => extractSubMeshes(gltf.scene, entry.id), [gltf.scene, entry.id]);

  const material = isBright ? brightMaterial : dimMaterial;

  return (
    <group
      visible={isVisible}
      userData={{ entryId: entry.id, uberonId: entry.id }}
      name={entry.id}
    >
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
 * --- Double-click detection (P1.12) ---
 *
 * `selectionStore.select(id)` already stamps `lastClickAt = Date.now()` on
 * every selection mutation. To detect a double-click we compare the
 * pre-click `lastClickAt` and the pre-click `firstSelectedId` against the
 * current event: if the same entry was the previous selection AND the
 * previous click was within DOUBLE_CLICK_MS, we trigger a dive instead of
 * a fresh select.
 *
 * The threshold is 350 ms (the dispatch's stated value) — a touch slower
 * than the OS default (250 ms on Win/macOS) because users navigating a 3D
 * scene tend to chord clicks with orbit drags, and a tighter threshold
 * dropped legitimate double-clicks in informal testing.
 */
const DOUBLE_CLICK_MS = 350;

interface SkeletonGroupProps {
  entries: OwnMeshEntry[];
  bounds: CombinedBounds;
}

function SkeletonGroup({ entries, bounds }: SkeletonGroupProps) {
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

  const peelPreset = usePeelStore(selectPeelPreset);
  const focusedId = useDiveStore(selectFocusedId);
  const dive = useDiveStore((s) => s.dive);

  // -- Pointer handlers -------------------------------------------------

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
      clearHover();
    },
    [clearHover],
  );

  const onPointerDown = useMemo(
    () => (e: ThreeEvent<PointerEvent>) => {
      const native = e.nativeEvent;
      if (native.button !== 0) return;

      const hit = pickFromIntersections(e.intersections);
      if (!hit) return;
      e.stopPropagation();

      // Snapshot the pre-mutation store so the double-click test reads
      // the PREVIOUS selection + click time (the mutation that follows
      // overwrites both).
      const prevState = useSelectionStore.getState();
      const prevFirstId = selectFirstSelectedId(prevState);
      const prevClickAt = prevState.lastClickAt;
      const now = Date.now();
      const sameEntry = prevFirstId === hit.entryId;
      const withinThreshold = prevClickAt > 0 && now - prevClickAt <= DOUBLE_CLICK_MS;

      const mods = modifierKeysFromEvent(e);
      const mode = modeFromModifiers(mods);
      select(hit.entryId, { mode });

      // Trigger dive on a double-click. Skip the dive if a modifier is
      // held (the user explicitly meant multi-select / toggle, not dive).
      if (
        sameEntry &&
        withinThreshold &&
        !mods.shift &&
        !mods.ctrl &&
        !mods.meta &&
        !mods.alt
      ) {
        dive(hit.entryId);
      }
    },
    [select, dive],
  );

  const onPointerMissed = useMemo(
    () => (e: MouseEvent) => {
      if ((e as MouseEvent).button !== 0) return;
      clearSelection();
    },
    [clearSelection],
  );

  // Pre-compute peel visibility per entry. Phase 1 has only `bone` entries
  // so this is the same boolean across all 79 — kept in the per-entry loop
  // anyway because Phase 2 entries (skin/muscle) WILL differ.
  return (
    <group scale={SCENE_SCALE} onPointerMissed={onPointerMissed}>
      <group position={translation}>
        {entries.map((entry) => {
          const visible = isMeshVisibleForPreset(peelPreset, entry.material_hint);
          // Sibling-dim rule: when a dive is active, only the focused entry
          // is bright. Phase 1 stops at single-leaf focus — Phase 2 will
          // also brighten the focused entry's constitutional_part_of
          // descendants (none in P1 registry).
          const isBright = focusedId === null || focusedId === entry.id;
          return (
            <Suspense fallback={null} key={entry.id}>
              <EntryMesh
                entry={entry}
                isSelected={selectedIds.has(entry.id)}
                isHovered={hoveredId === entry.id}
                isBright={isBright}
                isVisible={visible}
                onPointerOver={onPointerOver}
                onPointerOut={onPointerOut}
                onPointerDown={onPointerDown}
              />
            </Suspense>
          );
        })}
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

  useEffect(() => {
    preloadOwnMeshes(ownEntries, 0);
  }, [ownEntries]);

  return (
    <>
      <CameraRig bounds={bounds} entries={ownEntries} />
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
 * Public scene entry point.
 *
 * Wires keyboard dive (P1.12): Enter while exactly one entry is selected
 * fires `dive(selectedId)`. Listener attaches to the host div so it
 * doesn't fight global Tab/Escape semantics; the div is focusable
 * (`tabIndex=0`) so keyboard users can grab focus.
 */
export function SkeletalScene() {
  const [registry, setRegistry] = useState<MeshRegistry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

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

  // Keyboard handler: Enter dives into the first-selected entry. The store
  // exposes the same `dive` action the pointer path uses so the two stay
  // in sync. Use the document listener so the user doesn't have to focus
  // the canvas first; focus management for screen readers is a UI concern
  // (P1.13).
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Enter') return;
      // Don't fight a focused form input or button.
      const target = ev.target as HTMLElement | null;
      if (target && target.matches('input, textarea, select, [contenteditable="true"]')) {
        return;
      }
      const firstId = selectFirstSelectedId(useSelectionStore.getState());
      if (!firstId) return;
      // Multi-select with Enter is ambiguous — only dive if there's exactly one.
      const ids = selectSelectedIds(useSelectionStore.getState());
      if (ids.size !== 1) return;
      useDiveStore.getState().dive(firstId);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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
    <div className="scene-host" aria-label="3D skeletal atlas" ref={hostRef} tabIndex={0}>
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
