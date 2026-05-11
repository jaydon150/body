import type { ThreeEvent } from '@react-three/fiber';
import type { Object3D } from 'three';

/**
 * GPU-picking helpers for P1.11.
 *
 * Phase 1 strategy: leverage R3F's built-in pointer events. R3F runs a
 * Three.js `Raycaster` under the hood for every pointer event and provides
 * the intersected meshes via `event.intersections[]` already sorted
 * front-to-back. That's the raycaster path the dispatch calls for — no
 * additional render target is needed at this scale (79 meshes).
 *
 * Per the 3D Engine agent's hard rule the production endgame is true GPU
 * picking via a colour-buffer render-target; the rendered scene at P1.11
 * scale (79 meshes, average ~10–40k triangles each) does not warrant the
 * extra render pass yet. Open-item flagged in `3d-engine.state.md` for a
 * future dispatch.
 *
 * Responsibilities here:
 *   1. Resolve a pointer hit to the owning entry's UBERON id by walking the
 *      mesh's parent chain looking for `userData.entryId` (set in
 *      `SkeletalScene`).
 *   2. Filter for visibility — a peel-hidden mesh must not pick.
 *   3. Extract the modifier-key state and screen/world positions from the
 *      pointer event for event-shape conformance.
 *
 * Note on paired-bone behaviour (Option A — per dispatch recommendation):
 *   Anatomical concept = whole "femur" (both sides). The entry id is the
 *   unit of selection — both sub-meshes of a paired entry resolve to the
 *   same UBERON id and so light up together. Per-side selection is a
 *   Phase 2+ enhancement (state-file open item).
 */

/**
 * Walks the Object3D parent chain looking for the first ancestor with a
 * `userData.entryId` string. Returns null if none is found (which means the
 * picked Object3D was not under a tagged EntryMesh root — defensive).
 *
 * Also short-circuits to `null` if any node in the chain has
 * `visible: false`, which is the peel-hiding flag P1.12 will set. This way
 * a hidden mesh truly does not pick even if it's technically still in the
 * scene graph and the raycaster intersected it.
 */
export function resolveEntryIdFromObject(obj: Object3D | null | undefined): string | null {
  let node: Object3D | null | undefined = obj;
  while (node) {
    if (node.visible === false) {
      return null;
    }
    const id = node.userData?.entryId;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
    node = node.parent;
  }
  return null;
}

/**
 * Extracts modifier-key state from a pointer event. Used to populate the
 * `modifier_keys` field of a selection event for schema conformance.
 */
export interface PointerModifierState {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
}

export function modifierKeysFromEvent(e: ThreeEvent<PointerEvent | MouseEvent>): PointerModifierState {
  const native = e.nativeEvent as PointerEvent | MouseEvent | undefined;
  return {
    shift: native?.shiftKey === true,
    ctrl: native?.ctrlKey === true,
    alt: native?.altKey === true,
    meta: native?.metaKey === true,
  };
}

/**
 * Picks the "best" intersection from a pointer event.
 *
 * Phase 1 rule: pick the first hit (front-most). When several meshes
 * overlap at the cursor the closest one wins; pick-through-transparency
 * is a Phase 2 enhancement (state-file open item).
 *
 * The intersection list is already sorted near-to-far by R3F's raycaster;
 * we just walk it looking for the first hit that resolves to a visible
 * entry id.
 */
export function pickFromIntersections(
  intersections: ThreeEvent<PointerEvent | MouseEvent>['intersections'],
): { entryId: string; worldPoint: [number, number, number] } | null {
  for (const hit of intersections) {
    const entryId = resolveEntryIdFromObject(hit.object);
    if (entryId) {
      return {
        entryId,
        worldPoint: [hit.point.x, hit.point.y, hit.point.z],
      };
    }
  }
  return null;
}

/**
 * Decides the selection mode from modifier keys.
 *
 * Phase 1 mapping:
 *   - shift  → 'add'     (extend selection)
 *   - ctrl/meta → 'toggle' (add or remove)
 *   - none → 'replace'
 *
 * Note: the dispatch is explicit that P1.11 makes selection functional but
 * does not wire the UI. The store supports multi-select today and the
 * keyboard mapping above is the agreed convention; UI surfaces (e.g. a
 * "compare" mode toggle) can later override.
 */
export function modeFromModifiers(mods: PointerModifierState): 'replace' | 'add' | 'toggle' {
  if (mods.shift) return 'add';
  if (mods.ctrl || mods.meta) return 'toggle';
  return 'replace';
}
