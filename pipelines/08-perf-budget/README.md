# pipelines/08-perf-budget

Phase 1 step **P1.17** — performance budget enforcement.

A single zero-dep Node script that asserts three budgets and exits non-zero
on any violation. Wired into CI; intended to fail the workflow if a
regression slips in.

## Budgets

| # | Budget | Threshold | Source |
|---|--------|-----------|--------|
| 1 | Main JS chunk (gzipped) | < 320 KB | `app/web/dist/assets/index-*.js`, gzipped via `zlib` |
| 2 | mesh-registry entry count | == 79 | `data/derived/mesh-registry.json` `entries[]` |
| 3 | Total canonical mesh bytes | < 16 MB | sum of `data/canonical/meshes/**/lod*.glb` |

Rationale, per threshold:

- **320 KB gzipped main chunk** — Phase 1 Spec v0.2 acceptance criterion
  #16 mentions "bundle gzipped under 1.5 MB" as a generous outer bound.
  The actual P1.13 build is ~310 KB gzipped; 320 KB is a 3% headroom
  buffer that surfaces accidental dependency bloat early.
- **79 entries** — the exact post-P1.08 count. Any drift means either
  a mesh was added (registry needs a re-bake + manifest update) or a
  mesh was lost (regression).
- **16 MB total LOD bytes** — actual is ~14.4 MB after P1.06 LOD
  generation. 16 MB is a ~10% headroom; this catches a regression where
  someone re-runs the pipeline with looser decimation ratios.

## Run

From the repo root:

```
node pipelines/08-perf-budget/check.mjs
```

or via the web-package npm script:

```
cd app/web && npm run perf:check
```

`check.mjs` requires `app/web/dist/` to exist; run `npm run build` first
(the web-package `perf:check` script does this implicitly).

## Exit codes

- `0` — all budgets pass.
- `1` — at least one budget violated. Detailed message identifies which.
- `2` — a required input is missing (dist not built, registry not baked,
  meshes folder absent). This is an environment problem, not a regression.

## Dependencies

Zero. Pure Node built-ins (`fs`, `path`, `zlib`, `url`). No
`package-lock.json`, no `npm install` needed in this pipeline directory.

## Out of scope (P1.17)

- **Frame-time / FPS budgets** — out of scope here; rendering perf
  measurement requires a running browser, which is the Playwright-based
  visual-regression infrastructure's domain (see
  `tests/rendering-snapshots/`). A future QA dispatch can add a perf
  trace step that captures FPS during a fixed interaction script.
- **Per-mesh size budgets** — current per-entry sizes are
  well-bounded by the LOD ratios from `pipelines/03-decimate-lods`.
  A regression-class size shift would show up in budget #3 (total)
  before it became per-entry painful.
- **Draw-call budgets** — Phase 1 has 79 mesh entries with a shared
  bone material; the draw-call ceiling discussion in the Phase 1 Spec
  risk table is reserved for Phase 2 when muscle + skin add hundreds
  more entries.
