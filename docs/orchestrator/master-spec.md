# Master Spec

**Project:** `body` — interactive 3D human-body atlas
**Root:** `C:\Users\Jaydon\Desktop\body\`
**Status:** Phase 0 — Infrastructure
**Last updated:** 2026-05-11

This document is the single source of truth for what is decided and what is open. Append to the decision log when anything here changes. Sections marked "locked" do not change without an ADR.

---

## 1. Identity (locked)

- **Project name:** `body`
- **Audience:** personal project with open academic distribution as the goal
- **Distribution model:** open, non-commercial. No commercial pivot planned.
- **Repository:** GitHub private during early development; reserved name `body`. Public release contingent on Phase 0 completion and content readiness.

## 2. Stack (locked, refined 2026-05-11 evening)

- **Platforms:** web-first; **desktop browser and iPad as co-primary targets** (per Phase 1 Spec v0.2 user refinement). iPhone and Android phones remain out of scope.
- **Engine:** Three.js via react-three-fiber
- **Framework:** React + TypeScript + Vite
- **Renderer baseline:** WebGL2, with WebGPU upgrade where available
- **Out of scope for v1:** phone form factors, VR/AR, Unity/Unreal native, volumetric rendering

## 3. Asset path (locked, refined by ADR 0005)

- **Primary source:** BodyParts3D (CC-BY-SA-2.1-JP, verified directly at the upstream license page on 2026-05-11)
- **Supplementary source:** OpenAnatomy (3D Slicer License, commercialization-permissive) for regional atlases where it exceeds BodyParts3D coverage. Brain is the first such region; full integration deferred until Phase 2.
- **Watch list (not active):** Z-Anatomy — moved off the active list pending maintainer clarification of its contradictory license trail and absent ontology mapping.
- **Strategy:** build on top of existing, do not sculpt from scratch.
- **Post-v1 commercial upgrade short-list:** Zygote for targeted region replacements if open quality is insufficient. BioDigital / Complete Anatomy / Visible Body are not asset suppliers for this project; their licensing models do not support our use case without enterprise contracts.
- See [ADR 0002](../decisions/0002-asset-source.md) and [ADR 0005](../decisions/0005-asset-source-refinement.md).

## 4. License map (locked)

| Layer | License | File |
|-------|---------|------|
| Code | AGPL-3.0-or-later | `LICENSE` |
| Anatomical content + data | CC-BY-SA-4.0 | `LICENSE-CONTENT` |
| Project documentation | CC-BY-4.0 | `LICENSE-DOCS` |
| Runtime attribution (in-asset + in-product) | per ADR 0006 | baked into glTF metadata + in-app "About this atlas" surface |
| Upstream BodyParts3D | CC-BY-SA-2.1-JP (verified 2026-05-11) | `ATTRIBUTIONS.md` |
| Upstream OpenAnatomy (Phase 2+) | 3D Slicer License | `ATTRIBUTIONS.md` |

Configuration B per the licensing decision. Choice documented in [ADR 0002](../decisions/0002-asset-source.md).

## 5. Anatomical model (locked, refined by ADR 0004)

- **Structure:** typed directed acyclic graph (not a tree). Multiple parents per node permitted.
- **Identifier scheme:** UBERON IDs as primary (`UBERON:NNNNNNN`). FMA and TA2 codes preserved as aliases. Project-local `BODY:NNNN` reserved for structures with no upstream ontology equivalent.
- **Display vocabulary:** Terminologia Anatomica 2 (TA2) as primary source for English and Latin labels and synonyms.
- **Relation types (initial):** `regional_part_of`, `constitutional_part_of`, `systemic_part_of`, `member_of`, `branch_of`, `tributary_of`, `innervates`, `supplied_by`.
- See [ADR 0001](../decisions/0001-graph-not-tree.md) and [ADR 0004](../decisions/0004-ontology-primary-uberon.md).

## 6. v1 scope (locked)

- **Systems:** integumentary, skeletal, muscular
- **Anatomical floor:** organ-level (tissue and cellular deferred to later phases)
- **Body variant:** male only (female reserved for later)
- **Demonstration target:** system isolation, layer peel (region-aware presets, not global slider), dive-deeper navigation with breadcrumbs, click-to-name, search

## 7. Phasing

| Phase | Goal | Status |
|-------|------|--------|
| 0 — Infrastructure | folder, agents, contracts, CI, app skeleton | **closed 2026-05-11** |
| 1 — First system slice | one system end-to-end (skeletal as starter) | spec drafting |
| 2 — Widen | second and third systems, refine interaction model | not started |
| 3 — Depth | organ-level focus on flagship structures | not started |
| 4 — Content scale + a11y + i18n + compliance review | not started | not started |
| 5 — Open academic launch | public repository, DOI via Zenodo or similar | not started |

Tissue, cellular, female anatomy, pathology overlays, mobile, and VR are reserved for **post-v1** consideration.

## 8. Agent system (locked, see [system-map.md](system-map.md))

10 Tier 1 agents active from Phase 0, 3 Tier 2 invoked on demand, 3 Tier 3 deferred. Orchestrator is the user-facing role; specialists dispatched as file-backed Task subagents with per-agent prompt + state pairs.

## 9. Approval / gate model (locked)

- Orchestrator drafts specs and dispatches; user approves every dispatch.
- Architectural decisions land as ADRs in `docs/decisions/`.
- Phase transitions require master-spec update, status update, and retro doc.

## 10. Hard constraints

- **No commercial pivot.** Asset path and license configuration are chosen to lock this in.
- **No anatomical work in Phase 0.** Infrastructure only. Content begins in Phase 1.
- **No agent operates outside its scope.** Cross-agent work routes through the orchestrator.
- **Anatomical accuracy is mandatory.** Every published structure passes anatomist review before public release.

## 11. Risks tracked

| Risk | Mitigation | Owner |
|------|-----------|-------|
| Z-Anatomy share-alike conflicts with future commercial path | Open academic stance locked; no commercial pivot | Orchestrator |
| Topology quality of free meshes requires significant cleanup time | Pipeline `02-clean-meshes` budgets this work | Asset Pipeline |
| Functional anatomy (innervation, supply) absent from free data | Hand-author in Phase 2+ with anatomist review | Content + Anatomy Domain |
| Draw-call ceiling on WebGL2 with many separate meshes | Plan for instancing and per-system merged geometry, WebGPU upgrade path | 3D Engine |
| Anatomist availability constrains review throughput | Batch reviews; queue managed by QA | QA |
| FMA's public OBO track is stale; reliance on it as upstream is brittle | UBERON primary per ADR 0004; FMA used only as alias and via BodyParts3D's existing FMA mapping | Anatomy Domain |
| FMA→UBERON crosswalk gaps for non-canonical structures | Project-local `BODY:NNNN` IDs for orphans; Anatomy Domain owns the crosswalk task list | Anatomy Domain |
| Share-alike obligation traveling with deployed assets | Runtime attribution baked into glTF metadata + in-app surface per ADR 0006; CI fails on unattributed canonical meshes | Asset Pipeline + UI |
| iPad GPU constraints vs draw-call ceiling | LOD downshift on tablet, instancing for repeated structures, aggressive perf budget | 3D Engine |
| ~~OpenAnatomy atlas-page license inheritance not fully verified~~ | **RESOLVED 2026-05-11.** Verified at `openanatomy.org/atlas-pages/slicer-license.html` and per-atlas LICENSE files. Atlases inherit 3D Slicer License (BSD-style, permissive, no share-alike, attribution required). ADR 0005 references updated. | Research/Docs |

## 12. Out of scope (locked)

- Cellular and molecular detail
- Female anatomy variants
- Pathology overlays
- Mobile platforms
- VR / AR
- Native (Unity / Unreal)
- Clinical / diagnostic use
- Commercial distribution
- Multilingual content (until Phase 4+)

---

## Change log

| Date | Change | Source |
|------|--------|--------|
| 2026-05-11 | Initial spec committed at start of Phase 0 | Orchestrator |
| 2026-05-11 | Phase 0 closed. §3 asset path refined per ADR 0005 (BodyParts3D primary + OpenAnatomy supplement; Z-Anatomy demoted). §4 license map split BodyParts3D and OpenAnatomy chains. §5 anatomical model flipped to UBERON-primary per ADR 0004. §7 Phase 0 marked closed; Phase 1 marked spec-drafting. §11 added two new risks. | Orchestrator |
| 2026-05-11 (evening) | Phase 1 Spec v0.2 incorporates user refinements: iPad added to §2 as co-primary platform; §4 license map gains a runtime-attribution row pointing to ADR 0006; §11 risks expanded with runtime-attribution, iPad-GPU, and OpenAnatomy-verification entries. ADR 0006 (runtime attribution) drafted and accepted. | Orchestrator |
