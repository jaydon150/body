# Phase 2 Spec v0.1

**Phase:** 2 — Widen (muscular + integumentary systems interactive; sternum composite landed; peel UX validation activated; content batch 2; light functional anatomy)
**Status:** Draft v0.1; awaiting user approval and answers to open questions
**Author:** Orchestrator
**Date:** 2026-05-11 (drafted same day as Phase 1 close)

## Inherited state (from Phase 1 close + ADRs 0001–0008)

**From [Phase 1 retro](retros/phase-1-retro.md):**

- **Skeletal vertical slice running.** 79 BP3D meshes + 125-node UBERON-primary sub-ontology + 237 canonical glbs (LOD0/1/2) at 13.71 MB total + full UI chrome + iPad touch + WCAG 2.2 AA + 295–311 KB gz bundle. Locally `npm run dev` is green; CI green.
- **8 ADRs accepted:** 0001 graph-not-tree, 0002 asset-source, 0003 agent-mechanism, 0004 ontology-primary-UBERON, 0005 asset-source-refinement, 0006 runtime-attribution, 0007 Blender-attribution-discipline, 0008 composite-asset-entries.
- **Seven cross-agent contracts with ajv enforcement** (11/11 validations pass). `anatomist-review-manifest.json` is the eighth, currently schema-by-example.
- **File-backed Task subagent pattern** (ADR 0003) production-validated across 14+ dispatches including 4 cross-domain.
- **CI gates:** typecheck + 11/11 schemas + Vite build + 3-budget perf check + Chromium baseline capture. Visual diff-gating deferred.
- **51 `pending` content records** queued behind a TBD university-faculty anatomist; promotion pipeline (`pipelines/07-anatomist-review/`) is dry-run-tested and refuses to run without a named reviewer.
- **iPad co-primary smoke-tested only;** on-device perf measurement deferred.
- **Production-deploy path not yet decided** for canonical meshes (Vite middleware is dev/preview only).

**Open Phase 2 entry backlog (mirrored from Phase 1 retro carry-forward in `task-queue.md`):**

| ID | Source | Item | Size |
|----|--------|------|------|
| R1 | Reviewer P1.19 | Widen `SelectionIntent` runtime enum to schema's full `'none' \| 'frame' \| 'orbit' \| 'dive'`; route the three direct `diveStore.dive()` callsites through `select(..., {intent:'dive'})` | ~15 LoC, 3D Engine |
| R2 | Reviewer P1.19 | Soften `useStructureContent` strict `structure_id !== id` cross-check (`useStructureContent.ts:123`) to warn-and-pass | ~5 LoC, UI |
| R3 | Reviewer P1.19 | Rewrite `AttributionSurface.tsx:21-24` Phase 2 swap comment to describe the actual three-source structure | ~15 lines prose, UI+Architect |
| R4 | Reviewer P1.19 | Factor Vite middleware path-traversal pattern + add Windows-backslash test | small refactor, 3D Engine |
| R5 | Reviewer P1.19 | Sternum all-dim regression: `EntryMesh.isBright` returns false for every entry when `focusedId` is a composite id | ~3 LoC, 3D Engine |
| R6 | Reviewer P1.19 | Visceral preset escape affordance | UI, scoped in Phase 2 |
| R7 | Reviewer P1.19 | `FrameIntentBridge` documentation in `docs/agents/3d-engine.md` | docs, 3D Engine |
| R8 | Reviewer P1.19 | Pending-content production-build gate (`import.meta.env.PROD` or env-var filter) | small, UI + DevOps |
| R9 | Reviewer P1.19 | Content-record validator into `npm run verify` | small, QA |
| A1 | Architect open | Sternum composite registry-bake (schema unblocked at P1.09) | small, Asset Pipeline |
| A2 | Architect open | `attributions[]` field on `build-manifest` per ADR 0006 | schema + DevOps emission |
| A3 | Architect open | `quality_notes: string[]` field on `mesh-asset-manifest` entries | schema, Architect |
| A4 | Architect open | `synonyms.json` physical removal (retired by ADR 0008) | small, Anatomy Domain |
| UA-009 | UX/A11y P1.18 | Long-press visual-feedback affordance (radial ring vs flash vs hold-bar) — **user design decision blocks UI implementation** | UI |
| Anat | P1.16 | Named university-faculty anatomist + first promotion of 51 `pending` records — **Phase 2 entry gate** | external |
| Comp | P1.03/P1.07 carry | Compliance agent activation: BP3D mirror-vs-canonical license discrepancy + CC-BY-SA-2.1-JP Japanese-legal-code review | Tier 2 Compliance |
| Deploy | P1 close | Production-deploy path for canonical meshes (CDN URL prefix vs build-time copy vs hashed manifest) | DevOps + ADR |
| Audit | P1.09 | 2 moderate-severity transitive-dep findings from ajv install | possible `npm audit` follow-up |

