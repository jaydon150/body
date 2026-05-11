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
 * ascend. P1.14 wires the ascent properly:
 *
 *   - Clicking an ancestor segment sets selection to that ancestor with
 *     `intent: 'frame'`. The frame-intent bridge in SkeletalScene
 *     translates that to `diveStore.dive(ancestorId)`, which:
 *       * Pushes the previous focus onto the ascendStack (or starts the
 *         stack if there wasn't one).
 *       * Triggers the CameraRig lerp toward the ancestor's bounds.
 *     Net effect: the user sees the camera glide outward to encompass
 *     the ancestor's bounding box.
 *
 *   - There's a separate "Reset" affordance — the canvas itself clears
 *     dive when the user clicks empty space (`onPointerMissed`). We
 *     don't add a duplicate clear button here to keep the breadcrumb
 *     focused on the navigation trail.
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
                    onClick={() =>
                      // Ascend to the clicked ancestor with frame intent
                      // so the engine dives outward to it. The current
                      // dive (if any) ascends; the new ancestor becomes
                      // the new focus.
                      select(node.id, { intent: 'frame' })
                    }
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
