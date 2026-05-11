import { useSelectionStore } from '../state/selectionStore';

/**
 * Detail panel for the currently selected anatomical structure.
 *
 * P1.10 ships the registry-driven scene but does NOT emit selection events
 * yet (per agent hard rules — selection is a state machine, wired in P1.11).
 * The panel renders a "no selection" placeholder until then.
 *
 * The selection store is preserved as the single source of truth (per the
 * P1.10 dispatch); P1.11 wires GPU picking events into it.
 */
export function StructurePanel() {
  const selected = useSelectionStore((state) => state.selected);

  if (!selected) {
    return (
      <aside className="structure-panel" aria-label="Selected structure">
        <span className="panel-eyebrow">No selection</span>
        <strong>Drag to orbit</strong>
        <span>Picking arrives in P1.11</span>
      </aside>
    );
  }

  return (
    <aside className="structure-panel is-selected" aria-label="Selected structure">
      <span className="panel-eyebrow">{selected.id}</span>
      <strong>{selected.label}</strong>
      <span>{selected.latinLabel}</span>
      <span>
        {selected.materialHint} · {selected.status.replace('_', ' ')}
      </span>
    </aside>
  );
}
