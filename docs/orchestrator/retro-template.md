# Retro Template

Use at the end of each phase. Copy this file to `docs/orchestrator/retros/phase-N-retro.md`, fill in, commit.

The purpose of a retro is to learn from what just happened so the next phase goes better. Not a status report. Not a victory lap.

---

## Phase N retro

**Phase:** _N — short name_
**Dates:** _YYYY-MM-DD to YYYY-MM-DD_
**Author:** _agent or orchestrator_
**Status at close:** _green / yellow / red_

## What we set out to do

_The phase's stated goals, copied verbatim from the master spec or phase spec. No editorialising._

## What actually shipped

_Bullet list of concrete artifacts that landed and acceptance criteria that passed._

## What didn't ship

_Anything scoped in and cut, deferred, or partially done. Reason in one line each._

## What worked

_Specific patterns, tools, agent dispatches, or decisions that paid off. Be concrete — "tooling was fine" doesn't help; "auto-fetching license texts from gnu.org saved a verification step" does._

## What didn't work

_Where the agent system, the architecture, or the process leaked. Be specific. Avoid blame; describe the failure mode and the cost._

## What surprised us

_Things that turned out different from the working assumption. New information about the problem space, the tools, the data, the user._

## What we'd do differently next phase

_Three to seven concrete changes. Not "we should communicate better" — "Reviewer agent invoked at Phase 1 Day 3 instead of pre-launch only" is the shape we want._

## Decisions that need promotion

_Decisions made informally during the phase that should be lifted to ADRs or to the decision log. Cite location of the informal decision._

## Risks that emerged or escalated

_New risks discovered this phase, and risks already tracked that got worse. Add to master-spec risk table._

## Agent health

For each agent dispatched this phase:

| Agent | Dispatches | Avg quality | Overloaded? | Scope leaks? | Notes |
|-------|-----------|-------------|-------------|--------------|-------|
| _name_ | _count_ | _1-5_ | _y/n_ | _y/n_ | _short_ |

## Contracts touched

_Cross-agent contracts (anatomical-id-schema, content-record-schema, etc.) that were authored, modified, or broken this phase. Note version bumps and consumer impact._

## Hand-off into next phase

- _What the next phase inherits as "done"._
- _What the next phase starts with as "in progress"._
- _What's explicitly out of scope until later._

---

## When to write this

- Phase officially closes (acceptance criteria pass + user signs off).
- Within one working session of close — don't let the memory fade.
- Before dispatching Phase N+1's first task.
