# ADR 0005 — Asset source refinement: BodyParts3D primary + OpenAnatomy supplement, Z-Anatomy demoted

**Status:** Accepted
**Date:** 2026-05-11
**Deciders:** orchestrator, user
**Supersedes:** ADR 0002 on the Z-Anatomy-as-equal-base clause. ADR 0002's broader "build on top of existing, do not sculpt from scratch" decision is unchanged.

## Context

ADR 0002 framed Z-Anatomy and BodyParts3D as roughly interchangeable Phase 1 asset bases. The 2026-05-11 research feed surfaced two practical problems with that framing:

- **Z-Anatomy's public license trail is contradictory.** Zenodo's package metadata lists CC BY 4.0; the public app license page says the application incorporates Z-Anatomy under CC BY-SA. Maintainer clarification has not been obtained. For open academic distribution this is uncomfortable but not fatal; for any future commercial pivot, it would be a blocker.
- **Z-Anatomy has no published FMA/UBERON/TA2 mapping table.** BodyParts3D explicitly publishes per-mesh FMA IDs (and via crosswalk, UBERON identities — see ADR 0004). Without a published mapping, every Z-Anatomy mesh requires hand-identification by an anatomist before it can be promoted to the canonical store. That cost is non-trivial at scale.

A second finding sharpens the picture: **OpenAnatomy** (Brigham and Women's Hospital / SPL Harvard) publishes regional atlases (notably a brain atlas with much richer structure coverage than BodyParts3D's brain). Its license is the 3D Slicer License (commercialization-permissive). For specific body regions where BodyParts3D is shallow, OpenAnatomy is a clean supplement.

The research also surveyed commercial options (Zygote, BioDigital, Complete Anatomy, Visible Body) with a useful nuance: **Zygote is the only commercial source whose public license terms clearly contemplate real-time software distribution.** The others require negotiated enterprise contracts that exceed the project's scope. This isn't a v1 decision, but it usefully narrows the future-upgrade short-list.

## Decision

**Primary asset source for v1: BodyParts3D.** Whole-body skeletal, muscular, integumentary coverage is sufficient and the FMA-mapped structure makes ontology alignment cheap.

**Supplementary asset source for v1: OpenAnatomy**, used per-region where its coverage exceeds BodyParts3D. The brain atlas is the first candidate region; this matters in Phase 2+ but the agent system is told about it now so pipeline conventions accommodate it.

**Z-Anatomy is moved to a watch list**, not the active source list. It remains a potential source if the license trail is clarified by maintainer contact; until then, no Z-Anatomy mesh is imported into the canonical store.

**Commercial fallback short-list, post-v1: Zygote** for targeted region replacements if open quality is insufficient. BioDigital / Complete Anatomy / Visible Body are not asset suppliers for this project; their licensing models are subscription-platforms, not asset libraries.

The "build on top of existing, do not sculpt from scratch" stance from ADR 0002 is unchanged. The change is which existing assets we build on.

## Consequences

### Positive

- Ontology alignment is cheap. BodyParts3D's FMA IDs crosswalk to UBERON (per ADR 0004) without bespoke identification per mesh.
- License chain is unambiguous and verified (BodyParts3D = CC BY-SA 2.1 Japan, per `lifesciencedb.jp/bp3d/info/license/index.html`).
- OpenAnatomy slot in the pipeline lets us upgrade specific regions later (brain especially) without re-architecting the import flow.
- Future commercial upgrade path is named (Zygote) without committing budget now.

### Negative

- BodyParts3D's underlying data has not been updated since 2013. New anatomical structures or revisions of existing ones (e.g. mesentery 2017, interstitium 2018) will not appear from upstream. Our application graph can model these; the meshes can't.
- BodyParts3D mesh topology is rough. Pipeline `02-clean-meshes` remediation cost is real (already budgeted in Phase 0).
- OpenAnatomy bundles use 3D Slicer formats (`.nrrd`, `.seg.nrrd`). Pipeline `01-import-bp3d` (designed around BodyParts3D's OBJ) needs an OpenAnatomy variant pipeline. Manageable; flagged for Phase 2 when brain region is approached.
- Z-Anatomy was a credible alternative; losing it means we don't get its artistic cleanup of BodyParts3D meshes. We re-do that cleanup ourselves.

### Neutral

- License compatibility with the open academic distribution stance is unchanged. CC BY-SA 2.1 JP and 3D Slicer License (essentially permissive) both fit.
- Pipeline naming: `pipelines/01-import-bp3d` is now accurately scoped. An `01-import-bp3d` and a future `01b-import-openanatomy` (or numbered sibling) sit side-by-side.

## Alternatives considered

- **Keep Z-Anatomy as a co-primary base.** Rejected: license ambiguity is a permanent risk surface; no upside that BodyParts3D doesn't provide.
- **OpenAnatomy as primary, BodyParts3D as supplement.** Rejected: OpenAnatomy is region-specific, not whole-body. The pipeline would carry constant gaps.
- **Visible Human Project as base.** Rejected: it's imaging, not meshes. Segmentation work is months of dedicated effort and we'd own all of it. ADR 0002 already considered this.
- **License Zygote now for v1.** Rejected: economically wrong for a personal project at this stage. Zygote remains in the future-upgrade slot.

## Pipeline impact

- `pipelines/01-import-bp3d/` — unchanged in scope. First runnable pipeline of Phase 1.
- `pipelines/01b-import-openanatomy/` — **new placeholder**, created lazily when OpenAnatomy is first imported (likely Phase 2 brain region). For Phase 0 the directory is not pre-created; Asset Pipeline scaffolds it when needed.
- `pipelines/02-clean-meshes/` — same Blender cleanup pass for both sources.
- Z-Anatomy import scripts are not authored. The `data/raw/z-anatomy/` directory remains in the tree as a placeholder for the watch-list status but is unused.

## References

- ADR 0002 — asset-source (the broader decision this ADR refines)
- ADR 0004 — ontology-primary-uberon (the crosswalk that makes BodyParts3D's FMA mapping useful)
- `docs/references/summaries/ontology-and-dataset-review.md` — the analysis that prompted this ADR
- `docs/references/raw/2026-05-11-ontology-and-dataset-review.md` — source material
- BodyParts3D license: https://lifesciencedb.jp/bp3d/info/license/index.html (verified 2026-05-11, CC BY-SA 2.1 Japan)
- OpenAnatomy license: https://www.openanatomy.org/atlas-pages/slicer-license.html (verified 2026-05-11) — atlases inherit the 3D Slicer License at the canonical project level
- Per-atlas LICENSE file example: https://github.com/mhalle/spl-brain-atlas/blob/master/LICENSE.md (verified 2026-05-11) — SPL brain atlas explicitly references the 3D Slicer License
- 3D Slicer License source: https://github.com/Slicer/Slicer/blob/main/License.txt — BSD-style three-part agreement, Part B governs downloads, no share-alike, attribution required, clinical use discouraged
- Zygote licensing: see source citation in references summary
