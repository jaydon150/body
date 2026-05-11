# Project Status

**Last updated:** 2026-05-11 (late evening)
**Current phase:** Phase 1 in progress. Step P1.01 complete; P1.02 ready to dispatch.
**Overall health:** Green

---

## Right now

- Phase 1 step P1.01 (Research/Docs UBERON→FMA skeletal crosswalk) **complete**. Deliverable at `docs/references/summaries/uberon-fma-skeletal-crosswalk.md` — ~70 verified anchor rows across 16 sub-regions plus ~30 flagged gaps.
- First file-backed Task-subagent dispatch validated end to end. ADR 0003's mechanism is now proven in production.
- Phase 1 Spec v0.2 in effect (iPad co-primary; plain naming + clinical-toggle; ADR 0006 runtime attribution criterion; peel UX validation deferred to Phase 2).
- User's procedural femur seed integrated. ADRs 0004 / 0005 / 0006 accepted.

## Active work

- **P1.02 (Anatomy Domain): draft skeletal sub-ontology** — ready to dispatch. Inputs: P1.01 crosswalk + ADR 0004 + ADR 0001. Outputs: populated `data/canonical/ontology/{nodes,relations,synonyms}.json` with ~80–120 nodes and their typed edges.

## Blockers

- None for the orchestrator. P1.02 ready to dispatch on user "go."
- Blender install confirmation still open from user — does not block P1.02 (Anatomy Domain doesn't need Blender). Required ahead of P1.05 (Asset Pipeline cleanup).

## Next milestone

**P1.02 dispatch.** Anatomy Domain consumes the crosswalk, runs the inferred-row second-pass batch, decides flagship-bone sub-structure depth (femur / humerus / etc.), populates the three ontology JSON files. Output feeds P1.03 (Asset Pipeline download) and P1.04+ (mesh ingestion).

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
