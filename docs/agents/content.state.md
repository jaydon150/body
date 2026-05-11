# Agent state: content

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 (P1.15 first content batch)

---

## Open items

- **29 BP3D gap structures not in this batch.** Per `pipelines/01-import-bp3d/gap-report-2026-05-11.md`, 29 structures in the 125-node ontology lack BP3D-shipped meshes (sternum composite, hip-bone constitutional parts ilium/ischium/pubis, femur head/neck/shaft/condyles/trochanters, humerus head/neck/shaft/trochlea/capitulum/epicondyles, scapula sub-features acromion/coracoid/spine/glenoid, all hand and foot phalanges, coccyx). These nodes exist in `nodes.json` but were excluded from the P1.15 mesh-first content batch. They will need either Asset Pipeline procedural decomposition or a separate content-only batch authored ahead of the mesh.
- **Composite sternum content (UBERON:0000975) deferred.** The three constitutional parts (manubrium, body, xiphoid) each have their own content record in this batch. A composite parent content record is deferred until the Asset Pipeline either bakes a composite mesh (P1.08 noted this as an option) or the Architect rules that a parent-without-mesh-but-with-children content record is in-scope.
- **Flagship-bone sub-structure content not yet authored.** Femur head/neck/shaft/condyles/trochanters and the analogous humerus/scapula sub-features are good first targets for the P1.16-or-later content batch, especially if the Asset Pipeline procedurally decomposes the parent meshes.
- **`functional/` content directory is empty.** Innervation, arterial supply, venous drainage, lymphatic drainage, and muscle attachments are explicitly Content scope per `docs/agents/content.md` but were not in the P1.15 dispatch. The Phase 1 spec acceptance criterion #13 was reference prose only.

## Decisions log

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

### 2026-05-11 - first invocation, P1.15

- Read: `docs/agents/content.md`, `app/shared/schema/content-record-schema.json`, `data/canonical/ontology/nodes.json`, `data/derived/mesh-registry.json`, BP3D gap report.
- Created: `data/canonical/ontology/content/` directory, 51 `*.json` content records.
- Created: `pipelines/06-validate-content/` (validate.mjs + package.json + README.md + .gitignore).
- Ran: `pipelines/06-validate-content/validate.mjs` --> 51 pass / 0 fail.
- Ran: `app/web/npm run validate:schemas` --> 11 pass / 0 fail (no regression on the existing main validator).
- Did NOT touch: `app/web/src/`, `data/canonical/meshes/`, anything outside Content scope.