**From master-spec.md §2 / §6:**

- Stack locked: Vite + React + TypeScript + react-three-fiber, WebGL2 baseline with WebGPU upgrade where available.
- v1 systems: integumentary, skeletal, muscular. Organ-level floor. Male only.
- Distribution: open academic; private repo `jaydon150/body` during development.

## Goal — Phase 2 done means

A working **three-system vertical slice** (integumentary + skeletal + muscular, all interactive) running locally at `npm run dev`, on desktop browser and iPad-class hardware. A user can:

1. See the body with skin, muscle, and bone meshes loaded and **interactive in all three layers**.
2. Click any skin / muscle / bone structure → its name and a reviewed description appear in the side panel.
3. Use peel-mode presets to toggle `skin / muscle / bone` visibility and **see meaningful visual differentiation between presets** — the educational UX deferred at Phase 1 dispatch is now exercisable.
4. Switch system focus via a system switcher: skeletal / muscular / integumentary. Sidebar tree re-roots; selection follows.
5. For a flagship subset of muscles, see **light functional anatomy:** primary attachments (origin / insertion bones), primary innervation, and primary action — surfaced in the detail panel with anatomist-reviewed records.
6. Dive into a selected muscle: camera focuses, sibling muscles dim, breadcrumb updates — same dive-deeper interaction model as Phase 1, now exercised on muscle.
7. Find the "About this atlas" surface within three clicks; see verbatim upstream attribution from BP3D **and any newly-introduced sources** per ADR 0006.
8. Use the app fluently on iPad with **instrumented on-device frame timing** (not just smoke-test) hitting the criterion #17 60 fps target on iPad Air 4 / 9th-gen-class hardware.
9. Use the long-press touch-dive affordance with **visible long-press feedback** (UA-009 resolved).
10. See **sternum** as a single selectable structure in the sidebar — composite-children semantics resolve to manubrium + body + xiphoid at render time.

The peel UX validation deferred at Phase 1 is the load-bearing addition. Muscle content is what makes the peel toggle teach the user something.

### What Phase 2 does *not* prove (yet)

- **Deep functional anatomy.** Phase 2 ships *light* functional anatomy for a flagship muscle subset (target ~15–25 muscles). Comprehensive innervation + supply + attachment coverage for every muscle is Phase 3+.
- **Female anatomy.** Reserved per master-spec §12; revisit gate before Phase 3.
- **Production deploy.** Phase 2 resolves the production-deploy *path* (decision + ADR + implementation); the actual public deploy is Phase 5.
- **Multi-language nomenclature.** Localization is Tier 3, activates Phase 4+.
- **Pathology overlays / quizzes / learning paths.** Out of scope until at least Phase 4.

## Acceptance criteria

