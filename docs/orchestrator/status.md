# Project Status

**Last updated:** 2026-05-11 (P1.20 close, Phase 1 retro filed)
**Current phase:** **Phase 1 closed 2026-05-11.** Phase 2 spec drafting next. All 20 Phase 1 dispatches complete (P1.01–P1.20). Skeletal vertical slice ships: 79-mesh BP3D skeleton, picking + outline + selection + peel + dive plumbing, full UI chrome, 51 pending content records + anatomist review packet queued, 3 visual-regression baselines + 3 perf budgets passing in CI, WCAG 2.2 AA met, Reviewer Tier 2 verdict PASS-WITH-CONCERNS. Retro at [`retros/phase-1-retro.md`](retros/phase-1-retro.md); master-spec §7 updated.
**Overall health:** Green-with-concerns. 3 Reviewer must-close items (<60 LoC) and 6 carry-into-Phase-2 items deferred into Phase 2 prep per user direction. 1 UA-009 long-press design decision still open. 51 `pending` content records awaiting a named anatomist — hard Phase 2 entry gate.

---

## Right now

Phase 1 closed. The skeletal vertical slice runs locally at `npm run dev` against canonical data:

- 125-node UBERON-primary skeletal sub-ontology
- 79 canonical glbs (237 with LOD chain) in `data/canonical/meshes/uberon_NNNNNNN/`
- Attribution baked into every glb per ADR 0006
- 79-entry mesh-registry; sternum composite deferred to a Phase 2 follow-up bake
- Full UI chrome: Sidebar, Breadcrumbs, Cmd/Ctrl+K Search, DetailPanel, PeelControls, NomenclatureToggle, AttributionSurface
- iPad co-primary: tap-select, drag-rotate, pinch-zoom, long-press-to-dive; WCAG 2.2 AA met
- CI green: typecheck + 11/11 schemas + Vite build + perf-budget + 3-viewport Chromium baselines

14+ file-backed Task-subagent dispatches across the 20-step Phase 1 sequence, including 4 cross-domain dispatches. ADR 0003 mechanism is production-validated.

## Active work

Phase 2 Spec v0.1 drafting next (orchestrator-direct).

## Blockers

- **Anatomist identity** — 51 `pending` content records sit behind a TBD university-faculty reviewer. Hard Phase 2 entry gate.
- **UA-009 long-press affordance design decision** (radial-progress ring vs flash vs hold-bar). Small but blocks UI implementation.
- **3 Reviewer must-close items (R1/R2/R3)** carried into Phase 2 prep per user direction. Total <60 LoC. User decision on whether to bundle as a small fix-pass ahead of P2.01 or fold into Phase 2 early dispatches.

## Next milestone

**Phase 2 Spec v0.1 draft.** Inputs: this Phase 1 retro, the Reviewer Tier 2 report, the four Architect open items, the six Reviewer carry-into-Phase-2 items. Goal: widen to muscle + skin systems; activate the peel UX validation that Phase 1 explicitly descoped. Requires user approval and answers to open questions before P2.01 dispatch.

## Upcoming gates (user approval required)

1. **Anatomist identity confirmation** — hard prerequisite for promoting the 51 `pending` records to `reviewed` and closing Phase 1 criterion #13 retroactively.
2. **UA-009 long-press affordance form** — design decision needed before UI implementation.
3. **Pre-Phase-2 fix-pass decision** — bundle the 3 Reviewer must-close items (R1/R2/R3) as a single small dispatch ahead of P2.01, or fold into Phase 2 early dispatches.
4. **Phase 2 Spec v0.1 approval** + answers to the open questions it will surface.

## Recent decisions

See [decision-log.md](decision-log.md) and [retros/phase-1-retro.md](retros/phase-1-retro.md). Latest:

- 2026-05-11 (P1.20): Phase 1 closed. ADRs 0007 (Blender attribution discipline) + 0008 (composite asset entries) accepted in-phase. Reviewer Tier 2 PASS-WITH-CONCERNS verdict accepted; 3 must-close items deferred to Phase 2 prep per user direction.

## Working assumptions to validate (Phase 2)

- Anatomist identity + cadence will be confirmed before P2 review-batch dispatch (working assumption: 50 records / batch, 1–2 week turnaround — unvalidated until a real reviewer is named).
- Production-deploy path for canonical meshes (CDN vs build-time copy vs hashed manifest) decided at Phase 2 entry.
- Peel UX educational value can be assessed once muscle content lands.
- iPad on-device 60 fps perf assumption to be instrumented in Phase 2 (Phase 1 closed at smoke-test level).

## Health signals

| Signal | State | Notes |
|--------|-------|-------|
| Phase 0 close | ✅ signed off | All 16 acceptance criteria met |
| Phase 1 close | ✅ retro filed | 17/19 acceptance criteria fully met; #6 peel-UX descoped, #13 reviewed-records queued behind TBD anatomist. Retro at `docs/orchestrator/retros/phase-1-retro.md` |
| ADRs 0001–0008 | ✅ accepted | 0007 + 0008 added in-phase |
| Schema upgrade (ajv) | ✅ in place | 11/11 validations pass; `composite_children` via `oneOf` |
| Master spec | ✅ refreshed | §7 phasing updated; change-log appended |
| Agent dispatch mechanism (ADR 0003) | ✅ production-validated | 14+ invocations across single-agent + 4 cross-domain |
| Skeletal vertical slice | ✅ rendering | 79 BP3D meshes; picking + outline + peel + dive + UI chrome + iPad touch |
| Local verify | ✅ green | typecheck + 11 schemas + build + perf-check + 3/3 baselines |
| Perf budgets | ✅ all pass | JS gzip 303 KB / 320 KB; registry 79 / 79; LOD bytes 13.71 / 16 MB |
| WCAG 2.2 AA | ✅ MET | One deferred design decision (UA-009 long-press feedback) |
| Reviewer Tier 2 | ✅ PASS-WITH-CONCERNS | 3 must-close items deferred to Phase 2 prep; 6 carry-into-Phase-2 items filed |
| 51 content records | ⏳ pending | Anatomist TBD; promotion pipeline dry-run-tested |
| CI on main | ⏳ runs on next push | Pushed with each commit; check Actions tab |

## Pending external inputs

- **Named anatomist** for first review batch promotion — hard Phase 2 entry gate.
- **UA-009 long-press affordance design decision** — small but blocks UI implementation.
- **Pre-Phase-2 fix-pass decision** for the 3 Reviewer must-close items (R1/R2/R3).
- **User approval of Phase 2 Spec v0.1** (to be drafted next).
