# Agent state: ux-accessibility

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 — P1.18 (Tier 2 audit of the Phase 1 vertical slice)

---

## Open items

1. **(NEW, P1.18)** **UA-009 — Long-press visual feedback is missing.** A touch user holding a finger on a bone for the 500 ms long-press budget has no visual signal that a dive is being detected. Not a strict WCAG AA failure, but a meaningful UX gap that would surface in any real iPad-user demo. Recommend a radial-progress ring or chrome-tint flash, ~40 LoC + ~30 lines CSS; implementation sketched in `docs/references/audits/2026-05-11-ux-a11y-audit.md`. Deferred this dispatch because the *form* of the feedback (ring vs flash vs hold-bar) is a design judgement and the fix isn't purely localised — it crosses SkeletalScene's pointer handler + a portal-positioned overlay. **Orchestrator decision needed before Phase 1 close.**
2. **(NEW, P1.18)** **UA-021 — iPad slide-over sidebar does not auto-focus the tree on open.** A user holding Tab afterwards reaches the tree, so DOM order keeps AA conformance intact. Improvement: on `sidebarOpen` transitioning to `true`, focus the first row via the existing `setFocusedId` mechanism. Trivial change (~12 LoC) but requires AppShell↔Sidebar focus coordination. Deferred to a UI follow-up.
3. **(NEW, P1.18)** **UA-022 — Modal anchor (`<a>`) tap targets in Attribution + DetailPanel citations are thin.** `<a>` elements have no explicit padding; on iPad users may tap-miss long URLs. Wrap with `padding: 0.5rem; display: inline-block;` if iPad tap-miss reports surface. Not strict AA failure given surrounding li vertical space.
4. **(NEW, P1.18)** **UA-013 — Visual polish: Sidebar / Attribution close glyphs are literal "x" rather than × or an SVG icon.** SR reads correctly via `aria-label`; pure aesthetic.
5. **(NEW, P1.18)** **Phase 2 re-audit when new JS-driven motion lands.** Peel transitions, focus highlights, or any other useFrame-driven animation must be re-checked against `prefers-reduced-motion`. The CSS global rule does not cover JS animation; the CameraRig fix in P1.18 is the pattern (snap rather than lerp).

## Decisions log

### 2026-05-11 — P1.18 (Tier 2 UX/A11y audit of the Phase 1 vertical slice)

- **Measured WCAG contrast ratios for every text-on-bg pair in the design tokens.** Used the canonical sRGB→linear formula. The full table appears in `docs/references/audits/2026-05-11-ux-a11y-audit.md`. Pre-fix headline finding: `--text-muted: #7a7068` failed AA 4.5:1 against every dark background (3.17–3.79). All other text tokens passed comfortably (text-primary 11.7–14.0; text-secondary 6.4–7.7; text-accent 11.7–14.0; accent-cyan 5.5–6.6; accent-warn 7.1–8.5). Focus ring `accent-cyan` clears 1.4.11's 3:1 against every adjacent background. Active-state inverse (peel/nomenclature active) passes via `bg-canvas` text on `text-accent` bg = 13.46:1.

