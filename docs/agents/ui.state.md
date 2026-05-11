# Agent state: ui

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 (P1.14 — UI ↔ 3D Engine integration + iPad touch)

---

## Open items

- **Light mode** — explicitly deferred to Phase 2+ per dispatch. Dark is the only theme for Phase 1.
- **Search by FMA id** — partially supported (FMA aliases are indexed); first-class FMA-id-as-primary search is Phase 2+.
- **Per-side (left / right) selection UI** — Phase 2+ (sidebar tree doesn't expose laterality yet; ontology nodes don't all have it).
- **iPad slide-over gesture-driven dismiss** — current dismiss is the close button + `Escape` key. Swipe-to-dismiss + edge-swipe-to-open are P1.14 (touch input integration).
- **Content fetching** — `useStructureContent(id)` is a stub returning `null` for every id. P1.14 must wire the actual fetch once Content's `data/canonical/ontology/content/<id>.json` files exist.
- **Sidebar deep-tree expansion** — currently capped at depth 3 from root. Phase 2 may want full expansion to show every leaf bone; revisit when Content has authored deeper nodes.
- **Color-contrast verification** — token values were chosen for AA-target contrast (off-white #e8e0d3 on #1c1816 / #221d1a passes; cyan #3aa5d9 on dark passes for non-text UI). Phase 1.18 UX/A11y audit should formally measure and confirm; if any fails, swap tokens in `index.css` `:root`.

## Decisions log

### P1.14 — UI ↔ engine integration + iPad touch (2026-05-11)

- **Selection-intent flag added to `selectionStore.select(id, { mode, intent })`.** Distinguishes programmatic selections (Sidebar / Search / Breadcrumb → `intent: 'frame'`) from canvas-pick (`intent: 'none'`). The new `lastIntent` field on the store is read by the **`FrameIntentBridge`** component inside SkeletalScene; when the most recent select carries `'frame'` it calls `diveStore.dive(firstSelectedId)`. Centralising the rule means callsites don't import the dive store — they just declare their intent. Re-selections of the same id with fresh intent still trigger (effect keys on `lastClickAt`, not id alone).
- **Sidebar bidirectional sync.** Existing ancestor-trail auto-expand from P1.13 stays; P1.14 adds a `scrollIntoView({ block: 'nearest' })` effect keyed on `selectedId` so canvas clicks don't leave the user disoriented in the tree. Defers one tick so the auto-expansion has reconciled and the row exists in the DOM.
- **Content fetch via Vite middleware route.** `vite.config.ts` now serves `GET /content/<filename>.json` from `data/canonical/ontology/content/`. Same pattern as P1.10's `/registry.json` + `/meshes/` routes — production deploy of these is a separately-flagged concern. Path traversal guarded by `resolve()` + prefix check; only `.json` files served. URL builder: `UBERON:0000981 → /content/uberon_0000981.json` (lowercase namespace + underscore + digits). Generalised to handle `FMA:` and `BODY:` ids the same way.
- **`useStructureContent` hook: SWR-style cache + 5-state status machine.** `'idle' | 'loading' | 'present' | 'missing' | 'error'`. The 404 case is `'missing'` (distinct from `'error'`) so the DetailPanel can render "no description authored yet" rather than a generic failure. Module-scoped cache keyed by id; in-flight requests deduplicated. Defensive shape check refuses records whose `structure_id` doesn't match the request. Phase 1 has 51 records — cache eviction not needed.
- **DetailPanel rendering policy for `pending` content.** Per dispatch: show whatever the file says, but VISUALLY FLAG it. A muted amber `pending anatomist review` pill renders above the summary; `flagged` gets a similar pill. `reviewed` shows nothing (the absence is the signal). Long-form paragraph rendering uses a tiny `splitParagraphs` helper (`\n{2,}` → `<p>` array) rather than a Markdown library — Phase 1 content (verified against P1.15 records) ships plain prose with `\n\n` paragraph breaks and no inline markup. If Phase 2 content carries true Markdown a small inline parser belongs in `LongForm`; not worth a dep yet. Citations render as an `<ol>` with optional URL link.
- **Global Cmd-K + "/" shortcut moved to AppShell.** P1.13 lived inside `<Search>`; P1.14 moved to `AppShell` so the shortcut works even when Search is unmounted (which it is by default — `<Search>` returns `null` until open). Form-input + contenteditable targets are excluded so typing "/" in the search input itself doesn't recursively re-open. Search itself no longer registers a duplicate listener.
- **Search picks pass `intent: 'frame'`.** Searching is a navigation gesture — the user wants the chosen entry in view. Closes the palette and restores focus to the invoker (the focus-restore was already P1.13).
- **Breadcrumb ascend → frame intent.** Clicking an ancestor segment calls `select(node.id, { intent: 'frame' })`, which routes through FrameIntentBridge → `diveStore.dive(ancestorId)`. The dive store pushes the previous focus onto its `ascendStack` and the CameraRig lerps outward. Simpler than re-implementing per-depth ascent in the breadcrumb itself.
- **Tap-target audit.** All chrome controls already had `min-height: var(--touch-target)` (44px) from P1.13. Exception: breadcrumb links had `min-height: 1.8rem` (~29px) because the breadcrumb visually wants to stay dense. Fix: a `@media (pointer: coarse)` block adds an invisible `::before` overlay that extends the hit area by 10px above/below; visual stays dense, touch hit area meets WCAG. Other touch concerns: `OrbitControls` `enableZoom/enableRotate/enablePan` made explicit in CameraRig (defaults were `true`; explicit is safer against future refactors). Damping factor 0.08 was already P1.12; carried unchanged.

### P1.13 — 2026-05-11

- **Layout strategy: CSS grid + breakpoint at 1024 px.** Three-column on desktop (sidebar / canvas / detail). Below 1024 px (iPad portrait at 768 px is co-primary), sidebar collapses to a fixed-position slide-over; detail panel becomes a bottom rail. No JS media-query; pure CSS via `@media`. Touch targets ≥ 44 px everywhere via a `--touch-target` token.
- **Fuzzy-search approach: hand-rolled, zero-dep.** ~120 nodes × ~3 labels each is small enough to brute-force without indexing. Scoring blends prefix/substring/word-prefix with a Levenshtein-1 typo fallback. If Phase 2 adds 1000+ nodes, swap for `minisearch` (lib chosen, not yet imported). Score table documented in `ontology.ts`.
- **Store-vs-prop split: stores own state, components are pure presentation.** Sidebar / Breadcrumbs / Search / DetailPanel / PeelControls all read from existing Zustand stores (read-only) and the new `uiPreferencesStore`. No prop-drilling. This keeps P1.14 wiring trivial — engine actions go straight into the same stores.
- **Content-fetch placeholder strategy: `useStructureContent(id)` returns `{ loading: false, record: null, error: null }`.** Component contract locked here; P1.14 swaps the body to actually fetch `/ontology/content/<id>.json` (or a build-time glob import). Render path already handles `record === null` → "Content authoring in progress" placeholder.
- **Register-switching design: single source of truth.** `uiPreferencesStore.register: 'plain' | 'clinical'` + helper `labelForPreset(preset, register)` in `nomenclature.ts`. Engine state stores the canonical clinical enum (`PeelPreset`); the UI reads `register` and maps for display. Toggle component flips the store; everywhere that renders a preset label re-renders.
- **i18n keying: minimal in-file table.** `t(key)` lookups against an English table in `i18n.ts`. Anatomical names are NEVER in this table — those flow from `nodes.json[].labels[]`. Phase 4 localization plugs in new tables without touching call sites.
- **Ontology data loading: build-time import.** Vite's `resolveJsonModule` + `server.fs.allow: [repoRoot]` lets the UI import `nodes.json` / `relations.json` from outside `src/`. ~1500 lines of JSON inlined into the bundle (small; will stay tiny relative to Three.js). Avoids needing another `/registry.json`-style middleware route. Mesh registry is still fetched at runtime because it's larger and regenerated by the pipeline.
- **Tree shape: depth-3 cap with expand-on-demand.** Sidebar shows root (Skeletal system) → axial/appendicular → their regional children. Deeper structures are reachable via expand. Stops the tree from being a 100-line scroll-wall on first load.
- **Search index entries: every label + the id + FMA alias.** Each entry points back to its node; the search aggregates per-node and keeps the highest-scoring label as the "matched" text. Power-users can paste a UBERON or FMA id and find the structure directly.
- **AttributionSurface source list: hard-coded for Phase 1.** Three sources (BodyParts3D, UBERON, TA2). Phase 2 will derive dynamically from the registry's `provenance` blocks once Asset Pipeline emits them per ADR 0006. Contract is shaped for that swap.
- **Focus management: roving tabindex on the tree, focus-trap on modals.** Sidebar uses one focused row at a time + arrow-key navigation. Search and AttributionSurface trap focus while open and restore to invoker on close.

## Handoffs

### To P1.17 (QA — visual regression baselines + perf budgets + accuracy queue)

- **Baseline screenshots needed for the integrated flows:**
  - Initial load (full skeleton, no selection, plain register, surface peel).
  - Single canvas-click selection (outline appears, no camera change).
  - Double-click dive (camera framed on entry, sibling-dim active).
  - Sidebar selection (auto-expansion + scrollIntoView, camera dive).
  - Cmd-K search → "femur" → Enter (palette closes, selection + dive).
  - Breadcrumb ancestor click (ascend back up the dive stack).
  - DetailPanel with `pending` content rendered (amber pill visible, paragraph break preserved).
  - DetailPanel with `missing` content (no record on disk).
  - iPad portrait layout (sidebar slide-over, bottom-rail detail panel).
- **Perf budgets to lock:**
  - Selection → outline latency.
  - Dive lerp consistency at 60fps on iPad Pro M-class (DPR up to 2).
  - Bundle size ceiling (currently 1.13 MB / 311 KB gz; treat 1.5 MB gz as the regression line).
  - Content-fetch P95 latency at the middleware route (should be sub-50ms on local disk).
- **Accuracy queue:**
  - 51 `confidence: 'pending'` records on disk (P1.15). Reviewer workflow needed to walk these and promote to `'reviewed'`.
  - Several UBERON ids in `nodes.json` have NO content file (sidebar still lists them; DetailPanel now correctly renders "No description authored yet").

### To UX/A11y (P1.18 — Tier 2 audit)

- **Tap-target audit done at the CSS level only.** All chrome controls now use `--touch-target: 44px` either as `min-height` (text controls) or `width/height` (icon buttons). Breadcrumb links use an invisible `::before` overlay on `pointer: coarse` devices to keep dense visuals without sacrificing hit area. **Audit on real iPad hardware** to confirm; CSS-only spot-check is the floor, not the ceiling.
- **Selection live-region** is wired (DetailPanel `aria-live="polite"`) and now fires on all three selection paths (canvas, sidebar, search). Confirm in NVDA / VoiceOver that the announcement is useful (the prefix is `t('a11y.live_region.selected')` + preferred label).
- **FrameIntentBridge** is invisible plumbing; no a11y surface. The visible result is camera animation, which is gated by `prefers-reduced-motion` only via the existing CSS rule — not by Three.js's animation loop. Phase 2 may want to short-circuit the lerp duration to ~0ms when `matchMedia('(prefers-reduced-motion: reduce)').matches`; the engine's `DIVE_ANIMATION_DURATION_MS` is exported from `diveCamera.ts` for that swap.
- **Long-press on iPad** is currently silent — no visible hint that a press is being detected. Adding a subtle pulse on the touched mesh during the 500ms press window is the right UX, deferred from this dispatch (would require either a CSS pseudo-element on the canvas overlay or a new R3F outline variant). Track as a P1.18 enhancement.

### To Content (Content agent, ongoing)

- **DetailPanel now renders content files exactly as written**, including the `pending` badge. Records with `confidence: 'pending'` show the amber pill above the summary. The 51 records on disk render fine; some UBERON ids in the ontology have NO record (sidebar lists them; panel shows "No description authored yet").

### To P1.14 (UI ↔ engine integration) — COMPLETED in this invocation

- **Wire Sidebar onSelect → camera reframe.** Sidebar already calls `selectionStore.select(id)`. P1.14 should subscribe to `selected` changes in the scene and call the camera-reframe path (and `diveStore.dive(id)` on double-click or long-press).
- **Wire DetailPanel `useStructureContent` to actually fetch content files.** Stub lives in `app/web/src/ui/useStructureContent.ts`. Two paths: (a) add a Vite middleware route `/ontology/content/<id>.json` mirroring `/registry.json`; or (b) `import.meta.glob('../../../../data/canonical/ontology/content/*.json', { eager: false })` for a build-time map. Either works; the hook signature stays unchanged.
- **Wire Search Cmd/Ctrl+K listener at app root.** Current implementation registers a window-level keydown inside the `<Search>` component. Move to a single document-level listener in P1.14 (so it survives Search not being mounted) — or keep it here if you prefer.
- **iPad touch + long-press for dive.** Sidebar / Breadcrumbs / Search are all click-based and work with tap. P1.14 needs to (a) handle long-press on the 3D canvas to call `diveStore.dive(id)` (versus tap-to-select), (b) ensure the slide-over sidebar dismisses on backdrop tap (already wired via the close button; add a swipe-to-dismiss in P1.14), (c) ensure peel controls accept tap without conflicting with orbit gesture (peel overlay is `pointer-events: auto` over the canvas; the canvas's `pointer-events: none` propagation needs to be verified in P1.14's real-device test).
- **Breadcrumb ascend wiring.** Currently calls `select(id)`. P1.14 should also pop `diveStore.ascendStack` to the matching depth when the user clicks an ancestor, and trigger the camera ascend animation.
- **Search "click in search icon" on iPad.** Search button in header (`shell__search-trigger`) opens the palette — works on tap. Make sure the kbd hint doesn't render on tablet (already hidden via `@media (max-width: 1024px)`).

### To UX/Accessibility (P1.18 — Tier 2 audit)

- **Audit first:**
  - Tree role/aria-expanded/aria-selected correctness on Sidebar (`tree`, `treeitem`, `group` patterns).
  - Focus order in AttributionSurface (focus trap should keep tab inside, return focus to invoker on close).
  - Live-region announcement on DetailPanel — currently `aria-live="polite"` with the preferred label; confirm it reads usefully in NVDA / VoiceOver.
  - Color contrast for `--text-muted` (#7a7068) on `--bg-rail` (#221d1a) — secondary text contrast may be marginal; check formally.
  - Touch target sizes in `--touch-target: 44px`; verify on iPad Safari that hit boxes match.
  - `prefers-reduced-motion` — disables transitions; verify the slide-over still functions (CSS `transform: translateX(-100%) → 0` collapses to an instant snap, which is intentional).

### To Content (P1.15)

- **DetailPanel renders any record file you write.** Current placeholder text reads "Content authoring in progress (Phase 1 step P1.15)." once you ship a record with `confidence: "pending"` it'll render `summary` + `long_form` directly. The panel does not yet gate on `confidence === "reviewed"` — Phase 1 dispatch instruction is to show whatever the file says. P1.14 may add the build-time gate.

## Invocation history

### 2026-05-11 — second invocation, P1.14 (UI ↔ 3D Engine integration + iPad touch)

Cross-domain dispatch — also acting as 3D Engine agent (fourth invocation; see `3d-engine.state.md` for the engine-side notes). Five integration workstreams completed end-to-end.

**Files updated**:
  - `app/web/vite.config.ts` — added `GET /content/<file>.json` middleware route serving from `data/canonical/ontology/content/`. Path-traversal guarded; `.json` extension required; same Cache-Control as `/registry.json`. `contentRoot` const added at top.
  - `app/web/src/state/selectionStore.ts` — extended `select(id, { mode, intent })` signature with `intent: 'none' | 'frame'`. New `lastIntent` field on the store + `selectLastIntent` / `selectLastClickAt` selectors. Dev-window global `__selectionStore` added (parity with peel / dive stores).
  - `app/web/src/ui/AppShell.tsx` — moved global Cmd/Ctrl+K + "/" listener here from `<Search>` so it survives Search unmounting.
  - `app/web/src/ui/Sidebar.tsx` — click + Enter / Space now pass `{ intent: 'frame' }`. New `useEffect` scrolls the selected row into view (one-tick deferred after the auto-expansion effect).
  - `app/web/src/ui/Search.tsx` — removed duplicate global keydown listener (now lives in AppShell). `onPick` passes `{ intent: 'frame' }`.
  - `app/web/src/ui/Breadcrumbs.tsx` — segment click passes `{ intent: 'frame' }` (was bare `select(id)`).
  - `app/web/src/ui/DetailPanel.tsx` — rewrote the content section. Renders `loading / missing / error / present` states distinctly. `ContentSection` sub-component handles the switch; `ConfidenceBadge` shows the amber `pending anatomist review` pill (or `flagged`); `LongForm` paragraph-splits `\n\n`; `CitationLine` renders ref + optional URL.
  - `app/web/src/ui/useStructureContent.ts` — rewritten with real fetch. Module-scoped cache + in-flight dedup, 5-state status machine, defensive `structure_id` cross-check. URL builder `contentUrlForId` handles `UBERON:` / `FMA:` / `BODY:` namespaces. Test seam `_resetContentCache` exported.
  - `app/web/src/ui/i18n.ts` — added keys for the new DetailPanel states (`detail.content.missing`, `detail.content.error`, `detail.content.section_title`, `detail.citations.section_title`, `detail.confidence.pending`, `detail.confidence.flagged`).
  - `app/web/src/index.css` — new rules for `.detail-panel__longform-paragraph`, `.detail-panel__citations`, `.detail-panel__citation`, `.detail-panel__citation-link`, `.detail-panel__hint--error`. `@media (pointer: coarse)` adds invisible breadcrumb-link hit-area overlay.

**3D Engine scope (see `3d-engine.state.md` for full notes)**:
  - `app/web/src/scene/SkeletalScene.tsx` — added `FrameIntentBridge` component that translates `lastIntent === 'frame'` into `diveStore.dive()`. Pointer handlers extended with `onPointerUp` + `onPointerCancel`. Long-press 500ms timer wired (touch-only via `pointerType === 'touch'`); cancels on motion > 8px via global `pointermove` listener. Canvas-clicks now pass `{ intent: 'none' }` explicitly.
  - `app/web/src/scene/CameraRig.tsx` — `OrbitControls` `enableZoom / enableRotate / enablePan` made explicit.

**Verification**:
  - `npm run verify` → all green (typecheck + 11/11 schema validation + production build). Bundle 1,135.68 kB raw / 311.52 kB gzipped JS — +1 kB vs P1.13 baseline (FrameIntentBridge + extended pointer handlers + content fetch).
  - Dev-server smoke tests (server already up on :5173 from prior dispatch; 7 HTTP requests):
    - `GET /` → 200
    - `GET /registry.json` → 200 (105,707 bytes)
    - `GET /meshes/uberon_0000981/lod0.glb` → 200 (115,808 bytes)
    - `GET /content/uberon_0000981.json` → 200 (2,499 bytes — femur record)
    - `GET /content/uberon_0000209.json` → 200 (1,882 bytes)
    - `GET /content/uberon_99999999.json` → 404 (missing-handling)
    - `GET /content/..%2F..%2Fetc%2Fpasswd` → 404 (traversal guard works)
  - Static call-graph reasoning verified for the five required flows (sidebar→detail→outline, Cmd-K→search→dive, canvas-click no-dive, canvas-double-click dive, breadcrumb ascend).

**Visual verification note**: as in prior invocations, no headless-browser harness available. Canvas-side dive animation, sibling dimming, long-press dive, and DetailPanel pending-pill visual all require manual `npm run dev` + interaction test on an actual iPad.

### 2026-05-11 — first invocation, P1.13 (UI shell)

- New files in `app/web/src/ui/`:
  - `AppShell.tsx` — composes sidebar + breadcrumbs + canvas + detail + footer + search + attribution.
  - `Sidebar.tsx` — anatomy tree, roving-tabindex keyboard navigation, slide-over on iPad.
  - `Breadcrumbs.tsx` — clickable path from selectionStore + diveStore.ascendStack.
  - `Search.tsx` — Cmd/Ctrl+K fuzzy palette with arrow/Enter navigation, focus trap.
  - `DetailPanel.tsx` — label + Latin + synonyms + identifiers + content (placeholder) + provenance.
  - `PeelControls.tsx` — segmented control over 4 Phase 1 presets, register-aware labels.
  - `NomenclatureToggle.tsx` — plain ↔ clinical register switch.
  - `AttributionSurface.tsx` — "About this atlas" modal listing BodyParts3D + UBERON + TA2 per ADR 0006.
  - `i18n.ts` — minimal English UI-copy table behind `t(key)`.
  - `nomenclature.ts` — `labelForPreset(preset, register)` mapping.
  - `ontology.ts` — node-by-id index, children/parent lookups, ancestor trail, preferred-label resolution, sidebar-tree builder, fuzzy `search()`.
  - `useStructureContent.ts` — placeholder hook (returns `null`) for content fetch in P1.14.
- New state file: `app/web/src/state/uiPreferencesStore.ts` (UI scope: register, sidebar open, search open, attribution open). Does not modify the existing selection / peel / dive stores.
- Modified files: `app/web/src/App.tsx` (now wraps `<SkeletalScene>` in `<AppShell>`), `app/web/src/index.css` (full layout + chrome styling).
- Removed: `app/web/src/ui/StructurePanel.tsx` (replaced by `DetailPanel.tsx`).
- Verification: `npm run verify` green (typecheck + 11/11 schema validation + production build). Dev-server smoke test confirmed HTTP 200 on `/`, `/registry.json`, and `/meshes/uberon_0000209/lod0.glb`. Bundle size 1.13 MB / 310 KB gzipped (Three.js dominant; under the 1.5 MB target; Phase 2 code-split tracked in spec risks).
