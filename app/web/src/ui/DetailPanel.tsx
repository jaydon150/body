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
import {
  useStructureContent,
  type ContentCitation,
  type ContentRecord,
} from './useStructureContent';
import { t } from './i18n';

/**
 * Right-rail detail panel for the currently-selected anatomical structure.
 *
 * P1.14 fully wires `useStructureContent` to the on-disk content records
 * served by Vite middleware (`/content/<filename>.json`). The panel renders:
 *
 *   - Preferred label (TA2 English) + Latin TA2 below
 *   - Synonyms list (Latin, UBERON comparative, other label sources)
 *   - UBERON id and FMA alias
 *   - Content prose: `summary` (always when present), `long_form`
 *     (paragraph-split to preserve `\n\n` block breaks from the source),
 *     `citations` (footer list)
 *   - Confidence badge — `pending` → muted amber pill so the user knows the
 *     description has NOT passed anatomist review. `reviewed` records show
 *     no badge (the absence is the signal).
 *   - Provenance line (BodyParts3D + CC-BY-SA-2.1-JP) — Phase 1 hard-coded
 *     to the only upstream mesh source; Phase 2 reads dynamically from the
 *     registry's `provenance` block.
 *
 * Per ADR 0006 §"In the runtime UI" the panel surfaces per-structure
 * attribution.
 *
 * Accessibility: panel content is wrapped in an `aria-live="polite"`
 * region so screen readers announce structure changes when the user
 * selects from the canvas, sidebar, or search. Reserved width prevents
 * layout shift when empty -> populated.
 *
 * Markdown handling: the content schema permits Markdown in `long_form`
 * but Phase 1 records (per P1.15) ship plain prose with `\n\n`
 * paragraph breaks and no inline markup. The panel splits on blank lines
 * and renders each chunk as a `<p>`. If Phase 2 records carry true
 * Markdown (bold, links, etc.), a small inline parser belongs here — for
 * now the paragraph split is the entire rendering contract and avoids
 * a Markdown dependency.
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

      <ContentSection content={content} />

      <footer className="detail-panel__footer">
        <p className="detail-panel__provenance">
          Mesh source: BodyParts3D &middot; CC-BY-SA-2.1-JP
        </p>
      </footer>
    </aside>
  );
}

interface ContentSectionProps {
  content: ReturnType<typeof useStructureContent>;
}

/**
 * Renders the prose / citations / confidence-badge block. Split out so
 * the four resolution states (loading / missing / error / present) have a
 * single switch site and the parent `DetailPanel` stays focused on the
 * label/identifier scaffolding.
 */
function ContentSection({ content }: ContentSectionProps) {
  if (content.status === 'loading') {
    return (
      <section className="detail-panel__section detail-panel__section--content">
        <h3 className="detail-panel__section-title">{t('detail.content.section_title')}</h3>
        <p className="detail-panel__hint">{t('detail.content.loading')}</p>
      </section>
    );
  }
  if (content.status === 'missing' || content.status === 'idle') {
    return (
      <section className="detail-panel__section detail-panel__section--content">
        <h3 className="detail-panel__section-title">{t('detail.content.section_title')}</h3>
        <p className="detail-panel__hint">{t('detail.content.missing')}</p>
      </section>
    );
  }
  if (content.status === 'error') {
    return (
      <section className="detail-panel__section detail-panel__section--content">
        <h3 className="detail-panel__section-title">{t('detail.content.section_title')}</h3>
        <p className="detail-panel__hint detail-panel__hint--error">
          {t('detail.content.error')}
          {content.error ? ` (${content.error})` : null}
        </p>
      </section>
    );
  }
  // status === 'present'
  const record = content.record as ContentRecord;
  return (
    <>
      <section className="detail-panel__section detail-panel__section--content">
        <h3 className="detail-panel__section-title">{t('detail.content.section_title')}</h3>
        <ConfidenceBadge confidence={record.confidence} />
        <p className="detail-panel__summary">{record.summary}</p>
        {record.long_form ? <LongForm text={record.long_form} /> : null}
      </section>
      {record.citations && record.citations.length > 0 ? (
        <section className="detail-panel__section detail-panel__section--citations">
          <h3 className="detail-panel__section-title">
            {t('detail.citations.section_title')}
          </h3>
          <ol className="detail-panel__citations">
            {record.citations.map((c, i) => (
              <li key={`${c.kind}-${i}`} className="detail-panel__citation">
                <CitationLine citation={c} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}

/**
 * Renders the confidence badge — only when the content is NOT `reviewed`.
 * Per dispatch: `pending` content must be visually flagged so the user
 * knows the prose has not been confirmed by an anatomist.
 */
function ConfidenceBadge({ confidence }: { confidence: ContentRecord['confidence'] }) {
  if (confidence === 'reviewed') return null;
  const labelKey =
    confidence === 'flagged' ? 'detail.confidence.flagged' : 'detail.confidence.pending';
  return (
    <p className="detail-panel__pill" aria-label={t(labelKey)}>
      {t(labelKey)}
    </p>
  );
}

/**
 * Splits the long-form prose on blank lines into paragraphs. The schema
 * permits Markdown but Phase 1 records ship plain prose with `\n\n`
 * paragraph breaks (verified against the 51 records authored by P1.15).
 * This intentionally renders nothing fancy — no bold, no inline links —
 * to avoid a Markdown dependency for prose that doesn't need it.
 */
function LongForm({ text }: { text: string }) {
  const paragraphs = useMemo(() => splitParagraphs(text), [text]);
  return (
    <div className="detail-panel__longform">
      {paragraphs.map((p, i) => (
        <p key={i} className="detail-panel__longform-paragraph">
          {p}
        </p>
      ))}
    </div>
  );
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function CitationLine({ citation }: { citation: ContentCitation }) {
  const parts: string[] = [citation.ref];
  if (citation.edition) parts.push(citation.edition);
  if (citation.page) parts.push(citation.page);
  return (
    <>
      <span className="detail-panel__citation-text">{parts.join(' · ')}</span>
      {citation.url ? (
        <>
          {' '}
          <a
            className="detail-panel__citation-link"
            href={citation.url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {citation.url}
          </a>
        </>
      ) : null}
    </>
  );
}
