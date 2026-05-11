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
  selectLastClickAt,
  selectLastIntent,
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
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
  onPointerCancel: (e: ThreeEvent<PointerEvent>) => void;
}

/**
 * Renders one own-mesh entry. See the comment block in SkeletonGroup for
 * the per-frame pointer flow + the sibling-dim technique (two shared
 * materials, swapped via prop).
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
  onPointerUp,
  onPointerCancel,
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
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
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
 * --- Double-click + long-press thresholds (P1.12 + P1.14) ---
 *
 * Double-click (mouse) — P1.12: `selectionStore.select(id)` stamps
 * `lastClickAt = Date.now()` on every mutation. The double-click test
 * compares the PRE-CLICK `lastClickAt` and `firstSelectedId` against the
 * new event: same entry + within DOUBLE_CLICK_MS = trigger dive.
 *
 * Long-press (touch) — P1.14: pointerdown starts a LONG_PRESS_MS timer
 * scoped to the entry; pointerup or pointercancel cancels it; if the
 * timer fires AND the pointer hasn't moved more than a few pixels, we
 * trigger `dive(entryId)` directly. Touch-only — we discriminate on
 * `pointerType === 'touch'` so the mouse path stays untouched.
 *
 * Threshold reconciliation:
 *   - DOUBLE_CLICK_MS = 350 (mouse): a touch slower than the OS default
 *     (250) because 3D-scene users intermix clicks with orbit drag.
 *   - LONG_PRESS_MS  = 500 (touch): the standard iOS long-press budget;
 *     longer than DOUBLE_CLICK_MS so a quick double-tap (which on touch
 *     iPad Safari can also surface as two pointerdowns) still has time
 *     to register as two distinct events before the long-press timer
 *     fires. Order: tap (50ms down + up) → tap → both events resolved
 *     well within the 500ms budget.
 *   - LONG_PRESS_MAX_MOVE_PX = 8: if the pointer moves more than 8px
 *     during the press, treat it as a drag-to-orbit and cancel the
 *     long-press. Generous enough to absorb shake / finger tremor.
 *
 * The two paths do not race because long-press is gated on
 * `pointerType === 'touch'` and double-click on a mouse moves through
 * the same select() mutation. A double-tap on iPad is intentionally a
 * no-op (it'll register as two selects + long-press timer cancelled by
 * the second pointerup) — long-press is the iPad equivalent of
 * double-click.
 */
