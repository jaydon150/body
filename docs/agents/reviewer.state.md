# Agent state: reviewer

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 — P1.19 (Tier 2 cross-agent handoff pass on P1.11–P1.18)

---

## Open items

1. **(NEW, P1.19)** **Selection contract widening to four `camera_intent` values** — the `SelectionIntent` runtime enum (`'none' | 'frame'`) is a strict subset of the canonical schema's `camera_intent` enum (`'none' | 'frame' | 'orbit' | 'dive'`). Three dive callsites in `app/web/src/scene/SkeletalScene.tsx` (lines 345, 366, 578) and one in keyboard handling route around `selectionStore.lastIntent` and call `diveStore.dive()` directly, so the "state IS the event" Phase 1 design loses an event type as soon as a side-channel emitter is wired. Routed to 3D Engine (~15 LoC). Tracked as P1.19-R1.
2. **(NEW, P1.19)** **`useStructureContent` defensive `structure_id !== id` check breaks the FMA-namespace case the schema admits** — schema accepts `FMA:` and `BODY:` ids; the cross-check at `app/web/src/ui/useStructureContent.ts:123` rejects records whose `structure_id` doesn't match the requested id verbatim, which silently breaks alias-keyed lookups. Phase 1 has no FMA-primary nodes so the failure is unreachable today; Phase 2 with FMA-primary or alias-based selection will hit it. Routed to UI (~3-5 LoC). Tracked as P1.19-R2.
3. **(NEW, P1.19)** **`AttributionSurface.SOURCES` comment is wrong about its Phase 2 source-of-truth** — the comment promises a swap "from the registry's `provenance` blocks", but the registry only carries `BodyParts3D` (no UBERON, no TA2). The hand-curated three-source list is correct ADR-0006 fulfillment; the planned swap path would silently drop ontology + label sources. Routed to UI + Architect (~15 lines of comment-prose). Tracked as P1.19-R3.
4. **(NEW, P1.19)** **Vite-middleware path-traversal pattern is copied across three routes without a Windows-backslash test case** — the `startsWith('/')` early-reject misses backslash-prefixed inputs on Windows; the real defence is `target.startsWith(meshesRoot + sep)`, which works but means the early-reject is misleading documentation. One helper + a Windows-variant smoke test closes it. Routed to 3D Engine. Tracked as P1.19-R4.
5. **(NEW, P1.19)** **Sternum composite all-dim regression** — when the sidebar selects sternum (`UBERON:0000975`, composite per ADR 0008, no own-mesh entry), CameraRig early-returns but `diveStore.focusedId` is set to the sternum id, which makes every own-mesh entry's `isBright === false`. Net effect: clicking sternum in the sidebar fades the entire skeleton to 18% opacity with no camera motion. Routed to 3D Engine (~3 LoC). Tracked as P1.19-R5.
6. **(NEW, P1.19)** **`visceral`-preset escape affordance missing** — reachable only via dev console today, but the planned Phase 2 `UI_PEEL_ORDER_FULL` cycle wires it into the UI without re-auditing the empty-scene + no-recovery problem. A `resetPreset()` action + conditional "press Esc to return to surface" message is the right Phase 1 prep. Routed to 3D Engine + UI (~20 LoC). Tracked as P1.19-R6.
7. **(NEW, P1.19)** **`FrameIntentBridge` not documented in `docs/agents/3d-engine.md`** — the bridge is the contract between UI's frame-intent declarations and the engine's dive trigger, but it's described only in the source file's JSDoc and the engine state log. New agents inheriting UI or 3D Engine in Phase 2 will not learn it from the operating manual. Routed to Architect or 3D Engine (~10 lines of prose).
8. **(NEW, P1.19)** **`pending` content render gate is decision-only, not code-only or CI-only** — DetailPanel renders pending content with an amber pill in dev (correct Phase 1 design); the production-build filter required by content.md hard-rule 3 is not implemented anywhere. Acceptable for Phase 1 (dev-only); becomes a release gate before Phase 2 production deploy. Routed to UI (comment, Phase 1) + DevOps (env-gated render, Phase 2).
9. **(NEW, P1.19)** **Content-record validator not invoked from `npm run verify`** — `pipelines/06-validate-content/validate.mjs` exists and passes 51/51, but the main `app/web/scripts/validate-schemas.mjs` does not include content records in its four `DATA_PAIRINGS`. Routed to Architect (~8 LoC).

## Decisions log

### 2026-05-11 — P1.19 (Tier 2 cross-agent handoff pass)

