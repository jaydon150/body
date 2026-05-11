# Phase 1 Spec v0.2

**Phase:** 1 — First system slice (skeletal interactive; skin and muscle as visual placeholders for peel plumbing)
**Status:** Approved (with refinements); first dispatch ready
**Author:** Orchestrator
**Date:** 2026-05-11 (v0.1 → v0.2 revisions same day after user input)

## v0.1 → v0.2 changes

- **Scope clarified.** Peel UX *validation* (does the interaction teach users anything) is **deferred to Phase 2** when muscle content lands. Phase 1 builds and exercises the peel plumbing on skin + muscle as visual placeholders, but cannot prove the UX is right.
- **iPad added as co-primary target**, not secondary. Touch input, responsive layout, iPad-class GPU perf budgets are first-class.
- **Peel preset naming** changes from `surface / subcutaneous / musculoskeletal` to plain `skin / muscle / bone` as the primary register, with a nomenclature toggle that exposes the clinical register as a secondary UI option.
- **Runtime attribution** acceptance criterion added per ADR 0006. Asset Pipeline bakes provenance into glTF metadata; UI exposes an "About this atlas" surface.
- **User's procedural femur proxy seed** acknowledged. The proxy keyed to `UBERON:0000981` (FMA alias `FMA:9611`) is a placeholder; BodyParts3D pipeline output replaces it once available. The proxy is the first content the registry must accommodate.

## Inherited state (from Phase 0 close + ADRs 0004/0005/0006)

- Repository structure, agents, contracts, app skeleton committed and pushed.
- Stack locked: Vite + React + TypeScript + react-three-fiber, WebGL2 baseline.
- Ontology backbone: UBERON primary, FMA + TA2 as aliases. Labels prefer TA2.
- Asset source: BodyParts3D primary (CC-BY-SA-2.1-JP verified). OpenAnatomy reserved for Phase 2+ regional supplements. Z-Anatomy on watch list, not imported.
- Distribution: open academic, private repo `jaydon150/body` for development.
- Anatomist reviewer pool: university faculty, free, ad-hoc batches.

## Goal — Phase 1 done means

A working **skeletal-system vertical slice** running locally at `npm run dev`, on desktop browser and iPad-class hardware. A user can:

1. See the body with skin, muscle, and bone meshes loaded.
2. Click any skeletal structure → its name and a reviewed description appear in a side panel.
3. Use peel-mode presets to toggle `skin / muscle / bone` visibility, revealing the skeleton.
4. Use the sidebar tree to navigate from `Skeletal system → Axial → Vertebral column → Cervical → C1 (atlas)`.
5. Search "atlas" and select C1 directly.
6. Dive into a selected structure: camera focuses, siblings dim, breadcrumb updates, sidebar re-roots.
7. Ascend via the breadcrumb to back out of the dive.
8. Switch between plain and clinical nomenclature (skin ↔ surface, muscle ↔ subcutaneous, etc.) via a UI toggle.
9. Find the "About this atlas" surface within three clicks; see verbatim upstream attribution per ADR 0006.
10. Use the app fluently on iPad with touch input (drag-to-rotate, pinch-to-zoom, tap-to-select).

Skin and muscle meshes are **loaded and visible** for the peel plumbing test, but **content is not yet authored** for them in Phase 1. Clicking a skin or muscle mesh surfaces a "Phase 2 content not yet authored" placeholder.

### What Phase 1 does *not* prove

**Peel UX validation is deferred to Phase 2.** Phase 1 confirms the peel toggle works mechanically — meshes hide and show, animate smoothly, perform within budget — but cannot confirm the *interaction teaches users anything* until muscle has real content underneath. The peel UX as an educational tool is validated when Phase 2 adds muscle content, not now.

## Acceptance criteria

