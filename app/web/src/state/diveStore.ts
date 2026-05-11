import { create } from 'zustand';

/**
 * Dive-deeper navigation state for the 3D Engine (P1.12).
 *
 * The user's "dive" interaction is: select a structure, then drill in so the
 * camera frames it and siblings dim out. Per the phase-1 spec acceptance
 * criterion #8 ("camera animates to frame it") and #6 ("dive into a selected
 * structure: camera focuses, siblings dim, breadcrumb updates"), this store
 * is the source of truth for:
 *
 *   - WHICH entry is currently focused (`focusedId`)
 *   - The breadcrumb trail of prior focuses (`ascendStack`), so the UI can
 *     render a "Skeletal > Vertebral column > C1" path and call `ascend()`
 *     to pop one level at a time.
 *
 * The CameraRig subscribes to `focusedId` and lerps the camera + look-at
 * toward the entry's bounds when it changes. Sibling dimming is similarly a
 * scene-side render concern that reads this store.
 *
 * Phase 1 has only `regional_part_of` and `member_of` edges in the
 * skeletal sub-ontology and no `constitutional_part_of` children for any of
 * the 79 own-mesh entries (the sole composite, sternum, is deferred). The
 * "children stay visible when their parent is dived-into" rule is
 * forward-declared in `diveCamera.ts` for Phase 2; for Phase 1 every dive
 * focuses a leaf and dims every other entry.
 */

import type { PrimaryId } from '../engine/registry';

interface DiveState {
  /** Currently focused entry (camera framed on it; siblings dimmed). Null = no dive in progress. */
  focusedId: string | null;

  /**
   * Breadcrumb stack of previously focused entries, oldest at index 0.
   * `dive(id)` pushes the previous `focusedId` here (if non-null) so the
   * UI can render a back-trail and `ascend()` can pop one level at a time.
   */
  ascendStack: string[];

  /**
   * Wall-clock timestamp of the most recent dive transition (focus change
   * OR ascend OR clear). Read by `CameraRig` to compute the lerp progress;
   * `useFrame` interpolates over a fixed duration starting from this time.
   */
  diveStartedAt: number;

  /**
   * Camera state at the moment dive was triggered. Captured by the
   * CameraRig when it observes a focusedId change so the lerp interpolates
   * FROM where the camera was at trigger time, not from a stale default.
   * Stored as plain arrays to keep the store React-friendly (no THREE
   * imports here).
   */
  fromPose: CameraPose | null;

  dive: (entryId: string) => void;
  ascend: () => void;
  clearDive: () => void;

  /**
   * Called by the CameraRig once on mount and then on every dive transition,
   * passing the current camera position + target. The store snapshots it as
   * `fromPose` so the next frame's lerp has the right starting point.
   */
  setFromPose: (pose: CameraPose) => void;
}

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

export const useDiveStore = create<DiveState>((set) => ({
  focusedId: null,
  ascendStack: [],
  diveStartedAt: 0,
  fromPose: null,

  dive: (entryId) =>
    set((state) => {
      // Diving into the same entry is a no-op (don't churn the animation).
      if (state.focusedId === entryId) {
        return state;
      }
      const nextStack =
        state.focusedId === null
          ? state.ascendStack
          : [...state.ascendStack, state.focusedId];
      return {
        focusedId: entryId,
        ascendStack: nextStack,
        diveStartedAt: Date.now(),
      };
    }),

  ascend: () =>
    set((state) => {
      if (state.ascendStack.length === 0) {
        // No history → ascend out of the dive entirely.
        if (state.focusedId === null) {
          return state;
        }
        return { focusedId: null, diveStartedAt: Date.now() };
      }
      const nextStack = state.ascendStack.slice(0, -1);
      const previous = state.ascendStack[state.ascendStack.length - 1];
      return {
        focusedId: previous,
        ascendStack: nextStack,
        diveStartedAt: Date.now(),
      };
    }),

  clearDive: () =>
    set((state) =>
      state.focusedId === null && state.ascendStack.length === 0
        ? state
        : { focusedId: null, ascendStack: [], diveStartedAt: Date.now() },
    ),

  setFromPose: (pose) =>
    set({ fromPose: pose }),
}));

// -- Selectors -------------------------------------------------------------

export const selectFocusedId = (s: DiveState): string | null => s.focusedId;
export const selectAscendStack = (s: DiveState): string[] => s.ascendStack;
export const selectDiveStartedAt = (s: DiveState): number => s.diveStartedAt;
export const selectIsFocused =
  (id: PrimaryId | string) =>
  (s: DiveState): boolean =>
    s.focusedId === id;

// -- Global window hook (for UI bootstrap, dev convenience) ----------------
declare global {
  interface Window {
    __diveStore?: typeof useDiveStore;
  }
}

if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  window.__diveStore = useDiveStore;
}