- **First-pass severity calibration.** This was the first Reviewer dispatch in the project. Pattern set for future invocations: report at `docs/orchestrator/reviews/<date>-<topic>.md`, five-named-boundary structure when the dispatch covers cross-cutting work, severity-tagged findings with file:line citations on BLOCK and CONCERN, a separate "items considered but not findings" section so review work is auditable forward, recommendations grouped by Phase-1-close / Phase-2-prep / can-carry.
- **PASS-WITH-CONCERNS verdict over FAIL or PASS.** Two BLOCK-class findings (P1.19-R2 useStructureContent cross-check; P1.19-R3 AttributionSurface comment) and one less-severe BLOCK (P1.19-R4 path-traversal pattern). None breaks the user-visible vertical slice; all are <30 LoC fixes. The Phase 1 spec acceptance criteria are met; the concerns are contract / forward-coupling issues. FAIL would be inappropriate (no acceptance criterion broken); PASS would be inappropriate (three contract-touching issues; "will hurt soon" is not "ship as-is").
- **Severity discipline tested against three temptations to inflate.** (a) The Vite path-traversal Windows-backslash gap — initially considered as CONCERN, escalated to BLOCK because the failure mode IS reachable on the user's confirmed Windows platform and the prefix-check that catches it depends on a single line. (b) The all-dim sternum regression — initially CONCERN, kept CONCERN because the worst case is one bad UI moment, not a contract violation. (c) The `pending` content production gate — initially BLOCK because of the "ships unreviewed prose" wording in content.md hard rule 3, downgraded to CONCERN because Phase 1 is explicitly dev-only and no production deploy is in scope.
- **Three recommendations elevated to "must close before P1.20 retro."** P1.19-R1 (selection-contract widening), P1.19-R2 (content cross-check softened), P1.19-R3 (attribution comment correction). All three are <20 LoC and close the three contract-touching findings without changing user-visible behaviour. Rationale: P1.20 retro should record Phase 1 as a closed slice with no outstanding contract violations, even small ones.
- **Did not duplicate flagged items.** Architect.state.md open items #1-4 (sternum composite bake, build-manifest.attributions, quality_notes, synonyms.json) were verified to be correctly logged and consequence-evaluated for Phase 1 close. Recommendation to Orchestrator is to mirror them into `task-queue.md` as `[ ] P2` rows. Long-press visual feedback (UA-009) from ux-accessibility.state.md was already flagged to Orchestrator pre-dispatch; not re-filed.
- **New finding the agents missed.** The all-dim sternum regression (P1.19-R5) is genuinely new — the 3d-engine.state.md open items mentioned the sternum composite cannot dive (line 13) but did NOT mention that the `EntryMesh.isBright` rule turns the entire skeleton dim because no entry matches `focusedId`. Surfaced by walking the dive code with focusedId-set-to-unknown-id semantics in mind.
- **Read-only enforcement verified.** Reviewer wrote only to: `docs/orchestrator/reviews/2026-05-11-phase-1-handoffs.md` (new) and this state file. No source, schema, content, or agent prompt was modified. Hard rule 1 ("Reviewer never modifies the work under review") held end-to-end.

## Handoffs

### From P1.19 — to Orchestrator (P1.20 retro inputs)

- **Verdict:** PASS-WITH-CONCERNS. The vertical slice is end-to-end coherent; no acceptance criterion is broken; three contract-touching findings need <60 LoC of total fixes before P1.20 retro to claim Phase 1 closed cleanly.
- **3 must-close-before-retro items:** R1 (selection-contract widening, 3D Engine), R2 (useStructureContent soft-fail, UI), R3 (AttributionSurface comment, UI + Architect).
- **6 carry-into-Phase-2 items:** R4 (path-helper factoring), R5 (sternum all-dim), R6 (visceral escape), R7 (FrameIntentBridge documentation), R8 (pending-content prod gate), R9 (content-record validator in npm run verify).
- **4 already-flagged items confirmed properly logged:** Architect open items #1-4. Recommendation to mirror as `[ ] P2` in task-queue.md.
- **Report:** `docs/orchestrator/reviews/2026-05-11-phase-1-handoffs.md`. Full method, finding-by-boundary, cross-cutting observations, and items-considered-but-not-flagged are documented there; this state file is the summary index.

### From P1.19 — to future Reviewer dispatches

- Template structure for future reports is the one used at `docs/orchestrator/reviews/2026-05-11-phase-1-handoffs.md`. Five sections (Verdict, Method, Findings by Boundary, Cross-cutting Observations, Recommendations, Items Considered) when the dispatch is cross-cutting; collapse to three (Verdict, Findings, Recommendations) when the dispatch is a single handoff.
- Severity discipline: BLOCK requires (a) an active contract violation, downstream-agent dependency, or user-reachable failure mode AND (b) a file:line citation. CONCERN can be forward-looking but must name what will break and when. NIT may omit line if structural.
- Items-considered-but-not-flagged section is mandatory and reduces re-review work next time. Aim for parity in length with the findings section.

## Invocation history

### 2026-05-11 — P1.19 (1st invocation, Tier 2 cross-agent handoff pass)

**Dispatch summary:** Tier-2 pass over the five cross-agent handoffs across P1.11–P1.18 — Selection contract, Content fetch surface, Peel / dive coupling, Attribution surface, Schema coverage.

**Deliverable:** `docs/orchestrator/reviews/2026-05-11-phase-1-handoffs.md`.

**Verdict:** PASS-WITH-CONCERNS.

**Finding counts by severity:**

| Boundary | BLOCK | CONCERN | NIT |
|----------|------:|--------:|----:|
| [1] Selection contract | 0 | 2 | 1 |
| [2] Content fetch surface | 2 | 1 | 1 |
| [3] Peel / dive coupling | 0 | 3 | 0 |
| [4] Attribution surface | 1 | 2 | 1 |
| [5] Schema coverage | 0 | 2 | 1 |
| **Totals** | **3** | **10** | **4** |

**Open items routed to Orchestrator:** 9 new items (R1–R9 above). 3 must-close-before-P1.20-retro; 6 carry-into-Phase-2.

**Files written:** `docs/orchestrator/reviews/2026-05-11-phase-1-handoffs.md` (new), `docs/agents/reviewer.state.md` (this file). Zero edits to source, schema, content, or agent prompt files.
