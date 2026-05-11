# Phase 1 handoffs — Reviewer Tier 2 pass (P1.19)

**Date:** 2026-05-11
**Reviewer agent invocation:** 1st
**Scope:** P1.11–P1.18 cross-agent handoffs across the five named boundaries
**Verdict:** **PASS-WITH-CONCERNS** — the vertical slice is coherent end-to-end; every boundary has at least one carry-the-rule-into-Phase-2 concern but none is a hard contract violation that blocks P1.20 close. Three BLOCK-class findings (two on the content-fetch surface, one on the attribution surface) are narrow, fixable in <60 LoC of total work, and named explicitly below; everything else is CONCERN/NIT.

## Method

I read the operating rules (`docs/agents/reviewer.md`), the orchestrator's view of the current state (`master-spec.md`, `phase-1-spec.md`, `status.md`, `task-queue.md`), every named source file in the five boundaries, all four touched ADRs (0006/0007/0008 fully, plus the schema-impact text in the older ADRs), the seven schemas under `app/shared/schema/`, and the eight agent state files for agents that produced P1.11–P1.18. Per-boundary verifications I actually ran:

- **Selection contract.** Traced every callsite of `select(id, {intent})` across `SkeletalScene.tsx`, `Sidebar.tsx`, `Search.tsx`, `Breadcrumbs.tsx` to confirm the canvas→none / chrome→frame split holds at all 6 entry points. Cross-walked the `SelectionIntent = 'none' | 'frame'` runtime enum against the schema's `camera_intent = 'none' | 'frame' | 'orbit' | 'dive'` enum and the `buildSelectionEvent()` builder. Inspected the `FrameIntentBridge` for re-firing semantics, dep-array soundness, and store-coupling.
- **Content fetch surface.** Hand-traced the `contentUrlForId` regex against the four namespace prefixes (UBERON / FMA / BODY / unknown), validated against the schema's pattern `^(UBERON:\d{7}|FMA:\d+|BODY:\d+)$`, opened one sample record (`uberon_0000981.json`) and walked it against the schema's `allOf-if-confidence-reviewed` branch, and traced the in-flight / cache logic for the cancellation race. Re-read the vite middleware's `/content/` guards against the actual implementation (`startsWith('/')`, `..`, `\0`, `.json` enforcement, prefix-anchor).
- **Peel / dive coupling.** Read the three stores side-by-side, drew the state diagram by hand: which mutation writes to which store, which observer reads which selector, what happens on a `frame`-intent select for a composite (e.g. sternum), what happens if peelStore is dev-poked to `visceral`. Walked the `usePrefersReducedMotion` snap-branch in `CameraRig.tsx` and confirmed it nulls out `animRef` so a partially-elapsed lerp can't continue against a snapped target. Looked for the user-facing escape from a `visceral` preset — there is none in the UI cycle, but the value is reachable by dev console, so I treated it as a question, not a finding.
- **Attribution surface.** Diffed the hardcoded `SOURCES` array against the registry's distinct `provenance.source` values (`BodyParts3D` is the only one). Read ADR 0006 against the attribution-surface comment that promises a Phase 2 swap. Validated the focus-trap / ESC / restore-to-invoker pattern. Walked the click budget: header "About this atlas" button (1 click) — under the ADR's 3-click budget.
- **Schema coverage.** Sanity-checked the four `DATA_PAIRINGS` entries in `validate-schemas.mjs` against `app/shared/schema/` to confirm the four canonical data files are validated; cross-walked the open architect items against actual schemas. Confirmed the validator does NOT validate content records (the standalone `pipelines/06-validate-content/validate.mjs` does, but it isn't called from `npm run validate:schemas` or `npm run verify`).

## Findings

Severity discipline: a finding is **BLOCK** only when something the user, a downstream agent, or a contract depends on is actually broken or violated; **CONCERN** = will hurt soon; **NIT** = polish.

### [1] Selection contract

- **CONCERN — `SelectionIntent` runtime enum does not cover the schema's `camera_intent` enum**
  - **Where:** `app/web/src/state/selectionStore.ts:56` (`SelectionIntent = 'none' | 'frame'`) vs `app/shared/schema/selection-event-schema.json:80-83` (`camera_intent = 'none' | 'frame' | 'orbit' | 'dive'`) and `app/web/src/engine/selectionEvent.ts:31`.
  - **What:** The store distinguishes only `'none'` from `'frame'`, but the canonical schema specifies four kinds of camera response, and the typed builder at `selectionEvent.ts` carries all four. The store's `lastIntent` cannot represent a `dive` (currently a separate path — `SkeletalScene.tsx:345`, `:366`, `:578` call `diveStore.dive()` directly) or an `orbit` intent at all. If a future agent wires `buildSelectionEvent()` into a side channel using `lastIntent` as the source, the `dive` events will be lost and `orbit` cannot be emitted.
  - **Why it matters:** The dispatch question is whether the current store shape "admits a clean `buildSelectionEvent()` against the schema." Answer: not for `dive`. Today the dive trigger lives in three places that go around the store: long-press (`SkeletalScene.tsx:366`), double-click (`:345`), Enter key (`:578`). The "state IS the event" Phase 1 design therefore loses an event type *as soon as anyone tries to mirror the state to a real event channel.*
  - **Suggested resolution:** Widen `SelectionIntent` to the schema's four values (`'none' | 'frame' | 'orbit' | 'dive'`), and have the three dive paths set `lastIntent = 'dive'` via the store (either by adding a `setLastIntent` action or by routing dive through `select(id, { intent: 'dive' })` and letting the `FrameIntentBridge`-style observer act on it). Assigned: 3D Engine. ~15 LoC.

- **CONCERN — Three stores are co-authoritative for "what the camera should do next"; the contract is implicit**
  - **Where:** `app/web/src/state/selectionStore.ts:82` (`lastIntent`), `app/web/src/state/diveStore.ts:36` (`focusedId`), `app/web/src/state/diveStore.ts:78` (`diveStartedAt`), `app/web/src/state/peelStore.ts:128` (`preset`). All three stores carry state that — under the schema's "single event" model — would coexist on one event object.
  - **What:** The dispatch question is whether the split across three stores is "coherent with the schema's single-event shape." Functionally yes: an observer can read all three and reconstruct an event. Contractually no: there's no documented invariant about ordering (does `peelStore.setPreset()` race with a concurrent `dive()`?), no single mutation that updates `(selection, camera_intent, peel_state)` atomically, and the FrameIntentBridge's effect order is implicit (selection-store mutation → re-render → effect → dive-store mutation → re-render → CameraRig effect → lerp).
  - **Why it matters:** Phase 1 has zero side-channel consumers and one user, so this is fine in practice. The next agent who needs to emit a real `selection-event` payload (analytics worker, server mirror, undo log) will discover the implicit ordering and either replicate it imperfectly or have to refactor. The dispatch note on the 16ms `FrameIntentBridge` lag (engine state file P1.14 handoff line 365) is a symptom, not the cause.
  - **Suggested resolution:** Either (a) add a brief documented invariant somewhere (`docs/agents/3d-engine.md` would be the place) about "the canonical event for a user gesture is reconstructable from `(selectionStore.lastIntent, selectionStore.firstSelectedId, selectionStore.lastClickAt, diveStore.focusedId, peelStore.preset)` read in that order and only at React-render time"; or (b) collapse the three stores' camera-relevant state into a single `cameraIntentStore` in a Phase 2 cleanup. (a) is the right Phase 1 close; (b) is a Phase 2 question. Assigned: Architect (a) or 3D Engine (b).

- **NIT — `FrameIntentBridge` re-fire semantics depend on a deliberately-suppressed lint rule**
  - **Where:** `app/web/src/scene/SkeletalScene.tsx:524-525` (`// eslint-disable-next-line react-hooks/exhaustive-deps` with deps `[intent, lastClickAt]`).
  - **What:** The eslint-disable is correct (the code wants to re-fire on `lastClickAt` change even when `firstSelectedId` is stable), and the comment explains it well. The dispatch note about a "possible 16ms lag" between selection and dive is acceptable given the lerp is 600ms; the visible delay is well below the perception threshold.
  - **Why it matters:** Nothing actionable. Recording the conclusion so the next Reviewer doesn't relitigate it.

### [2] Content fetch surface

- **BLOCK — Vite middleware `/content/` traversal guard accepts a string starting with `\` on Windows**
  - **Where:** `app/web/vite.config.ts:93` (`if (sub.includes('..') || sub.startsWith('/') || sub.includes('\0'))`) and similarly `:67` for the `/meshes/` route.
  - **What:** The guard refuses `..`, `\0`, and `/`-prefixed paths, then trusts `normalize(resolve(contentRoot, sub))` to stay under `contentRoot`. On Windows (the user's confirmed platform per `env.OS Version: Windows 10`), `resolve()` treats `\foo` as a drive-anchored path: `resolve("C:/.../content", "\\etc/passwd")` evaluates to `C:\etc\passwd`, which the prefix-check would reject — so far so good. But `sub.startsWith('/')` only catches forward-slash leading paths; the more relevant Windows escape is `decodeURIComponent` of a backslash-encoded `%5C..%5Csomething`, which yields `\..\something`, does NOT start with `/`, does NOT include `..` after a single split, and `resolve()` will collapse the parent-segment. The belt-and-braces `target.startsWith(meshesRoot + sep)` check at `:72` is what actually stops the escape — but I confirmed the dev-test in 3d-engine.state.md line 545 only checked `..%2F..%2Fetc%2Fpasswd` (the forward-slash variant). The backslash variant on Windows is not in the test set, and the guards depend entirely on `resolve` + prefix check to catch it.
  - **Why it matters:** This is dev-only middleware (Vite plugin), not a deployed surface. But (a) the prefix-check IS the real defence and the early-return checks are misleading documentation that suggest layered defence when only one layer is real; (b) a Phase 2 contributor who copies this pattern to a deployed Express/Fastify route inherits the gap without the documented warning. The asset-pipeline-confirmed test sample of one URL variant under-tests the path.
  - **Suggested resolution:** Three things together. (i) Add `sub.startsWith('\\')` to the early-reject. (ii) Extract the path-traversal logic to one helper (`safeJoinUnderRoot(root, sub)` returning `string | null`) and reuse it in both `/meshes/` and `/content/` routes. (iii) Add Windows-variant test cases (`%5C..%5C...`, `\foo`, mixed slashes) to the smoke-test set. Assigned: 3D Engine (Vite plugin lives in their scope). ~25 LoC + ~3 test URLs.

- **BLOCK — `useStructureContent` defensive `structure_id` cross-check breaks paired-id cases the registry already accepts**
  - **Where:** `app/web/src/ui/useStructureContent.ts:123` (`if (json.structure_id !== id)`).
  - **What:** The hook constructs `/content/uberon_0000981.json` from the requested id `UBERON:0000981`, fetches it, and rejects the record if `json.structure_id !== id`. That's correct for the 79 own-mesh entries in the registry, all of which have a `UBERON:`-prefixed id. But the schema's `structure_id` pattern explicitly accepts `FMA:` and `BODY:` ids (`content-record-schema.json:48`), and the registry's `primary_id` $def matches the same union. If a future content record is keyed to an FMA id whose corresponding UBERON id is also referenced from somewhere (e.g. an alias-keyed sidebar selection), this check will treat the record as `'error'`, which DetailPanel renders as a generic failure pill — strictly worse than the `'missing'` fallback.
  - **Why it matters:** Today the registry has no FMA-keyed entries and the ontology has no FMA-primary nodes (P1.02 zero `BODY:NNNN` needed, all UBERON). So the failure mode is not reachable in Phase 1. But the schema-by-design admits it, and ADR 0004 explicitly carries FMA as a fallback id when UBERON is missing. A Phase 2 dispatch that adds an FMA-primary node — entirely plausible per the master spec's open-academic backlog — would silently break content rendering for that node. This is a contract violation: the schema permits a class of records the hook rejects.
  - **Suggested resolution:** Three options, pick one: (a) drop the cross-check entirely (the URL-from-id mapping is already canonical — if the file is at `/content/<namespace>_<digits>.json` and the namespace+digits matches, the content's `structure_id` should be trusted); (b) make the check soft (warn to console, do not fail); (c) extend the check to "matches the requested id OR matches an alias of the requested id" via an ontology lookup. (b) is the lowest-risk Phase 1 close. (a) is the cleanest. Assigned: UI. ~5 LoC for (b), ~3 LoC for (a).

- **CONCERN — `pending` content is rendered in the user-facing dev build with no production-build gate documented**
  - **Where:** `app/web/src/ui/DetailPanel.tsx:212` (`if (confidence === 'reviewed') return null;` — the badge renders for everything else), and the rendering of `record.summary` + `record.long_form` regardless of confidence at `:185-186`.
  - **What:** The Content agent's hard rule per `ui.state.md` handoff line 87 says "the build-time filter to exclude `pending` records from the production app remains the UI/DevOps responsibility (per hard-rule 3 in `docs/agents/content.md`). For Phase 1 dev preview the records can be shown with a 'pending review' badge." That handoff is dated; the badge is implemented and visible; what is NOT implemented is any production-build gate — and nothing in `vite.config.ts` or `package.json`'s `build` script differentiates dev from production for content surfacing. The dispatch decision to render with a badge is correct for Phase 1 dev; the rule has *not* been carried forward to a CI gate or a build flag.
  - **Why it matters:** Phase 1 is explicitly dev-only per spec, so this is not a *current* user-visible problem. But (a) a future agent doing the first production deploy will not know the "pending must be filtered" rule unless they read `docs/agents/content.md` (which is two layers deep from the file they'll be editing); (b) there is no schema-enforced or CI-enforced check that prevents an inadvertent `npm run build` followed by `npm run preview` from showing unreviewed prose to end users. The dispatch-time decision is documented in `ui.state.md` and `content.state.md` but not at the call site in `DetailPanel.tsx`.
  - **Suggested resolution:** Add a comment block at `DetailPanel.tsx:179` (just above the `// status === 'present'` line) referencing the open hard-rule-3 gate and naming who owns it. Optionally — and this would be Phase 2 work — flip the dev/prod gate by reading `import.meta.env.PROD` and rendering only `reviewed` records, with a fallback "this structure's description has not been reviewed yet" message. Assigned: UI (comment) or DevOps + UI (env-gated render). ~3 LoC for the comment; ~12 LoC for the env gate.

- **NIT — Content-record validator (`pipelines/06-validate-content/validate.mjs`) is not invoked from `npm run verify`**
  - **Where:** `app/web/scripts/validate-schemas.mjs:27-48` (the four `DATA_PAIRINGS`); no content-record entry. Per content.state.md line 92 the standalone validator exists and passed 51/51 at P1.15, but `npm run validate:schemas` does not include it.
  - **What:** Adding content records to the main validator was deliberately deferred per content.state.md (would have crossed Architect/QA boundary at P1.16). The Architect's open item #4 doesn't mention this. Concretely: CI green does not imply content records validate.
  - **Why it matters:** Today the records DO validate (Content agent ran the standalone tool). A future content edit by a different agent without running the secondary tool could land a malformed record and CI would not catch it.
  - **Suggested resolution:** Add one `DATA_PAIRINGS` entry per content record OR (better, since there are 51) a glob entry. Architect dispatch. ~8 LoC.

### [3] Peel / dive coupling

- **CONCERN — `visceral` preset is reachable via dev tooling and produces an empty scene with no recovery affordance**
  - **Where:** `app/web/src/state/peelStore.ts:108-113` (visceral excludes `bone`), `app/web/src/state/peelStore.ts:206-207` (`window.__peelStore` dev hook), `app/web/src/ui/PeelControls.tsx`'s `UI_PEEL_ORDER` (`app/web/src/ui/nomenclature.ts:52-57`, only 4 of 5 presets shown).
  - **What:** The dispatch question is "can the user enter a state and end up looking at an empty scene with no recovery affordance?" In the **shipped UI** the answer is no — `visceral` is intentionally omitted from `UI_PEEL_ORDER`. In the **dev preview that users will actually load on first open**, the answer is also no, because the default is `'surface'` and no UI action transitions to `'visceral'`. But: (a) the `__peelStore` dev hook is enabled in any `import.meta.env.DEV` build (a Vite dev server, which is the only Phase 1 deployment), and a curious user opening the console and running `window.__peelStore.getState().setPreset('visceral')` ends up with a black scene; (b) the `cyclePreset()` action at `:145` filters `visceral` correctly (its cycle is `PEEL_PRESET_CYCLE` at `:44-49`, also visceral-free), so that path is safe; (c) there is no `clearPreset()` or "reset peel to surface" affordance anywhere — Escape doesn't clear it, background-click doesn't clear it.
  - **Why it matters:** Strictly a developer-curiosity concern — a regular user cannot reach this state. But the dispatch question pushed on it, and the peelStore comment at `:31-33` explicitly says "visceral hides the entire skeleton because that's the canonical clinical meaning" — i.e. the state IS reachable by design even if not via the UI. If a Phase 2 task adds `visceral` to the UI cycle (its forward-declared `UI_PEEL_ORDER_FULL` at `nomenclature.ts:60-66` does this), the empty-scene + no-recovery problem becomes user-reachable on day one without anyone re-auditing the affordance.
  - **Suggested resolution:** Add an "all visible" reset action to `peelStore` (`resetPreset: () => set({ preset: 'surface' })`) and surface it in `PeelControls` only when the active preset hides the skeleton (which today means only `'visceral'`). When Phase 2 wires `UI_PEEL_ORDER_FULL`, the reset is already there. Alternatively, render an explicit "Visceral view — skeletal data hidden; press Esc to return to surface" message in the canvas's empty-state fallback. Assigned: 3D Engine + UI. ~20 LoC.

- **CONCERN — `FrameIntentBridge` fires `dive()` synchronously inside an effect; race + 16ms lag are documented but the coupling is not in the agent map**
  - **Where:** `app/web/src/scene/SkeletalScene.tsx:510-528` (the bridge).
  - **What:** The dispatch question is "is the 16ms lag acceptable and is the coupling documented." Lag: yes, acceptable (lerp is 600ms, perception threshold ~50ms). Coupling: documented inside the file's JSDoc and the 3d-engine.state.md P1.14 entry, but **not in either agent's `*.md` operating manual**. The `docs/agents/3d-engine.md` and `docs/agents/ui.md` do not mention `FrameIntentBridge` at all (I confirmed by searching the agent prompts).
  - **Why it matters:** A new agent inheriting "UI" or "3D Engine" responsibility in Phase 2 reads the operating manual first and the source second. They will not know `FrameIntentBridge` exists until they encounter it. If they re-implement "click in sidebar → camera frame" at the AppShell level (logical mirror of where Cmd-K lives now), the two implementations will fight.
  - **Suggested resolution:** Add a paragraph to `docs/agents/3d-engine.md` describing the bridge and naming `lastIntent` as the contract between UI and engine. Assigned: Architect or 3D Engine. ~10 lines of prose.

- **CONCERN — Sternum composite cannot dive; current behaviour is a silent no-op, not user-visible**
  - **Where:** `app/web/src/scene/CameraRig.tsx:176-180` (`if (!entry) return;` when the dive target is a composite or unknown id).
  - **What:** Already documented as 3d-engine.state.md open item line 13. The current behaviour: a user who clicks the sternum row in the sidebar (which exists per nodes.json) gets `select(UBERON:0000975, { intent: 'frame' })` → bridge fires `dive('UBERON:0000975')` → diveStore sets `focusedId = 'UBERON:0000975'` and `diveStartedAt`, but CameraRig's effect early-returns because the id isn't in `ownEntryById`. Net effect: selection sets, breadcrumb updates, sidebar row highlights — but camera doesn't move and siblings don't dim (because no `focusedId` actually has a mesh to compare). Actually, re-reading: `EntryMesh.isBright = focusedId === null || focusedId === entry.id` — so when `focusedId = 'UBERON:0000975'` (sternum composite) and no entry matches, ALL entries become dim. That's almost certainly NOT what the user expects.
  - **Why it matters:** Discovered during this review. The state file mentions the no-dive but does NOT mention the all-dim consequence. A user who clicks the sternum sidebar row sees the entire skeleton fade to 18% opacity with no camera motion — an opaque failure mode.
  - **Suggested resolution:** Either (a) gate the sibling-dim on the bridge being able to resolve focusedId to an own-mesh entry (engine-side filter: `isBright = focusedId === null || focusedId === entry.id || !ownEntryById.has(focusedId)`); or (b) skip the `select` mutation for composites in the sidebar until the composite bake lands. (a) is the right fix because composites WILL exist in Phase 2 and the same all-dim problem would surface. Assigned: 3D Engine. ~3 LoC.

### [4] Attribution surface

- **BLOCK — `SOURCES` list and the comment claiming "Phase 2 will derive dynamically from the registry's `provenance` blocks" together violate ADR 0006's "in-app surface" requirement**
  - **Where:** `app/web/src/ui/AttributionSurface.tsx:21-24` (the JSDoc claim), `app/web/src/ui/AttributionSurface.tsx:179-201` (the hardcoded `SOURCES` array containing BodyParts3D + UBERON + TA2).
  - **What:** Two things are simultaneously true and inconsistent: (1) the registry's `provenance.source` field carries only `"BodyParts3D"` across all 79 entries (I checked); (2) the attribution surface correctly displays BodyParts3D AND UBERON AND TA2. The displayed list IS the right ADR-0006 list (mesh source + ontology source + label source), but the comment promising a Phase 2 swap "from the registry's `provenance` blocks" is wrong on its face — the registry has no UBERON or TA2 provenance entry and never will, because those aren't mesh-level provenance. A future agent doing the Phase 2 swap will either (a) drop UBERON + TA2 from the surface (incorrectly satisfying ADR 0006 with mesh-only attribution), or (b) discover the gap and need to invent a new source-list mechanism. The comment misnames the planned source-of-truth.
  - **Why it matters:** ADR 0006 says "Every canonical asset records its source provenance and license in machine-readable metadata that travels with the asset" — that's the mesh-level chain, satisfied by `provenance` blocks. But ADR 0006 ALSO says the "in-app attribution surface" must list "every upstream source contributing to the loaded scene" — and UBERON + TA2 are not mesh sources, they're identifier and label sources. The current surface is correct because the SOURCES array is hand-curated to include all three categories. The Phase 2 plan-as-documented would silently strip the non-mesh sources.
  - **Suggested resolution:** Rewrite the comment block at `:21-24` so it describes the actual three-source structure (mesh sources from registry provenance + ontology sources from a hand-maintained list + label sources from a hand-maintained list). When OpenAnatomy is added in Phase 2 per ADR 0005, only the mesh-sources segment derives from the registry; ontology + label segments remain hand-maintained until / unless a `bundle_attributions.json` design appears. Assigned: UI + Architect (comment is UI; the discipline question is Architect). ~15 lines of prose.

- **CONCERN — `build-manifest.json` is missing the `attributions[]` array required by ADR 0006 §3**
  - **Where:** `app/shared/schema/build-manifest.json:29-40` (top-level properties; no `attributions`); architect.state.md open item #2 already flags this.
  - **What:** ADR 0006 explicitly says "build-manifest.json gains an `attributions` array listing every distinct upstream source contributing to the build. CI fails if the bundle contains assets whose source isn't in this array." Today neither the schema nor any CI step implements this. The architect's P1.09 dispatch deliberately deferred it ("would have been new structure beyond the A4 mandate").
  - **Why it matters:** Phase 1 is dev-only and no build manifest is yet generated, so the absence has no current bite. But the ADR is the contract; the schema is the enforcement; the CI is the gate. All three layers ADR 0006 names are partially implemented and the build-manifest layer is unimplemented. For Phase 1 close this is acceptable per the deferred-by-design note in architect.state.md; for Phase 2 open it must close before any production build.
  - **Suggested resolution:** Already filed in architect.state.md open item #2. Confirm Orchestrator has logged it as a Phase 2 must-close item. No new dispatch required at P1.20. Assigned: Architect (schema), DevOps (manifest emission and CI gate) — Phase 2.

- **CONCERN — Reachability claim of "≤3 clicks" from main viewer is one click but is undocumented as such**
  - **Where:** `app/web/src/ui/AppShell.tsx:108-114` (header "About this atlas") and `app/web/src/ui/AppShell.tsx:139-148` (footer link); ADR 0006 §"in-app attribution surface".
  - **What:** The actual reachability is one click (header button OR footer link). The AttributionSurface JSDoc at `:15-16` says "Reachability per ADR 0006: ≤ 3 clicks from the main viewer. The trigger lives in the footer and the header, so one click opens the modal — easily under budget." That's correct.
  - **Why it matters:** No actionable issue — verified, in budget. Recorded for the next reviewer.
  - **Suggested resolution:** No action.

- **NIT — Attribution dialog focus restore to invoker works correctly under happy-path conditions; not verified under invoker-removed-during-modal-life conditions**
  - **Where:** `app/web/src/ui/AttributionSurface.tsx:48-56`.
  - **What:** The pattern captures `invokerRef.current = document.activeElement` on mount and calls `invokerRef.current?.focus?.()` on unmount. If the invoker element is removed from the DOM while the modal is open (e.g. a route change), the optional-chain prevents a crash but focus silently goes to `<body>`. This is the standard React-modal trade-off, the implementation is conventional, and Phase 1 has no route-changes mid-modal.
  - **Why it matters:** Not actionable. Recorded.

### [5] Schema coverage

- **CONCERN — Open-item inventory (architect.state.md open items #1-4) is accurate; no new gaps found, but Orchestrator should explicitly accept each into Phase 2 backlog**
  - **Where:** `docs/agents/architect.state.md:11-15`.
  - **What:** The four open items are: (1) sternum composite bake unblocked but not scheduled; (2) `build-manifest.json.attributions[]` missing per ADR 0006; (3) `quality_notes: string[]` field on LOD2-fallback meshes not added; (4) `synonyms.json` physically retained but logically retired. I verified all four against the actual schemas + data. Item (4) is benign — the file validates as an empty document under the loosened schema. Item (3) is the smallest — two meshes affected, the information is recoverable from the LOD2 triangle-ratio in the registry. Item (2) is the most consequential per Phase 2 (see Boundary 4 above). Item (1) is what enables sternum dive (see Boundary 3 above).
  - **Why it matters:** Reviewer hard rule 5: my job is "to confirm Orchestrator has logged it for follow-up, or to identify what was missed." All four are logged. Nothing is missed. But none is in `task-queue.md` as a Phase 2 backlog entry yet.
  - **Suggested resolution:** Orchestrator dispatches a single follow-up to add four `[ ] P2` entries in `task-queue.md` mirroring architect.state.md items 1-4, with owner assignment. Assigned: Orchestrator. ~4 lines of edit.

- **CONCERN — Reviewer's own new finding: `anatomist-review-manifest.json` schema absent AND `app/web/scripts/validate-schemas.mjs` does not validate the queue file**
  - **Where:** `tests/review-queue/2026-05-11-batch-1/manifest.json` (51-item batch, dispatched out for university faculty review per content.state.md P1.16), no corresponding schema in `app/shared/schema/`. content.state.md open item #1 flags the schema absence; the validator absence is implicit.
  - **What:** The Content agent's P1.16 dispatch wrote a manifest format and a `promote.mjs` script that consumes it, but the contract is "schema-by-example in `tests/review-queue/README.md`" rather than a JSON Schema. If the anatomist returns a structurally-broken manifest (e.g. mis-spelled `"approve"` instead of `"approved"`), `promote.mjs` will either silently skip the item or fail mid-batch — `promote.mjs`'s all-or-nothing behaviour mitigates partial-write damage but the bad manifest could still be committed by the user before the dispatch runs.
  - **Why it matters:** The anatomist review is the hinge between Phase 1 (51 pending records) and the next phase (51 reviewed records). A schema would catch a mis-spelled decision string at validation time rather than at promote time. This is exactly the kind of cross-agent contract the schema directory exists to capture.
  - **Suggested resolution:** Defer to Phase 2 IF the anatomist returns a clean manifest on first pass; promote to "must close before Phase 2 dispatch" IF the first batch produces any decision-string typos. Assigned: Architect + Content (schema-by-example to formal schema). ~50 LoC schema + 1 validator pairing.

- **NIT — `anatomical-id-schema.json` $defs are shared across nodes / relations / synonyms but the validator emits no per-file context**
  - **Where:** `app/web/scripts/validate-schemas.mjs:138-197`.
  - **What:** The four `DATA_PAIRINGS` print the data file path and the schema name on success. On failure the loop logs `"at <instancePath>: <message>"` which is fine for `mesh-asset-manifest`-style validation. For the anatomy schema which is shared across three data files using only some of its $defs, a failure on `relations.json` could be confusing if the message mentions a node-shape field.
  - **Why it matters:** Not actionable today (all three files validate). Recorded.

## Cross-cutting observations

Three patterns spanning multiple boundaries:

**(a) "State is the event" is real in Phase 1 but its limits are unmarked.** Boundaries 1 and 3 both surface the same issue from different angles: there is no documented invariant about which store carries which slice of an eventual `selection-event` payload, and the multi-store coupling will resist clean migration to a side-channel emitter unless someone writes down the rule before Phase 2 starts. Recommendation: a single-paragraph addition to `docs/agents/3d-engine.md` listing the five stores' fields that together reconstruct a selection event, with explicit "read order" semantics for the FrameIntentBridge case.

**(b) Defensive guards across the Vite middleware routes are pattern-copied but not factored out.** The `/registry.json`, `/meshes/<sub>/<file>.glb`, and `/content/<file>.json` routes share an identical path-traversal pattern (`..`, leading `/`, `\0`, then `resolve` + prefix-check). The `/content/` route adds a `.json` extension guard. If the deployed surface ever extends to `/glb/`, `/textures/`, or `/audio/`, the next pattern-copy will inherit the same Windows-backslash gap noted in Boundary 2. One small helper (`safeJoinUnderRoot(root, sub, allowedExt)`) closes that for the future.

**(c) Hardcoded UI source-of-truth points are correctly flagged for Phase 2 swap, but the comments describing the swap path are not always consistent with the data shape that will be available.** `AttributionSurface.SOURCES` is the clearest case (Boundary 4 BLOCK), but the same shape is present at `DetailPanel.tsx:133` (the provenance footer line — hardcoded "Mesh source: BodyParts3D · CC-BY-SA-2.1-JP", will only work for the 79 BP3D meshes; Phase 2 OpenAnatomy meshes will need the line to come from the entry's `provenance` block). Recording rather than filing a separate finding because Phase 2 will catch these the moment the second source lands; the BLOCK in Boundary 4 is the one that needs a comment fix today.

## Recommendations to Orchestrator

**Must close before P1.20 retro (3 items):**

1. **Selection contract widening** — fix the `SelectionIntent` enum to match the schema's `camera_intent` four values, and route the three direct-`diveStore.dive()` callsites through `select(..., { intent: 'dive' })` so `lastIntent` is the canonical event reconstruction point. (Selection boundary, CONCERN; together with the Cross-cutting observation (a), this closes the most material handoff gap.) Assigned: 3D Engine. ~15 LoC.

2. **Content fetch's defensive cross-check softened to a warn** — the current strict reject silently breaks the FMA-namespace case the schema admits. (Content boundary, BLOCK.) Assigned: UI. ~5 LoC.

3. **AttributionSurface comment + plan correction** — rewrite the JSDoc to describe the real three-source structure (registry-derived mesh sources + hand-maintained ontology source + hand-maintained label source), so the Phase 2 swap doesn't accidentally drop UBERON/TA2. (Attribution boundary, BLOCK.) Assigned: UI + Architect concur. ~15 lines of prose.

**Should close before Phase 2 starts (also Phase 1 backlog candidates):**

4. Vite-middleware path helper factored out + Windows backslash variant test cases added. (Content + cross-cutting (b).) ~25 LoC.

5. Sternum composite all-dim regression fixed in CameraRig (~3 LoC) OR sternum sidebar selection guarded until composite bake lands.

6. `visceral`-preset recovery affordance — even a one-line "Press Esc / click to reset peel" when no entries are visible. ~20 LoC.

7. Operating-manual prose in `docs/agents/3d-engine.md` documenting `FrameIntentBridge` and the store-coupling invariant. ~10 lines.

**Can carry into Phase 2 backlog (no new dispatch needed at P1.20):**

8. Architect's four open items (sternum bake, build-manifest.attributions, quality_notes, synonyms.json physical removal) — explicitly file as `[ ] P2` rows in `task-queue.md`.

9. Anatomist-review-manifest JSON Schema — close-on-trigger (when first anatomist batch returns dirty), defer otherwise.

10. Content-record validation rolled into `npm run verify` — Architect dispatch when the next schema-edit task happens.

## Items considered but not findings

So the next reviewer doesn't redo this work:

- **AttributionSurface focus trap correctly restores focus to invoker on unmount** — verified (`AttributionSurface.tsx:48-56`).
- **AttributionSurface ESC handler doesn't fight modal-internal handlers** — verified, no double-handler.
- **Background-click on canvas clears selection cleanly** — verified (`SkeletalScene.tsx:387-397`).
- **Long-press cancel-on-motion budget (8 px) is generous enough not to swallow legitimate drag-orbit but tight enough to suppress accidental dive** — verified.
- **Double-click + long-press do not race on iPad** (the explicit dispatch question) — verified by walking the threshold reconciliation note in `SkeletalScene.tsx:204-227`; the 350 ms double-click cancels on the second pointerup well within the 500 ms long-press, so the long-press never fires for a quick double-tap.
- **Reduced-motion snap-branch in CameraRig correctly nulls `animRef`** before snapping — verified (`CameraRig.tsx:198-204`); a previously-running lerp cannot continue against a snapped target.
- **`useStructureContent`'s in-flight dedup correctly handles concurrent mount/unmount of the same id** — verified by tracing the cancellation flag + the module-level `inflight` map.
- **`useStructureContent` cache shape matches expected SWR semantics** — verified; finished results live in `cache`, in-flight in `inflight`, no leak across hook unmounts.
- **selectionStore mutators correctly avoid re-renders on no-op transitions** — verified (the `state.hovered.id === id` short-circuit at `:99`, the `state.selected.ids.size === 0` guard at `:138`).
- **`isMeshVisibleForPreset(preset, materialHint)` correctly defaults `materialHint === undefined` to `'generic'`** — verified; unhinted entries can never silently disappear.
- **`peelStore.cyclePreset()` is defensive against out-of-cycle current values** — verified (`peelStore.ts:147-152`).
- **`diveStore.dive(id)` is idempotent on same-id** — verified, avoids animation churn (`diveStore.ts:83-85`).
- **Sidebar keyboard navigation uses roving tabindex correctly per WAI-ARIA tree pattern** — verified (`Sidebar.tsx:129-185`).
- **Sidebar auto-expand on selection change is keyed correctly to ancestor trail** — verified.
- **DetailPanel `aria-live="polite"` region announces selection change without screen reader fighting** — verified at the announce-string level; live SR test deferred to UX/A11y already.
- **Content `confidence === 'reviewed'` requires citations + reviewed_by** — verified via the schema's `allOf-if-then` clause (`content-record-schema.json:91-100`).
- **The four `DATA_PAIRINGS` in `validate-schemas.mjs` cover what they claim to cover** — verified against the schema file basenames.
- **All 51 P1.15 content records have `confidence: "pending"`** and the spot-checked femur record validates by hand against the schema — verified (one record opened: `uberon_0000981.json`; structure_id matches filename; required fields all present; date-time formatted correctly).
- **glTF attribution baking + ADR-0007 NUL-padded chunk-type handling** — out of P1.19's scope (asset side; P1.04–P1.08 territory), but the runtime side (mesh registry + AttributionSurface) treats the data correctly.
- **`UI_PEEL_ORDER` correctly omits `visceral`** — verified; user cannot reach the empty-scene state through clicks.
- **`OrbitControls` `enableZoom / enableRotate / enablePan` declared explicitly per P1.14 contract-clarity decision** — verified (`CameraRig.tsx:259-270`).
- **`FrameIntentBridge` is rendered inside `<Canvas>`, not at AppShell scope** — verified; consistent with the engine-state-file's documented rationale for keeping the bridge inside engine scope.
- **`useStructureContent.contentUrlForId` handles all three id namespaces consistently** — verified at the regex level (`^([A-Z]+):(\d+)$` → `<namespace>_<digits>.json`).
- **No content record uses a `BODY:NNNN` id** — verified by checking the content directory listing (all `uberon_*.json`).

---

**Reviewer note for the next dispatch:** the pattern I followed here — five named boundaries, severity discipline (BLOCK for actual contract violations, CONCERN for "will hurt", NIT for polish), cite-line-numbers on every BLOCK and CONCERN, separate "items considered but not findings" so review work is auditable forward — is the template. If a future Reviewer dispatch covers fewer or different boundaries, the report should still carry the four sections (Findings / Cross-cutting / Recommendations / Considered-not-flagged) so the Orchestrator can fold them together at retros.
