# Task Queue

Active queue, in-progress items, and what's blocked. The orchestrator maintains this; specialists append handoff notes when they complete or block.

## Conventions

- `[ ]` pending
- `[~]` in progress (only one per agent at a time)
- `[x]` done
- `[!]` blocked — include reason and required unblock
- Tasks reference owning agent in parentheses
- Phase tag at left bracket (`P0`, `P1`, etc.)

---

## In progress

- `[~] P1` Phase 1 Spec v0.1 drafted at [`docs/orchestrator/phase-1-spec.md`](phase-1-spec.md) — awaiting user approval and answers to 7 open questions before dispatch.
- `[~] P1-seed` User-directed selectable procedural femur proxy keyed to `UBERON:0000981`; not a replacement for the Phase 1 BodyParts3D import plan.

## Phase 0 — Infrastructure (CLOSED 2026-05-11)

- `[x] P0` Folder skeleton at `~/desktop/body/` (orchestrator)
- `[x] P0` Git init, LFS install, long-paths enabled, `.gitignore` + `.gitattributes` (orchestrator)
- `[x] P0` License files (AGPL-3.0, CC-BY-SA-4.0, CC-BY-4.0) + README + ATTRIBUTIONS (orchestrator)
- `[x] P0` Orchestrator artifacts: master-spec, system-map, task-queue, decision-log, status, retro-template (orchestrator)
- `[x] P0` ADRs: 0001 graph-not-tree, 0002 asset-source, 0003 agent-mechanism + 0000 ADR template (orchestrator)
- `[x] P0` Tier 1 agent prompts + empty state files (orchestrator). Tier 2 + 3 stubs included.
- `[x] P0` Seven cross-agent contract JSON Schema stubs (orchestrator-as-architect)
- `[x] P0` `app/web/` skeleton: Vite + React + TypeScript + R3F, renders empty canvas (orchestrator-as-3D-Engine)
- `[x] P0` CI skeleton at `.github/workflows/ci.yml` + schema validation tooling (orchestrator-as-DevOps + QA)
- `[x] P0` End-to-end check: typecheck clean, schema validation passes, app builds (verified locally `npm run verify`)
- `[x] P0` Create GitHub private repo `jaydon150/body`, push initial commit `311e18a` (orchestrator-as-DevOps)
- `[x] P0` Phase 0 retro doc at `docs/orchestrator/retros/phase-0-retro.md`

## Phase 1 — First system slice (skeletal). Spec at [`phase-1-spec.md`](phase-1-spec.md).

Phase 1 has 20 sequenced dispatches across the agent roster. Full plan in the spec; this is the headline queue:

