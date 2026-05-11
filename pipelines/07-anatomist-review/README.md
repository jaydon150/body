# pipelines/07-anatomist-review

Phase 1 step **P1.16** — anatomist review queue.

This pipeline does two things, separated in time by the human anatomist:

1. **`generate-packet.mjs`** — at the start of a batch, read every
   `data/canonical/ontology/content/*.json` and emit two artefacts under
   `tests/review-queue/<batch_id>/`:
   - `review-packet.md` — a Markdown document the anatomist reads and
     marks up.
   - `manifest.json` — a machine-readable queue file the promotion
     script consumes.
2. **`promote.mjs`** — after the anatomist returns the edited manifest
   (and any prose corrections directly to the content records), read
   the manifest and promote every item with `status: "approved"` from
   `confidence: "pending"` to `confidence: "reviewed"`, stamping
   `reviewed_by` and `last_updated`. Schema-validated before writing;
   any failure aborts the entire batch.

The two scripts are independent and idempotent.

## generate-packet.mjs

Inputs (read-only):
- `data/canonical/ontology/content/*.json`
- `data/canonical/ontology/nodes.json` (for labels and FMA aliases)

Outputs:
- `tests/review-queue/<batch_id>/review-packet.md`
- `tests/review-queue/<batch_id>/manifest.json`

Run:

```
node generate-packet.mjs
```

or

```
npm run generate
```

Batch id defaults to `2026-05-11-batch-1`. Override via the `BATCH_ID`
environment variable.

The packet's section ordering minimises anatomist context-switching:

1. The three canaries (femur, mandible, rib 8).
2. Skull bones (frontal, parietal, temporal, occipital, sphenoid,
   ethmoid, maxilla).
3. Atypical vertebrae (atlas, axis, C7, sacrum).
4. Everything else alphabetical by preferred label.

Each section shows: preferred label, UBERON ID, FMA alias, TA Latin term,
summary, long-form prose, citations, and a reviewer-action block with
four checkboxes plus a free-text notes blockquote.

## promote.mjs

Inputs:
- `tests/review-queue/<batch_id>/manifest.json` (anatomist-edited)
- `data/canonical/ontology/content/*.json` (read in)
- `app/shared/schema/content-record-schema.json` (validation)

Outputs:
- Modified `data/canonical/ontology/content/*.json` records with
  `confidence: "reviewed"`, `reviewed_by: <name>`, bumped
  `last_updated`, and optional `review_notes`.

Flags:
- `--dry-run` — preview without writing.
- `--manifest <path>` — override default manifest path.
- `--batch <id>` — pick a different batch id.

Run dry-run:

```
node promote.mjs --dry-run
```

or

```
npm run promote:dry-run
```

Run live:

```
node promote.mjs
```

Promotion rules:
- Only items with `status: "approved"` are promoted.
- `"approved_with_edits"` is **not** auto-promoted — Content agent
  should incorporate the edits into the prose first, then re-queue
  for a final `approved` sign-off in a follow-up batch.
- `"rejected"` and `"needs_research"` stay `pending`. They become a
  Content-agent task.
- The script refuses to run if `manifest.anatomist.name` is still
  `"TBD"` or empty (the schema requires `reviewed_by` for `reviewed`
  records and we will not invent it).
- The script refuses to promote an item whose `decision` field is
  empty.
- Any post-promotion record that fails schema validation aborts the
  **entire batch** (nothing is written).

## Dependencies

Imports `ajv` and `ajv-formats` via relative path from
`app/web/node_modules/`. There is no `package-lock.json` and no
`npm install` needed in this pipeline directory — same approach as
the other Phase 1 pipelines.

## Out of scope (P1.16)

- The actual human anatomist review is out-of-band: the user emails
  the packet to a university faculty anatomist, who returns the
  marked-up manifest. This pipeline doesn't automate that step.
- A JSON Schema for `manifest.json` itself (proposed open item; see
  `tests/review-queue/README.md`).
- Extending the main project validator
  (`app/web/scripts/validate-schemas.mjs`) to call promote/manifest
  validation is an Architect concern.
