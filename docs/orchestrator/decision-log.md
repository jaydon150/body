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

## 2026-05-11 (evening — post-research ingest)

- **Phase 0 closed.** User signed off after retro filed. Initial scaffold pushed to `jaydon150/body` (private) at commit `311e18a`; Phase 0 close at `3acf0a7`; research intake at `f0941ba`.

- **Research feed ingested.** External report on ontology + dataset strategy saved to `docs/references/raw/2026-05-11-ontology-and-dataset-review.md`; summary at `docs/references/summaries/ontology-and-dataset-review.md`. One factual error in the source (BodyParts3D license claim) was caught and noted; the canonical license is CC BY-SA 2.1 Japan, verified at `lifesciencedb.jp/bp3d/info/license/index.html`.

- **Ontology primary backbone flipped from FMA to UBERON.** UBERON IDs are now primary per ADR 0004. FMA and TA2 codes preserved as aliases; project-local `BODY:NNNN` reserved for orphans. *Reason:* FMA's public OBO track is stale; UBERON is actively maintained and graph-native. ADR 0001's DAG structure is unchanged. ADR: 0004.

- **Asset source path refined.** BodyParts3D remains primary; OpenAnatomy added as regional supplement (brain especially, Phase 2+); Z-Anatomy demoted to a watch list pending license clarification; commercial fallback short-list narrowed to Zygote only. *Reason:* Z-Anatomy's license trail is contradictory and it lacks a published ontology mapping. ADR 0002's "build on top of existing" stance is unchanged. ADR: 0005.

- **Schema change to `anatomical-id-schema.json`.** `node.id` regex broadened from `^FMA:\d+$` to `^(UBERON:\d{7}|FMA:\d+|BODY:\d+)$` with UBERON as the preferred form, per ADR 0004. No fields added or removed. Existing schema validation still passes.

- **Master spec updates.** §3 (asset path), §4 (license map), §5 (anatomical model), §7 (phasing), §11 (risks). All linked to the relevant new ADRs. Change-log entry appended.

- **Phase 1 starter system confirmed.** Skeletal. Vertical slice covers: import BodyParts3D skeletal meshes → build UBERON-primary sub-ontology with FMA aliases → mesh registry + LODs → renderer with selection / peel / dive-deeper for skeletal → UI sidebar / search / breadcrumbs / panel → first content batch with anatomist review. Detailed in Phase 1 Spec v0.1.

- **User-directed first model seed.** Started a hand-authored procedural femur proxy keyed to `UBERON:0000981` with `FMA:9611` as an alias. *Reason:* user asked to start making the 3D model immediately; this creates one selectable skeletal structure without pretending the formal BodyParts3D pipeline is complete. The proxy is not atlas-grade and must be replaced by BodyParts3D pipeline output.

---

## 2026-05-11 (late evening — Phase 1 Spec v0.2 refinements)

- **Phase 1 framing clarified.** Phase 1 is whole-body skeletal *interactively populated*; skin and muscle meshes are *visual placeholders* for the peel plumbing. **Peel UX validation is explicitly deferred to Phase 2** (muscle content is the load-bearing layer for that judgement; absent muscle content, the peel toggle can be exercised but its educational UX cannot be validated). *Reason:* user surfaced the framing tension between "test peel end-to-end" and "only one system has content."

- **iPad added as co-primary platform target** (not secondary). Touch input, responsive layout, iPad-class GPU perf budgets are first-class Phase 1 acceptance criteria. *Reason:* user override of the v0.1 desktop-only assumption.

- **Peel preset naming flipped to plain.** Primary register: `skin / muscle / bone`. Clinical register: `surface / subcutaneous / musculoskeletal`. Switched via a UI nomenclature toggle. *Reason:* user prefers plain register for the educational-first audience; clinical register stays accessible via toggle for users who want it. New acceptance criterion #7 codifies this.

- **Anatomist review cadence flagged for revisit.** v0.2 keeps the working assumption (50 / batch / 1–2 wk) but explicitly marks it for re-confirmation once a specific anatomist is engaged. *Reason:* user note that the cadence assumes facts not yet in evidence.

- **Runtime attribution must travel with assets.** ADR 0006 accepted: every canonical glb bakes `asset.copyright` + `asset.extras.source`; the deployed app exposes an "About this atlas" surface; build manifest enumerates contributing sources. *Reason:* user point that share-alike notices must travel with the work — ATTRIBUTIONS.md at the repo root doesn't reach end users of the deployed app. ADR: 0006.

- **OpenAnatomy license — partial verification.** The 3D Slicer License itself is BSD-permissive (verified at `github.com/Slicer/Slicer/blob/main/License.txt`). The research's "Section B" framing is misleading — there is no atlas-specific Section B; Part B is general software. OpenAnatomy atlas-page-level inheritance could not be directly verified during ingestion (URL guesses 404'd). **Phase 2 entry prerequisite:** Research/Docs re-verifies before any OpenAnatomy import. Not a Phase 1 blocker.

- **Phase 1 Spec v0.1 → v0.2.** 16 acceptance criteria → 19. New: nomenclature toggle (#7), iPad perf (#17), runtime attribution (#18). Renumbered the rest. Open questions consolidated; 5 of 7 resolved, Blender install remains open, BodyParts3D download verifies-at-step-3 unchanged.

---

## Conventions

- Decisions are immutable once logged. If a decision is reversed, append a new entry that supersedes it and reference the original by date + scope.
- Decisions that need a dedicated ADR get a reference column (ADR-NNNN); not every decision needs one.
- Append in date order, newest at bottom under the date heading.