| # | Criterion | Owner |
|---|-----------|-------|
| 1 | BodyParts3D archive imported, cleaned, LODded; all skin + muscle + bone meshes present in `data/canonical/meshes/` | Asset Pipeline |
| 2 | Skeletal sub-ontology: ~80–120 UBERON-primary nodes with FMA aliases, TA2 labels, typed edges | Anatomy Domain |
| 3 | `mesh-asset-manifest.json` registers every imported mesh; every mesh's `id` resolves to an ontology node | Asset Pipeline + Anatomy Domain |
| 4 | App renders the body with skin + muscle + bone, default materials, lit | 3D Engine |
| 5 | GPU picking works; clicking any skeletal mesh emits a `select` event | 3D Engine |
| 6 | Peel mode toggles between `skin / muscle / bone` presets; non-skeletal meshes hide accordingly | 3D Engine |
| 7 | Nomenclature toggle switches preset labels between plain (`skin / muscle / bone`) and clinical (`surface / subcutaneous / musculoskeletal`) registers everywhere they appear | UI |
| 8 | Selected structure gets an outline pass; camera animates to frame it | 3D Engine |
| 9 | Sidebar tree displays the skeletal hierarchy from `Skeletal system` down to leaf bones | UI |
| 10 | Breadcrumb bar shows the current dive-deeper depth and ascends on click | UI |
| 11 | Search (Cmd/Ctrl+K, or tap-search-icon on iPad) finds skeletal structures by label or synonym | UI |
| 12 | Detail panel shows the selected structure's reviewed content record | UI |
| 13 | At least 50 skeletal structures have `reviewed` content; anatomist sign-off logged | Content + QA |
| 14 | All seven schemas validate; full ajv meta-schema validation in place (upgrade from Phase 0 placeholder) | Architect + QA |
| 15 | Visual regression baselines committed for: loaded scene, peel transitions, dive-deeper transitions, at both desktop and iPad viewport sizes | QA |
| 16 | Performance — **desktop:** stable 60 fps on mid-range hardware (Apple M-series / 4-year-old laptop); draw calls below budget; bundle gzipped under 1.5 MB | 3D Engine + DevOps |
| 17 | Performance — **iPad co-primary:** stable 60 fps on iPad Air 4 / 9th-gen-class hardware (A14/A13 SoC); touch input (drag-rotate, pinch-zoom, tap-select) works; layout responsive at iPad portrait (768px) and landscape (1366px) | 3D Engine + UI + DevOps |
| 18 | Runtime attribution per ADR 0006: every canonical glb carries `asset.copyright` + `asset.extras.source`; in-app "About this atlas" surface reachable in ≤ 3 clicks shows verbatim upstream attribution; `build-manifest.json` enumerates contributing sources | Asset Pipeline + UI + DevOps |
| 19 | CI green: typecheck + schema validation + build + visual regression (desktop + iPad viewport snapshots) | DevOps |

## Scope locked

- **Systems with full interactivity:** skeletal only.
- **Systems present as non-interactive meshes:** integumentary (skin), muscular.
- **Number of skeletal structures:** ~100 (default per user). Major bones with sub-structures for the flagship ones (e.g. femur head/neck/shaft/condyles; vertebrae individually named C1–L5).
- **Floor:** organ-level. No tissue, no cellular.
- **Body variant:** male.
- **Targets:** desktop browser **and** iPad (co-primary). Apple M-series / 4-year-old laptop on desktop side; iPad Air 4 / 9th-gen-class on tablet side.
- **Procedural femur proxy:** continues as a placeholder until pipeline output replaces it. Treated as the first registered asset in `mesh-asset-manifest.json` and the first content-record dry-run.

## Scope explicitly NOT in Phase 1

- **Peel UX validation** (deferred to Phase 2 with muscle content; mechanical-peel plumbing is in scope).
- Skin / muscle ontology and content authoring.
- Female anatomy.
- Functional anatomy (innervation, supply, attachments) — Phase 2+.
- Pathology, clinical correlations.
- Quizzes and learning paths.
- Public deploy. App runs locally only.
- iPhone, Android phone, VR/AR (only iPad as a tablet target).
- Authentication, accounts, persistent user state.

## Folder additions / changes

- `data/raw/bodyparts3d/` — populated by `pipelines/01-import-bp3d` (gitignored once content arrives if size exceeds LFS budget).
- `data/canonical/meshes/<primary_id>/` — one folder per anatomical concept with LOD chain.
- `data/canonical/ontology/nodes.json` — populated.
- `data/canonical/ontology/relations.json` — populated.
- `data/canonical/ontology/synonyms.json` — populated.
- `data/canonical/ontology/content/<primary_id>.json` — one content record per structure.
- `data/derived/mesh-registry.json` — generated by `pipelines/05-bake-registry`.
- `app/web/src/engine/` — populated (camera, renderer setup, picking, outline pass, clipping, materials)
- `app/web/src/scene/` — populated (scene graph, peel state, dive-deeper logic)
- `app/web/src/state/` — populated (Zustand store for selection, camera, peel)
- `app/web/src/ui/` — populated (sidebar, breadcrumbs, search, panel, layout)

