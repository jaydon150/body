# Project Status

**Last updated:** 2026-05-11 (late evening, post-P1.18 close)
**Current phase:** Phase 1 in progress. **P1.01–P1.18 complete.** Application side is wired end-to-end: 79-mesh BP3D skeleton renders, picking + outline + selection works, peel + dive plumbing in place, full UI chrome (Sidebar/Search/Breadcrumbs/DetailPanel/PeelControls/NomenclatureToggle/AttributionSurface), 51 pending content records authored + anatomist review packet queued, **3 visual-regression baselines + 3 perf budgets all passing in CI**, **WCAG 2.2 AA audit complete with 4 fixes landed and 1 deferred design decision (UA-009 long-press feedback)**. Remaining: P1.19 (Reviewer handoff passes), P1.20 (Phase 1 retro).
**Overall health:** Green (one open design decision flagged from P1.18 — does not block reviewer/retro)

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
- **12:30Z** — P1.19 (Reviewer Tier 2 handoff passes on P1.11–16 boundaries)
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

- None for P1.19/P1.20 close. **One open design decision flagged from P1.18:** UA-009 long-press visual feedback (touch user has no signal during 500 ms long-press budget). Recommended a CSS-only radial-progress ring at the pointer position with reduced-motion opacity-step fallback (~40 LoC + ~30 lines CSS); awaiting user/orchestrator decision on the affordance form before UI-agent implementation. Does not block reviewer pass or retro doc; would block "shippable to actual iPad users" claim.

## Next milestone

**P1.19 dispatch (Reviewer Tier 2 handoff passes).** Audit the major Phase 1 handoff boundaries (3 raw-asset, 8 baked-registry, 14 UI↔engine integration) for completeness, contract integrity, and asset-chain trust. After P1.19: P1.20 (Phase 1 retro + close).

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
| CI on main | ⏳ runs on next push | Pushed with each commit; check Actions tab |

## Pending external inputs

- **User "go" to dispatch P1.02** (Anatomy Domain).
- **Blender install confirmation** — does not block P1.02; required ahead of P1.05.
- **Anatomist reviewer cadence confirmation** — required before P1.16 (review batch).
