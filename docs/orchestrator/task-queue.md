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

- `[ ] P1.01` Research/Docs: extract UBERON's FMA xref subset for skeletal terms (independent; can start first)
- `[ ] P1.02` Anatomy Domain: draft skeletal sub-ontology (nodes, relations, synonyms — UBERON primary, FMA alias, TA2 labels)
- `[ ] P1.03` Asset Pipeline: download BodyParts3D into `data/raw/bodyparts3d/`
- `[ ] P1.04–06` Asset Pipeline: import → clean → LOD
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
