import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  selectFirstSelectedId,
  useSelectionStore,
} from '../state/selectionStore';
import {
  selectSidebarOpen,
  useUiPreferencesStore,
} from '../state/uiPreferencesStore';
import {
  ancestorTrail,
  buildSidebarTree,
  flattenTree,
  preferredLabel,
  type TreeNode,
} from './ontology';
import { t } from './i18n';

/**
 * Left-rail anatomy tree.
 *
 * Renders the skeletal hierarchy rooted at `UBERON:0001434` (Skeletal
 * system) two levels deep with on-demand expansion past that. The tree
 * uses the WAI-ARIA `tree`/`treeitem`/`group` pattern with a roving
 * tabindex — only one item is in the tab order at a time, arrow keys move
 * focus.
 *
 * Selection wiring: clicking a row dispatches `select(id, { intent:
 * 'frame' })`. The `'frame'` intent tells the engine to camera-dive
 * toward the new selection (sidebar/search navigations want to bring the
 * structure into view); canvas-click selections pass `'none'` and stay
 * still until the user explicitly double-clicks / long-presses. See
 * selectionStore.ts and SkeletalScene.tsx for the consumer side.
 *
 * Bidirectional sync (P1.14): when the selection changes from OUTSIDE
 * the sidebar (i.e. the user clicked a mesh in the canvas), the tree
 * (a) auto-expands the ancestor path and (b) scrolls the selected row
 * into view so the user doesn't lose context. The expansion was P1.13;
 * the scroll-into-view was P1.14.
 *
 * iPad portrait: the rail becomes a slide-over driven by
 * `uiPreferencesStore.sidebarOpen`. CSS handles the breakpoint; no JS
 * media query.
 */
