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

- **P1.01 dispatched and returned clean.** Research/Docs subagent built the UBERON→FMA skeletal crosswalk. ~70 verified anchor rows + ~30 flagged sub-structure gaps. UBERON's FMA xref coverage is comprehensive enough that no `BODY:NNNN` IDs are needed for Phase 1 skeletal — validates ADR 0004's tractability assumption. First file-backed Task-subagent dispatch ran end-to-end without orchestrator intervention; ADR 0003's mechanism is proven in production. *Reason:* user dispatched.

- **Surfaced sharp edges from P1.01.** (1) Rib 8 sits at non-contiguous `UBERON:0010757` (ribs 1-7 and 9-12 use the `UBERON:0004601–0004611` sequence) — Asset Pipeline mesh-registry generation must handle this. (2) UBERON's preferred labels use comparative-anatomy register ("tetrapod frontal bone", "vertebral bone 1", "innominate bone", "fused sacrum") in ~25 rows — already covered by ADR 0004's decision to put TA2 labels in `labels[0]`. (3) ~7 thoracic-vertebra and rib rows were inferred-by-pattern between verified anchors; Anatomy Domain owns the mechanical second-pass batch before promoting to `reviewed`.

- **Open follow-up from P1.01:** UBERON release version still not pinned to a specific date — needs a direct `github.com/obophenotype/uberon/releases` query. Filed in Research/Docs state; not a Phase 1 blocker, but a citation footnote worth resolving before Phase 1 retro.

- **P1.02 dispatched and returned clean.** Anatomy Domain subagent populated the skeletal sub-ontology: 125 nodes (1 system, 16 region, 108 structure) + 125 typed edges (regional_part_of 70, member_of 30, constitutional_part_of 24, systemic_part_of 1). DAG verified clean — no cycles, all referential integrity passes. Zero `BODY:NNNN` IDs assigned. Schemas + typecheck + build all green. The pattern-inferred-row second-pass from P1.01 caught a real bug: P1.01 had T8 at `UBERON:0004633`, which is actually T9; P1.02 corrected to `UBERON:0011050`. Agent-handoff design is paying off — the discovered error was caught by the next agent in the chain rather than reaching production. *Reason:* user dispatched.

- **P1.02 surfaced two more sharp edges.** (1) **Thoracic T8 non-contiguous at `UBERON:0011050`** (same anomaly shape as Rib 8). Asset Pipeline must not assume vertebrae are sequentially numbered. (2) **Humerus neck at `UBERON:4200172`** — an unusually high-prefix UBERON ID, still 7 digits, still schema-valid, but worth knowing about for any tooling that filters by ID range.

- **`synonyms.json` schema gap surfaced.** P1.02 subagent's open-items list flags that the current `anatomical-id-schema.json` has no `$defs.synonym_entry` definition; the subagent produced a placeholder structure. Architect's P1.09 schema upgrade should resolve this; or earlier if a synonyms-specific schema is needed before P1.09.

- **OpenAnatomy license verification — RESOLVED 2026-05-11 (late evening).** User pushed back on the earlier "partial verification" status after the BodyParts3D miss. Orchestrator re-ran WebSearch + WebFetch against canonical sources: `openanatomy.org/atlas-pages/slicer-license.html` (project-level: atlases use the 3D Slicer License) and `github.com/mhalle/spl-brain-atlas/blob/master/LICENSE.md` (per-atlas LICENSE file). 3D Slicer License is BSD-style, three-part agreement, Part B governs downloads, permissive, no share-alike, attribution required, clinical use discouraged. The research report's substance was correct; the "Section B" gloss was sloppy. ADR 0005's reference list updated. master-spec.md risk row closed. Phase 1 Spec follow-up marked resolved. *Reason:* user-directed rigor pass.

- **ADR 0006 (runtime attribution) operationalization confirmed.** Committed at `e60bb9e`. Phase 1 Spec v0.2 acceptance criterion #18 enforces it. Dispatch step P1.08 extends `pipelines/05-bake-registry` to write `asset.copyright` and `asset.extras.source` into every canonical glb. UI step P1.13 adds the "About this atlas" surface. No further drafting needed; will be exercised in P1.08 and P1.13.

