# Project Status

**Last updated:** 2026-05-11 (late evening, post-P1.02)
**Current phase:** Phase 1 in progress. Steps P1.01–P1.02 complete; P1.03 ready to dispatch.
**Overall health:** Green

---

## Right now

- Phase 1 steps P1.01 and P1.02 **complete**. The skeletal sub-ontology is real: 125 UBERON-primary nodes + 125 typed edges populated in `data/canonical/ontology/` and validated against the schemas.
- Notable catch in P1.02: the P1.01 pattern-inferred T8 row was wrong (would have caused a labeling bug downstream). Anatomy Domain's mechanical second-pass found the real T8 at `UBERON:0011050`. Agent-handoff design is paying off.
- Two file-backed Task-subagent dispatches now executed cleanly. ADR 0003 is twice-proven.

## Active work

- **P1.03 (Asset Pipeline): download BodyParts3D into `data/raw/bodyparts3d/`** — ready to dispatch. First step that touches the asset side; will verify the BodyParts3D download URL is accessible and pull the archive. Does not yet need Blender (that's P1.05).

## Blockers

- None for the orchestrator. P1.02 ready to dispatch on user "go."
- Blender install confirmation still open from user — does not block P1.02 (Anatomy Domain doesn't need Blender). Required ahead of P1.05 (Asset Pipeline cleanup).

## Next milestone

**P1.03 dispatch.** Asset Pipeline verifies the BodyParts3D download URL is accessible and pulls the archive into `data/raw/bodyparts3d/`. Subsequent P1.04–P1.08 chain (import → clean → LOD → validate → bake registry) follows. Blender install confirmation needed before P1.05.

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