| # | Criterion | Owner |
|---|-----------|-------|
| 1 | Three Reviewer must-close items (R1/R2/R3) landed; `SelectionIntent` matches schema's `camera_intent` enum; `useStructureContent` warns and passes on alias-namespace records; `AttributionSurface` comment reflects the actual three-source structure | 3D Engine + UI + Architect |
| 2 | Sternum composite (`UBERON:0000975`) registered in `mesh-asset-manifest.json` with `composite_children: [UBERON:0002205, UBERON:0006820, UBERON:0002207]`; renders + selects + dives as a single structure; R5 all-dim regression fixed | Asset Pipeline + 3D Engine |
| 3 | Architect open items A2/A3/A4 closed: `attributions[]` on `build-manifest`; `quality_notes: string[]` on registry entries; `synonyms.json` physically removed; `anatomist-review-manifest.json` formalised as the eighth contract | Architect |
| 4 | Muscular sub-ontology: ~150–200 UBERON-primary nodes with FMA aliases, TA2 labels, typed edges including `attaches_to` (or equivalent), `innervated_by`, `acts_at` for flagship muscles | Anatomy Domain |
| 5 | Integumentary sub-ontology: ~5–15 nodes (skin as single integumentary organ at minimum; regional sub-divisions if BP3D supports cleanly) | Anatomy Domain |
| 6 | BodyParts3D muscular meshes imported, cleaned, LODded; integumentary mesh sourced (BP3D where possible, fallback documented if not) | Asset Pipeline |
| 7 | `mesh-asset-manifest.json` re-baked with all three systems; every muscle and skin mesh `id` resolves to an ontology node | Asset Pipeline + Anatomy Domain |
| 8 | App renders body with **interactive** skin + muscle + bone; system switcher present in the UI; selection routes by system | 3D Engine + UI |
| 9 | Peel-mode presets visually differentiate: `skin` shows only skin, `muscle` shows muscle + bone, `bone` shows only bone (current Phase 1 behaviour, now load-bearing), `visceral` retains current semantics with R6 escape affordance | 3D Engine + UI |
| 10 | Peel UX educationally validated: a structured walk-through (5–10 anatomical tasks, e.g. "find the deltoid", "trace the rotator cuff from skin to bone") completes successfully with no novice-blocking interaction failures | UX/A11y + 3D Engine |
| 11 | Cross-store event contract documented as a new ADR (candidate: ADR 0009 cross-store coordination); `selection-event` schema runtime-emitted and consumed; FrameIntentBridge documented in `docs/agents/3d-engine.md` (R7) | Architect + 3D Engine |
| 12 | Multi-system scene composition: rendering is incremental (a system can be hidden without re-uploading meshes); selection + peel + dive all aware of the active system | 3D Engine |
| 13 | UA-009 long-press visual feedback shipped; affordance form chosen per user decision (ring / flash / hold-bar) | UI |
| 14 | Light functional anatomy: ~15–25 flagship muscles have `attaches_to` + `innervated_by` + `acts_at` content fields populated and anatomist-reviewed | Content + Anatomy Domain |
| 15 | **Anatomist named.** First batch of 51 Phase 1 `pending` records promoted to `reviewed`; second batch (~80 muscular + ~5 integumentary + ~25 functional records) authored, queued, and at least 50% promoted to `reviewed` | Content + QA + user |
| 16 | Visual-regression **diff-gating** enabled in CI; baseline corpus widened to include all three systems and each peel-preset state; perceptual-diff threshold tuned and documented | QA + DevOps |
| 17 | iPad on-device frame timing instrumented; criterion #17 ("stable 60 fps on iPad Air 4 / 9th-gen-class") verified by measurement, not smoke-test; perf budget refreshed | 3D Engine + QA |
| 18 | Production-deploy path for canonical meshes decided + ADR drafted (candidate: ADR 0010 deploy-path); `vite build` output is deployable (build-time copy, CDN prefix, or hashed manifest); `build-manifest.json` is emitted by DevOps and validates | DevOps + Architect |
| 19 | LFS budget re-baselined: muscular + integumentary additions stay under a revised total-LOD-bytes budget agreed with user (current 16 MB ceiling will be insufficient; resolved per open question 5) | Asset Pipeline + DevOps |
| 20 | Compliance agent activated for first dispatch: BP3D mirror-vs-canonical license discrepancy + CC-BY-SA-2.1-JP Japanese-only-legal-code review filed in `docs/agents/compliance.state.md`; pre-launch obligations enumerated | Compliance (Tier 2 activation) |
| 21 | WCAG 2.2 AA conformance retained across new surfaces: system switcher, functional-anatomy overlay, long-press feedback, peel-preset escape affordances; UX/A11y Tier 2 re-audit clean | UX/A11y |
| 22 | Reviewer Tier 2 verdict on cross-agent handoffs is PASS (no must-close BLOCK-class items) at end of phase; mid-phase Reviewer dispatch landed at first multi-store coupling step (lesson from Phase 1 retro item 1) | Reviewer |
| 23 | CI green: typecheck + ≥ 12 schemas (incl. `anatomist-review-manifest`) + build + perf-budget + visual-regression with diff-gating + dynamic perf measurement | DevOps |

23 acceptance criteria. Higher than Phase 1's 19; reflects the larger surface area (two new systems + functional anatomy + peel UX validation + diff-gating + deploy-path decision + Compliance activation + Phase 1 carry-forward absorption).

## Scope locked