## Dispatch plan

Order matters: pipeline must precede renderer; renderer must precede UI integration; content can parallel UI but anatomist review batching dictates the cadence.

| Step | Dispatch | Agent(s) | Depends on | Output |
|------|----------|----------|-----------|--------|
| 1 | Extract UBERON's FMA xref subset for skeletal terms; surface gaps | Research/Docs | — | reference doc in `docs/references/summaries/uberon-fma-skeletal-crosswalk.md` |
| 2 | Draft skeletal sub-ontology (nodes + relations + synonyms) | Anatomy Domain | step 1 | `data/canonical/ontology/{nodes,relations,synonyms}.json` (skeletal subset) |
| 3 | Download BodyParts3D archive into `data/raw/bodyparts3d/` | Asset Pipeline | — | raw OBJ files |
| 4 | Run `pipelines/01-import-bp3d` → OBJ to glb | Asset Pipeline | step 3 | unclean glb in working dir |
| 5 | Run `pipelines/02-clean-meshes` → Blender headless cleanup | Asset Pipeline | step 4 | clean glb |
| 6 | Run `pipelines/03-decimate-lods` → generate LOD chains | Asset Pipeline | step 5 | LOD0/1/2 glb per mesh |
| 7 | Run `pipelines/04-validate-ontology` → cross-check IDs | Asset Pipeline + Anatomy Domain | steps 2 + 6 | validation report, missing-ID list |
| 8 | Run `pipelines/05-bake-registry` → produce `mesh-asset-manifest.json` AND bake glTF `asset.copyright` + `asset.extras.source` per ADR 0006 | Asset Pipeline | step 7 | `data/derived/mesh-registry.json`, attribution baked into every glb |
| 9 | Upgrade schema validation to full ajv meta-schema | Architect + QA | — | `app/web/scripts/validate-schemas.mjs` upgraded |
| 10 | 3D Engine: load registry, render meshes, materials, lighting | 3D Engine | step 8 | `app/web/src/engine/`, `app/web/src/scene/` populated |
| 11 | 3D Engine: GPU picking, selection state, outline pass | 3D Engine | step 10 | selection events emit correctly |
| 12 | 3D Engine: peel-mode presets, dive-deeper camera animation | 3D Engine | step 11 | peel + dive verified |
| 13 | UI: layout, sidebar tree, breadcrumbs, search, detail panel, nomenclature toggle, "About this atlas" surface, responsive iPad layout | UI | steps 2 + 11 | `app/web/src/ui/` populated |
| 14 | UI ↔ 3D Engine integration; touch input on iPad (drag-rotate, pinch-zoom, tap-select); attribution surface populated from registry | UI + 3D Engine | steps 8 + 12 + 13 | click/tap ↔ panel, tree ↔ camera, search ↔ select, peel ↔ visibility, attribution surface ↔ registry all wired |
| 15 | Content first batch: draft 50–100 skeletal descriptions | Content | step 2 | content records, all `pending` |
| 16 | Anatomist review batch | Content (via user) | step 15 | content records promoted to `reviewed` |
| 17 | QA: visual regression baselines (desktop + iPad viewports), perf budgets (desktop + iPad GPU), accuracy queue | QA | step 14 | tests committed |
| 18 | UX/Accessibility audit (Tier 2) | UX/A11y | step 14 | audit report, fixes filed |
| 19 | Reviewer pass at each major handoff (3, 8, 14) | Reviewer | n/a | review reports |
| 20 | End-to-end check + Phase 1 retro | Orchestrator | all above | retro doc, status update |

## Open questions — resolved in v0.2

1. ✅ **Skeletal structure count:** ~100 (user default).
2. ✅ **Peel preset names:** plain `skin / muscle / bone` primary, with a nomenclature toggle exposing clinical `surface / subcutaneous / musculoskeletal` as secondary.
3. 🔍 **BodyParts3D download:** Asset Pipeline verifies at step 3; escalates only if blocked. No change from v0.1.
4. ✅ **Blender install on user's machine:** **RESOLVED 2026-05-11.** Blender 5.1.1 (build 2026-04-14) at `C:\Program Files\Blender Foundation\Blender 5.1\blender.exe`. Not on PATH; full path invocation. Major version 5.x rather than the 4.x the spec assumed — mesh-cleanup `bpy` operators we need are stable across the version gap.
5. ✅ **Anatomist review cadence:** 50 / batch / 1–2 wk turnaround as working assumption. **Revisit once an anatomist is confirmed** (user-flagged in v0.2).
6. ✅ **Performance target:** mid-range 4-year-old laptop on desktop **AND** iPad Air 4 / 9th-gen-class on tablet (co-primary, per v0.2 update).
7. ✅ **Phase 1 close gate:** hold all 19 acceptance criteria (was 16 in v0.1; 17–18 added in v0.2 for iPad perf and attribution).