- **P1.03 dispatched and returned clean.** Asset Pipeline subagent pulled both BodyParts3D archives (IS-A 137 MB + PART-OF 62 MB) from `dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/` plus 6 TSV mapping tables and the upstream README. Integrity-checked. README, LICENSE, license-registry entry, and TSV mapping tables tracked; the binary ZIPs gitignored. ADR 0006 provenance honored at the raw layer (next ADR-0006 step is canonical glb metadata baking in P1.08). *Reason:* user dispatched.

- **P1.03 surfaced two new compliance items.** (1) Mirror page at `dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html` displays a CC BY 4.0 license summary; canonical project page at `lifesciencedb.jp/bp3d/info/license/index.html` declares CC BY-SA 2.1 Japan. Project follows canonical per ADR 0005 / 0002. **Pre-launch Compliance agent review must reconcile and document the discrepancy.** (2) The CC BY-SA 2.1 JP authoritative legal code is Japanese-only; the English deed is a summary, not the law. **Pre-launch legal review must address.** Both items filed in Asset Pipeline's state file open items.

- **P1.03 surfaced a structural sharp edge for P1.04.** BodyParts3D OBJ filenames use an FJ-prefix (e.g. `FJ1252.obj`), not FMA-prefix. The FMA → FJ-id pivot lives in the TSV file `isa_element_parts.txt`. P1.04 (OBJ→glb conversion) MUST read this table; it cannot infer the mapping from filenames. Adds a small but critical dependency on the upstream TSV being in git (it is, per the gitignore exception).

- **P1.04 dispatched and returned clean.** 79 canonical glbs produced in `data/canonical/meshes/uberon_NNNNNNN/lod0.glb`, total 9.4 MB. Mean 118 KB, range 10 KB pisiform → 980 KB scapula. **0 conversion failures.** Tools: `obj2gltf` v3 (programmatic Node API) for OBJ→glb; `gltf-pipeline.processGlb` post-process for attribution injection (obj2gltf v3's CLI flag for copyright no longer exists). `adm-zip` for ZIP extraction after `unzip -p` bash path failed on Windows. *Reason:* user dispatched.

- **Paired bones merged at OBJ-text level.** 45 of 79 outputs are paired bones (ribs, vertebrae, carpals, tarsals) — BP3D ships left + right as separate FJ files inheriting from the same parent FMA. Subagent merged them with v/vn/vt index rebasing, preserved as separate glTF mesh nodes within a single glb. Both halves runtime-selectable individually. Smart engineering; consistent with the schema (one mesh manifest entry per anatomical concept, sub-meshes inside the glb).

- **Sternum gap is recoverable as a composite.** `UBERON:0000975` (sternum) has no whole-sternum mesh in BP3D, but all 3 sub-components (manubrium, body of sternum, xiphoid process) converted successfully. **Decision point for Anatomy Domain in P1.07/P1.08:** synthesize a composite sternum at the registry layer (group the 3 sub-meshes under one anatomical-concept entry) vs leave the parent un-instantiated and only surface the sub-parts. Logged in Asset Pipeline open items.

- **Attribution chain verified end-to-end on mandible glb.** `asset.copyright` reads verbatim: *"BodyParts3D, Copyright© 2008 Life Science Database Center licensed by CC BY-SA 2.1 Japan"*. `asset.extras.source` carries source/license/original_id (FJ3289)/fma_id (FMA:52748)/ingested_at. ADR 0006 is satisfied at the asset layer; UI surface remains a Phase 1 P1.13 task.

- **Surprise: BP3D OBJ headers already carry the CC-BY-SA notice in their `#` comments.** The first-author license chain is intact upstream — not just in our injection layer. Strengthens the provenance story.

- **P1.05 (Blender cleanup) blocked.** Asset Pipeline flagged in its outbound handoff that the user needs to confirm Blender 4.x is installed and on PATH before P1.05 dispatches. **P1.07 (validate-ontology) can proceed in parallel** — it has no Blender dependency.

---

## Conventions

- Decisions are immutable once logged. If a decision is reversed, append a new entry that supersedes it and reference the original by date + scope.
- Decisions that need a dedicated ADR get a reference column (ADR-NNNN); not every decision needs one.
- Append in date order, newest at bottom under the date heading.