- **Systems with full interactivity:** skeletal (carried from Phase 1) + muscular (new) + integumentary (new).
- **Muscular structure count:** ~150–200. Flagship subset (~15–25) gets light functional anatomy.
- **Integumentary structure count:** ~5–15. Skin as a single integumentary organ at minimum; regional sub-divisions if BP3D supports cleanly.
- **Floor:** organ-level (carried). No tissue, no cellular.
- **Body variant:** male (carried, subject to open question 1).
- **Targets:** desktop browser + iPad (co-primary, carried).
- **Functional anatomy depth:** *light* — attachments + innervation + action, on a flagship subset only. Full coverage is Phase 3+.
- **Sternum composite:** lands in Phase 2 (Architect open item A1).
- **Production-deploy path:** decided in Phase 2; ADR drafted; build output deployable. Actual public deploy is Phase 5.
- **WebGPU:** evaluated in Phase 2 per open question 4; activation decision is part of Phase 2 entry.
- **LFS budget:** revised in Phase 2 per open question 5.

## Scope explicitly NOT in Phase 2

- **Deep functional anatomy** (every muscle has full innervation + supply + attachment + action — Phase 3+).
- **Female anatomy** (subject to open question 1; default-defer to post-v1).
- **Pathology overlays / clinical correlations** (post-v1).
- **Multilingual content** (Localization Tier 3, Phase 4+).
- **Quizzes / learning paths** (Phase 4+).
- **Public deploy / DOI** (Phase 5).
- **Authentication / accounts / persistent user state** (carried out-of-scope per master-spec).
- **iPhone, Android phone, VR/AR, native Unity/Unreal** (locked out per master-spec §12).

## Folder additions / changes

