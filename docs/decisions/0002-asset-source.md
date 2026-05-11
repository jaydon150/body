# ADR 0002 — Asset source: build on Z-Anatomy / BodyParts3D

**Status:** Accepted
**Date:** 2026-05-11
**Deciders:** orchestrator, user
**Supersedes:** —

## Context

The viewer needs anatomical 3D meshes. Options span a wide range of cost, quality, license, and effort:

- **Free / open** — Z-Anatomy (a curated remix of BodyParts3D), BodyParts3D itself, Open Anatomy Project, Visible Human Project.
- **Commercial single-license** — Plastic Boy, TurboSquid medical packs.
- **Commercial enterprise** — Zygote, 3D4Medical, BioDigital SDK.
- **Sculpt from scratch** — hand-author every structure.

The decision is forced by four constraints, all set by the user:

1. **Distribution model.** Open academic. No commercial pivot planned. This removes the share-alike incompatibility that would otherwise rule out Z-Anatomy and BodyParts3D for a commercial product.
2. **Budget.** Free start. Migration to paid is reserved as a post-v1 option but not in the active plan.
3. **v1 scope.** Integumentary, skeletal, muscular. Z-Anatomy's strongest coverage areas are skeletal and (to a lesser extent) muscular.
4. **Quality bar.** Credible at university level, not surgical-grade.

Sculpting from scratch is a 2–7 year effort by a skilled medical 3D artist even for v1's scope, and AI cannot shortcut anatomically accurate mesh generation in 2026 (text-to-3D produces plausible-looking but anatomically wrong geometry; medical-segmentation AI requires upstream volumetric data and labels, not a prompt). Where AI does help — retopology, LOD generation, rigging, animation — it helps *on top of* existing geometry.

The CC-BY-SA-2.1-JP license on Z-Anatomy / BodyParts3D is share-alike, and version-compatibility with CC-BY-SA-4.0 is a real legal question that depends on jurisdiction. Pre-launch compliance review will resolve this; in the meantime, derivatives carry the upstream Japan-license obligations alongside the project's own CC-BY-SA-4.0 declarations.

## Decision

Use **Z-Anatomy / BodyParts3D as the v1 asset base.** Build on top of existing geometry; do not sculpt from scratch. Reserve **targeted hand-authored or commissioned replacement meshes** for individual high-stakes structures (typically heart, brain) as a post-v1 option if the free quality is insufficient for specific organs.

The asset pipeline is designed source-agnostic from the start: it ingests meshes keyed by anatomical ID, applies cleanup and LODs, and bakes a registry. Swapping a single mesh for a higher-quality replacement is a per-ID operation, not a pipeline rewrite.

## Consequences

### Positive

- Cash cost: zero for v1.
- Time-to-first-anatomy: weeks, not years.
- Existing FMA mapping in BodyParts3D matches ADR 0001's identifier choice.
- Z-Anatomy's coverage of v1's chosen systems (especially skeletal) is among its strongest.
- License is compatible with the open academic distribution stance.

### Negative

- Topology quality is rough: self-intersections, non-manifold geometry, inconsistent normals. The `02-clean-meshes` pipeline will need significant Blender work, especially for muscular and skin.
- Internal organ detail is shallow. Heart chambers exist but no separable coronary tree. Liver is one blob (no Couinaud segments). Lungs have major airways, not the deep bronchial tree. Kidney has no nephrons. Not a blocker for v1 (organ floor) but a real constraint for any later organ-deep-dive phase.
- Vasculature and innervation thin out fast past major structures. Functional anatomy (named branches, supply territories) is largely absent and will need hand-authoring in Phase 2+.
- Female anatomy coverage is limited. v1 is male; female reserved.
- Share-alike chain is inherited permanently. Any future contributor or fork must respect it.

### Neutral

- Visual style: textbook-diagram, not photoreal. This may align with the educational positioning, but it is a stylistic constraint set by the source, not a deliberate design choice. Re-shading is possible later.
- Rigging and animation are not included in the source and must be authored or AI-generated on top.

## Alternatives considered

- **Commercial license (Plastic Boy / Zygote / 3D4Medical).** Rejected: cost, and incompatible with open academic distribution without complex sublicensing.
- **Sculpt from scratch.** Rejected: years of skilled labour with no quality differentiation; AI cannot replace anatomical accuracy in 2026.
- **Hybrid free-plus-paid from day one.** Rejected: premature optimisation. Resurface as a post-v1 option per-organ if needed.
- **Visible Human Project as primary source.** Rejected: it ships sectional images, not labeled meshes. Conversion is enormous work — essentially what Open Anatomy Project already did from other sources.

## References

- BodyParts3D (DBCLS, Japan): https://lifesciencedb.jp/bp3d/
- Z-Anatomy: https://www.z-anatomy.com/
- Open Anatomy Project (Brigham / SPL Harvard): https://www.openanatomy.org/
- ATTRIBUTIONS.md — full upstream chain
- ADR 0001 — graph-not-tree (sets the identifier scheme this asset path aligns with)