- `[x] P1.01` Research/Docs: extract UBERON's FMA xref subset for skeletal terms — DONE 2026-05-11. Deliverable: `docs/references/summaries/uberon-fma-skeletal-crosswalk.md` (~70 verified anchor rows + ~30 flagged gaps). First formal Phase 1 dispatch via file-backed Task subagent. ADR 0003 mechanism proven.
- `[x] P1.02` Anatomy Domain: draft skeletal sub-ontology — DONE 2026-05-11. 125 nodes, 125 typed edges (regional_part_of 70, member_of 30, constitutional_part_of 24, systemic_part_of 1). DAG verified, no cycles, schema-valid, build green. Zero `BODY:NNNN` needed. Femur seed preserved.
- `[x] P1.03` Asset Pipeline: download BodyParts3D into `data/raw/bodyparts3d/` — DONE 2026-05-11. ~210 MB across 10 files. Both archive ZIPs (isa 137 MB + partof 62 MB) integrity-checked and gitignored; all text provenance (README, LICENSE, 6 TSV mapping tables, upstream README_e.html, per-source license registry entry) tracked.
- `[x] P1.04` Asset Pipeline: OBJ → glb conversion — DONE 2026-05-11. 79 canonical glbs produced in `data/canonical/meshes/uberon_NNNNNNN/lod0.glb`, total 9.4 MB. Attribution baked via `gltf-pipeline.processGlb` post-process. Both halves of paired bones merged at OBJ-text level and preserved as separate glTF mesh nodes (selectable individually). 0 conversion failures. 29 BP3D-side gaps documented in `pipelines/01-import-bp3d/gap-report-2026-05-11.md`.
- `[x] P1.05` Asset Pipeline: Blender headless cleanup — DONE 2026-05-11. **79/79 cleaned successfully, 0 failures.** Vertex count down 8.9% (262,862 → 239,519). File size down 6.34% (9.35 MB → 8.76 MB). 9.83s Blender pass + <1s reinject + <1s source.txt update. Two glbs flagged for hand-review (ethmoid + body of sternum, non-manifold geometry).
- `[ ] P1.06` Asset Pipeline: decimate-lods (Blender; LOD0 already in place, generates LOD1 + LOD2)
- `[ ] P1.07` Asset Pipeline + Anatomy Domain: validate-ontology cross-check
- `[ ] P1.08` Asset Pipeline: bake registry
- `[ ] P1.09` Architect + QA: upgrade schema validation to ajv meta-schema
- `[ ] P1.10–12` 3D Engine: rendering, picking, selection, outline, peel, dive-deeper
- `[ ] P1.13–14` UI: layout + sidebar + breadcrumbs + search + panel + integration with 3D Engine
- `[ ] P1.15–16` Content: first batch (50–100 structures) → anatomist review
- `[ ] P1.17` QA: visual regression baselines, perf budgets, accuracy queue
- `[ ] P1.18` UX/Accessibility audit (Tier 2)
- `[ ] P1.19` Reviewer passes at handoffs 3, 8, 14 (Tier 2)
- `[ ] P1.20` Orchestrator: end-to-end check + Phase 1 retro

## Phase 2+

Placeholders. Expanded once Phase 1 vertical slice is accepted.

---

## Append: handoff notes

Specialists append here when they complete or block a task. Format: `YYYY-MM-DD | agent | task | note`.

