import { FEMUR_SEED } from '../scene/anatomySeed';
import { useSelectionStore } from '../state/selectionStore';

export function StructurePanel() {
  const selected = useSelectionStore((state) => state.selected);

  if (!selected) {
    return (
      <aside className="structure-panel" aria-label="Selected structure">
        <span className="panel-eyebrow">No selection</span>
        <strong>Click the femur proxy</strong>
        <span>Seed model: {FEMUR_SEED.id}</span>
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
