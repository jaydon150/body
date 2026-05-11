# ADR 0003 — File-backed Task subagents as the agent mechanism

**Status:** Accepted
**Date:** 2026-05-11
**Deciders:** orchestrator, user
**Supersedes:** —

## Context

The project is developed by a solo user plus an AI team modelled on a structured agent roster (orchestrator + specialists). The mechanism by which specialists are dispatched needs to be picked early — every downstream artifact (agent prompts, state files, contracts) depends on it.

Options surveyed:

1. **File-backed Task subagents.** Each agent has a prompt file and a state file in the repo. The orchestrator dispatches via Claude Code's Task tool, loading prompt + state at invocation. The subagent reads inputs from the repo, writes outputs back, and the orchestrator continues. State is persisted in files, not in agent memory.

2. **One long-lived session per agent.** Each agent is its own Claude Code session running in a separate terminal. Agents communicate via shared files. The orchestrator coordinates by writing to a shared task queue.

3. **MCP-wired specialists.** Agents are MCP servers exposing tools the orchestrator calls.

4. **External AI tools coordinated by orchestrator.** Mix of Claude Code, Cursor, Codex, etc., glued together by the orchestrator's task queue.

The user's input was permissive: "whatever handle you need for the best possible output."

## Decision

Use **file-backed Task subagents** as the primary mechanism.

- Each agent has `docs/agents/<name>.md` (prompt — role, scope, contracts, conventions, escalation triggers).
- Each agent has `docs/agents/<name>.state.md` (running log — decisions made, work completed, open items, handoffs).
- The orchestrator dispatches via the Task tool, passing the agent name. The subagent reads its prompt + state, reads any inputs from its scope, performs work, writes outputs to its scope, appends to its state file, and returns a summary.
- Cross-agent contracts live in `app/shared/schema/` as JSON Schemas, owned by the Architect agent.

## Consequences

### Positive

- Lowest overhead. One Claude Code session. No terminal-juggling.
- Native to the tooling. Task subagents are first-class.
- State is in the repo. Git history is the decision log. Other agents (and future humans) can read state without API access.
- Stateless dispatches are easy to reason about. Each invocation reads the same files; reproducibility is good.
- Cost-efficient. No idle sessions consuming context windows.

### Negative

- Cold start each invocation. The subagent re-reads prompt + state every time.
- No "always-on" agent that monitors for events. Everything is orchestrator-pulled.
- Loss of within-session memory across invocations — anything not written to state is lost. Forces discipline on what gets persisted, which is mostly a positive but adds overhead.

### Neutral

- Migration to long-lived sessions later is possible if a specific agent benefits (likely 3D Engine during heavy rendering work). The file-backed prompt + state design remains valid — the agent just stays warm.

## Alternatives considered

- **Long-lived sessions per agent.** Rejected: orchestration overhead is high, terminals proliferate, coordination is fragile.
- **MCP-wired specialists.** Rejected: too heavyweight for solo scale; valuable when many clients consume the same agent, not for one orchestrator + one project.
- **Mix of external AI tools.** Rejected for the core roster: increases coordination cost and information loss between tools. Reserve for *specific* tasks where another tool is clearly superior (e.g., a different model for a specific rendering problem).

## Conventions

- **Prompt files are immutable once accepted**, modulo small revisions. Major changes require an ADR.
- **State files are append-only logs**, ordered most recent at top. Don't rewrite history.
- **Handoffs are explicit.** When work crosses agents, the producing agent writes a handoff note in its state file referencing the receiving agent and the contract.
- **No agent reaches outside its owned paths.** Cross-cutting changes route through the orchestrator.

## References

- ADR 0001 — graph-not-tree (drives the Anatomy Domain agent's scope)
- ADR 0002 — asset-source (drives the Asset Pipeline agent's scope)
- `docs/orchestrator/system-map.md` — full ownership matrix
