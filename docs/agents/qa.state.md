# Agent state: qa

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 — P1.17 (visual regression baselines + perf budgets + review-queue state machine, third QA invocation)

---

## Open items

4. **(NEW, P1.16)** **No JSON Schema for `anatomist-review-manifest.json` yet.** The de-facto contract is the schema-by-example block in `tests/review-queue/README.md`. Filed as an open item for a future Architect dispatch — schema authority is Architect's, and adding the schema (and wiring it into `app/web/scripts/validate-schemas.mjs`) would have crossed that boundary in this dispatch. Until the schema exists, manifest validation is enforced ad-hoc by `pipelines/07-anatomist-review/promote.mjs` (which refuses to run with a TBD anatomist name and refuses to promote items with empty decision fields).
5. **(NEW, P1.16)** **The review queue is auditable by manifest + Markdown, not by a structured event log.** QA hard-rule 4 says "every `pending` content record's journey to `reviewed` is logged with reviewer ID, date, and decision". This is satisfied per-batch by: (a) `manifest.json` carrying `reviewed_by`, `reviewed_at`, `decision`, `reviewer_notes` per item; (b) the modified content records themselves carrying `reviewed_by` + `last_updated` after `promote.mjs` runs; (c) git history of both. A separate cross-batch audit log file (e.g. `tests/review-queue/audit.jsonl`) was considered and deferred — the per-batch manifests + git diff are sufficient for Phase 1 and the rollup view can be generated lazily.
6. **(NEW, P1.16)** **`approved_with_edits`, `rejected`, and `needs_research` items have no QA follow-up automation.** When the anatomist marks a record in any of these states, Content (or Research/Docs) agent picks them up via a future dispatch; the manifest item stays in-place rather than being deleted. QA dispatch idea: build a `pipelines/07-anatomist-review/triage-report.mjs` that summarises non-`approved` items across all batches for orchestrator follow-up. Filed but not started.

1. **(NEW, P1.09)** **The validator covers schema meta-validation + 4 canonical data pairings.** Coverage gaps to fill in later QA dispatches:
   - No fixture-based tests yet under `tests/fixtures/` or `tests/schema-tests/`. The validator runs against canonical data; isolated fixtures (per the QA hard rule "Don't reach into `data/canonical/` for test data") are not yet wired. Filed for a follow-up QA dispatch.
   - No visual regression baselines yet (Phase 1 has no rendered scenes to baseline).
   - No performance budgets yet (Phase 1 is still building the renderer pipeline; budgets land at P1.10 + P1.13).
2. **(NEW, P1.09)** **The validator's data pairings list is hardcoded inside the script.** When new canonical data files arrive (e.g. content records, build manifests, selection-event fixtures), the `DATA_PAIRINGS` array in `app/web/scripts/validate-schemas.mjs` must be extended. Not a problem yet — Phase 1 has the four files covered — but worth keeping in mind. A future refactor could discover pairings from a manifest rather than hardcoding.
3. **(NEW, P1.09)** **CI runs `npm run validate:schemas` already (per `.github/workflows/ci.yml` step "Validate schemas").** No CI changes needed in P1.09 — the new ajv-backed validator is a drop-in replacement; the step still invokes the same script via npm. Confirmed end-to-end by running `npm run verify` locally.

## Decisions log

### 2026-05-11 — P1.17 (visual regression baselines + perf budgets + review-queue state machine, third QA invocation)

