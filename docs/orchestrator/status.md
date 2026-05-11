# Project Status

**Last updated:** 2026-05-11 (late evening, post-P1.19 close)
**Current phase:** Phase 1 in progress. **P1.01–P1.19 complete.** Application side wired end-to-end (79-mesh BP3D skeleton, picking + outline + selection, peel + dive plumbing, full UI chrome, 51 pending content records + anatomist review packet queued, 3 visual-regression baselines + 3 perf budgets passing in CI, WCAG 2.2 AA audit complete). **Reviewer Tier 2 pass complete: PASS-WITH-CONCERNS verdict, 3 BLOCK + 10 CONCERN + 4 NIT findings across 5 cross-agent handoff boundaries.** Remaining: P1.20 (Phase 1 retro).
**Overall health:** Green-with-three-must-close (Reviewer flagged 3 narrow contract-touching items totalling <60 LoC for pre-retro close: selection-intent enum widening, useStructureContent cross-check soft-fail, AttributionSurface comment correction). Plus the open UA-009 long-press design decision from P1.18.

---

## Right now

- Phase 1 steps P1.01–P1.04 **complete**. Real canonical assets now exist:
  - 125-node UBERON-primary skeletal sub-ontology
  - 79 canonical glbs (9.4 MB) in `data/canonical/meshes/uberon_NNNNNNN/lod0.glb`
  - Attribution baked into every glb per ADR 0006 (verified on mandible: `asset.copyright` + `asset.extras.source`)
  - 29 BP3D-side gaps documented (mostly flagship-bone sub-structures — femur head/neck/shaft, phalanges-of-manus/pes)
- Four file-backed Task-subagent dispatches now executed cleanly. ADR 0003 is four-times-proven.
- Paired bones (ribs, vertebrae, carpals, tarsals) handled cleverly: left+right merged at OBJ-text level, preserved as separate glTF mesh nodes for individual runtime selection.

## Active work

**Autonomous overnight schedule (2026-05-11, user asleep).** Five remote-agent routines scheduled at 1-hour intervals starting 10:30Z. Each clones `jaydon150/body`, dispatches one task, commits, pushes back. User wakes to commits or — if private-repo auth on Anthropic's CCR isn't set up — to error reports the user resolves by authorizing GitHub access at claude.ai. Schedule:

- **10:30Z** — P1.17 (QA: visual regression baselines + perf budgets + accuracy queue) — **DONE**
- **11:30Z** — P1.18 (UX/Accessibility Tier 2 audit) — **DONE**
- **12:30Z** — P1.19 (Reviewer Tier 2 handoff passes on P1.11–18 boundaries) — **DONE**. Report at `docs/orchestrator/reviews/2026-05-11-phase-1-handoffs.md`. Verdict PASS-WITH-CONCERNS; 3 must-close-before-retro items (R1 selection-intent enum widening 3D Engine; R2 content cross-check soft-fail UI; R3 attribution comment correction UI+Architect) total <60 LoC.
- **13:30Z** — P1.20 (Phase 1 retro doc + close)
- **14:30Z** — Phase 2 Spec v0.1 draft (orchestrator-direct; needs user approval before any P2 dispatch)

The vertical slice is functionally complete:
- Loading the dev server renders 79 BP3D skeletal meshes
- Click any mesh → cyan outline + DetailPanel shows the structure's name + summary + long-form prose (for the 51 with pending content, with an amber "pending review" pill)
- Sidebar tree + breadcrumbs + Cmd/Ctrl+K search all drive selection and dive
- Peel mode toggles work mechanically (visual effect arrives in Phase 2 with non-bone material_hints)
- Nomenclature toggle switches plain ↔ clinical labels
- "About this atlas" surface lists every upstream source per ADR 0006
- iPad: tap-select, drag-rotate, pinch-zoom, long-press-to-dive

## Blockers

- None for P1.20 close. **Two open items inherited from earlier dispatches:** (1) UA-009 long-press visual feedback design decision from P1.18 (CSS-only radial-progress ring recommended; awaiting affordance choice before UI implementation). (2) The three Reviewer must-close items from P1.19 (R1 selection-intent enum, R2 content cross-check, R3 attribution comment) — none breaks the slice today, all are forward-coupling fixes. User decision needed on whether to land the three fixes before P1.20 retro or fold into Phase 2 prep.

