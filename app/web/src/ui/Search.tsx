import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSelectionStore } from '../state/selectionStore';
import {
  selectSearchOpen,
  useUiPreferencesStore,
} from '../state/uiPreferencesStore';
import { preferredLabel, search, type SearchResult } from './ontology';
import { t } from './i18n';

/**
 * Cmd/Ctrl-K search palette.
 *
 * Modal overlay that lets the user fuzzy-search anatomical structures by
 * any label (TA2 English, Latin, UBERON comparative, FMA alias, or the
 * raw id). Up/Down to navigate results; Enter to select; Esc to close.
 *
 * Global keyboard handler: P1.14 wires the Cmd/Ctrl+K listener at the
 * document level. For this dispatch, the component registers its own
 * keydown listener while mounted — that's enough for the smoke test. The
 * listener is idempotent across remounts (the registered fn is stable via
 * useCallback) so a Phase 2 GlobalShortcut layer can override without
 * conflict.
 */
export function Search() {
  const open = useUiPreferencesStore(selectSearchOpen);
  const setOpen = useUiPreferencesStore((s) => s.setSearchOpen);
  const selectId = useSelectionStore((s) => s.select);

  // Register global Cmd/Ctrl+K + "/" shortcut to OPEN the palette.
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      // "/" but ignore when typing in an input.
      const isSlash =
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement);
      if (isCmdK || isSlash) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onGlobalKey);
    return () => window.removeEventListener('keydown', onGlobalKey);
  }, [setOpen]);

  if (!open) return null;

  return (
    <SearchPalette
      onClose={() => setOpen(false)}
      onPick={(id) => {
        selectId(id);
        setOpen(false);
      }}
    />
  );
}

interface SearchPaletteProps {
  onClose: () => void;
  onPick: (id: string) => void;
}

function SearchPalette({ onClose, onPick }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const invokerRef = useRef<HTMLElement | null>(null);

  // Remember which element had focus before the palette opened so we can
  // restore it on close (a11y).
  useEffect(() => {
    invokerRef.current = (document.activeElement as HTMLElement) ?? null;
    inputRef.current?.focus();
    return () => {
      invokerRef.current?.focus?.();
    };
  }, []);

  const results: SearchResult[] = useMemo(() => search(query, 8), [query]);

  useEffect(() => {
    // Clamp active index when the result set shrinks below the cursor.
    if (activeIndex >= results.length) setActiveIndex(0);
  }, [results.length, activeIndex]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const r = results[activeIndex];
        if (r) onPick(r.node.id);
        return;
      }
    },
    [activeIndex, results, onClose, onPick],
  );

  // Click on backdrop closes; click on dialog content does not.
  const onBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return (
    <div
      className="search-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={t('search.placeholder')}
      onClick={onBackdropClick}
    >
      <div className="search-palette">
        <input
          ref={inputRef}
          type="search"
          className="search-palette__input"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          aria-label={t('search.placeholder')}
          aria-autocomplete="list"
          aria-controls="search-palette__results"
          aria-activedescendant={
            results[activeIndex] ? `search-result-${results[activeIndex].node.id}` : undefined
          }
        />
        <ul
          id="search-palette__results"
          role="listbox"
          className="search-palette__results"
        >
          {query.length === 0 ? (
            <li className="search-palette__hint">{t('search.empty')}</li>
          ) : results.length === 0 ? (
            <li className="search-palette__hint">{t('search.no_results')}</li>
          ) : (
            results.map((r, idx) => {
              const isActive = idx === activeIndex;
              const preferred = preferredLabel(r.node);
              const matched = r.matchedLabel;
              const subtitle = matched !== preferred ? matched : r.node.id;
              return (
                <li
                  key={r.node.id}
                  id={`search-result-${r.node.id}`}
                  role="option"
                  aria-selected={isActive}
                  className={[
                    'search-palette__result',
                    isActive ? 'search-palette__result--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => {
                    // mouseDown rather than click so we beat blur.
                    e.preventDefault();
                    onPick(r.node.id);
                  }}
                >
                  <span className="search-palette__primary">{preferred}</span>
                  <span className="search-palette__subtitle">{subtitle}</span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
