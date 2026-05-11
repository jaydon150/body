# Agents

This directory holds the prompts and state files for the agent roster that develops the project.

The system is described in [`docs/decisions/0003-agent-mechanism.md`](../decisions/0003-agent-mechanism.md) (the architectural decision) and [`docs/orchestrator/system-map.md`](../orchestrator/system-map.md) (the ownership matrix).

## File pairing

Every agent has two files:

- **`<name>.md`** — the agent's prompt. Role, scope, contracts, hard rules, escalation triggers. Treated as the agent's charter.
- **`<name>.state.md`** — the agent's running state. Append-only log of decisions, work completed, and open items. The agent reads this on every invocation to recover context.

## Tier conventions

- **Tier 1** — active from Phase 0. Always available; routinely dispatched.
- **Tier 2** — invoked on demand at gates or handoffs. Idle until called.
- **Tier 3** — deferred until a future phase. Stub prompts only; activated by an ADR.

## Roster index

### Tier 1

- [orchestrator](orchestrator.md) — routing, integration, decision shepherding (the user-facing role)
- [architect](architect.md) — cross-cutting design, schema authorship
- [anatomy-domain](anatomy-domain.md) — ontology graph, IDs, relations
- [asset-pipeline](asset-pipeline.md) — mesh ingestion, cleanup, LODs, registry
- [3d-engine](3d-engine.md) — renderer, scene graph, selection, camera, peel
- [ui](ui.md) — React app shell, panels, search, breadcrumbs
- [content](content.md) — descriptions, functional anatomy, quizzes (later phases)
- [qa](qa.md) — functional + perf + accuracy-review-queue
- [research-docs](research-docs.md) — external research ingestion, summaries
- [devops](devops.md) — CI, build, repo hygiene

### Tier 2

- [ux-accessibility](ux-accessibility.md) — feature-gate reviews
- [reviewer](reviewer.md) — handoff reviews
- [data-steward](data-steward.md) — canonical store hygiene, lineage, backups

### Tier 3

- [localization](localization.md) — multilingual nomenclature (Phase 4+)
- [compliance](compliance.md) — disclaimers, license obligations (pre-launch)
- [user-testing](user-testing.md) — user research facilitation (Phase 1+)

## How dispatch works

1. The orchestrator decomposes a request, identifies the agent, and dispatches a Task subagent.
2. The subagent reads its prompt + state.
3. The subagent reads any inputs from its scope.
4. The subagent performs work and writes outputs to its scope.
5. The subagent appends an entry to its state file describing what it did.
6. The subagent returns a summary to the orchestrator.
7. The orchestrator updates `docs/orchestrator/task-queue.md` and `docs/orchestrator/status.md`.

## Hard rules across all agents

- No agent reaches outside its owned paths.
- Cross-agent work routes through the orchestrator.
- State files are append-only logs.
- Contracts are versioned; breaking changes require an ADR.
- Hand-offs are explicit and reference the receiving agent + contract.
- The orchestrator does not implement; it dispatches.