## Next milestone

**P1.20 dispatch (Phase 1 retro doc + close).** Synthesize Phase 1 learnings from P1.01–P1.19 retros across all agent state files and the Reviewer report; produce `docs/orchestrator/retros/phase-1-retro.md`; mark Phase 1 closed in master-spec.md. Optional pre-retro: land the three Reviewer must-close fixes (<60 LoC total).

## Upcoming gates (user approval required)

1. **Phase 1 Spec v0.1 approval.** Plus answers to the 7 open questions in the spec.
2. **Phase 1 entry approval per dispatch** (per "approve all" gate). Anticipated batched approval for steps that have no cross-agent dependency.
3. **Phase 1 close** at end of vertical slice.

## Recent decisions

See [decision-log.md](decision-log.md). Latest:

- 2026-05-11 (evening): Phase 0 signed off; ADRs 0004 + 0005 accepted; schemas updated; Phase 1 Spec v0.1 drafted.

## Working assumptions to validate (Phase 1)

- BodyParts3D download URL still accessible — Asset Pipeline's step 3 verifies.
- Blender available on user's machine for headless pipeline runs — open question 4 in Phase 1 Spec.
- Anatomist available for ~50-structure review batch within Phase 1's 8–14 week effort window — open question 5.
- Target hardware: mid-range / 4-year-old laptop, 60 fps stable — open question 6 confirms.

## Health signals

| Signal | State | Notes |
|--------|-------|-------|
| Phase 0 close | ✅ signed off | All 16 acceptance criteria met |
| Research intake | ✅ committed | One factual error caught and noted |
| ADRs 0004 + 0005 | ✅ drafted, approved, committed | UBERON primary, BodyParts3D primary + OpenAnatomy supplement |
| Schema updates | ✅ four schemas updated for UBERON-primary | Non-breaking; all validate |
| Master spec | ✅ refreshed | §3 §4 §5 §7 §11 |
| Phase 1 Spec | ✅ v0.2 in effect | iPad co-primary, plain naming + toggle, attribution criterion |
| First model seed | ✅ committed | Procedural femur proxy keyed to `UBERON:0000981` with TA2 label + FMA alias |
| ADR 0006 (runtime attribution) | ✅ accepted | Pipeline + UI changes scoped into Phase 1 |
| P1.01 deliverable | ✅ landed | `docs/references/summaries/uberon-fma-skeletal-crosswalk.md` |
| Agent dispatch mechanism (ADR 0003) | ✅ validated | First subagent dispatch ran clean |
| Local verify | ✅ green | Typecheck + 11 schemas + build all pass (post-P1.17) |
| P1.17 baselines | ✅ captured | 3 PNGs at `tests/rendering-snapshots/baseline-*.png`; re-captured post-P1.18 with new `--text-muted` token |
| P1.17 perf budgets | ✅ all pass | JS gzip 303.45 KB / 320 KB; registry 79 / 79; LOD bytes 13.71 / 16 MB |
| P1.18 WCAG 2.2 AA | ✅ MET | 21-finding audit; 5 fixes applied (`--text-muted` contrast bump, reduced-motion snap for dive lerp, scene-host focus ring, Search dialog `aria-labelledby`, sidebar disclosure 44 px on coarse pointer); 1 deferred design decision (UA-009 long-press feedback) |
| P1.19 Reviewer Tier 2 | ✅ PASS-WITH-CONCERNS | 17 findings across 5 boundaries: 3 BLOCK / 10 CONCERN / 4 NIT. 3 must-close-before-P1.20-retro; 6 carry-into-Phase-2; 4 architect open items confirmed properly logged. Report at `docs/orchestrator/reviews/2026-05-11-phase-1-handoffs.md`. |
| CI on main | ⏳ runs on next push | Pushed with each commit; check Actions tab |

## Pending external inputs

- **User "go" to dispatch P1.02** (Anatomy Domain).
- **Blender install confirmation** — does not block P1.02; required ahead of P1.05.
- **Anatomist reviewer cadence confirmation** — required before P1.16 (review batch).
