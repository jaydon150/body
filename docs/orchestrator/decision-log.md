# Decision Log

Append-only chronological record of decisions made on the project. Significant architectural decisions get their own ADR in `docs/decisions/`; this log captures everything (small decisions too) for traceability.

Format: `YYYY-MM-DD | scope | decision | rationale | reference`.

---

## 2026-05-11

- **Project location.** Root at `C:\Users\Jaydon\Desktop\body\`. Empty folder pre-existed; structure laid down at start of Phase 0. *Reason:* user-selected location on Desktop, kept lowercase, sibling to existing knowledge corpora.

- **Audience and distribution.** Personal project intended for open academic distribution. No commercial pivot planned. *Reason:* user stance; resolves Z-Anatomy share-alike tension as a feature not a constraint.

- **Asset path.** Z-Anatomy / BodyParts3D as v1 base. Build on top of existing; do not sculpt from scratch. Targeted custom meshes reserved as a post-v1 option. *Reason:* sculpting from scratch is years of skilled work for no quality differentiation; existing free dataset is good enough for educational use, especially for the systems chosen for v1 (skeletal coverage is strongest in Z-Anatomy). ADR: 0002.

- **License configuration.** Configuration B: AGPL-3.0-or-later for code, CC-BY-SA-4.0 for anatomical content, CC-BY-4.0 for project documentation. *Reason:* data is share-alike whether we like it or not; AGPL closes the SaaS-fork loophole that GPL leaves open; doc license is most permissive for citation. Matches the open academic stance.

- **Anatomical data model.** Typed directed acyclic graph (not tree). FMA IDs as primary identifiers; UBERON / TA2 as aliases. Relations include `regional_part_of`, `constitutional_part_of`, `systemic_part_of`, `member_of`, `branch_of`, `tributary_of`, `innervates`, `supplied_by`. *Reason:* organs belong to multiple systems (diaphragm, pancreas, kidneys); tree-modelling is the canonical newbie mistake. ADR: 0001.

- **v1 scope.** Three systems: integumentary, skeletal, muscular. Organ-level floor. Male anatomy only. *Reason:* user-selected. Cellular floor deferred. Female variant reserved.

- **Stack.** Web-first, Three.js via react-three-fiber, React + TypeScript + Vite, WebGL2 baseline with WebGPU when available. Desktop / laptop browsers only. *Reason:* user picked "simple first"; web with R3F is the lowest-friction starting point and has the largest model + community support for AI-assisted work.

- **Project root case.** Lowercase `body/`. *Reason:* user-specified; avoids Windows-vs-Git case-sensitivity drift.

- **Agent system.** File-backed Task subagents. Each agent has a prompt file + state file under `docs/agents/`. Orchestrator dispatches via Task subagents that load prompt + state on invocation. Cross-agent contracts live in `app/shared/schema/`. *Reason:* simplest Claude-Code-native pattern; alternative (one long-lived session per agent) is heavier with no offsetting benefit at solo scale. ADR: 0003.

- **Agent roster.** 10 Tier 1 active, 3 Tier 2 on demand, 3 Tier 3 deferred. Tier 1: Orchestrator, Architect, Anatomy Domain, Asset Pipeline, 3D Engine (merged Rendering + Scene/Application), UI, Content, QA, Research/Docs, DevOps. Tier 2: UX/A11y, Reviewer, Data Steward. Tier 3: Localization, Compliance, User Testing. *Reason:* pasted plan critiqued and restructured; merges resolved fuzzy boundaries (Rendering ↔ Scene), additions covered real gaps (Architect, Research/Docs, Reviewer, Data Steward), renames clarified roles (Legal → Compliance).

- **Remote repo.** GitHub private during early development. Repo name: `body`. *Reason:* user choice. Discoverability concern noted; rename or public-flip is reversible later.

- **Git Credential Manager path.** `gh` CLI is not installed locally; relying on Git Credential Manager that ships with Git for Windows. Will prompt for browser-based auth at first push. *Reason:* user reported "auth done" but `gh` is not on PATH; assume credential manager is configured via VS Code / Desktop / similar.

- **Anatomical accuracy review.** Free via university faculty network the user has access to. As-needed, no fixed cadence. *Reason:* user-supplied.

- **Phase 0 contents.** Folder structure, license + README + attributions, orchestrator artifacts, three foundational ADRs, agent scaffolds, contract stubs, app skeleton, CI, end-to-end check, repo push, retro. *Reason:* infrastructure-only, no anatomy work until Phase 1.

---

## Conventions

- Decisions are immutable once logged. If a decision is reversed, append a new entry that supersedes it and reference the original by date + scope.
- Decisions that need a dedicated ADR get a reference column (ADR-NNNN); not every decision needs one.
- Append in date order, newest at bottom under the date heading.
