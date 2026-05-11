import { create } from 'zustand';
import type { MaterialHint } from '../engine/registry';

/**
 * Peel-mode state machine for the 3D Engine (P1.12).
 *
 * Per the agent operating principle "the peel mechanic uses presets, not a
 * global slider" (consequence of ADR 0001 graph-not-tree), this is a fixed
 * enum, not a continuous opacity slider. The enum mirrors
 * `peel_state.preset` in `app/shared/schema/selection-event-schema.json`
 * — the canonical (clinical) names. The user-facing nomenclature toggle
 * between PLAIN (`skin / muscle / bone`) and CLINICAL
 * (`surface / subcutaneous / musculoskeletal`) registers is UI agent's job
 * (P1.13) — engine state stores the canonical enum, UI renders the label.
 *
 * --- Phase 1 limitation ---
 *
 * The Phase 1 registry contains only the 79 skeletal own-mesh entries
 * (every `material_hint === 'bone'`). Skin and muscle ontology + meshes
 * land in Phase 2. That means in Phase 1:
 *
 *   - `surface`       → show everything (skin would be visible if present)
 *   - `subcutaneous`  → hide skin (no-op; no skin entries)
 *   - `musculoskeletal` → hide skin AND fat AND fascia (no-op; none present)
 *   - `skeletal`      → hide everything but bone (no-op; only bone present)
 *   - `visceral`      → show only organ parenchyma (HIDES the skeleton)
 *
 * The plumbing is correct — `isMeshVisible(entryId, ontologyKind)` returns
 * the right boolean for every preset — but the VISIBLE UX difference only
 * activates when Phase 2 adds skin + muscle ontology + meshes. This is
 * called out in the phase-1 spec ("What Phase 1 does *not* prove"). The
 * `visceral` preset hides the skeleton because that's the canonical clinical
 * meaning of "visceral view" — see decision below for why we ship this even
 * though Phase 1 has no organs to reveal.
 */

import type { PeelPreset } from '../engine/selectionEvent';

export type { PeelPreset };

/** Cycle order for `cyclePreset` — matches the dispatch's stated reveal
 *  progression (outermost → innermost). UI may rebind to a different cycle
 *  (e.g. plain `skin/muscle/bone` only) without touching the store. */
export const PEEL_PRESET_CYCLE: PeelPreset[] = [
  'surface',
  'subcutaneous',
  'musculoskeletal',
  'skeletal',
];

/**
 * Material-hint visibility table per preset. Each preset declares which
 * `material_hint` values should render. `material_hint === undefined` is
 * treated as 'generic' and always renders so unhinted entries (composites,
 * orphan meshes) never silently disappear.
 *
 * Phase 1 registry only has `bone` entries, so only the `bone` column is
 * exercised in practice. Other rows are forward-declared for Phase 2.
 */
const PRESET_VISIBLE_HINTS: Record<PeelPreset, ReadonlySet<MaterialHint>> = {
  // Show everything: skin on top, all layers visible.
  surface: new Set<MaterialHint>([
    'skin',
    'fat',
    'fascia',
    'muscle',
    'bone',
    'cartilage',
    'ligament',
    'tendon',
    'vessel_artery',
    'vessel_vein',
    'nerve',
    'organ_parenchyma',
    'generic',
  ]),
  // Skin peeled back; everything under the skin still visible.
  subcutaneous: new Set<MaterialHint>([
    'fat',
    'fascia',
    'muscle',
    'bone',
    'cartilage',
    'ligament',
    'tendon',
    'vessel_artery',
    'vessel_vein',
    'nerve',
    'organ_parenchyma',
    'generic',
  ]),
  // Skin + fat peeled; reveals muscle + bone + connective tissue. Vessels &
  // nerves stay on (they're embedded in the musculature for orientation).
  musculoskeletal: new Set<MaterialHint>([
    'muscle',
    'bone',
    'cartilage',
    'ligament',
    'tendon',
    'vessel_artery',
    'vessel_vein',
    'nerve',
    'generic',
  ]),
  // Body-wall opened; reveals visceral organs. Skeleton hidden so it doesn't
  // occlude the viscera. (Canonical clinical meaning of "visceral view".)
  visceral: new Set<MaterialHint>([
    'organ_parenchyma',
    'vessel_artery',
    'vessel_vein',
    'nerve',
    'generic',
  ]),
  // Skeleton-only: every non-bone tissue hidden.
  skeletal: new Set<MaterialHint>([
    'bone',
    'cartilage',
    'ligament',
    'generic',
  ]),
};

interface PeelState {
  /**
   * Active peel preset. Default `'surface'` = show everything (the user
   * sees the body intact on first load, as the spec requires).
   */
  preset: PeelPreset;

  setPreset: (preset: PeelPreset) => void;

  /**
   * Advance to the next preset in `PEEL_PRESET_CYCLE`. Bound to a UI button
   * or keyboard shortcut by P1.13. Wraps at the end.
   */
  cyclePreset: () => void;
}

export const usePeelStore = create<PeelState>((set) => ({
  preset: 'surface',

  setPreset: (preset) =>
    set((state) => (state.preset === preset ? state : { preset })),

  cyclePreset: () =>
    set((state) => {
      const idx = PEEL_PRESET_CYCLE.indexOf(state.preset);
      // If the current preset isn't in the cycle (e.g. UI set it to
      // `visceral` directly), start the cycle from the top so a button
      // press still moves the user somewhere predictable.
      const nextIdx = idx < 0 ? 0 : (idx + 1) % PEEL_PRESET_CYCLE.length;
      return { preset: PEEL_PRESET_CYCLE[nextIdx] };
    }),
}));

/**
 * Visibility predicate. The scene calls this per entry to decide whether to
 * render the mesh. Hidden entries are also unpickable — the picker already
 * walks the parent chain checking `visible !== false`, so setting
 * `<group visible={false}>` cascades correctly.
 *
 * The `entryId` argument is currently unused but kept in the signature
 * because Phase 2 will want per-entry overrides (e.g. "isolate this organ"
 * = show this entry regardless of preset). Marked as a no-op for now so the
 * UI doesn't have to thread different selector shapes when that lands.
 *
 * Returning `true` means the mesh SHOULD be rendered.
 */
export function isMeshVisibleForPreset(
  preset: PeelPreset,
  materialHint: MaterialHint | undefined,
): boolean {
  const hint: MaterialHint = materialHint ?? 'generic';
  return PRESET_VISIBLE_HINTS[preset].has(hint);
}

// -- Selectors -------------------------------------------------------------

export const selectPeelPreset = (s: PeelState): PeelPreset => s.preset;

/**
 * Hook variant of `isMeshVisibleForPreset` curried by `materialHint`. Subs
 * to the preset only so a re-render of one entry doesn't ripple to
 * unrelated entries.
 */
export const selectIsMeshVisible =
  (materialHint: MaterialHint | undefined) =>
  (s: PeelState): boolean =>
    isMeshVisibleForPreset(s.preset, materialHint);

// -- Global window hook (for UI bootstrap) ---------------------------------
//
// The dispatch asks the engine to expose peel-store actions "globally enough
// that a UI sidebar can wire to them without further engine changes".
// Zustand stores ARE already module-level singletons — any UI file that
// imports `usePeelStore` gets the same store instance. Nothing further is
// needed for the React side. A dev-console handle is set in development so
// you can hot-poke the preset without remounting (the smoke-test path).
declare global {
  interface Window {
    __peelStore?: typeof usePeelStore;
  }
}

if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__peelStore = usePeelStore;
}
