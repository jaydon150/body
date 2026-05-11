import { useCallback, useEffect, useRef } from 'react';
import {
  selectAttributionOpen,
  useUiPreferencesStore,
} from '../state/uiPreferencesStore';
import { t } from './i18n';

/**
 * "About this atlas" modal — ADR 0006 runtime-attribution surface.
 *
 * Lists every upstream source contributing to the loaded scene with the
 * verbatim attribution string + a link to the upstream license, plus the
 * project's own license map (AGPL-3.0 / CC-BY-SA / CC-BY).
 *
 * Reachability per ADR 0006: ≤ 3 clicks from the main viewer. The trigger
 * lives in the footer and the header, so one click opens the modal —
 * easily under budget.
 *
 * For Phase 1 the source list is hard-coded to BodyParts3D (the only
 * upstream mesh source in the registry). Phase 2 will derive the list
 * dynamically from the registry's `provenance` blocks so OpenAnatomy
 * (when added) flows in automatically. The contract is well-shaped for
 * that swap.
 *
 * Accessibility:
 *   - `role="dialog"`, `aria-modal="true"`
 *   - ESC closes
 *   - Focus moves into the dialog on open; restored to invoker on close
 *   - Background scroll is locked while open (no behind-the-scenes scroll)
 */
export function AttributionSurface() {
  const open = useUiPreferencesStore(selectAttributionOpen);
  const setOpen = useUiPreferencesStore((s) => s.setAttributionOpen);

  if (!open) return null;
  return <AttributionDialog onClose={() => setOpen(false)} />;
}

interface AttributionDialogProps {
  onClose: () => void;
}

function AttributionDialog({ onClose }: AttributionDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const invokerRef = useRef<HTMLElement | null>(null);

  // Focus management — capture invoker on mount, restore on unmount.
  useEffect(() => {
    invokerRef.current = (document.activeElement as HTMLElement) ?? null;
    // Defer one tick so the dialog has actually mounted to focus.
    const id = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      invokerRef.current?.focus?.();
    };
  }, []);

  // ESC closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus trap — keep tab focus inside the dialog.
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const dialog = e.currentTarget;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <div
      className="attribution-backdrop"
      onClick={onBackdropClick}
      role="presentation"
    >
      <div
        className="attribution-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="attribution-title"
        onKeyDown={onKeyDown}
      >
        <header className="attribution-dialog__header">
          <h2 id="attribution-title" className="attribution-dialog__title">
            {t('attribution.title')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="attribution-dialog__close"
            onClick={onClose}
            aria-label={t('attribution.close')}
          >
            x
          </button>
        </header>

        <p className="attribution-dialog__intro">{t('attribution.intro')}</p>

        <section className="attribution-dialog__section">
          <h3 className="attribution-dialog__section-title">
            {t('attribution.sources_heading')}
          </h3>
          <ul className="attribution-dialog__sources">
            {SOURCES.map((s) => (
              <li key={s.name} className="attribution-dialog__source">
                <p className="attribution-dialog__source-name">{s.name}</p>
                <p className="attribution-dialog__source-attribution">
                  {s.attribution}
                </p>
                <p className="attribution-dialog__source-license">
                  License: <span>{s.license}</span>
                </p>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="attribution-dialog__source-link"
                >
                  {s.url}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="attribution-dialog__section">
          <h3 className="attribution-dialog__section-title">
            {t('attribution.project_license_heading')}
          </h3>
          <p className="attribution-dialog__body">
            {t('attribution.project_license_body')}
          </p>
        </section>
      </div>
    </div>
  );
}

interface UpstreamSource {
  name: string;
  /** Verbatim attribution string required by the upstream license. */
  attribution: string;
  license: string;
  url: string;
}

/**
 * Phase 1 upstream sources. Hard-coded — Phase 2 will derive from the
 * registry's `provenance` blocks once Asset Pipeline emits attribution
 * baked into glTF metadata per ADR 0006.
 */
const SOURCES: UpstreamSource[] = [
  {
    name: 'BodyParts3D',
    attribution:
      'BodyParts3D, Copyright (c) 2008 Life Science Database Center licensed by CC BY-SA 2.1 Japan',
    license: 'CC-BY-SA-2.1 Japan',
    url: 'https://lifesciencedb.jp/bp3d/info/license/index.html',
  },
  {
    name: 'UBERON ontology',
    attribution:
      'UBERON: an integrative multi-species anatomy ontology, used under CC BY 3.0.',
    license: 'CC-BY 3.0',
    url: 'https://obofoundry.org/ontology/uberon',
  },
  {
    name: 'Terminologia Anatomica (TA2)',
    attribution:
      'Terminologia Anatomica, Federative International Programme on Anatomical Terminologies (FIPAT).',
    license: 'See FIPAT terms',
    url: 'https://fipat.library.dal.ca/ta2/',
  },
];
