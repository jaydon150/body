import { create } from 'zustand';

/**
 * Selection state machine for the 3D Engine (P1.11).
 *
 * Per the agent's hard rule "Selection is a state machine", hover / single-
 * select / multi-select / focus are explicit states, not ad-hoc flags. The
 * store IS the event stream — for Phase 1 nothing is emitted through a side
 * channel; consumers subscribe directly. Future expansion (e.g. analytics,
 * worker dispatch) can wrap mutations in event emissions without changing the
 * store's public surface.
 *
 * Event shape conforms to `app/shared/schema/selection-event-schema.json`
 * (see `engine/selectionEvent.ts` for the typed builder).
 */

/**
 * Legacy P1.10 selection shape. Retained as an exported type so any
 * downstream consumer that imported it pre-P1.11 still typechecks; the
 * store itself no longer uses this shape — selection is keyed on the
 * registry-derived `entryId` (UBERON id) and labels are resolved by the UI
 * layer from the ontology graph.
 *
 * @deprecated Use `useSelectedIds()` / `useHoveredId()` and resolve labels
 * via the ontology lookup. Kept for one release cycle of UI compatibility.
 */
export interface AnatomicalSelection {
  id: string;
  label: string;
  latinLabel: string;
  materialHint: string;
  status: 'procedural_proxy';
}

export type SelectionMode = 'replace' | 'add' | 'toggle';

/**
 * Selection "intent" — tells downstream observers what triggered the change.
 *
 * Added in P1.14 to distinguish programmatic selections from canvas-pick
 * selections so the camera framing decision is centralised in the store
 * rather than re-derived at every callsite:
 *
 *   - `'none'`  → outline only, no camera change. Canvas-click uses this
 *                 because the user is already framing things by orbiting;
 *                 dive is reserved for explicit double-click / long-press.
 *   - `'frame'` → bring the entry into view (the CameraRig dives toward it
 *                 with the standard ease-in-out lerp). Sidebar, Search, and
 *                 Breadcrumb (click an ancestor) pass this because the user
 *                 is navigating to a structure they may not currently see.
 *
 * The store also exposes `lastIntent` so the CameraRig (or any other
 * observer) can read what kind of selection just happened without having
 * to wrap every `select(...)` call into a custom event channel.
 */
export type SelectionIntent = 'none' | 'frame';

interface SelectionState {
  /** Currently hovered entry, or null if the pointer is not over a pickable mesh. */
  hovered: { id: string | null };

  /**
   * Selected entry ids. Multi-select-capable even though P1.13 UI may only
   * surface single-select; the data layer supports both so a later dispatch
   * can light up multi-select without a store migration.
   */
  selected: { ids: Set<string> };

  /**
   * Wall-clock timestamp of the most recent click that resulted in a
   * selection change. Reserved for P1.12 double-click detection (dive
   * camera trigger).
   */
  lastClickAt: number;

  /**
   * Intent that accompanied the most recent `select()` call. Observers
   * (e.g. CameraRig wrapper / DetailPanel) read this to decide whether to
   * frame the camera on the new selection. Reset to `'none'` whenever the
   * selection is cleared.
   */
  lastIntent: SelectionIntent;

  setHovered: (id: string | null) => void;
  clearHover: () => void;
  select: (id: string, options?: { mode?: SelectionMode; intent?: SelectionIntent }) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  hovered: { id: null },
  selected: { ids: new Set<string>() },
  lastClickAt: 0,
  lastIntent: 'none',

  setHovered: (id) =>
    set((state) => {
      // Avoid superfluous re-renders when the hovered id doesn't change.
      if (state.hovered.id === id) {
        return state;
      }
      return { hovered: { id } };
    }),

  clearHover: () =>
    set((state) => (state.hovered.id === null ? state : { hovered: { id: null } })),

  select: (id, options) =>
    set((state) => {
      const mode: SelectionMode = options?.mode ?? 'replace';
      const intent: SelectionIntent = options?.intent ?? 'none';
      const next = new Set(state.selected.ids);
      switch (mode) {
        case 'replace':
          next.clear();
          next.add(id);
          break;
        case 'add':
          next.add(id);
          break;
        case 'toggle':
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          break;
      }
      return {
        selected: { ids: next },
        lastClickAt: Date.now(),
        lastIntent: intent,
      };
    }),

  clearSelection: () =>
    set((state) =>
      state.selected.ids.size === 0
        ? state
        : {
            selected: { ids: new Set<string>() },
            lastClickAt: Date.now(),
            lastIntent: 'none',
          },
    ),
}));

// -- Convenience selectors -------------------------------------------------
//
// Tiny named selectors avoid repeated inline-selector identity churn at
// callsites. Zustand re-runs subscribers whenever the chosen slice's identity
// changes; the store mutators above only return a new `selected`/`hovered`
// object when the underlying value actually changes, so these are stable
// across no-op transitions.

export const selectHoveredId = (s: SelectionState): string | null => s.hovered.id;
export const selectSelectedIds = (s: SelectionState): Set<string> => s.selected.ids;
export const selectIsSelected =
  (id: string) =>
  (s: SelectionState): boolean =>
    s.selected.ids.has(id);
export const selectFirstSelectedId = (s: SelectionState): string | null => {
  const it = s.selected.ids.values().next();
  return it.done ? null : (it.value as string);
};
export const selectLastIntent = (s: SelectionState): SelectionIntent => s.lastIntent;
export const selectLastClickAt = (s: SelectionState): number => s.lastClickAt;

// -- Global window hook (dev convenience, parity with peelStore / diveStore) --
declare global {
  interface Window {
    __selectionStore?: typeof useSelectionStore;
  }
}

if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__selectionStore = useSelectionStore;
}