- **Playwright `@playwright/test ^1.59.1` + Chromium 147 added to `app/web` devDependencies.** Installed via `npm install --save-dev @playwright/test` then `npx playwright install chromium` (no `--with-deps`; system deps assumed pre-installed on Windows + GitHub-Actions ubuntu-latest). 3 new packages added to the lockfile; pre-existing 2 moderate-severity dep-audit findings unchanged (filed in P1.09 as a possible future "audit fix" dispatch).
- **`vite.config.ts` `canonicalMeshStaticPlugin` extended to register under both `configureServer` and `configurePreviewServer`.** Previously `apply: 'serve'`-only; that gated the dev server's `/registry.json` + `/meshes/*` + `/content/*` routes to dev mode only. `vite preview` did not have those routes, so the baseline-capture script (which runs against the prod build for fidelity) would have rendered an empty scene. Lifting the apply gate and binding the same handler in `configurePreviewServer` is a minimal, surgical change — no production impact, since prod deploy is out of Phase 1 scope (the canonical mesh tree is dev-time only by design; ADR-eligible discussion in Phase 2 if and when prod deploy enters scope).
- **New script `tests/rendering-snapshots/capture.mjs`** (~200 lines, zero new deps beyond Playwright). Spawns `vite preview` via the local `node_modules/vite/bin/vite.js` directly (bypassing `npm.cmd` to side-step Node 24 + Windows EINVAL on shimmed `.cmd` spawn). Polls until the server is reachable on :5173, then for each of three viewports (desktop 1920x1080, iPad-landscape 1366x1024, iPad-portrait 768x1024): launches a Chromium context, navigates, waits for `networkidle`, waits an additional 4 s for GLB streams + R3F render passes to settle, screenshots to `baseline-<viewport>.png`. Cleans up the preview server on exit via `taskkill /pid <pid> /f /t` on Windows or `SIGTERM` elsewhere. Playwright is imported via explicit relative-path `pathToFileURL` to `app/web/node_modules/@playwright/test/index.mjs` because Node ESM's package-lookup starts at the script's directory, not the cwd — same pattern as pipelines/06 + 07 for ajv.
- **3 baselines captured, committed to git as ordinary PNG binaries (not LFS).** Sizes: desktop 96 KB, iPad-landscape 89 KB, iPad-portrait 70 KB. Inspected visually — skeleton renders at all viewports, UI chrome responsive (iPad portrait collapses sidebar to hamburger), peel/about/nomenclature controls visible. The skeleton's apparent horizontal orientation is the engine's initial camera state, not a capture bug.
- **`pipelines/08-perf-budget/check.mjs`** (~170 lines, zero npm deps; Node built-ins only — `fs`, `path`, `zlib`, `url`). Three budgets, each independently asserted:
  - main JS chunk gzipped < 320 KB — actual 303.27 KB (94.8% of budget, raw 1.08 MB)
  - mesh-registry entries == 79 — actual 79
  - total `lod*.glb` bytes < 16 MB — actual 13.71 MB across 237 glbs in 79 dirs (85.7% of budget)
  Exits 0 on full pass, 1 on any violation, 2 on environment problem (dist missing, registry missing, meshes folder missing). Wired as `npm run perf:check` in `app/web/package.json`.
- **`pipelines/08-perf-budget/package.json` + `README.md` + `.gitignore` follow the same convention as pipelines 06 + 07.** package.json has a single `check` script; README documents each budget's rationale and an exit-code table.
- **CI workflow `.github/workflows/ci.yml` extended** with five new steps after `Build`:
  1. `Perf budget check` — runs `npm run perf:check` (fails workflow on violation)
  2. `Cache Playwright browsers` — `actions/cache@v4` keyed on `package-lock.json` hash, path `~/.cache/ms-playwright`
  3. `Install Playwright Chromium` — conditional on cache miss
  4. `Capture visual regression baselines` — runs `npm run capture:baselines`
  5. `Upload baseline screenshots` — `actions/upload-artifact@v4`, name `rendering-baselines`, retention 14 days, `if: always()` so failures still upload for debugging
  The `web` job's name updated to `web — typecheck + schemas + build + perf + baselines` to reflect the wider scope.
- **`tests/review-queue/README.md` extended** with explicit per-item + batch-level state machine diagrams, transition tables, and "how QA tracks batches across time" guidance (one folder per batch, append-only, cross-batch audit via git log, triage signal via the proposed `triage-report.mjs`). Per-item terminal-state rationale documented for `approved_with_edits`, `rejected`, and `needs_research` (none auto-promote; each routes to a specific follow-up agent). Phase 1 counts inlined: 1 batch, 51 items, all queued, anatomist TBD.
- **`tests/README.md` written** describing the overall four-category testing strategy: schema validation (mature), visual regression baselines (active), perf budgets (active), anatomist accuracy queue (active). Future categories enumerated: unit, integration, touch-input, dynamic-perf, a11y.
- **End-to-end verification.** `cd app/web && npm run verify`: typecheck ✓, validate:schemas 11/11 ✓, vite build ✓ (646 modules, 311.52 kB gzipped — within budget). `npm run perf:check`: 3/3 budgets pass. `npm run capture:baselines`: 3/3 viewports captured cleanly. Review-queue manifest verified: 51 items, all `queued`, anatomist TBD. No regression in any prior CI step.

