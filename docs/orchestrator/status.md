# Project Status

**Last updated:** 2026-05-11 (evening)
**Current phase:** Phase 0 signed off; Phase 1 Spec v0.1 drafted, awaiting user approval
**Overall health:** Green

---

## Right now

- Phase 0 closed and signed off by user.
- Deep-research feed ingested. One factual error in the source caught (BodyParts3D license claim). Two ADRs drafted and approved as a result: 0004 (ontology pivot to UBERON-primary) and 0005 (asset source refinement: BodyParts3D primary + OpenAnatomy supplement, Z-Anatomy demoted).
- Schemas updated for UBERON-primary across `anatomical-id`, `content-record`, `mesh-asset-manifest`, and `selection-event`. Local `npm run verify` still green: 7 schemas valid, typecheck clean, build in ~3.3s.
- Master spec §3 / §4 / §5 / §7 / §11 updated with ADR references and new risks.
- Phase 1 Spec v0.1 drafted at `docs/orchestrator/phase-1-spec.md`.

## Active work

_None dispatched. Phase 1 gated on user approval of Phase 1 Spec v0.1 + answers to 7 open questions._

## Blockers

- None for orchestrator. Awaiting user input.

## Next milestone

**Phase 1 dispatch.** Begins on user sign-off. First dispatch is Research/Docs (FMA→UBERON skeletal crosswalk) — independent of other steps, can run in background while remaining open questions resolve.

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
| Phase 1 Spec | ✅ drafted | Awaiting user approval |
| Local verify | ✅ green | Typecheck + 7 schemas + build all pass |
| CI on main | ⏳ runs on next push | Push will follow this commit |

## Pending external inputs

- User approval of Phase 1 Spec v0.1
- Answers to 7 open questions in Phase 1 Spec
- Anatomist reviewer cadence confirmation
