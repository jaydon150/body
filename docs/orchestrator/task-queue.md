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

_None. Phase 0 closed. Awaiting Phase 1 dispatch._

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

## Phase 1 — First system slice (blocked until Phase 0 closed)

- `[!] P1` Awaiting deep-research feed for ontology + dataset confirmation
- `[ ] P1` Import Z-Anatomy skeletal meshes via `pipelines/01-import-bp3d`
- `[ ] P1` Build skeletal sub-ontology (FMA-aligned, graph form)
- `[ ] P1` Skeletal mesh registry + LOD chains
- `[ ] P1` Renderer + selection + peel mechanic for skeletal system
- `[ ] P1` UI: sidebar tree, breadcrumbs, search, click-to-name
- `[ ] P1` Content first pass: descriptions for top 50 skeletal structures, anatomist review
- `[ ] P1` Vertical-slice acceptance: peel + isolate + dive on skeletal end-to-end

## Phase 2+

Placeholders. Expanded once Phase 1 vertical slice is accepted.

---

## Append: handoff notes

Specialists append here when they complete or block a task. Format: `YYYY-MM-DD | agent | task | note`.

- 2026-05-11 | orchestrator | Phase 0 dispatched after user approval of Phase 0 Spec v0.1.
- 2026-05-11 | orchestrator | Phase 0 closed. All 12 spec tasks completed. Initial commit `311e18a` pushed to `jaydon150/body` (private). Local `npm run verify` passes. Retro at `docs/orchestrator/retros/phase-0-retro.md`. Awaiting user sign-off and deep-research feed before Phase 1 spec drafting.
