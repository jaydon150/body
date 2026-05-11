# Phase 0 Retro

**Phase:** 0 — Infrastructure
**Dates:** 2026-05-11 to 2026-05-11
**Author:** Orchestrator
**Status at close:** green

## What we set out to do

Lay down infrastructure for the `body` project: folder structure, agent prompts and state scaffolds, foundational ADRs, cross-agent contract schemas, web app skeleton, CI, license and attribution files, and an initial committed and pushed snapshot. No anatomical content. Goal stated in Phase 0 Spec v0.1.

## What actually shipped

- Folder structure under `~/desktop/body/` matching the spec
- Git initialized on `main`, LFS configured, Windows long-paths enabled
- Triple-license setup committed verbatim from gnu.org and creativecommons.org: AGPL-3.0 (code), CC-BY-SA-4.0 (content), CC-BY-4.0 (docs)
- `ATTRIBUTIONS.md` documenting the upstream Z-Anatomy / BodyParts3D chain (CC-BY-SA-2.1-JP)
- Six orchestrator artifacts: master spec, system map, task queue, decision log, status, retro template
- Three foundational ADRs: 0001 graph-not-tree, 0002 asset-source, 0003 agent-mechanism, plus 0000 ADR template
- 16 agent prompts (10 Tier 1 active, 3 Tier 2 on-demand, 3 Tier 3 deferred) and 16 corresponding empty state files
- Seven cross-agent contract JSON Schema stubs: anatomical-id, content-record, mesh-asset-manifest, selection-event, style-tokens, test-fixture, build-manifest
- Web app skeleton: Vite + React + TypeScript + react-three-fiber renders an empty canvas; typecheck clean, schemas validate, build succeeds in ~2.8s
- GitHub Actions CI workflow (typecheck + schema validation + build + artifact upload)
- Initial commit (SHA `311e18a`, 96 files, 7289 insertions) pushed to private GitHub repo `jaydon150/body`

All Phase 0 acceptance criteria from the spec passed.

## What didn't ship

- Nothing scoped to Phase 0 was cut.
- One scope adjustment mid-flight: schema validation tooling started as a placeholder JSON-parse check rather than full ajv meta-schema validation. Reason: avoiding a second `npm install` round-trip after the first kicked off. Phase 1+ will upgrade to ajv-based validation when there's actual canonical data to validate.

## What worked

- **Verbatim license-text fetching.** `curl -sSL https://www.gnu.org/licenses/agpl-3.0.txt -o LICENSE` (and similar for CC variants) avoided any risk of paraphrased legal text. Cheap, reliable, defensible.
- **File-backed agent prompt + state pattern.** Reading like a coherent system: anyone (or any future Claude session) can pick up `docs/agents/` and understand the roster in five minutes.
- **JSON Schema stubs with `$defs`.** Defining `fma_id`, `language_code`, `label`, `relation_type` once at the top of each schema reads cleanly and stays consistent across schemas.
- **End-to-end verify chain.** `npm run verify` chaining typecheck + schema validation + build means one local command gates a commit. CI mirrors it.
- **Initial commit message.** Long-form, structured, explains what's in the commit. Worth the typing for a project foundation commit.

## What didn't work

- **`gh` PATH staleness.** User said "auth done" but `gh` wasn't on my PowerShell session's PATH. Took two probe rounds and a registry-style PATH inspection to find `C:\Program Files\GitHub CLI\gh.exe` and invoke it by full path. Lesson: verify the executable resolves, not just that the user reports completion.
- **`gh repo create --push` propagation race.** GitHub returned "Repository not found" on the immediate post-create push. Worked on a manual `git push -u origin main` seconds later. Lesson: prefer `--no-push` and a separate push step, or accept a retry.
- **PowerShell 5.1 stderr redirect quirk almost masked success.** `git push 2>&1` wrapped each stderr line as a NativeCommandError; the actual git operation succeeded. Lesson encoded in tool docs but worth re-reading: don't redirect stderr from native commands in PowerShell 5.1.
- **Empty directories needed `.gitkeep` placeholders.** Worked, but the iteration of "create dir → write file → delete .gitkeep → write content" was noisier than it needed to be. Future phases: either keep .gitkeep until first real content lands, or skip it entirely when the dir gets content in the same task.

## What surprised us