### 2026-05-11 — P1.16 (anatomist review queue, cross-domain Content + QA second invocation)

- **Cross-domain dispatch.** Operated as both Content (packet-prose ordering + content-record semantics) and QA (queue state-machine + dry-run-tested promotion pipeline). Content-side details captured in `content.state.md`; this log focuses on QA-side queue audit infrastructure + promotion-script smoke tests.
- **New pipeline at `pipelines/07-anatomist-review/`.** Two scripts: `generate-packet.mjs` (read 51 content records + nodes.json → write `review-packet.md` + `manifest.json` per batch) and `promote.mjs` (read anatomist-edited manifest → modify content records in-place to `confidence: "reviewed"` + `reviewed_by` + bumped `last_updated`; abort-on-first-validation-failure). Both zero-dep on this pipeline's side; ajv comes from `app/web/node_modules/` by relative import (same pattern as `pipelines/06-validate-content/`).
- **Review queue audit infrastructure under `tests/`.** Created `tests/review-queue/README.md` (workflow + manifest schema-by-example + Markdown-vs-PDF rationale) and the first batch folder `tests/review-queue/2026-05-11-batch-1/` containing `review-packet.md` (51 sections) and `manifest.json` (51 items). QA-side hard rule 4 ("the accuracy review queue is auditable") is satisfied: every queue item's state and the modifications applied are traceable via manifest + git history + post-promotion record fields.
- **`promote.mjs` safety guards:**
  - Refuses to run if `manifest.anatomist.name` is `"TBD"` or empty (schema requires `reviewed_by` for `reviewed`).
  - Refuses to promote individual items whose `decision` field is empty.
  - Skips items with `status !== "approved"`: `approved_with_edits` stays `pending` (the prose itself needs Content-agent revision before sign-off); `rejected` and `needs_research` likewise. Reasoning: auto-promoting `approved_with_edits` would lock in un-revised prose.
  - All-or-nothing batch write: any post-promotion schema failure aborts the entire batch (nothing is written). Half-promoted state would be ambiguous to audit.
  - `--dry-run` flag prints what *would* change without writing. Default mode writes.
- **Smoke tests, in order:**
  1. `generate-packet.mjs` produced 51 sections + 51 items as expected. Initial run uncovered a priority-bucket bug (I had wrong UBERON IDs in the `SKULL_BONES` and `ATYPICAL_VERTEBRAE` sets — 0001105 is clavicle not C7; 0001446 is fibula not sacrum). Fixed by verifying every priority-bucket ID inline against `nodes.json`; re-ran; priority ordering now correct (3 canaries → 7 calvarial/skull-base bones → 4 atypical vertebrae → 37 alphabetical).
  2. Synthetic all-approved manifest with `name: "Dr. Synthetic Anatomist (DRY-RUN TEST)"` ran through `promote.mjs --dry-run` → result `51 would-promote, 0 failed`. Synthetic manifest deleted after the run; no content records modified.
  3. `promote.mjs --dry-run` against the unedited (TBD-anatomist) manifest correctly refused: `FAIL manifest.anatomist.name is not set...`.
  4. `pipelines/06-validate-content/validate.mjs` re-ran post-dispatch: 51 pass / 0 fail (no regression).
  5. `app/web npm run verify`: typecheck + 11/11 schemas + clean Vite build (no regression; the 1.1 MB chunk-size warning is pre-existing per P1.10 baseline).
- **Markdown packet format chosen for v1.** Diffs cleanly under git; renders on GitHub for review threading; prints to PDF via any browser. PDF generator (Puppeteer / LaTeX) deferred to Phase 2+ unless the anatomist requests it. Zero pipeline dependencies for the generator side.

### 2026-05-11 — P1.09 (Architect + QA schema upgrade, cross-domain dispatch)

- **Cross-domain dispatch.** Operated as both Architect (schema authority) and QA (validation tooling) for one invocation. Architect-side details captured in `architect.state.md`; this log focuses on QA-side validator + smoke-test.

