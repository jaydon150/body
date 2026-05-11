# Project Status

One-page snapshot of where the project is right now. Updated by the orchestrator at each significant transition.

**Last updated:** 2026-05-11
**Current phase:** Phase 0 — Infrastructure
**Overall health:** Green

---

## Right now

Phase 0 dispatched and in progress. Infrastructure-only work — no anatomical content yet.

## Active work

- Orchestrator artifacts being committed.
- Agent prompts + state scaffolds queued.
- Contract JSON Schema stubs queued.
- App skeleton + CI queued.
- GitHub private repo + initial push queued.

## Blockers

- None active for Phase 0.
- Deep research feed (external) still pending — does **not** block Phase 0; **does** block start of Phase 1.

## Next milestone

**Phase 0 done:** folder + agents + contracts + CI + app skeleton + first commit pushed to private GitHub repo `body`. Retro doc written. User approves phase close.

## Upcoming gates (user approval required)

1. End of Phase 0 — full Phase 0 acceptance review.
2. Start of Phase 1 — Phase 1 Spec v0.1 drafted from master spec + deep-research-informed ontology decisions.

## Recent decisions

See [decision-log.md](decision-log.md) for full chronological record. Latest:

- 2026-05-11: License configuration B locked (AGPL + CC-BY-SA + CC-BY).
- 2026-05-11: Asset path locked to Z-Anatomy / BodyParts3D, build-on-top-of.
- 2026-05-11: Agent roster restructured from pasted plan (16 agents, 3 tiers, see system-map).

## Working assumptions to validate

- Git Credential Manager handles GitHub auth at push time (user reported "auth done"; `gh` CLI not installed; will validate at push step).
- Node 24.x and npm 11.x are sufficient for Vite + R3F scaffold (verified locally; will validate at scaffold step).
- University anatomist reviewer pool is reachable for Phase 1 content review (user-supplied; will validate before Phase 1 content begins).

## Health signals

| Signal | State | Notes |
|--------|-------|-------|
| Folder structure | ✅ laid down | Per spec |
| Git + LFS | ✅ initialized | Long-paths enabled, LFS rules in `.gitattributes` |
| Licenses | ✅ verbatim | Fetched from gnu.org and creativecommons.org |
| Master spec | ✅ committed | First version |
| ADRs | ⏳ pending | Three foundational ADRs queued |
| Agent prompts | ⏳ pending | Tier 1 agents queued |
| Contract schemas | ⏳ pending | Seven stubs queued |
| App skeleton | ⏳ pending | Vite + R3F scaffold queued |
| CI | ⏳ pending | Workflow file queued |
| Initial push | ⏳ pending | Will check auth at push time |
