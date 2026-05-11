import {
  selectFirstSelectedId,
  selectHoveredId,
  selectSelectedIds,
  useSelectionStore,
} from '../state/selectionStore';

/**
 * Detail panel for the currently selected anatomical structure.
 *
 * P1.11 ships the picking + selection state machine; the engine emits
 * `setHovered` and `select` into the store. This panel renders a minimal
 * read-out of those signals — UBERON id + multi-select cardinality + hover
 * indicator. Rich label / latin-name / definition rendering is P1.13's
 * job (UI agent owns label resolution against the ontology graph).
 *
 * The panel is intentionally read-only: clicks here do NOT change selection
 * (that comes from the canvas picker). Wiring this panel into a structure
 * list / sidebar is P1.13.
 */
export function StructurePanel() {
  const firstSelectedId = useSelectionStore(selectFirstSelectedId);
  const selectedIds = useSelectionStore(selectSelectedIds);
  const hoveredId = useSelectionStore(selectHoveredId);
  const selectionCount = selectedIds.size;

  if (!firstSelectedId) {
    return (
      <aside className="structure-panel" aria-label="Selected structure">
        <span className="panel-eyebrow">No selection</span>
        <strong>Click a structure</strong>
        <span>
          {hoveredId
            ? `Hover: ${hoveredId}`
            : 'Drag to orbit. Shift-click to multi-select. Background-click to deselect.'}
        </span>
      </aside>
    );
  }

  return (
    <aside className="structure-panel is-selected" aria-label="Selected structure">
      <span className="panel-eyebrow">
        {selectionCount > 1 ? `${selectionCount} selected` : 'Selected'}
      </span>
      <strong>{firstSelectedId}</strong>
      <span>
        {hoveredId && hoveredId !== firstSelectedId
          ? `Hover: ${hoveredId}`
          : 'Label resolution arrives in P1.13'}
      </span>
    </aside>
  );
}