- 2026-05-11 | orchestrator | Phase 0 dispatched after user approval of Phase 0 Spec v0.1.
- 2026-05-11 | orchestrator | Phase 0 closed. All 12 spec tasks completed. Initial commit `311e18a` pushed to `jaydon150/body` (private). Local `npm run verify` passes. Retro at `docs/orchestrator/retros/phase-0-retro.md`. Awaiting user sign-off and deep-research feed before Phase 1 spec drafting.
- 2026-05-11 | orchestrator | Phase 0 signed off by user. Research feed ingested at `f0941ba`. ADRs 0004 (ontology pivot to UBERON) and 0005 (asset source refinement) drafted and approved. Master spec and schemas updated. Phase 1 Spec v0.1 drafted at `docs/orchestrator/phase-1-spec.md`. Awaiting user approval and answers to 7 open questions before dispatching Phase 1.
- 2026-05-11 | orchestrator | Phase 1 Spec v0.2 published (iPad co-primary, plain naming + nomenclature toggle, ADR 0006 runtime attribution criterion, peel UX deferred to Phase 2). User's procedural femur seed integrated. Commit `e60bb9e`.
- 2026-05-11 | research-docs (subagent) | P1.01 complete. UBERON→FMA skeletal crosswalk delivered. ~70 verified anchor rows across 16 sub-regions; ~30 sub-structure rows flagged for Anatomy Domain second-pass. UBERON's FMA xref coverage is comprehensive for skeletal — no `BODY:NNNN` IDs needed so far. Rib 8 anomaly (non-contiguous UBERON ID) and comparative-anatomy label register mismatch (~25 rows) flagged for downstream handling. First Task-subagent dispatch validated ADR 0003.
- 2026-05-11 | anatomy-domain (subagent) | P1.02 complete. Skeletal sub-ontology populated: 125 nodes (1 system, 16 region, 108 structure) + 125 typed edges. DAG verified clean. Zero `BODY:NNNN` IDs assigned — UBERON's skeletal coverage was complete for every Phase 1 target. **P1.01 inferred T8 row was wrong** — subagent caught it during second-pass batch and corrected (real T8 is UBERON:0011050, not the inferred UBERON:0004633 which is actually T9). Caught humerus-neck unusual high-prefix UBERON:4200172 (still schema-valid). All seven schemas + typecheck + vite build green.
- 2026-05-11 | orchestrator | OpenAnatomy license verification fully resolved at canonical source (`openanatomy.org/atlas-pages/slicer-license.html` + per-atlas LICENSE.md). 3D Slicer License is BSD-style, permissive, no share-alike. ADR 0005 references updated; Phase 1 follow-up closed. Commit `549a040`. ADR 0006 status confirmed (committed, operationalized in Phase 1 Spec acceptance criterion #18).
- 2026-05-11 | asset-pipeline (subagent) | P1.03 complete. BodyParts3D archives downloaded from `dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/` — isa archive (137 MB, 2,234 OBJ files matching expected count) + partof archive (62 MB, 1,258 OBJ files) + 6 TSV mapping tables. ZIPs gitignored; text provenance + mapping tables tracked. Sharp edges flagged: (a) mirror page shows CC BY 4.0 summary while canonical page shows CC BY-SA 2.1 JP — project follows canonical per ADR 0005, compliance review pre-launch; (b) CC BY-SA 2.1 JP authoritative legal code is Japanese-only, English is a summary; (c) OBJ filenames use FJ-prefix (e.g. FJ1252.obj) not FMA-prefix — P1.04 must pivot via `isa_element_parts.txt`; (d) PART-OF archive kept on disk for Phase 2+ compound-organ assembly even though Phase 1 only uses IS-A.
- 2026-05-11 | asset-pipeline (subagent) | P1.04 complete. **79 canonical glbs** produced in `data/canonical/meshes/uberon_NNNNNNN/lod0.glb` (9.4 MB total, mean 118 KB, range 10 KB pisiform → 980 KB scapula). Tooling: `obj2gltf` for conversion + `gltf-pipeline.processGlb` post-process for attribution injection (CLI flag path on obj2gltf v3 no longer available). **0 conversion failures.** Attribution chain verified: every glb's `asset.copyright` carries the verbatim BodyParts3D notice + `asset.extras.source` carries source/license/original_id/fma_id/ingested_at. Clever handling of **paired bones (45 of 79)**: BP3D ships left+right as separate FJ files; subagent merged at OBJ-text level with v/vn/vt index rebasing, preserved as separate glTF mesh nodes for individual runtime selectability. **Sternum gap is recoverable as a composite** — UBERON:0000975 has no whole-sternum mesh but all 3 sub-components converted; P1.08 can synthesize. 29 BP3D-side gaps documented (mostly sub-structures like femur head/neck/shaft and phalanges-of-manus/pes). **P1.05 blocked on user Blender 4.x install confirmation.**
- 2026-05-11 | orchestrator | Blender 5.1.1 verified at `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe` (one major version newer than spec assumed; mesh ops stable across gap). P1.05 unblocked.
- 2026-05-11 | asset-pipeline (subagent) | P1.05 complete. **79/79 glbs cleaned, 0 failures.** Vertex count -8.9% (262,862 → 239,519), file-size -6.34% (9.35 MB → 8.76 MB). Cleanup: `remove_doubles` + `normals_make_consistent` per mesh inside each glb. Two glbs flagged for hand-review: `uberon_0001679` (ethmoid, 2 non-manifold edges + 7 verts on intricate paranasal-sinus geometry) and `uberon_0006820` (sternum body, 24 non-manifold verts from 99% decimation). Confirmed empirically: **Blender 5.1's glTF exporter trampled `asset.copyright` and dropped `asset.extras` unconditionally despite `export_copyright`/`export_extras` flags** — pre-Blender snapshot + post-Blender re-inject is the only reliable preservation path. GLB v2 JSON chunk 4-byte padding (0x20 space) + BIN chunk padding (0x00) handled correctly. Cleanup is idempotent (re-running on same glb produces no further welds). P1.06 dispatchable next (LOD chain generation).
