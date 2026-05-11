import { useMemo } from 'react';
import { selectFirstSelectedId, useSelectionStore } from '../state/selectionStore';
import { selectAscendStack, useDiveStore } from '../state/diveStore';
import { ancestorTrail, getNode, preferredLabel } from './ontology';
import { t } from './i18n';

/**
 * Top-bar breadcrumb showing the path to the currently-selected or
 * currently-focused structure.
 *
 * Two sources are blended:
 *
 *   1. `diveStore.ascendStack` — the dive history (older focuses oldest-first)
 *      plus the current `focusedId`. This is the user's explicit "where I've
 *      dived to" trail.
 *
 *   2. `selectionStore.selected` (first id) — used when no dive is in
 *      progress; we synthesize a trail from the ontology graph via
 *      `ancestorTrail` so the user still sees their structural location.
 *
 * Per phase-1-spec acceptance criterion #10 every segment is clickable to
 * ascend. The actual ascend wiring (which calls `diveStore.ascend()` /
 * sets the selection) is left to P1.14 (engine-UI integration) — for now
 * the click handler calls `select(id)`. P1.14 will replace this with a
 * combined ascend + reframe.
 */
export function Breadcrumbs() {
  const selectedId = useSelectionStore(selectFirstSelectedId);
  const ascendStack = useDiveStore(selectAscendStack);
  const select = useSelectionStore((s) => s.select);

  const trail = useMemo(() => {
    if (selectedId) {
      // Anchor on selection; show the full ontology ancestry. This is
      // strictly more informative than only the dive history during early
      // exploration (the user can see where they ARE in the graph).
      return ancestorTrail(selectedId);
    }
    if (ascendStack.length > 0) {
      return ascendStack
        .map((id) => getNode(id))
        .filter((n): n is NonNullable<ReturnType<typeof getNode>> => Boolean(n));
    }
    return [];
  }, [selectedId, ascendStack]);

  if (trail.length === 0) {
    return (
      <nav className="breadcrumbs breadcrumbs--empty" aria-label={t('breadcrumbs.aria')}>
        <span className="breadcrumbs__empty">{t('breadcrumbs.none')}</span>
      </nav>
    );
  }

  return (
    <nav className="breadcrumbs" aria-label={t('breadcrumbs.aria')}>
      <ol className="breadcrumbs__list">
        {trail.map((node, i) => {
          const isLast = i === trail.length - 1;
          return (
            <li key={node.id} className="breadcrumbs__item">
              {isLast ? (
                <span className="breadcrumbs__current" aria-current="page">
                  {preferredLabel(node)}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    className="breadcrumbs__link"
                    onClick={() => select(node.id)}
                    aria-label={`${preferredLabel(node)} (${t('breadcrumbs.ascend')})`}
                  >
                    {preferredLabel(node)}
                  </button>
                  <span className="breadcrumbs__sep" aria-hidden="true">
                    {' / '}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