- `data/canonical/meshes/uberon_NNNNNNN/` — populated for muscular + integumentary structures (currently 79 skeletal dirs; expected ~230–315 after Phase 2).
- `data/canonical/ontology/nodes.json` — appended (currently 125 nodes; expected ~280–340 after Phase 2).
- `data/canonical/ontology/relations.json` — appended with new edge types (`attaches_to`, `innervated_by`, `acts_at`); regional/systemic/constitutional edges expanded.
- `data/canonical/ontology/content/<primary_id>.json` — appended with muscular content + integumentary content + ~15–25 functional-anatomy records.
- `data/canonical/ontology/functional/<primary_id>.json` — **new** subdirectory if functional records merit a separate file (per Content agent owned-path in system-map).
- `data/derived/mesh-registry.json` — re-baked, three-system, with sternum composite entry.
- `data/canonical/ontology/synonyms.json` — physically removed (A4).
- `app/web/src/scene/` — system switcher integration, peel UX validation harness, sternum composite resolution.
- `app/web/src/ui/` — system switcher component, functional-anatomy overlay, UA-009 long-press feedback, R6 visceral escape affordance.
- `app/web/src/state/` — cross-store event contract per ADR 0009 (candidate); `selectionStore`/`peelStore`/`diveStore` coordinator.
- `app/shared/schema/anatomist-review-manifest.json` — **new** (eighth contract).
- `app/shared/schema/build-manifest.json` — `attributions[]` field added (A2).
- `app/shared/schema/mesh-asset-manifest.json` — `quality_notes[]` field added (A3).
- `app/shared/schema/selection-event-schema.json` — possible refinement for cross-store contract.
- `docs/decisions/0009-cross-store-coordination.md` — candidate ADR.
- `docs/decisions/0010-deploy-path.md` — candidate ADR (criterion #18).
- `docs/agents/compliance.state.md` — populated for first time (Tier 2 activation).
- `docs/agents/devops.state.md` — populated for first time beyond CI.
- `pipelines/01-import-bp3d/` — extended for muscular + integumentary OBJ pivot tables.
- `pipelines/04-validate-ontology/` — extended for multi-system completeness math.
- `pipelines/05-bake-registry/` — extended for composite entries + multi-system roll-up.
- `pipelines/09-perf-instrument/` — **new**: iPad on-device frame-timing harness.
- `pipelines/10-visual-diff/` — **new**: pixel-diff baseline-vs-current with tuned threshold.
- `tests/review-queue/2026-MM-DD-batch-2/` — second review packet (anatomist required).
- `tests/rendering-snapshots/` — baseline corpus widened to per-system + per-peel-preset captures.

## Dispatch plan

Order matters: prep fix-pass first; ontology + asset pipelines before renderer + UI; content can parallel scene work but anatomist promotion gates closure. Mid-phase Reviewer dispatch lands at first multi-store coupling step per Phase 1 retro lesson 1.

| Step | Dispatch | Agent(s) | Depends on | Output |
|------|----------|----------|-----------|--------|
| 0 | **Pre-dispatch fix-pass:** R1 + R2 + R3 + A1 (sternum bake) + A4 (synonyms.json removal); single batched dispatch ahead of P2.01 | Orchestrator-direct (multi-agent touch) | Phase 2 entry approval | <100 LoC + 1 schema bake; closes 5 carry-forward items in one shot |
| 1 | Research/Docs: UBERON→FMA muscular crosswalk + integumentary mapping + functional-anatomy ontology survey (`attaches_to` / `innervated_by` / `acts_at` precedents in UBERON / FMA / TA2) | Research/Docs | step 0 | reference docs in `docs/references/summaries/` |
| 2 | Anatomy Domain: muscular + integumentary sub-ontologies; new edge types in `relations.json`; flagship-muscle subset enumerated | Anatomy Domain | step 1 | `data/canonical/ontology/{nodes,relations}.json` appended |
| 3 | Asset Pipeline: BP3D muscular OBJ list + integumentary mesh strategy decided + raw archives audited (already on disk from P1.03's PART-OF download) | Asset Pipeline | step 2 | source-list manifest + strategy doc |
| 4 | Asset Pipeline: OBJ → glb conversion for muscle + integumentary; paired-bone-equivalent handling for paired muscles (psoas, deltoid heads, etc.) | Asset Pipeline | step 3 | new `data/canonical/meshes/uberon_NNNNNNN/lod0.glb` entries |
| 5 | Asset Pipeline: Blender headless cleanup per ADR 0007 attribution discipline; hand-review flagging for sinusoid / fascia geometry | Asset Pipeline | step 4 | cleaned glbs |
| 6 | Asset Pipeline: LOD decimation chains for new meshes (LOD1 = 50%, LOD2 = 10%; degenerate-fallback per Phase 1 precedent) | Asset Pipeline | step 5 | LOD1 + LOD2 glbs |
| 7 | Asset Pipeline + Anatomy Domain (cross-domain): validate-ontology multi-system pass; gap report; sternum composite verification end-to-end | Asset Pipeline + Anatomy Domain | steps 2 + 6 | validation report; gap-report v2 |
| 8 | Asset Pipeline: registry re-bake (three-system) including sternum composite via `composite_children`; emit `quality_notes[]` for hand-review flags (A3 schema-dependent) | Asset Pipeline | steps 7 + 9-or-earlier-A3 | `data/derived/mesh-registry.json` v2 |
| 9 | Architect: schema additions — `attributions[]` on build-manifest (A2); `quality_notes[]` on mesh-asset-manifest (A3); `anatomist-review-manifest.json` formal schema (eighth contract); refinements to `selection-event-schema` per cross-store ADR | Architect | step 0 + Phase 2 ADR drafting | 4 schema deltas, 1 new contract |
| 10 | Compliance (Tier 2 activation): BP3D mirror-vs-canonical license discrepancy + CC-BY-SA-2.1-JP Japanese-only-legal-code review; pre-launch obligations enumeration | Compliance | step 1 | `docs/agents/compliance.state.md` populated; findings logged |
| 11 | 3D Engine: multi-system scene composition; system switcher integration; cross-store event contract implementation per ADR 0009 candidate; R4 path-helper factor + Windows test; R5 sternum all-dim fix | 3D Engine | steps 8 + 9 | multi-system scene; cross-store contract live |
| 12 | **Mid-phase Reviewer (Tier 2):** cross-agent handoff audit at first multi-store coupling boundary (step 11 hands off to UI in step 13) | Reviewer | step 11 | mid-phase review report; must-close items resolved before step 13 |
| 13 | 3D Engine: peel UX activation — `skin` / `muscle` / `bone` presets now visually differentiate; visceral preset escape affordance hook for R6; sibling-dim semantics tested on muscle | 3D Engine | step 11 + step 12 verdict | peel UX visibly working |
| 14 | UI: system switcher component; functional-anatomy overlay in DetailPanel; UA-009 long-press feedback (form per user decision); R6 visceral escape affordance; R7 FrameIntentBridge documentation in `docs/agents/3d-engine.md` | UI | steps 9 + 11 | UI shell extended; UA-009 closed |
| 15 | UI + 3D Engine (cross-domain): peel UX validation harness — structured task walk-through scaffolding for UX/A11y to drive | UI + 3D Engine | steps 13 + 14 | task-walk-through harness in `app/web/src/scene/peel-validation/` |
| 16 | Content: muscular content batch (target ~150 records including ~80 with full descriptions, ~70 short-form) + integumentary content (~5–15 records) + light functional records (~15–25 flagship muscles with `attaches_to` + `innervated_by` + `acts_at`) | Content | step 2 | ~170–220 new content records, all `pending` |
| 17 | Content + QA (cross-domain): anatomist review batch 2 packet + promotion of Phase 1 51-record batch 1 (gated on named anatomist) + batch 2 first-pass | Content + QA | step 16 + named anatomist | `tests/review-queue/2026-MM-DD-batch-2/` + first promotions to `reviewed` |
| 18 | QA: visual-regression **diff-gating** enabled in CI (`pipelines/10-visual-diff/`); baseline corpus widened to per-system + per-peel-preset; perceptual-diff threshold tuned; R8 pending-content prod gate; R9 content-record validator into `npm run verify`; possible `npm audit` follow-up | QA + DevOps | steps 13 + 14 | CI diff-gating live; tightened verify chain |
| 19 | 3D Engine + QA (cross-domain): iPad on-device frame-timing instrumentation (`pipelines/09-perf-instrument/`); criterion #17 measured not smoke-tested; perf budgets refreshed | 3D Engine + QA | step 13 | dynamic perf measurement live |
| 20 | UX/Accessibility Tier 2 re-audit: system switcher + functional-anatomy overlay + UA-009 + R6 escape affordance + peel UX walk-through; WCAG 2.2 AA retained | UX/A11y | steps 14 + 15 | audit report; fixes inline |
| 21 | DevOps activation: production-deploy path ADR drafted (CDN vs build-time copy vs hashed manifest); `vite build` output deployable; LFS budget revised per open question 5; `build-manifest.json` emitted | DevOps + Architect | steps 8 + 9 | ADR 0010 candidate; deployable build artefact |
| 22 | **End-of-phase Reviewer (Tier 2):** cross-agent handoff audit covering all multi-system surfaces, cross-store contract, sternum composite, deploy path | Reviewer | all prior | review report; verdict ≥ PASS-WITH-CONCERNS (target PASS) |
| 23 | Orchestrator: end-to-end check + Phase 2 retro; master-spec §7 updated; status.md + task-queue.md transitioned to Phase 3 prep | Orchestrator | all above | retro doc; Phase 3 spec drafting begins |

Step 0 deliberately bundles five small carry-forward items as one orchestrator-direct fix-pass rather than five separate dispatches. Steps 1–7 mirror Phase 1's pipeline cadence (research → ontology → import → convert → clean → decimate → validate). Steps 8 + 9 are interlocked: the registry bake needs the `quality_notes[]` schema; the schema upgrade lands in parallel. Step 12 is the mid-phase Reviewer dispatch — Phase 1 retro lesson 1. Steps 17 and 21 are external-dependency gates (anatomist; deploy path decision).

## Open questions — for user

1. **Female anatomy.** Master-spec §6 locks male-only for v1; §12 reserves female for post-v1. Phase 2 inherits that lock. Do you want to revisit before Phase 3, or stay locked to post-v1? *Default if no input: stay locked to post-v1; reserve the gate decision for Phase 3 entry.*

2. **Functional-anatomy depth.** Phase 2 ships *light* functional anatomy on a flagship subset (~15–25 muscles, three fields each: attachments + innervation + action). The alternatives:
   - **Lighter:** drop to ~5–10 muscles, two fields (attachments + action). Faster; teaches less.
   - **As proposed:** ~15–25, three fields. Balanced.
   - **Heavier:** ~30–50, four fields (add vascular supply). Phase 3 work pulled into Phase 2; doubles content + anatomist load.
   *Default if no input: as proposed.*

3. **Content scaling — anatomist throughput.** Phase 1 working assumption was 50 records / batch / 1–2 week turnaround. Phase 2 produces ~170–220 new records (muscular + integumentary + functional) on top of the 51 Phase 1 records still pending. The anatomist needs to clear ~221–271 records cumulatively before Phase 2 closes against criterion #15 (≥ 50% of batch 2 promoted to `reviewed`). Options:
   - **One anatomist, sequential.** Realistic 4–6 weeks for batch 1 (51 records) + first half of batch 2 (~85–110 records). Phase 2 effort estimate assumes this.
   - **Multiple anatomists, parallel.** Faster but introduces cross-reviewer consistency review. New process work.
   - **Promote less stringently.** E.g. accept `reviewed-light` for non-flagship records. Lowers the bar; changes the schema.
   *Default if no input: one anatomist, sequential. Effort estimate calibrated to this.*

4. **WebGPU upgrade path.** Master-spec §2 reserves WebGPU "where available." Adding muscle + skin meshes pushes draw-call and triangle counts up materially (estimate 2–4× Phase 1). Options:
   - **Activate WebGPU in Phase 2** as a progressive enhancement with WebGL2 fallback. Front-loads the work; future-proofs performance for Phase 3 functional rendering (vector overlays, supply trees).
   - **Defer to Phase 3.** Phase 2 stays WebGL2; Phase 3 spec includes WebGPU activation. Simpler Phase 2 dispatch plan; perf budget pressure mitigated by aggressive instancing + LOD downshift.
   *Default if no input: defer to Phase 3 unless Phase 2 step 4 (asset import) reveals draw-call ceiling concerns.*

5. **LFS budget.** Phase 1 total-LOD-bytes budget was 16 MB; current usage 13.71 MB (14.3% headroom). Phase 2 muscular + integumentary additions are likely to be 8–15 MB on top (BP3D muscular set is roughly 2× the skeletal mesh count once paired-muscle merge is applied). Options:
   - **Bump the budget to 32 MB.** Self-contained build; mesh registry stays in-repo. Simplest; CI handles it.
   - **Bump to 24 MB + move LOD0 chains to Git LFS** (LOD1 + LOD2 remain in regular git). Keeps the working-tree light; uses LFS where it pays off. Pairs with criterion #18 (production-deploy path) — LFS-backed assets can also serve via CDN.
   - **Move to hashed-manifest CDN serving now.** Most aligned with criterion #18; introduces deploy-path work earlier in Phase 2.
   *Default if no input: bump to 32 MB inline; decouple from criterion #18. Revisit at Phase 3 if perf or repo-size pressure shows up.*

## Risks specific to Phase 2

| Risk | Mitigation | Owner |
|------|------------|-------|
| **Integumentary mesh quality** — BP3D skin coverage is sparse and inconsistent across body regions; some regions ship as a single skin envelope, others not at all | Step 3 audit before step 4 conversion; if BP3D skin is insufficient, fall back to a single-mesh hand-authored envelope at criterion #5 minimum; document in Anatomy Domain state | Asset Pipeline + Anatomy Domain |
| **Muscle paired-bone-equivalent merge complexity** — Phase 1 saw 45 of 79 paired bones merged at OBJ-text level; muscle paired structures (deltoids, biceps, etc.) may have a different decomposition shape | Step 4 dispatch reads BP3D muscular pivot tables before committing to merge strategy; per-muscle merge decisions logged | Asset Pipeline |
| **Functional anatomy ontology edge types not in UBERON** — `attaches_to`, `innervated_by`, `acts_at` precedent must be researched | Step 1 research dispatch settles precedent before step 2 schema work; project-local `BODY:NNNN` reserved for orphan relations | Anatomy Domain |
| **Anatomist throughput insufficient for both Phase 1 batch + Phase 2 batch** | Phase 2 entry gate: named anatomist + first promotion of Phase 1 batch 1 (51 records) before P2.01 dispatch; if throughput is the bottleneck mid-phase, declare partial-promotion success (criterion #15 ≥ 50% gates this) | Content + QA + user |
| **Cross-store event contract churn** — ADR 0009 candidate may force store-shape changes that ripple into UI components | Mid-phase Reviewer (step 12) catches contract drift before UI integration; cross-store ADR drafted before step 11 implementation | 3D Engine + Architect |
| **Peel UX validation reveals fundamental interaction misdesign** — possible the educational UX requires re-thinking presets or sibling-dim semantics | Step 15 harness is structured walk-through, not free-form testing; results bound the design changes; pre-walk-through expectation: 5–10 task pass rate without UX rework | UX/A11y + 3D Engine |
| **iPad on-device perf measurement reveals criterion #17 not met** — Phase 1 closed against smoke-test; instrumentation may surface stutter | Step 19 instruments early enough to mitigate via LOD downshift + instancing + WebGPU evaluation (open question 4) | 3D Engine + QA |
| **Production-deploy path decision blocks Phase 2 close** | Step 21 dispatched early enough; if all options are contentious, Phase 2 retro frames the decision rather than blocking; deploy path ADR drafted by step 21 outcome | DevOps + Architect + user |
| **Diff-gating threshold causes CI thrash** — perceptual-diff tuning can over-fail or under-fail on Chromium font rendering / GPU-rasterization differences | Step 18 establishes baseline on the CI image (not local dev); threshold tuned against ≥ 3 stable runs; per-baseline override allowed for known-flaky regions (text-rendering only) | QA + DevOps |
| **Compliance findings escalate** — BP3D mirror-vs-canonical license discrepancy may require user contact with DBCLS for clarification | Step 10 produces findings + escalation path; orchestrator owns user-contact decision | Compliance + Orchestrator |
| **LFS budget overrun without resolution** — if open question 5 isn't answered before step 4, asset pipeline may produce meshes the budget can't accommodate | Step 4 dispatch parametrised on LFS strategy; step 21 (DevOps activation) resolves deploy path including LFS strategy | Asset Pipeline + DevOps |
| **WebGPU upgrade churn** — if open question 4 lands "activate now" mid-phase, scene + renderer get rework | Default-defer to Phase 3 keeps Phase 2 simple; only re-evaluate if step 19 perf instrumentation forces it | 3D Engine |
| **Content-record validator landing late** — R9 schedules into step 18; if landed earlier, would catch authoring drift in step 16 | Schedule R9 dispatch alongside step 9 schema work; step 16 then runs against the validator from the start | QA + Architect |
| **Multi-system selection routing conflicts with diveStore** — Phase 1's diveStore assumes a single tree-root; multi-system widens to N roots | Step 11 cross-store contract addresses this explicitly; ADR 0009 candidate documents the resolution | 3D Engine + Architect |

## Estimated effort

Honest range: **10–16 weeks** for the user + this AI team, assuming:

- One anatomist available; throughput 25–40 records / week.
- BP3D muscular + integumentary archives accessible (already on disk from P1.03).
- Blender 5.x available locally (carried from Phase 1).
- Production-deploy decision (criterion #18) resolved within 2 weeks of Phase 2 entry.
- No major pivot from one of the open questions (e.g. female anatomy decision flipping; WebGPU activation pulled forward).
- No structural rework forced by peel UX validation findings (step 15 walk-through pass rate ≥ 80%).
- Mid-phase Reviewer dispatch catches cross-store contract issues before UI integration.

Phase 1 closed in one calendar day but at extraordinary cadence (20 dispatches end-to-end), with most work AI-executed against a clean greenfield. Phase 2's slowdowns:

- **Anatomist throughput is the dominant constraint** for criterion #15 (~6–10 weeks of the total, parallel to other work but gating close).
- **Multi-system rendering + cross-store contract** introduces architectural rework that wasn't present in Phase 1's single-system slice (~2–3 weeks).
- **Peel UX validation, dynamic perf instrumentation, diff-gating** all introduce new infrastructure (~1–2 weeks each, partly parallel).
- **Compliance + DevOps activation** for the first time on this project (~1 week each).

The 10-week floor assumes parallel execution and the anatomist clearing 30+ records/week; the 16-week ceiling assumes anatomist as the critical path at 25/week with the peel UX walk-through forcing one round of design adjustment.

## What I need from you to dispatch Phase 2

**Hard prerequisites:**

1. **Named anatomist.** First-batch promotion of Phase 1's 51 `pending` records is criterion #15's anchor; cannot dispatch step 17 without this. Two paths: (a) named faculty contact + initial engagement; (b) confirmation that 51 records will ship as `pending` and criterion #15 is re-scoped to batch 2 only.
2. **UA-009 long-press affordance form.** Ring vs flash vs hold-bar. Blocks step 14 UI implementation.
3. **Answers to the five open questions above** — or explicit "use defaults" on each.

**Pre-dispatch step 0 batched fix-pass** lands the three Reviewer must-close items (R1/R2/R3) + sternum composite bake (A1) + synonyms.json physical removal (A4) as a single orchestrator-direct fix-pass before P2.01 dispatch. Total <100 LoC + 1 schema bake. Confirmation that this consolidated fix-pass is the preferred shape (vs folding into P2.01–P2.11 individually) closes the last carry-forward decision.

**First dispatchable step is P2.00** (the batched fix-pass), pending only your "go." P2.01 (Research/Docs muscular crosswalk) is unblocked the moment step 0 lands.