- **The Z-Anatomy share-alike chain compatibility with CC-BY-SA-4.0 is more legally uncertain than I initially framed.** The CC-BY-SA-2.1-JP → CC-BY-SA-4.0 upgrade path involves jurisdictional considerations I cannot resolve in this seat. Flagged in `decision-log.md` and `0002-asset-source.md`; will need compliance/legal review pre-launch.
- **The user's working cadence is fast iterate with hard pushback on premature recommendations.** Calibrated this through the conversation — pushback (e.g. "why not from scratch?") is a signal of engagement, not disagreement. Future phases should expect this and present trade-offs cleanly rather than collapsing to a single recommendation when alternatives are meaningful.
- **96 files is more than it sounds.** A flat number doesn't communicate the shape; the breakdown by agent prompts + state files + schemas + ADRs + orchestrator artifacts + license texts + app source did most of the work.

## What we'd do differently next phase

1. **Verify each tool with a smoke test, not a user confirmation.** Before any task that needs `gh`, run `gh auth status` from the same shell context that will run the dispatch. If it fails, surface immediately.
2. **Use `gh repo create --no-push` and a separate `git push` step.** Avoids the propagation race; cleaner error surface.
3. **Add real `ajv` schema validation in Phase 1.** Replace the JSON-parse-and-check-keys script with full meta-schema validation. Especially important once `data/canonical/ontology/` accumulates content that needs to be validated *against* the schemas (not just schemas themselves).
4. **Don't pre-create empty dirs with `.gitkeep`.** Either populate in the same task or skip the dir until first content. Eliminates a class of small noise.
5. **For Phase 1 dispatch, actually invoke specialist Task subagents.** Phase 0 was tightly scoped enough that orchestrator-direct execution was correct. Phase 1 must test the file-backed Task-subagent pattern in production, or ADR 0003 stays unproven.

## Decisions that need promotion

None new. All significant Phase 0 decisions are already in ADRs or `decision-log.md`.

## Risks that emerged or escalated

- **Procedural risk: tool-on-PATH staleness on Windows.** Mitigation: pre-flight smoke test before dispatch. Add to orchestrator routine. Not architecturally significant.
- **Legal-tracking risk: CC license version compatibility with the Japan upstream.** Already in `master-spec.md` §11 risk table; escalation queued for Compliance agent activation pre-launch.

## Agent health

| Agent | Dispatches | Avg quality | Overloaded? | Scope leaks? | Notes |
|-------|-----------|-------------|-------------|--------------|-------|
| Orchestrator | 1 (running) | 4 / 5 | yes (took on every task directly) | n/a | Correct for Phase 0; test subagent dispatch in Phase 1 |
| Architect | 0 | n/a | no | no | Schema stubs effectively authored by orchestrator. Phase 1 should hand schema evolution to Architect proper. |
| Anatomy Domain | 0 | n/a | no | no | Activates in Phase 1 |
| Asset Pipeline | 0 | n/a | no | no | Activates in Phase 1 |
| 3D Engine | 0 | n/a | no | no | Activates in Phase 1 |
| UI | 0 | n/a | no | no | Activates in Phase 1 |
| Content | 0 | n/a | no | no | Activates in Phase 1 |
| QA | 0 | n/a | no | no | Schema-validation tooling effectively QA's first artifact; Phase 1 hands it over properly |
| Research/Docs | 0 | n/a | no | no | Awaiting deep-research feed |
| DevOps | 0 | n/a | no | no | CI workflow effectively DevOps's first artifact; Phase 1 hands it over properly |

Tier 2 and Tier 3 agents not invoked (by design).

## Contracts touched

- All seven contract schemas authored as v0.1 stubs.
- No version bumps. No consumer-impact analysis needed yet (no consumers).
- Phase 1 will exercise these for the first time; expect at least one schema revision per consumer.

## Hand-off into Phase 1

### Inherits as done
- Working folder structure with Git LFS + long-paths configured
- Triple-license setup committed
- Agent prompts and state files loaded for all 16 agents
- Seven contract schema stubs ready for first use
- Web app skeleton that builds and renders an empty canvas
- CI workflow that will run on next push
- Private GitHub repo `jaydon150/body` with initial commit

### Starts as in-progress
- Nothing. Phase 1 begins from a clean slate after user approval.

### Out of scope until later
- Tissue and cellular floor (deferred to post-v1 phases)
- Female anatomy (reserved)
- Pathology overlays
- Mobile, VR/AR, native (Unity / Unreal)
- Commercial distribution
- Multilingual content (Localization activates Phase 4+)
- User testing (User Testing activates Phase 1+ but not yet)

### Blocked / waiting on
- Deep-research feed on FMA / UBERON / TA2 and 3D anatomy datasets — Research/Docs awaiting paste-in from user. Phase 1 ontology and dataset confirmation depend on this.
- Anatomist on retainer must be lined up before content authoring begins in Phase 1.

## Phase 0 close

All acceptance criteria from Phase 0 Spec v0.1 met. Awaiting user sign-off to formally close Phase 0 and gate Phase 1 Spec v0.1 drafting on the deep-research feed.
