# tests/

QA-owned test infrastructure. Four current categories, one reserved
for future expansion.

| Folder                  | Category                | Owned by  | Status (Phase 1)                                                |
|-------------------------|-------------------------|-----------|-----------------------------------------------------------------|
| `schema-tests/`         | Schema validation       | QA        | Validator under `app/web/scripts/`; this folder is a placeholder for fixture-backed tests. |
| `fixtures/`             | Reusable test fixtures  | QA        | Placeholder. Filed for a future QA dispatch.                    |
| `rendering-snapshots/`  | Visual regression       | QA        | **Active.** 3 baselines committed; `capture.mjs` drives runs.   |
| `review-queue/`         | Anatomist accuracy queue| QA + user | **Active.** 1 batch (51 items) awaiting out-of-band review.     |

## Testing strategy

The QA agent (see `docs/agents/qa.md`) tests across three dimensions:

1. **Functional** — does the code work?
2. **Performance** — does it run within budget?
3. **Accuracy** — is the anatomical content correct?

Accuracy is delegated to a human anatomist. QA prepares the review
queue and tracks state.

### 1. Schema validation

**Where it lives:** `app/web/scripts/validate-schemas.mjs` (the
authoritative validator) + `app/shared/schema/*.json` (the schemas
themselves).

**What it does:** Two-phase ajv-backed validator.

- Phase A: meta-schema validates every schema file against JSON Schema
  2020-12.
- Phase B: data-against-schema validates four canonical pairings —
  `nodes.json`, `relations.json`, `synonyms.json`, and
  `mesh-registry.json` — against their schemas.

**How to run:** `cd app/web && npm run validate:schemas`, or as part
of `npm run verify`. Wired into CI as the "Validate schemas" step.

**P1.09 added the ajv backing** (replacing the Phase 0 placeholder
that only did parse + key-existence). Smoke-tested by rejecting a
deliberately-broken registry payload — five clear errors, exit 1.

**Future fixture coverage:** `tests/fixtures/` + `tests/schema-tests/`
are placeholders for isolated per-fixture tests so the validator
runs against shape-stable test data rather than always against
mutating canonical data. The QA hard rule "don't reach into
`data/canonical/` for test data" is the long-term anchor here.

### 2. Visual regression baselines

**Where it lives:** `tests/rendering-snapshots/`.

**What it does:** Captures full-page screenshots of the running app
at three viewports — desktop 1920x1080, iPad-landscape 1366x1024,
iPad-portrait 768x1024 — for visual-diff regression detection.

**How to run locally:**

```
cd app/web
npm run build           # capture.mjs serves the built bundle via vite preview
npm run capture:baselines
```

This script:

1. starts `vite preview` on port 5173 in the background (the
   `canonicalMeshStaticPlugin` registers under both
   `configureServer` and `configurePreviewServer`, so the registry +
   mesh routes work in preview too);
2. polls until the server is reachable;
3. for each viewport, opens a Playwright Chromium context, navigates,
   waits for `networkidle`, waits 4 s for GLB streams + R3F render
   passes to settle, then screenshots to
   `tests/rendering-snapshots/baseline-<viewport>.png`;
4. tears down the preview server.

The three PNGs are committed to git (binary, not LFS — they're
small, ~70-100 KB each).

**Phase 1 scope:** only *captures* baselines. Phase 2 will introduce
diff-based gating (a regression run produces a candidate set; a
pixel-or-perceptual diff against baselines decides pass/fail).

**CI:** the workflow runs `npm run capture:baselines` and uploads the
PNGs as a workflow artifact (`rendering-baselines`, 14-day retention)
on every build. Phase 1 does not yet diff them.

### 3. Performance budgets

**Where it lives:** `pipelines/08-perf-budget/check.mjs`.

**What it does:** Zero-dep Node script that asserts three budgets:

| Budget                                       | Threshold     |
|----------------------------------------------|---------------|
| Main JS chunk (gzipped)                      | < 320 KB      |
| `data/derived/mesh-registry.json` entries    | == 79         |
| Total `data/canonical/meshes/**/lod*.glb` B  | < 16 MB       |

Exit code: 0 pass, 1 violation, 2 environment problem.

**How to run locally:**

```
cd app/web
npm run build           # check.mjs reads dist/assets/index-*.js
npm run perf:check
```

**CI:** the workflow runs `npm run perf:check` immediately after the
build. A budget violation fails the workflow.

**Phase 1 scope:** static budgets (bundle size + registry shape +
asset bytes). Dynamic budgets (FPS, draw calls, time-to-first-frame)
are out of scope here; they require a running browser and are a
candidate for a future Playwright-based perf-trace step that
piggy-backs on the visual-regression infrastructure.

### 4. Anatomist accuracy review queue

**Where it lives:** `tests/review-queue/`. See that folder's README
for the full per-item and per-batch state machine.

**What it does:** Manages the human-anatomist review pipeline. One
folder per batch, named `YYYY-MM-DD-batch-N`, containing:

- `review-packet.md` — Markdown read by the anatomist (one section
  per content record, with reviewer-action checkboxes + notes
  blockquote).
- `manifest.json` — machine-readable queue state. Items move
  `queued` → `in_review` → one of `approved`, `approved_with_edits`,
  `rejected`, `needs_research`. Promotion to `confidence: "reviewed"`
  on the content record only happens for `approved`.

**Pipeline:** `pipelines/07-anatomist-review/` contains
`generate-packet.mjs` (build the batch) and `promote.mjs` (consume
the anatomist-edited manifest).

**As of Phase 1:** 1 batch (`2026-05-11-batch-1/`) with 51 items,
all `status: "queued"`, anatomist `TBD`. Awaiting out-of-band review
by a university faculty anatomist. P1.16 dispatch put the queue in
place; P1.17 (this dispatch) added the cross-batch state-machine
documentation.

## CI summary

The `.github/workflows/ci.yml` workflow runs, in order:

1. `npm ci` — install
2. `npm run typecheck` — TypeScript
3. `npm run validate:schemas` — schema validation
4. `npm run build` — Vite production build
5. `npm run perf:check` — perf budget enforcement
6. `npx playwright install chromium` (cached) — browser binary
7. `npm run capture:baselines` — visual regression baseline capture
8. upload `rendering-baselines` and `web-dist` artifacts

The schemas, build, perf, and baseline-capture steps each gate the
ones after them (`set -e` semantics from GitHub Actions). Visual diff
gating arrives in Phase 2 once a sufficient corpus of baselines
exists.

## Future test categories

Reserved for later dispatches, not yet in scope:

- **Unit tests** — pure functions under `app/web/src/engine/` and
  `app/web/src/scene/`. Filed for a follow-up QA dispatch once the
  Phase 1 vertical slice settles.
- **Integration tests** — agent-contract tests verifying e.g. the
  shape of selection events fired by the engine, the shape of
  content records returned by the dev-server middleware.
- **Touch input tests** — a Playwright suite exercising tap, long-
  press, pinch on the iPad viewports.
- **Dynamic perf measurement** — FPS / draw-call counts captured
  during a fixed interaction script in Playwright.
- **A11y tests** — coordinated with the Tier 2 UX/Accessibility audit
  (P1.18); a future skill axe-core integration would gate keyboard
  navigation, contrast, and ARIA shape.
