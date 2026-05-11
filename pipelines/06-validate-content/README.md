# pipelines/06-validate-content

Phase 1 step **P1.15** — validate every content record under
`data/canonical/ontology/content/` against
`app/shared/schema/content-record-schema.json`.

This step is **read-only**. It does not write, move, or rename any
content records. It exists so the Content agent (and future CI) can
verify a content batch before handoff to the anatomist review queue
(P1.16).

## What it checks

For every `*.json` file under `data/canonical/ontology/content/`:

1. **Schema conformance** — validates against
   `content-record-schema.json` using Ajv 2020-12 + ajv-formats.
2. **Filename matches `structure_id`** — the basename of the file
   (without extension) must equal the URL-safe form of the record's
   `structure_id` (colon replaced with underscore, lowercased).
   e.g. `uberon_0000981.json` must contain `"structure_id": "UBERON:0000981"`.
3. **`structure_id` exists in `nodes.json`** — every content record
   references a valid anatomy-graph node.
4. **No record claims `confidence='reviewed'` in P1.15** — the
   anatomist-promote step is P1.16. Records with `confidence='reviewed'`
   in this dispatch would be ahead of governance and are rejected here.

## How to run

```
node validate.mjs
```

or

```
npm run validate
```

(from this directory).

Emits one `PASS` / `FAIL` line per file. Exits non-zero on any failure.

## Dependencies

Imports `ajv` and `ajv-formats` via relative path from
`app/web/node_modules/`. There is no `package-lock.json` and no
`npm install` needed in this pipeline directory — same approach as
the lighter Phase 1 pipelines.

## Out of scope

- Extending the main project validator (`app/web/scripts/validate-schemas.mjs`)
  to call this content validator is an Architect + QA concern; this
  pipeline runs standalone.
- Promoting records from `pending` to `reviewed` is the anatomist's
  job in P1.16.
