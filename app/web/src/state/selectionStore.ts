import { create } from 'zustand';

export interface AnatomicalSelection {
  id: string;
  label: string;
  latinLabel: string;
  materialHint: string;
  status: 'procedural_proxy';
}

interface SelectionState {
  selected: AnatomicalSelection | null;
  select: (selection: AnatomicalSelection) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selected: null,
  select: (selection) => set({ selected: selection }),
  clear: () => set({ selected: null })
}));