const DOUBLE_CLICK_MS = 350;
const LONG_PRESS_MS = 500;
const LONG_PRESS_MAX_MOVE_PX = 8;

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

  // -- Long-press timer state (touch only) ----------------------------------
  //
  // The timer + its start position + the entry being pressed live in a ref
  // so closures don't capture stale state. Cancel the timer on pointerup,
  // pointercancel, pointerout, or motion > MAX_MOVE.
  const longPressStateRef = useRef<{
    timerId: number | null;
    startX: number;
    startY: number;
    entryId: string | null;
    pointerId: number | null;
  }>({ timerId: null, startX: 0, startY: 0, entryId: null, pointerId: null });

  const cancelLongPress = useMemo(
    () => () => {
      const s = longPressStateRef.current;
      if (s.timerId !== null) {
        window.clearTimeout(s.timerId);
      }
      s.timerId = null;
      s.entryId = null;
      s.pointerId = null;
    },
    [],
  );

  // Clear any pending timer on unmount so we don't fire a dive against a
  // dead scene.
  useEffect(() => cancelLongPress, [cancelLongPress]);

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
      // Treat pointer-leave-mesh as a long-press cancel — the user is no
      // longer pressing this entry.
      cancelLongPress();
    },
    [clearHover, cancelLongPress],
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
      // Canvas-pick selections pass intent: 'none' — outline only, do not
      // dive. Diving is reserved for double-click (mouse) and long-press
      // (touch). Sidebar / Search / Breadcrumb pass 'frame' from their
      // own callsites.
      select(hit.entryId, { mode, intent: 'none' });

      // Trigger dive on a double-click (mouse path). Skip the dive if a
      // modifier is held (the user explicitly meant multi-select / toggle,
      // not dive).
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

      // Touch path: arm a long-press timer. If the user holds for
      // LONG_PRESS_MS without moving > LONG_PRESS_MAX_MOVE_PX, dive.
      // Modifier suppression isn't relevant here (touch has no
      // shift/ctrl natively).
      if (native.pointerType === 'touch') {
        cancelLongPress();
        const state = longPressStateRef.current;
        state.startX = native.clientX;
        state.startY = native.clientY;
        state.entryId = hit.entryId;
        state.pointerId = native.pointerId;
        state.timerId = window.setTimeout(() => {
          // The id was captured at press-start; safe even if the user
          // released a different finger in the meantime (pointerup clears).
          const targetId = state.entryId;
          state.timerId = null;
          state.entryId = null;
          state.pointerId = null;
          if (targetId) dive(targetId);
        }, LONG_PRESS_MS);
      }
    },
    [select, dive, cancelLongPress],
  );

  const onPointerUp = useMemo(
    () => (_e: ThreeEvent<PointerEvent>) => {
      // Whether or not the long-press timer fired, release cancels it.
      // (If it already fired, the state was zeroed in the timer callback.)
      cancelLongPress();
    },
    [cancelLongPress],
  );

  const onPointerCancel = useMemo(
    () => (_e: ThreeEvent<PointerEvent>) => cancelLongPress(),
    [cancelLongPress],
  );

  const onPointerMissed = useMemo(
    () => (e: MouseEvent) => {
      // Clearing selection on background-click is a standard 3D-viewer
      // pattern; also cancel any pending long-press if the gesture
      // wandered off-mesh.
      cancelLongPress();
      if ((e as MouseEvent).button !== 0) return;
      clearSelection();
    },
    [clearSelection, cancelLongPress],
  );

  // -- Long-press cancel on motion (PointerEvent listener) ------------------
  //
  // R3F doesn't dispatch pointermove on the mesh unless the pointer is
  // still over it; we want a global listener so even a quick lateral drag
  // off-bone cancels the long-press. The window-level handler reads the
  // ref state, no React re-render involved.
  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      const s = longPressStateRef.current;
      if (s.timerId === null) return;
      if (s.pointerId !== null && ev.pointerId !== s.pointerId) return;
      const dx = ev.clientX - s.startX;
      const dy = ev.clientY - s.startY;
      if (dx * dx + dy * dy > LONG_PRESS_MAX_MOVE_PX * LONG_PRESS_MAX_MOVE_PX) {
        cancelLongPress();
      }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [cancelLongPress]);

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
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
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
 * --- Selection-intent → dive bridge (P1.14) ---
 *
 * Subscribes to `lastIntent` + `lastClickAt` + first-selected-id. When
 * the most recent selection mutation carried `intent: 'frame'`, this
 * triggers a `diveStore.dive()` against the new selection so the
 * CameraRig lerps toward it.
 *
 * Why a bridge effect rather than calling `dive()` inline at every
 * `select(..., {intent: 'frame'})` callsite? Centralising the rule in
 * one place means:
 *   - Sidebar / Search / Breadcrumb don't need to import the dive store
 *     or know that 'frame' means dive (they just declare their intent).
 *   - A future change ("frame intent should also call clearPeel()" or
 *     "frame intent on a composite should resolve to its first child")
 *     happens in one effect, not three components.
 *
 * Keyed on `lastClickAt` so a re-selection of the same id with a fresh
 * 'frame' intent still triggers the dive (the id alone wouldn't change).
 */
function FrameIntentBridge() {
  const intent = useSelectionStore(selectLastIntent);
  const lastClickAt = useSelectionStore(selectLastClickAt);
  const firstSelectedId = useSelectionStore(selectFirstSelectedId);
  const dive = useDiveStore((s) => s.dive);

  useEffect(() => {
    if (intent !== 'frame') return;
    if (!firstSelectedId) return;
    dive(firstSelectedId);
    // intent + lastClickAt change together on every frame-intent select,
    // so this effect fires exactly once per call. id-only deps would
    // miss re-selections of the same id (e.g. clicking the same
    // breadcrumb ancestor twice).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent, lastClickAt]);

  return null;
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
        <FrameIntentBridge />
      </Canvas>
    </div>
  );
}
