# Agent state: content

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 (P1.16 anatomist review queue, cross-domain Content + QA)

---

## Open items

- **(NEW, P1.16)** **JSON Schema for `anatomist-review-manifest.json` not yet authored.** The de-facto contract is the schema-by-example block in `tests/review-queue/README.md`. Proposed for a future **Architect** dispatch; out-of-scope for P1.16 because schema authority belongs to Architect and extending `app/web/scripts/validate-schemas.mjs` would have crossed that boundary.
- **(NEW, P1.16)** **No anatomist identity yet recorded.** `manifest.anatomist.{name,credentials,contact}` are all `"TBD"` until the user names the university faculty reviewer. `promote.mjs` refuses to run with a TBD name (the content-record schema requires `reviewed_by` for `reviewed` records). The user must fill the `anatomist` block before the promotion stage.
- **(NEW, P1.16)** **`approved_with_edits`, `rejected`, and `needs_research` items do not auto-promote.** They become Content (or Research/Docs) agent follow-up work. A new Content batch will need to revise the prose for any `approved_with_edits` records and re-queue; `rejected` records need either rewriting or removal; `needs_research` items escalate to Research/Docs.
- **29 BP3D gap structures not in this batch.** Per `pipelines/01-import-bp3d/gap-report-2026-05-11.md`, 29 structures in the 125-node ontology lack BP3D-shipped meshes (sternum composite, hip-bone constitutional parts ilium/ischium/pubis, femur head/neck/shaft/condyles/trochanters, humerus head/neck/shaft/trochlea/capitulum/epicondyles, scapula sub-features acromion/coracoid/spine/glenoid, all hand and foot phalanges, coccyx). These nodes exist in `nodes.json` but were excluded from the P1.15 mesh-first content batch. They will need either Asset Pipeline procedural decomposition or a separate content-only batch authored ahead of the mesh.
- **Composite sternum content (UBERON:0000975) deferred.** The three constitutional parts (manubrium, body, xiphoid) each have their own content record in this batch. A composite parent content record is deferred until the Asset Pipeline either bakes a composite mesh (P1.08 noted this as an option) or the Architect rules that a parent-without-mesh-but-with-children content record is in-scope.
- **Flagship-bone sub-structure content not yet authored.** Femur head/neck/shaft/condyles/trochanters and the analogous humerus/scapula sub-features are good first targets for the P1.16-or-later content batch, especially if the Asset Pipeline procedurally decomposes the parent meshes.
- **`functional/` content directory is empty.** Innervation, arterial supply, venous drainage, lymphatic drainage, and muscle attachments are explicitly Content scope per `docs/agents/content.md` but were not in the P1.15 dispatch. The Phase 1 spec acceptance criterion #13 was reference prose only.

## Decisions log

### 2026-05-11 - P1.16 (anatomist review queue, cross-domain Content + QA second invocation)

