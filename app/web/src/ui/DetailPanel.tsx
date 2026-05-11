import { useMemo } from 'react';
import {
  selectFirstSelectedId,
  selectHoveredId,
  selectSelectedIds,
  useSelectionStore,
} from '../state/selectionStore';
import {
  getNode,
  latinLabel,
  preferredLabel,
  synonymLabels,
} from './ontology';
import { useStructureContent } from './useStructureContent';
import { t } from './i18n';

/**
 * Right-rail detail panel for the currently-selected anatomical structure.
 *
 * Replaces the previous P1.11 `StructurePanel` stub. Shows:
 *   - Preferred label (TA2 English) + Latin TA2 below
 *   - Synonyms list (Latin, UBERON comparative, other label sources)
 *   - UBERON id and FMA alias
 *   - Content prose from `useStructureContent` (loads in P1.14)
 *
 * Per ADR 0006 §"In the runtime UI" the panel also surfaces per-structure
 * provenance — the upstream mesh source. For Phase 1 every mesh is from
 * BodyParts3D so the panel hard-renders that attribution string below the
 * content; Phase 2 will read it dynamically from the registry entry's
 * provenance block.
 *
 * Accessibility: panel content is wrapped in an `aria-live="polite"`
 * region so screen readers announce structure changes when the user
 * selects from the canvas. Reserved width prevents layout shift when
 * empty → populated.
 */
export function DetailPanel() {
  const firstSelectedId = useSelectionStore(selectFirstSelectedId);
  const selectedIds = useSelectionStore(selectSelectedIds);
  const hoveredId = useSelectionStore(selectHoveredId);
  const selectionCount = selectedIds.size;

  const node = useMemo(() => (firstSelectedId ? getNode(firstSelectedId) : undefined), [
    firstSelectedId,
  ]);
  const content = useStructureContent(firstSelectedId);

  if (!firstSelectedId) {
    return (
      <aside className="detail-panel detail-panel--empty" aria-label={t('detail.aria')}>
        <div aria-live="polite" className="detail-panel__live" />
        <h3 className="detail-panel__heading">{t('detail.empty.title')}</h3>
        <p className="detail-panel__hint">
          {hoveredId
            ? `${t('a11y.live_region.selected')} ${preferredLabel(getNode(hoveredId)) || hoveredId}`
            : t('detail.empty.body')}
        </p>
      </aside>
    );
  }

  const preferred = preferredLabel(node) || firstSelectedId;
  const latin = latinLabel(node);
  const synonyms = synonymLabels(node).filter(
    (l) => l.text !== preferred && l.text !== latin,
  );

  return (
    <aside className="detail-panel" aria-label={t('detail.aria')}>
      <div aria-live="polite" className="detail-panel__live">
        {`${t('a11y.live_region.selected')} ${preferred}`}
      </div>

      <header className="detail-panel__header">
        <p className="detail-panel__eyebrow">
          {selectionCount > 1 ? `${selectionCount} selected` : 'Selected'}
        </p>
        <h2 className="detail-panel__title">{preferred}</h2>
        {latin ? <p className="detail-panel__latin">{latin}</p> : null}
      </header>

      {synonyms.length > 0 ? (
        <section className="detail-panel__section">
          <h3 className="detail-panel__section-title">{t('detail.synonyms')}</h3>
          <ul className="detail-panel__synonyms">
            {synonyms.map((l) => (
              <li key={`${l.source}-${l.text}`} className="detail-panel__synonym">
                <span className="detail-panel__synonym-text">{l.text}</span>
                <span className="detail-panel__synonym-source">{l.source}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="detail-panel__section">
        <h3 className="detail-panel__section-title">{t('detail.identifiers')}</h3>
        <dl className="detail-panel__ids">
          <dt>UBERON</dt>
          <dd>{firstSelectedId}</dd>
          {node?.aliases?.fma ? (
            <>
              <dt>FMA</dt>
              <dd>{node.aliases.fma}</dd>
            </>
          ) : null}
        </dl>
      </section>

      <section className="detail-panel__section detail-panel__section--content">
        {content.loading ? (
          <p className="detail-panel__hint">{t('detail.content.loading')}</p>
        ) : content.record ? (
          <>
            <p className="detail-panel__summary">{content.record.summary}</p>
            {content.record.long_form ? (
              <p className="detail-panel__longform">{content.record.long_form}</p>
            ) : null}
            {content.record.confidence !== 'reviewed' ? (
              <p className="detail-panel__pill">
                {content.record.confidence}
              </p>
            ) : null}
          </>
        ) : (
          <p className="detail-panel__hint">{t('detail.content.pending')}</p>
        )}
      </section>

      <footer className="detail-panel__footer">
        <p className="detail-panel__provenance">
          Mesh source: BodyParts3D · CC-BY-SA-2.1-JP
        </p>
      </footer>
    </aside>
  );
}