- **B1 — ajv `^8.20.0` + ajv-formats `^3.0.1` added to `app/web/package.json` devDependencies.** Versions chosen by `npm view ajv version` and `npm view ajv-formats version` (latest stable at 2026-05-11). `npm install` succeeded; `package-lock.json` updated. `ajv-formats` is required because schemas use `format: "date"`, `format: "date-time"`, `format: "uri"` — ajv 8 enforces these only when the formats package is registered.
  - 2 moderate-severity npm-audit findings surfaced in the unrelated dependency tree; not P1.09 scope to address. Filed mentally for an Orchestrator dispatch if material.

- **B2 — `app/web/scripts/validate-schemas.mjs` rewritten as a two-phase ajv-based validator.** Replaces the Phase 0 placeholder that only did JSON-parse + key-existence.
  - **Phase 1 (meta-schema validation):** every JSON file in `app/shared/schema/` is validated as a JSON Schema 2020-12 document via `ajv.validateSchema()`. Additional `ajv.compile()` pass catches issues meta-validation misses (e.g. unresolvable $ref). Confirms declared `$schema` equals `https://json-schema.org/draft/2020-12/schema`.
  - **Phase 2 (data-against-schema):** four pairings, hardcoded in the script:
    - `data/canonical/ontology/nodes.json` → `anatomical-id-schema.json`
    - `data/canonical/ontology/relations.json` → `anatomical-id-schema.json`
    - `data/canonical/ontology/synonyms.json` → `anatomical-id-schema.json` (retired per ADR 0008 but still validates as a degenerate version-only document)
    - `data/derived/mesh-registry.json` → `mesh-asset-manifest.json`
  - **Output format:** one `✓ <name>` or `✗ <name>` line per file, with detailed ajv errors (path + message + params) printed on failure. Final result line: `Result: N passed, M failed.` Exit code non-zero if any failure.
  - **ajv config:** `strict: false` (tolerate unknown keywords for forward-compat) + `allErrors: true` (report every failing constraint, not just first).

- **B3 — CI wiring unchanged.** `.github/workflows/ci.yml` step "Validate schemas" runs `npm run validate:schemas`; the package.json script invokes the same `scripts/validate-schemas.mjs` (now ajv-backed). No workflow-yaml edit needed. `npm run verify` chain (`typecheck && validate:schemas && build`) still works end-to-end.

- **B4 — Smoke test outcome.** Constructed a temporary `broken-registry.json` by deleting `lods`, `bounds`, and `provenance` from the first entry of `data/derived/mesh-registry.json` — the entry then matches neither the `own_mesh_entry` shape (missing required fields) nor the `composite_entry` shape (no `composite_children` either). Ran ajv against it. Result: REJECTED with five clear errors:
  - `at /entries/0: must have required property 'lods' {"missingProperty":"lods"}`
  - `at /entries/0: must have required property 'bounds' {"missingProperty":"bounds"}`
  - `at /entries/0: must have required property 'provenance' {"missingProperty":"provenance"}`
  - `at /entries/0: must have required property 'composite_children' {"missingProperty":"composite_children"}`
  - `at /entries/0: must match exactly one schema in oneOf {"passingSchemas":null}`
  Exit code 1. Confirms the `oneOf` enforcement from ADR 0008 works correctly. Temp files were cleaned up; no commits of the broken payload.

- **Idempotency verified.** Ran `npm run validate:schemas` twice in succession. Identical output (modulo terminal control bytes from npm wrapping). All 11 lines pass; result line unchanged.

- **Final verification result.** `npm run verify` in `app/web/` ran clean: typecheck ✓, validate:schemas (11 / 11 PASS) ✓, vite build ✓ (built 49 modules, gzip 168.35 kB — no regression from the Phase 0 baseline). End-to-end: P1.09 deliverables ship without breaking any existing CI signal.

## Handoffs

### From P1.16 — to the user (out-of-band anatomist review)

