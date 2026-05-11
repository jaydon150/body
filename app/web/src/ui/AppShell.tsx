import { useEffect, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { Search } from './Search';
import { DetailPanel } from './DetailPanel';
import { PeelControls } from './PeelControls';
import { NomenclatureToggle } from './NomenclatureToggle';
import { AttributionSurface } from './AttributionSurface';
import {
  useUiPreferencesStore,
} from '../state/uiPreferencesStore';
import { t } from './i18n';

interface AppShellProps {
  /** 3D canvas (SkeletalScene) — slotted into the centre column. */
  children: ReactNode;
}

/**
 * Composes the full UI shell around the 3D canvas.
 *
 * Layout strategy:
 *
 *   Desktop (≥ 1024 px wide):
 *     [ Sidebar | Canvas | DetailPanel ]
 *     Above all: header (title, search trigger, peel controls,
 *                nomenclature toggle, about button)
 *     Below all: footer (about + license link)
 *
 *   iPad portrait (≤ 1024 px wide):
 *     Sidebar collapses to a slide-over (drawer) triggered from header.
 *     DetailPanel slides up from the bottom as a sheet.
 *     Canvas occupies the visible area.
 *
 * The breakpoint is implemented in CSS; this component is layout-agnostic
 * and just renders all the pieces.
 *
 * Per phase-1-spec acceptance #18 the AttributionSurface is reachable
 * with one click (header "About" button OR footer link).
 */
export function AppShell({ children }: AppShellProps) {
  const setSidebarOpen = useUiPreferencesStore((s) => s.setSidebarOpen);
  const setSearchOpen = useUiPreferencesStore((s) => s.setSearchOpen);
  const setAttributionOpen = useUiPreferencesStore((s) => s.setAttributionOpen);

  // Global Cmd/Ctrl+K + "/" shortcut to open the search palette.
  // Lives at AppShell level (P1.14) so it works even when <Search/> is
  // unmounted (which it is by default — Search only mounts when open).
  // Form-input targets are excluded so typing "/" in a textarea or
  // Ctrl+K inside an input doesn't hijack the user.
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inFormInput =
        target?.matches('input, textarea, select, [contenteditable="true"]') ?? false;
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const isSlash =
        e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !inFormInput;
      if (isCmdK || isSlash) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, [setSearchOpen]);

  return (
    <div className="shell">
      <a className="shell__skip-link" href="#canvas-region">
        {t('a11y.skip_to_canvas')}
      </a>

      <header className="shell__header">
        <div className="shell__header-left">
          <button
            type="button"
            className="shell__sidebar-trigger"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('sidebar.toggle.open')}
          >
            ☰
          </button>
          <div className="shell__title-group">
            <h1 className="shell__title">{t('app.header.title')}</h1>
            <p className="shell__subtitle">{t('app.header.subtitle')}</p>
          </div>
        </div>

        <div className="shell__header-right">
          <button
            type="button"
            className="shell__search-trigger"
            onClick={() => setSearchOpen(true)}
            aria-label={t('search.open')}
          >
            <span className="shell__search-icon" aria-hidden="true">
              ?
            </span>
            <span className="shell__search-label">{t('search.placeholder')}</span>
            <kbd className="shell__search-kbd" aria-hidden="true">
              {t('search.shortcut_hint')}
            </kbd>
          </button>

          <NomenclatureToggle />

          <button
            type="button"
            className="shell__about-trigger"
            onClick={() => setAttributionOpen(true)}
          >
            {t('app.footer.about')}
          </button>
        </div>
      </header>

      <div className="shell__breadcrumbs">
        <Breadcrumbs />
      </div>

      <div className="shell__body">
        <Sidebar />

        <main
          id="canvas-region"
          className="shell__canvas"
          aria-label="3D anatomy viewer"
        >
          {children}
          <div className="shell__peel-overlay">
            <PeelControls />
          </div>
        </main>

        <DetailPanel />
      </div>

      <footer className="shell__footer">
        <button
          type="button"
          className="shell__footer-link"
          onClick={() => setAttributionOpen(true)}
        >
          {t('app.footer.about')}
        </button>
        <span className="shell__footer-license">{t('app.footer.license')}</span>
      </footer>

      <Search />
      <AttributionSurface />
    </div>
  );
}