## Outstanding follow-ups (orchestrator owns)

- **OpenAnatomy verification — RESOLVED 2026-05-11 (late evening).** Full verification at the canonical OpenAnatomy project page `openanatomy.org/atlas-pages/slicer-license.html` AND at a per-atlas LICENSE file `github.com/mhalle/spl-brain-atlas/blob/master/LICENSE.md`. Atlases inherit the 3D Slicer License (BSD-style, three-part agreement, Part B governs downloads). Permissive. No share-alike. Commercial use permitted with attribution and clinical-use disclaimer. The research report's substance was right; only its "Section B" gloss was sloppy. ADR 0005 references updated accordingly.
- **Blender install confirmation.** Awaiting user yes/no.

## Risks specific to Phase 1

| Risk | Mitigation | Owner |
|------|------------|-------|
| FMA→UBERON crosswalk gaps for some skeletal structures | `BODY:NNNN` project-local IDs; Anatomy Domain tracks gap list | Anatomy Domain |
| BodyParts3D download access broken | Verify URL at step 3; escalate to Orchestrator if blocked; fallback: contact DBCLS or use Internet Archive | Asset Pipeline |
| Mesh cleanup time blows Phase 1 budget | Time-box each mesh; meshes that need >1 hr of cleanup get a per-mesh issue logged; accept rough mesh + flag for replacement in Phase 2 | Asset Pipeline |
| Anatomist review batch slower than Phase 1 cadence | Don't block on full anatomist completion; ship Phase 1 with a subset reviewed, the rest queued | Content + QA |
| Draw call ceiling hit early | Identify with browser perf tools at step 11; mitigate via instancing (vertebrae, ribs) before adding more meshes | 3D Engine |
| Bundle size exceeds 1.5 MB target | Code-split Three.js via dynamic import; lazy-load LOD0 meshes; reserve WebGPU upgrade for Phase 2 | 3D Engine + DevOps |
| iPad GPU is significantly slower than desktop; perf budget pressure on tablet target | LOD downshift on detected tablet user-agent; tighten draw-call budget for iPad; aggressive instancing for repeated structures (vertebrae, ribs) | 3D Engine |
| iOS Safari WebGL2 quirks (historical) | Verify early via real-device test; fallback path is documented limitations rather than silent failures | 3D Engine + QA |
| Touch input for dive-deeper and selection conflicts with rotate/pan gestures | Long-press for select vs drag-to-rotate; explicit one-finger orbit, two-finger pan, pinch zoom; test in UX/A11y audit | UI + UX/A11y |
| Runtime attribution scope creep | Pipeline-side metadata baking is mechanical; UI "About" surface is bounded to listing sources from registry; resist adding history, contributor lists, etc. in Phase 1 | Asset Pipeline + UI |

## Estimated effort

Honest range: **8–14 weeks** for a solo developer + this AI team, assuming:

- Anatomist available for at least one batch per week.
- BodyParts3D download accessible.
- Blender available locally.
- No major rework forced by a Phase 1 finding (e.g. needing to add a fourth relation type).

The deep-research feed's "4–10 weeks" estimate covered a narrower goal (browser anatomy viewer with no content/review/peel). My estimate covers the full Phase 1 acceptance bar above.

## What I need from you to dispatch Phase 1

v0.2 incorporates the user-approved refinements:

- Plain `skin / muscle / bone` naming + nomenclature toggle
- iPad as co-primary target
- Runtime attribution acceptance criterion (ADR 0006)
- Peel UX validation explicitly deferred to Phase 2
- Anatomist cadence flagged for revisit

**Outstanding before dispatch:**

1. **Blender installation status** on your machine — required for local `02-clean-meshes` runs. Pre-step 5 of the dispatch sequence.

**First dispatch is unblocked even with Blender open**: **Research/Docs step 1 — FMA→UBERON skeletal crosswalk** — has no dependency on Blender, BodyParts3D download, or anatomist availability. It can begin immediately on user "go."
