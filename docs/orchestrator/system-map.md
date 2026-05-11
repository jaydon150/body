# System Map

Each agent's scope, prompt file, state file, and contracts. The orchestrator routes work to agents; agents do not reach across each other's scope.

## Tier 1 — active from Phase 0

| Agent | Prompt | State | Owns (paths) | Produces contracts | Consumes contracts |
|-------|--------|-------|--------------|--------------------|--------------------|
| Orchestrator | `docs/orchestrator/` | `docs/orchestrator/status.md` | routing, integration, ADR shepherding | system-map, task-queue | all |
| Architect | `docs/agents/architect.md` | `docs/agents/architect.state.md` | cross-cutting design, all schema authorship | (authority on all 7 contracts) | — |
| Anatomy Domain | `docs/agents/anatomy-domain.md` | `docs/agents/anatomy-domain.state.md` | `data/canonical/ontology/` | anatomical-id-schema | — |
| Asset Pipeline | `docs/agents/asset-pipeline.md` | `docs/agents/asset-pipeline.state.md` | `pipelines/`, `data/canonical/meshes/`, `data/canonical/textures/`, `data/derived/` | mesh-asset-manifest | anatomical-id-schema |
| 3D Engine | `docs/agents/3d-engine.md` | `docs/agents/3d-engine.state.md` | `app/web/src/engine/`, `app/web/src/scene/`, `app/web/src/state/` | selection-event-schema | mesh-asset-manifest, anatomical-id-schema |
| UI | `docs/agents/ui.md` | `docs/agents/ui.state.md` | `app/web/src/ui/` | style-tokens | selection-event-schema, content-record-schema, anatomical-id-schema |
| Content | `docs/agents/content.md` | `docs/agents/content.state.md` | `data/canonical/ontology/content/`, `data/canonical/ontology/functional/` | content-record-schema | anatomical-id-schema |
| QA | `docs/agents/qa.md` | `docs/agents/qa.state.md` | `tests/` | test-fixture-schema | all |
| Research/Docs | `docs/agents/research-docs.md` | `docs/agents/research-docs.state.md` | `docs/references/` | — (consumer only) | — |
| DevOps | `docs/agents/devops.md` | `docs/agents/devops.state.md` | `.github/`, root-level build config | build-manifest | — |

## Tier 2 — invoked on demand

| Agent | Prompt | State | Invoked when |
|-------|--------|-------|--------------|
| UX / Accessibility | `docs/agents/ux-accessibility.md` | `docs/agents/ux-accessibility.state.md` | at feature gates; before any user-visible UI ships |
| Reviewer | `docs/agents/reviewer.md` | `docs/agents/reviewer.state.md` | on significant cross-agent handoffs |
| Data Steward | `docs/agents/data-steward.md` | `docs/agents/data-steward.state.md` | at phase transitions, for backup + lineage audit |

## Tier 3 — deferred

| Agent | Activates | Notes |
|-------|-----------|-------|
| Localization | Phase 4+ | TA / multilingual nomenclature |
| Compliance | Drafting from Phase 0, full pre-launch | Disclaimer + license obligations |
| User Testing | Phase 1+ | Once there's something testable |

## Cross-agent contract ownership

| Contract | File | Producer | Primary consumers |
|----------|------|----------|-------------------|
| `anatomical-id-schema` | `app/shared/schema/anatomical-id-schema.json` | Anatomy Domain | all |
| `content-record-schema` | `app/shared/schema/content-record-schema.json` | Content | UI, QA |
| `mesh-asset-manifest` | `app/shared/schema/mesh-asset-manifest.json` | Asset Pipeline | 3D Engine, QA |
| `selection-event-schema` | `app/shared/schema/selection-event-schema.json` | 3D Engine | UI |
| `style-tokens` | `app/shared/schema/style-tokens.json` | UI (with UX/A11y) | UI components |
| `test-fixture-schema` | `app/shared/schema/test-fixture-schema.json` | QA | all |
| `build-manifest` | `app/shared/schema/build-manifest.json` | DevOps | all |

## Operating principles

1. **No agent reaches outside its owned paths.** Cross-cutting changes route through the orchestrator.
2. **Contracts are versioned.** Breaking changes require an ADR and consumer-agent acknowledgement.
3. **State files are append-only logs.** Don't rewrite history; append, mark superseded items.
4. **Hand-offs are explicit.** When work crosses agents, the producing agent writes a handoff note to its state file referencing the receiving agent.
5. **The orchestrator does not own implementation.** When tempted to write code directly, dispatch to the relevant specialist instead. Architectural decisions (ADRs) and integration are the orchestrator's scope.
