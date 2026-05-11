# Agent state: qa

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 — P1.09 (Architect + QA schema upgrade, cross-domain dispatch)

---

## Open items

1. **(NEW, P1.09)** **The validator covers schema meta-validation + 4 canonical data pairings.** Coverage gaps to fill in later QA dispatches:
   - No fixture-based tests yet under `tests/fixtures/` or `tests/schema-tests/`. The validator runs against canonical data; isolated fixtures (per the QA hard rule "Don't reach into `data/canonical/` for test data") are not yet wired. Filed for a follow-up QA dispatch.
   - No visual regression baselines yet (Phase 1 has no rendered scenes to baseline).
   - No performance budgets yet (Phase 1 is still building the renderer pipeline; budgets land at P1.10 + P1.13).
2. **(NEW, P1.09)** **The validator's data pairings list is hardcoded inside the script.** When new canonical data files arrive (e.g. content records, build manifests, selection-event fixtures), the `DATA_PAIRINGS` array in `app/web/scripts/validate-schemas.mjs` must be extended. Not a problem yet — Phase 1 has the four files covered — but worth keeping in mind. A future refactor could discover pairings from a manifest rather than hardcoding.
3. **(NEW, P1.09)** **CI runs `npm run validate:schemas` already (per `.github/workflows/ci.yml` step "Validate schemas").** No CI changes needed in P1.09 — the new ajv-backed validator is a drop-in replacement; the step still invokes the same script via npm. Confirmed end-to-end by running `npm run verify` locally.

## Decisions log

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

### To future QA dispatches

- **Fixture infrastructure under `tests/fixtures/` + `tests/schema-tests/`** is the next QA build-out. The validator pattern in `scripts/validate-schemas.mjs` is reusable — extracting the ajv + addFormats + compile loop into a small helper would let test files do per-fixture validation without re-coding the boilerplate. Filed for a fixtures dispatch.
- **Selection-event fixtures, content-record fixtures, build-manifest fixtures** can all leverage the existing schemas; their generation is a separate task per agent contract.

### To Asset Pipeline

- **The validator now enforces the composite_children shape.** When P1.08-followup synthesizes the sternum entry, running `npm run validate:schemas` immediately confirms or rejects the shape. No additional bake-time validation logic needed — the ajv pass is authoritative.

### To Orchestrator (if material)

- **2 moderate-severity npm-audit findings** appeared during `npm install ajv ajv-formats`. They are in the existing dependency tree, not in the newly-added packages. Filed for a possible "audit fix" dispatch; not a P1.09 concern.

## Invocation history

- **2026-05-11 — P1.09** (Architect + QA schema upgrade, cross-domain dispatch). ajv `^8.20.0` + ajv-formats `^3.0.1` added; two-phase validator (meta-schema + data-against-schema) replaces the Phase 0 placeholder; smoke-test confirmed rejection of a broken payload with clear `oneOf` errors; `npm run verify` clean.
