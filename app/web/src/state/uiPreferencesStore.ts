import { create } from 'zustand';

/**
 * UI preferences — register choice, sidebar collapsed state, etc.
 *
 * Owned by the UI agent (P1.13). The engine-side stores (selectionStore,
 * peelStore, diveStore) hold the canonical, source-of-truth state; this
 * store holds purely-presentational preferences that never feed back into
 * engine behavior.
 *
 * The `register` field gates the plain ↔ clinical nomenclature toggle
 * required by phase-1-spec acceptance criterion #7:
 *
 *   plain     → `skin / muscle / bone / organs / skeleton`
 *   clinical  → `surface / subcutaneous / musculoskeletal / visceral / skeletal`
 *
 * Default: plain (per spec v0.2: "plain ... primary register, with a
 * nomenclature toggle that exposes the clinical register as a secondary
 * UI option").
 */

export type NomenclatureRegister = 'plain' | 'clinical';

interface UiPreferencesState {
  /** Active nomenclature register. */
  register: NomenclatureRegister;

  /**
   * Sidebar open state. On desktop this is always effectively true
   * (CSS hides the toggle); on iPad portrait this controls the slide-over.
   */
  sidebarOpen: boolean;

  /** AttributionSurface modal visibility. */
  attributionOpen: boolean;

  /** Search palette visibility. */
  searchOpen: boolean;

  setRegister: (register: NomenclatureRegister) => void;
  toggleRegister: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setAttributionOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>((set) => ({
  register: 'plain',
  sidebarOpen: false,
  attributionOpen: false,
  searchOpen: false,

  setRegister: (register) =>
    set((state) => (state.register === register ? state : { register })),

  toggleRegister: () =>
    set((state) => ({ register: state.register === 'plain' ? 'clinical' : 'plain' })),

  setSidebarOpen: (open) =>
    set((state) => (state.sidebarOpen === open ? state : { sidebarOpen: open })),

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setAttributionOpen: (open) =>
    set((state) => (state.attributionOpen === open ? state : { attributionOpen: open })),

  setSearchOpen: (open) =>
    set((state) => (state.searchOpen === open ? state : { searchOpen: open })),
}));

// -- Selectors -------------------------------------------------------------

export const selectRegister = (s: UiPreferencesState): NomenclatureRegister => s.register;
export const selectSidebarOpen = (s: UiPreferencesState): boolean => s.sidebarOpen;
export const selectAttributionOpen = (s: UiPreferencesState): boolean => s.attributionOpen;
export const selectSearchOpen = (s: UiPreferencesState): boolean => s.searchOpen;