export function Sidebar() {
  const tree = useMemo(() => buildSidebarTree(), []);
  const selectedId = useSelectionStore(selectFirstSelectedId);
  const select = useSelectionStore((s) => s.select);
  const sidebarOpen = useUiPreferencesStore(selectSidebarOpen);
  const setSidebarOpen = useUiPreferencesStore((s) => s.setSidebarOpen);

  // Auto-expand nodes on the path to the current selection so the tree
  // doesn't visually "lose" the user after they click a structure in the
  // canvas.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (tree) initial.add(tree.node.id);
    return initial;
  });

  useEffect(() => {
    if (!selectedId || !tree) return;
    const ancestors = ancestorTrail(selectedId);
    if (ancestors.length === 0) return;
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const a of ancestors) {
        if (!next.has(a.id)) {
          next.add(a.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedId, tree]);

  const flat = useMemo(
    () => (tree ? flattenTree(tree, expanded) : []),
    [tree, expanded],
  );

  const [focusedId, setFocusedId] = useState<string | null>(() =>
    tree ? tree.node.id : null,
  );

  const itemRefs = useRef(new Map<string, HTMLDivElement>());

  // Focus management — when the focused id changes (keyboard nav), move
  // DOM focus too. Done in an effect so React reconciles the new DOM
  // first.
  useEffect(() => {
    if (!focusedId) return;
    const el = itemRefs.current.get(focusedId);
    el?.focus();
  }, [focusedId]);

  // -- Scroll selected row into view when the selection changes from
  // outside the sidebar (e.g. canvas click). Runs AFTER the expansion
  // effect above so the row actually exists in the flat list.
  //
  // Note: we don't want to fight `focus()` calls triggered by keyboard
  // navigation (which already scroll their own targets). The effect keys
  // on `selectedId` only — if the user keyboard-navigates to a row, the
  // row.focus() call in the focused-id effect handles the scroll; this
  // hook only fires when selectedId itself transitions.
  useEffect(() => {
    if (!selectedId) return;
    // Defer one tick so the auto-expansion above has reconciled and the
    // target row exists in the DOM.
    const id = window.setTimeout(() => {
      const el = itemRefs.current.get(selectedId);
      if (!el) return;
      // 'nearest' avoids jumping if the row is already visible.
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, 0);
    return () => window.clearTimeout(id);
  }, [selectedId]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onItemKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, item: TreeNode, index: number) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = flat[Math.min(index + 1, flat.length - 1)];
          if (next) setFocusedId(next.node.id);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = flat[Math.max(index - 1, 0)];
          if (prev) setFocusedId(prev.node.id);
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (item.children.length === 0) break;
          if (!expanded.has(item.node.id)) {
            toggleExpand(item.node.id);
          } else {
            // already expanded → move to first child
            const child = item.children[0];
            if (child) setFocusedId(child.node.id);
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (expanded.has(item.node.id) && item.children.length > 0) {
            toggleExpand(item.node.id);
          }
          // else: noop (don't try to climb to parent — too brittle for v1)
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          // Sidebar/keyboard navigation passes `intent: 'frame'` so the
          // CameraRig dives toward the structure — the user is browsing
          // the hierarchy and wants the chosen entry in view.
          select(item.node.id, { intent: 'frame' });
          break;
        }
        case 'Escape': {
          e.preventDefault();
          // Close mobile slide-over; on desktop the sidebar is always open
          // so this just blurs focus.
          setSidebarOpen(false);
          break;
        }
        default:
          break;
      }
    },
    [flat, expanded, toggleExpand, select, setSidebarOpen],
  );

  if (!tree) {
    return (
      <aside className="sidebar sidebar--empty" aria-label={t('sidebar.title')}>
        <p className="sidebar__empty">{t('sidebar.empty')}</p>
      </aside>
    );
  }

  return (
    <aside
      className={['sidebar', sidebarOpen ? 'sidebar--open' : ''].filter(Boolean).join(' ')}
      aria-label={t('sidebar.title')}
    >
      <header className="sidebar__header">
        <h2 className="sidebar__title">{t('sidebar.title')}</h2>
        <button
          type="button"
          className="sidebar__close"
          onClick={() => setSidebarOpen(false)}
          aria-label={t('sidebar.toggle.close')}
        >
          x
        </button>
      </header>
      <div
        role="tree"
        aria-label={t('sidebar.tree.aria')}
        className="sidebar__tree"
      >
        {flat.map((item, idx) => (
          <SidebarRow
            key={item.node.id}
            item={item}
            index={idx}
            isExpanded={expanded.has(item.node.id)}
            isFocused={focusedId === item.node.id}
            isSelected={selectedId === item.node.id}
            registerRef={(el) => {
              if (el) itemRefs.current.set(item.node.id, el);
              else itemRefs.current.delete(item.node.id);
            }}
            onToggle={() => toggleExpand(item.node.id)}
            onClick={() => {
              setFocusedId(item.node.id);
              // Sidebar click → camera-frame intent. Distinguishes from
              // canvas pick (which passes 'none' to keep the orbit free).
              select(item.node.id, { intent: 'frame' });
            }}
            onKeyDown={(e) => onItemKeyDown(e, item, idx)}
          />
        ))}
      </div>
    </aside>
  );
}

interface SidebarRowProps {
  item: TreeNode;
  index: number;
  isExpanded: boolean;
  isFocused: boolean;
  isSelected: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  onToggle: () => void;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

function SidebarRow({
  item,
  index: _index,
  isExpanded,
  isFocused,
  isSelected,
  registerRef,
  onToggle,
  onClick,
  onKeyDown,
}: SidebarRowProps) {
  const hasChildren = item.children.length > 0;
  const label = preferredLabel(item.node);
  return (
    <div
      ref={registerRef}
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
      aria-level={item.depth + 1}
      tabIndex={isFocused ? 0 : -1}
      data-kind={item.node.kind}
      className={[
        'sidebar__row',
        `sidebar__row--depth-${item.depth}`,
        isSelected ? 'sidebar__row--selected' : '',
        isFocused ? 'sidebar__row--focused' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(e) => {
        // Click on the disclosure arrow expands; click on the label selects.
        const target = e.target as HTMLElement;
        if (target.dataset.role === 'disclosure') {
          onToggle();
        } else {
          onClick();
        }
      }}
      onKeyDown={onKeyDown}
    >
      {hasChildren ? (
        <span
          data-role="disclosure"
          className="sidebar__disclosure"
          aria-hidden="true"
        >
          {isExpanded ? '-' : '+'}
        </span>
      ) : (
        <span className="sidebar__disclosure sidebar__disclosure--leaf" aria-hidden="true" />
      )}
      <span className="sidebar__label">{label}</span>
    </div>
  );
}
