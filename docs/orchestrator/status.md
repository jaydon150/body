# Project Status

**Last updated:** 2026-05-11 (late evening, post-P1.04)
**Current phase:** Phase 1 in progress. Steps P1.01–P1.04 complete; P1.05 blocked on Blender install confirm; P1.07 (validate-ontology) can run in parallel.
**Overall health:** Green

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

- **P1.05 (Blender headless cleanup) — BLOCKED on user confirming Blender 4.x is installed and on PATH.** Asset Pipeline flagged this in the outbound handoff.
- **P1.07 (validate-ontology cross-check) can run in parallel** with the Blender question — it doesn't need Blender, just reads the existing glb set against the ontology. Could be dispatched next while Blender install resolves.

## Blockers

- None for the orchestrator. P1.02 ready to dispatch on user "go."
- Blender install confirmation still open from user — does not block P1.02 (Anatomy Domain doesn't need Blender). Required ahead of P1.05 (Asset Pipeline cleanup).

## Next milestone

**Either P1.07 (validate-ontology cross-check) — proceeds without Blender — OR P1.05 (Blender cleanup) once user confirms Blender 4.x is installed.** Recommendation: dispatch P1.07 next while Blender confirmation lands in parallel. Validate-ontology will surface any registry/ontology drift before cleanup is applied.

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
| Local verify | ✅ green | Typecheck + 7 schemas + build all pass |
| CI on main | ⏳ runs on next push | Pushed with each commit; check Actions tab |

## Pending external inputs

- **User "go" to dispatch P1.02** (Anatomy Domain).
- **Blender install confirmation** — does not block P1.02; required ahead of P1.05.
- **Anatomist reviewer cadence confirmation** — required before P1.16 (review batch).