- **Packet format: Markdown for v1.** `tests/review-queue/2026-05-11-batch-1/review-packet.md` is one Markdown document with one H2 section per content record. Each section shows preferred label + UBERON ID + FMA alias + TA Latin name + summary + long-form + citations + a 4-checkbox reviewer-action stub + a free-text quote-block for notes. Markdown chosen over PDF for v1 because it diffs cleanly, renders on GitHub, prints via browser when paper is wanted, and requires zero pipeline dependencies. PDF reserved for Phase 2+ if the anatomist requests it.
- **Section ordering minimises anatomist context-switching.** Bucket order: (1) three canaries (femur, mandible, rib 8); (2) seven calvarial/skull-base bones (frontal, parietal, occipital, sphenoid, temporal, ethmoid, maxilla); (3) four atypical vertebrae (atlas, axis, C7, sacrum); (4) everything else alphabetical by preferred label. Within each bucket, alphabetical. The UBERON IDs used for the priority buckets are verified inline against `nodes.json` (avoided a near-miss where I'd assumed wrong IDs from memory: 0001105 is *clavicle* not C7, 0001446 is *fibula* not sacrum — the actual IDs are 0004616 and 0003690 respectively).
- **Manifest shape (`tests/review-queue/2026-05-11-batch-1/manifest.json`):** top-level `version`, `batch_id`, `generated_at`, `anatomist {name, credentials, contact}`, `status`, `items[]`. Per-item: `structure_id`, `filename`, `preferred_label`, `status` (`queued | in_review | approved | approved_with_edits | rejected | needs_research`), `queued_at`, `reviewed_at`, `decision`, `reviewer_notes`. All 51 items in this batch are `status: "queued"`, `reviewed_at: null`, `decision: null`, `reviewer_notes: null`.
- **Promotion script (`pipelines/07-anatomist-review/promote.mjs`) is dry-run-only this dispatch.** No content records modified. The script reads the manifest, and for each item with `status: "approved"` opens the corresponding content record, sets `confidence: "reviewed"`, `reviewed_by: <anatomist.name>`, bumps `last_updated`, optionally appends `review_notes` from `reviewer_notes`, validates against `content-record-schema.json`, and writes — but only with `--dry-run` absent. Dry-run with a synthetic all-approved manifest (`Dr. Synthetic Anatomist (DRY-RUN TEST)`) confirmed 51 would-promote / 0 failed; no files written.
- **`approved_with_edits` does not auto-promote.** That state means the prose itself needs Content-agent revision. Promoting to `reviewed` would lock in unedited prose; the safer pattern is: Content edits → re-queue → next anatomist sign-off as `approved` → promote.
- **`promote.mjs` refuses to run with `anatomist.name === "TBD"` or empty.** Confirmed by smoke test. Schema requires `reviewed_by` for `reviewed` records and we will not invent it.
- **All-or-nothing batch write.** If any record fails post-promotion schema validation, `promote.mjs` aborts the entire batch (nothing is written). This matches QA hard-rule 4 ("the accuracy review queue is auditable") — half-promoted state would be confusing to audit.
- **No P1.15 records modified.** All 51 remain `confidence: "pending"`. The `pipelines/06-validate-content/validate.mjs` re-run still shows 51 passed / 0 failed.
- **`app/web` build untouched.** `npm run verify` continues to show 11/11 schemas pass + clean Vite build.

### 2026-05-11 - P1.15 (first invocation)

- **51 content records authored** (1 over the 50 lower bound). Each conforms to `content-record-schema.json` with `confidence: "pending"`, `authored_by: "Content agent, P1.15 dispatch"`, and at least one textbook citation.
- **Selection criteria applied:** all 79 entries in `data/derived/mesh-registry.json` were considered. The 51 chosen biased toward:
  - The three P1.05/P1.06/P1.07 canaries: femur (UBERON:0000981), mandible (UBERON:0001684), rib 8 (UBERON:0010757).
  - Visible-identity skull bones: frontal, parietal, temporal, occipital, sphenoid, ethmoid, maxilla; plus face accessory bones (zygomatic, nasal, lacrimal, palatine, vomer) for orbital and palatal coverage.
  - Vertebral column representative coverage: atlas, axis, C3-C7, T1, T6, T8, T12, L1, L3, L5, sacrum (15 vertebrae out of 24 + sacrum in the mesh registry; mid-region T2-T5, T7, T9-T11, L2, L4 omitted because the typical pattern is well-conveyed by the representative subset and adjacent records would be near-duplicates).
  - All 6 typical+atypical rib categories: rib 1 (atypical, single facet, scalene-tubercle), rib 2 (sternal-angle landmark), rib 7 (last true rib), rib 8 (canary, false rib), rib 9 (false rib), rib 11 (floating), rib 12 (floating).
  - All 3 sternum sub-components (manubrium, body, xiphoid).
  - Upper limb long bones (clavicle, scapula, humerus, radius, ulna) and the two most distinctive carpal bones (scaphoid, lunate).
  - Lower limb long bones (femur, tibia, fibula), patella, hip bone (whole — its three constitutional parts are BP3D gaps), and the two largest tarsal bones (talus, calcaneus).
- **Per-individual carpal/tarsal/phalanx records skipped** for this batch (lunate authored as scaphoid's logical pair; remaining carpals/tarsals/phalanges are pedagogically less differentiated at this level per dispatch guidance).
- **Citation sources standardised on two textbooks:** *Gray's Anatomy: The Anatomical Basis of Clinical Practice* 42nd ed. (2021, ed. Standring) as primary, and *Moore's Clinically Oriented Anatomy* 9th ed. (2023) as supplementary citation on canary records, the three highest-traffic surface-landmark structures (atlas, axis, C7, T12, L5, sacrum, hip bone, clavicle, scapula, humerus, tibia, talus, calcaneus, patella, ribs 1/2/12), and the sternum body. Page numbers were intentionally given as chapter/section references rather than specific page numbers, because verified page numbers across the multiple chapter splits of the 42nd edition could not be cross-checked without the physical text on hand. Per hard-rule 4 ("AI confidently invents plausible anatomy"), the section reference is honest and sufficient for the anatomist to locate the source; fabricated page numbers would be the opposite of due diligence.
- **Voice register:** encyclopedic, university-level. TA Latin terms inline parenthetically on first reference, then the English term in body prose. No "interestingly," no editorialising, no clinical recommendations (Phase 1 is educational reference, not clinical guidance). Reading level pitched at pre-medical / first-year medical school.
- **`citations` field included on every record despite being optional for `pending`.** This is per hard-rule 1 in `docs/agents/content.md` ("Every content record cites a source. No uncited prose, even when paraphrasing.").
- **No record claims `confidence: "reviewed"`.** The validator in this pipeline enforces this rule (P1.16 is where the anatomist promotes records).

## Handoffs

### From P1.16 — to the user (out-of-band human anatomist review)

- **The review packet at `tests/review-queue/2026-05-11-batch-1/review-packet.md`** is ready to email / hand to the university faculty anatomist. The Markdown renders cleanly on any GitHub PR; if the anatomist prefers paper, print-to-PDF through any browser works.
- **The manifest at `tests/review-queue/2026-05-11-batch-1/manifest.json`** is the machine-readable companion. Three workflow options for the anatomist's return:
  1. The anatomist edits both the Markdown packet (ticking boxes, writing notes) and the manifest JSON directly.
  2. The anatomist edits only the Markdown packet; a Content/QA helper translates the marks into the manifest JSON.
  3. The anatomist returns the marked-up Markdown plus a short email summary; a Content/QA helper fills the manifest from both.
- **Before running the promotion script,** the user must replace `anatomist.{name,credentials,contact}` "TBD" placeholders with the real reviewer identity, set the top-level `status` to `"complete"`, and per-item set `status` to one of (`approved`, `approved_with_edits`, `rejected`, `needs_research`) plus `reviewed_at`, `decision`, and optional `reviewer_notes`.

### From P1.16 — to a future small dispatch (P1.16-promote / P1.17-promote)

- Once the anatomist returns the marked-up manifest, dispatch a small **Content + QA** task to run `node pipelines/07-anatomist-review/promote.mjs` (without `--dry-run`). The script handles the promotion mechanics; the dispatch's job is to verify the manifest is sane (anatomist named, decisions populated), run the dry-run first, then promote live, then re-run `pipelines/06-validate-content/validate.mjs` to confirm all `reviewed` records still validate.

### From P1.16 — to Architect (open item)

- **Propose a JSON Schema `anatomist-review-manifest.json`** under `app/shared/schema/` and wire it into `app/web/scripts/validate-schemas.mjs` (alongside the existing four data pairings). The schema-by-example block in `tests/review-queue/README.md` is the de-facto contract until then.

### To P1.16 (anatomist review queue)

- **51 `pending` content records** are queued for the user's university anatomist. Order of priority for review:
  1. **Three canaries** — femur (UBERON:0000981), mandible (UBERON:0001684), rib 8 (UBERON:0010757). These have already been used as canaries through P1.05-P1.10 and are the highest-visibility records.
  2. **Whole-skull bones** (frontal, parietal, temporal, occipital, sphenoid, ethmoid, maxilla) — high pedagogical visibility, broad articulations described.
  3. **Vertebral column** — vertebral records share considerable structural overlap; the anatomist may want to triage atypical vertebrae (atlas, axis, C7, T1, T12, L5, sacrum) ahead of typical vertebrae.
  4. **Thoracic cage** — ribs and sternum components.
  5. **Limb bones and remaining structures.**
- Each record's `last_updated` is `2026-05-11T00:00:00Z`. On promotion to `reviewed`, the anatomist should:
  - Set `confidence: "reviewed"`.
  - Add `reviewed_by: "<anatomist's name>"`.
  - Bump `last_updated` to the review timestamp.
  - Optionally fill `review_notes`.
- The schema requires `citations` minItems 1 + `reviewed_by` for `reviewed` records — already satisfied by every record in this batch on the citations side.

### To UI agent (P1.13 parallel)

- Content records are now available at `data/canonical/ontology/content/<primary_id>.json` for the 51 structures listed. UI is free to import these in dev. **The build-time filter to exclude `pending` records from the production app remains the UI/DevOps responsibility** (per hard-rule 3 in `docs/agents/content.md`). For Phase 1 dev preview the records can be shown with a "pending review" badge.

### To QA / CI

- New pipeline at `pipelines/06-validate-content/` runs `node validate.mjs`. Result on this dispatch: **51 passed, 0 failed.**
- Extending the main `app/web/scripts/validate-schemas.mjs` to also call the content validator (so `npm run validate:schemas` covers content) is an Architect + QA concern and deliberately not done in this dispatch (it would be a P1.09 follow-up or a new ADR-worthy decision).

## Invocation history

### 2026-05-11 - second invocation, P1.16 (cross-domain Content + QA)

- Read: `docs/agents/content.md`, `content.state.md`, `qa.md`, `qa.state.md`, `app/shared/schema/content-record-schema.json`, the 51 records under `data/canonical/ontology/content/`, `data/canonical/ontology/nodes.json` (label + alias lookups), `pipelines/06-validate-content/{validate.mjs,package.json,README.md,.gitignore}` (pattern reference), `docs/orchestrator/phase-1-spec.md` (acceptance criterion #13 + anatomist cadence section).
- Created pipeline: `pipelines/07-anatomist-review/` with `generate-packet.mjs`, `promote.mjs`, `package.json`, `README.md`, `.gitignore`.
- Created queue infrastructure: `tests/review-queue/README.md` (workflow + manifest schema-by-example + JSON Schema deferral rationale).
- Generated: `tests/review-queue/2026-05-11-batch-1/review-packet.md` (51 sections, ~1960 lines) and `tests/review-queue/2026-05-11-batch-1/manifest.json` (51 items, ~15 KB).
- Ran: `pipelines/07-anatomist-review/generate-packet.mjs` --> 51 sections / 51 items written.
- Ran: synthetic dry-run promotion with `manifest.dryrun-test.json` (all 51 items `status: "approved"`, synthetic anatomist) --> 51 would-promote / 0 failed; no files written; synthetic manifest cleaned up.
- Ran: `pipelines/07-anatomist-review/promote.mjs --dry-run` against unedited manifest --> correctly refused with `FAIL manifest.anatomist.name is not set (still "TBD" or empty)`.
- Ran: `pipelines/06-validate-content/validate.mjs` --> 51 pass / 0 fail (no regression on P1.15).
- Ran: `app/web npm run verify` --> typecheck + 11/11 schemas + clean Vite build (no regression).
- Did NOT touch: `app/web/src/`, `data/canonical/ontology/content/*.json` (read-only), the engine, any contracts under `app/shared/schema/`.

### 2026-05-11 - first invocation, P1.15

- Read: `docs/agents/content.md`, `app/shared/schema/content-record-schema.json`, `data/canonical/ontology/nodes.json`, `data/derived/mesh-registry.json`, BP3D gap report.
- Created: `data/canonical/ontology/content/` directory, 51 `*.json` content records.
- Created: `pipelines/06-validate-content/` (validate.mjs + package.json + README.md + .gitignore).
- Ran: `pipelines/06-validate-content/validate.mjs` --> 51 pass / 0 fail.
- Ran: `app/web/npm run validate:schemas` --> 11 pass / 0 fail (no regression on the existing main validator).
- Did NOT touch: `app/web/src/`, `data/canonical/meshes/`, anything outside Content scope.