- **Bumped `--text-muted` from `#7a7068` to `#a49a8c`** ([`app/web/src/index.css:18-27`](../../../app/web/src/index.css#L18)). Verified: 5.53:1 worst case (against `bg-rail-hover`), 6.60:1 best case (against `bg-shell`). Token used in 14 component selectors; all now pass AA. Documented inline rationale + audit cross-reference in the CSS so the next reader sees why the token moved.

- **Reduced-motion is the big silent failure pre-fix.** Hard rule #4: reduced-motion disables deep-zoom + selection-camera animations. The global CSS rule at `index.css:984-989` zeroes CSS `animation-duration` + `transition-duration` (handles the 200 ms sidebar slide-over and component transitions) but does NOT affect the JS-driven dive camera lerp in `CameraRig.tsx` (useFrame + DIVE_ANIMATION_DURATION_MS=600). The lerp ran unconditionally over 600 ms.

  **Fix:** added `usePrefersReducedMotion()` hook inline in CameraRig.tsx (subscribes to `window.matchMedia('(prefers-reduced-motion: reduce)')` with `addEventListener('change', …)` so OS toggles propagate mid-session); read in `CameraRig`; branch in the dive `useEffect` — when reduced-motion is preferred, clear `animRef`, snap `camera.position` + `controls.target` to the target pose, re-enable controls, return early. Reduced-motion dependency added to the effect's dep array. Long-press 500 ms is a *wait*, not motion — out of scope for reduced-motion.

- **Scene-host had no `:focus-visible` outline.** `SkeletalScene`'s host div is `tabIndex=0` so keyboard users can grab focus to trigger the Enter-dive handler, but without a focus ring the user can't see when focus has landed there. Added `.scene-host:focus-visible { outline: 2px solid var(--accent-cyan); outline-offset: -2px; }` — inset because the canvas fills 100% and an outline outside the box would be clipped by adjacent panels.

- **Search modal dialog had no stable accessible name.** Used `aria-label={t('search.placeholder')}` which resolves to "Search structures..." — placeholder text, not a name. Switched to `aria-labelledby="search-dialog-title"` against a visually-hidden `<h2>`; new i18n key `search.dialog.title` = "Search anatomical structures". Added `.visually-hidden` utility class to `index.css` so future SR-only headings have a canonical pattern. Attribution dialog already used `aria-labelledby="attribution-title"` correctly — no change.

- **Sidebar disclosure caret hit area was ~16 × ~21 px.** The row's onClick checks `target.dataset.role === 'disclosure'` to decide expand-vs-select, so only the disclosure span itself receives expansion taps. Pre-fix this fell below AA's 24 × 24 target-size minimum on iPad. Fixed: bumped to `flex: 0 0 1.4rem` fine-pointer and `flex: 0 0 var(--touch-target)` (44 px) on coarse-pointer, with an `::before { inset: -2px }` overlay for hit-area forgiveness. Layout shift in the tree is negligible (~6 px wider disclosure column).

- **Audit deliverable:** `docs/references/audits/2026-05-11-ux-a11y-audit.md` — 21 findings; 4 fixed this dispatch; 5 deferred; 12 already-passing (covered for completeness). Contains the full contrast table (pre + post fix), the keyboard-flow walkthrough (15 steps), the reduced-motion analysis, the touch-target table (every interactive element on coarse pointer), and the long-press-feedback recommendation with sketch CSS.

- **Verification after edits.** `cd app/web && npm run verify`: typecheck ✓, validate:schemas 11/11 ✓, vite build ✓ (646 modules, 311.71 KB gz JS — up from 311.52 KB; CSS 16.34 KB from 15.82 KB; within 320 KB perf budget). `npm run perf:check`: 3/3 budgets pass (303.45 KB gz JS, 79/79 mesh entries, 13.71 MB LOD bytes). `npm run capture:baselines`: 3/3 viewports re-captured; visual diff confirms muted-text legibility improvement (subtitle, "No selection" breadcrumb, hint paragraph, footer) across desktop + iPad portrait/landscape. Outline pass / dive animation continue to work (animation runs by default when reduced-motion is NOT preferred; tested by toggling browser devtools "Emulate CSS reduced-motion" mid-session).

- **Hard rules check.** Final state per the agent's own non-negotiables:
  1. WCAG 2.2 AA — **MET**.
  2. Keyboard-only completes every flow — **MET**.
  3. Color never sole information channel — **MET** (sidebar row uses bg-tint + left-border + focus outline + `aria-selected`; peel/nomenclature use inverse fg/bg + `aria-pressed`; pending content uses pill background + visible text label).
  4. Reduced-motion disables deep-zoom — **MET post-fix**.
  5. SR output uses canonical names — **MET** (`preferredLabel` resolves TA2 English).

- **Confidence statement: WCAG 2.2 AA is met with one caveat — UA-009 long-press feedback needs a design decision before claiming "shippable to actual users on iPad."** Every other criterion either passed pre-fix or has been fixed this dispatch.

## Handoffs

### From P1.18 — to Orchestrator (decision needed)

- **UA-009 long-press feedback.** Need a decision on the visual treatment (radial-progress ring, chrome-tint flash, or hold-bar) before the UI agent implements. Recommendation in the audit report defaults to a CSS-only radial-progress ring at the pointer position, scaled 0→1 over 500 ms via `transition: transform 500ms linear`, with a reduced-motion opacity-step fallback. ~40 LoC + ~30 lines CSS. Once the form is decided, this is a UI-agent dispatch.

### From P1.18 — to UI agent (follow-ups)

- **UA-021 sidebar focus-on-open** (iPad slide-over should focus the first tree row on open).
- **UA-022 modal anchor tap targets** (Attribution source links + DetailPanel citation links wrap with `padding: 0.5rem; display: inline-block;`).
- **UA-013 close-glyph polish** (literal "x" → × or SVG; aria-labels already correct).

### From P1.18 — to QA / DevOps (CI hardening)

- **No automated contrast check yet.** The audit was static + manual. A future QA dispatch could add `pa11y` or `axe-core` to the CI workflow as a non-blocking advisory step, or a Node-side ratio validator over the design tokens (`style-tokens.json`) so future token edits get caught at PR time. Filed as a Phase 2 nice-to-have; the current ratios are documented in the audit report.
- **Visual regression baselines were re-captured.** The PNG diff is small but real (muted-text gets lighter); CI's baseline-comparison step (if/when introduced) will need to accept the new baselines.

## Invocation history

- **2026-05-11 — P1.18** (Tier 2 UX/A11y audit of the Phase 1 vertical slice). 21 findings produced; 4 blockers/majors fixed this dispatch: UA-001 muted-text contrast (bumped `--text-muted` to #a49a8c); UA-005 reduced-motion dive (added `usePrefersReducedMotion` + snap-branch in CameraRig); UA-007 scene-host focus ring (inset cyan `:focus-visible`); UA-006 Search dialog labelling (switched `aria-label` to `aria-labelledby` against visually-hidden heading); UA-008 sidebar disclosure caret hit area (bumped to 44×44 on coarse pointer). 5 items deferred including UA-009 long-press feedback (needs orchestrator design decision). `npm run verify` clean post-edits; `npm run perf:check` 3/3 pass; 3 visual baselines re-captured. Audit report at `docs/references/audits/2026-05-11-ux-a11y-audit.md`. WCAG 2.2 AA is met with one caveat (UA-009).
