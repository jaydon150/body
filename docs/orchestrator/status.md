# Project Status

**Last updated:** 2026-05-11 (late evening, post-P1.03)
**Current phase:** Phase 1 in progress. Steps P1.01–P1.03 complete; P1.04 ready to dispatch (Blender needed for P1.05 onward).
**Overall health:** Green

---

## Right now

- Phase 1 steps P1.01, P1.02, P1.03 **complete**. The skeletal sub-ontology is real (125 UBERON-primary nodes + 125 typed edges). BodyParts3D archives are on disk (210 MB) with full provenance recorded per ADR 0006.
- OpenAnatomy license verification fully resolved at canonical source.
- Three file-backed Task-subagent dispatches now executed cleanly. ADR 0003 is thrice-proven.
- LFS bandwidth preserved: raw mesh ZIPs gitignored, text provenance + FMA mapping tables tracked.

## Active work

- **P1.04 (Asset Pipeline): import IS-A archive — unzip OBJ → convert to glb** — ready to dispatch. Pivots through `isa_element_parts.txt` (FMA → FJ-prefix → OBJ file). Does not yet need Blender (that's P1.05 cleanup). Will produce working-tier glb files in `data/canonical/meshes/<UBERON-id>/` aligned with the ontology populated in P1.02.

## Blockers

- None for the orchestrator. P1.02 ready to dispatch on user "go."
- Blender install confirmation still open from user — does not block P1.02 (Anatomy Domain doesn't need Blender). Required ahead of P1.05 (Asset Pipeline cleanup).

## Next milestone

**P1.04 dispatch.** Asset Pipeline unzips the IS-A archive, walks `isa_element_parts.txt` to map FMA IDs to FJ-prefix OBJ filenames, and converts each OBJ to glb keyed by the UBERON ID from the ontology (via the FMA→UBERON crosswalk built in P1.01 + P1.02). Output: working-tier glb files in `data/canonical/meshes/<UBERON-id>/`. **Blender not needed for this step** (OBJ→glb is doable in pure JS/Python without Blender). P1.05 cleanup is the Blender step.

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
