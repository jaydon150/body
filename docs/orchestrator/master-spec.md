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

## 2. Stack (locked)

- **Platform:** web-first, desktop and laptop browsers
- **Engine:** Three.js via react-three-fiber
- **Framework:** React + TypeScript + Vite
- **Renderer baseline:** WebGL2, with WebGPU upgrade where available
- **Out of scope for v1:** mobile, VR/AR, Unity/Unreal native, volumetric rendering

## 3. Asset path (locked)

- **Primary source:** Z-Anatomy / BodyParts3D
- **Upstream license:** CC-BY-SA-2.1-JP, share-alike accepted
- **Strategy:** build on top of existing, do not sculpt from scratch
- **Reserved option:** commission or carefully hand-author targeted high-stakes meshes (heart, brain) post-v1 if quality demands it
- See [ADR 0002](../decisions/0002-asset-source.md)

## 4. License map (locked)

| Layer | License | File |
|-------|---------|------|
| Code | AGPL-3.0-or-later | `LICENSE` |
| Anatomical content + data | CC-BY-SA-4.0 | `LICENSE-CONTENT` |
| Project documentation | CC-BY-4.0 | `LICENSE-DOCS` |
| Upstream Z-Anatomy / BodyParts3D | CC-BY-SA-2.1-JP | `ATTRIBUTIONS.md` |

Configuration B per the licensing decision. Choice documented in [ADR 0002](../decisions/0002-asset-source.md).

## 5. Anatomical model (locked)

- **Structure:** typed directed acyclic graph (not a tree). Multiple parents per node permitted.
- **Identifier scheme:** Foundational Model of Anatomy (FMA) IDs as primary; UBERON/TA2 as aliases via the synonyms file.
- **Relation types (initial):** `regional_part_of`, `constitutional_part_of`, `systemic_part_of`, `member_of`, `branch_of`, `tributary_of`, `innervates`, `supplied_by`.
- See [ADR 0001](../decisions/0001-graph-not-tree.md)

## 6. v1 scope (locked)

- **Systems:** integumentary, skeletal, muscular
- **Anatomical floor:** organ-level (tissue and cellular deferred to later phases)
- **Body variant:** male only (female reserved for later)
- **Demonstration target:** system isolation, layer peel (region-aware presets, not global slider), dive-deeper navigation with breadcrumbs, click-to-name, search

## 7. Phasing

| Phase | Goal | Status |
|-------|------|--------|
| 0 — Infrastructure | folder, agents, contracts, CI, app skeleton | **in progress** |
| 1 — First system slice | one system end-to-end (skeletal as starter) | not started |
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