- **Hand `tests/review-queue/2026-05-11-batch-1/review-packet.md` to the university faculty anatomist.** Once the anatomist returns their decisions:
  1. Fill in `manifest.anatomist.{name, credentials, contact}`.
  2. Per item, set `status` to one of (`approved`, `approved_with_edits`, `rejected`, `needs_research`), populate `reviewed_at` (ISO datetime), `decision` (short string), and optional `reviewer_notes`.
  3. Set top-level `manifest.status` to `"complete"`.
  4. Dispatch a small Content + QA follow-up to run `node pipelines/07-anatomist-review/promote.mjs --dry-run` first, then `node pipelines/07-anatomist-review/promote.mjs` live, then `node pipelines/06-validate-content/validate.mjs` to confirm the promoted records still validate.

### From P1.16 — to Architect (open item)

- **Propose JSON Schema `anatomist-review-manifest.json`** under `app/shared/schema/`, wire it into `app/web/scripts/validate-schemas.mjs` as a fifth data pairing, and document the schema in the Architect ADR series. Until then, the schema-by-example in `tests/review-queue/README.md` is the de-facto contract and `promote.mjs` enforces the critical invariants (named anatomist; non-empty decisions; per-item schema-valid post-promotion record).

### From P1.16 — to a future QA dispatch (optional)

- **`pipelines/07-anatomist-review/triage-report.mjs`** would summarise non-`approved` items across all batches (rejected + needs_research + approved_with_edits) for orchestrator visibility into the long tail. Not built in P1.16 because the first batch's tail is empty (everything is `queued` until the anatomist reviews).

### To future QA dispatches

- **Fixture infrastructure under `tests/fixtures/` + `tests/schema-tests/`** is the next QA build-out. The validator pattern in `scripts/validate-schemas.mjs` is reusable — extracting the ajv + addFormats + compile loop into a small helper would let test files do per-fixture validation without re-coding the boilerplate. Filed for a fixtures dispatch.
- **Selection-event fixtures, content-record fixtures, build-manifest fixtures** can all leverage the existing schemas; their generation is a separate task per agent contract.

### To Asset Pipeline

- **The validator now enforces the composite_children shape.** When P1.08-followup synthesizes the sternum entry, running `npm run validate:schemas` immediately confirms or rejects the shape. No additional bake-time validation logic needed — the ajv pass is authoritative.

### To Orchestrator (if material)

- **2 moderate-severity npm-audit findings** appeared during `npm install ajv ajv-formats`. They are in the existing dependency tree, not in the newly-added packages. Filed for a possible "audit fix" dispatch; not a P1.09 concern.

## Invocation history

- **2026-05-11 — P1.17** (visual regression baselines + perf budgets + review-queue state machine, third QA invocation). Added Playwright + Chromium to `app/web` devDependencies. Created `tests/rendering-snapshots/capture.mjs` — 3 baselines captured cleanly (desktop / iPad-landscape / iPad-portrait), committed as binary PNGs (96 / 89 / 70 KB). Created `pipelines/08-perf-budget/` with `check.mjs` + supporting files; 3 budgets all pass (303.27 / 320 KB gzip JS; 79 / 79 registry entries; 13.71 / 16 MB total LOD bytes). Extended `vite.config.ts` to register canonical-mesh middleware under `configurePreviewServer` so `vite preview` serves the same routes as dev. Extended `.github/workflows/ci.yml` with perf-check + cached chromium install + baseline capture + artifact upload. Extended `tests/review-queue/README.md` with state-machine diagrams + cross-batch tracking docs. Wrote `tests/README.md` covering the four active test categories. `npm run verify` end-to-end clean.

- **2026-05-11 — P1.16** (anatomist review queue, cross-domain Content + QA second invocation). Generated `tests/review-queue/2026-05-11-batch-1/review-packet.md` (51 sections, ~1960 lines) + `manifest.json` (51 items, all `status: "queued"`, anatomist TBD). Created `pipelines/07-anatomist-review/` with `generate-packet.mjs` + `promote.mjs` (dry-run-tested only this dispatch). Synthetic-manifest dry-run: 51 would-promote / 0 failed; no content records modified. `pipelines/06-validate-content` re-run: 51 pass / 0 fail. `app/web npm run verify`: 11/11 schemas + clean build.

- **2026-05-11 — P1.09** (Architect + QA schema upgrade, cross-domain dispatch). ajv `^8.20.0` + ajv-formats `^3.0.1` added; two-phase validator (meta-schema + data-against-schema) replaces the Phase 0 placeholder; smoke-test confirmed rejection of a broken payload with clear `oneOf` errors; `npm run verify` clean.
