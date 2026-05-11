# Agent state: 3d-engine

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 (P1.10)

---

## Open items

- **Composite-entry rendering** (ADR 0008): the registry currently has 0
  composite entries; the sternum composite (UBERON:0000975 → manubrium,
  body of sternum, xiphoid process) is a deferred Asset-Pipeline bake.
  `engine/registry.ts` recognises the shape and `SkeletalScene` will
  silently skip composites until either (a) the bake lands and the
  scene-side composite-children resolver is added, or (b) the bake stays
  deferred and we explicitly synthesise a render-time composite from the
  three child entries. Decision pending Asset Pipeline.
- **iPad touch input.** Phase 1 acceptance #17 is co-primary with desktop.
  P1.10 renders on iPad (R3F + drei + WebGL2 baseline are touch-safe out of
  the box via OrbitControls' built-in touch handling). Confirmed only at
  the smoke-test level — actual on-device perf check is a follow-up.
- **Per-mesh selection material override.** The shared bone material is
  one instance reused across all 79 meshes. P1.11 will need per-mesh
  material clones to support outline / hover highlight; the EntryMesh
  loop already calls `mesh.material = sharedMaterial`, so swapping to a
  per-entry clone is a one-line change when the time comes. Original
  glb materials are preserved on `mesh.userData.originalMaterial` for
  reference / revert.
- **Production deploy path for canonical meshes.** Phase 1 is dev-only
  (spec). The Vite dev middleware does NOT run in `vite build` output. A
  later dispatch must decide: copy meshes into `dist/` at build time,
  serve them from a CDN, or bake them into the build manifest with hashed
  filenames. Flagged for Orchestrator scheduling.
- **Bundle size**: 1,059 KB raw / 295 KB gzipped JS after build. Well
  under the 2 MB-gzipped flag threshold from the dispatch. drei + three +
  fiber dominate; code-split deferred to a perf-focused dispatch.

## Decisions log

### P1.10 — registry-driven SkeletalScene (2026-05-11)

**Mesh-serving strategy: Vite dev middleware.**
A `canonicalMeshStaticPlugin` in `vite.config.ts` maps `/registry.json`
to `data/derived/mesh-registry.json` and `/meshes/<sub>/<file>.glb` to
`data/canonical/meshes/<sub>/<file>.glb`. Chosen over the symlink and
the copy-script alternatives because:
  - No file duplication; canonical data stays the single source of truth.
  - Cross-platform (Windows symlink permission caveats avoided).
  - 30 lines of glue code; one place to evolve when production deploy
    needs a different path (e.g. CDN URL prefix).
  - Path-traversal guarded by `resolve` + prefix check on the meshes root.

**Material strategy: single shared MeshStandardMaterial.**
Color `#ebe0c9` (warm off-white per the femur preview render), roughness
`0.55`, metalness `0`, FrontSide. One instance reused across all 79
own-mesh entries via `getBoneMaterial()`. Per-mesh material clones are
deferred until P1.11 needs them for selection highlighting. The original
glb material is preserved on `mesh.userData.originalMaterial` for
later revert if a dispatch wants the source-baked material back.

**Lighting: three-point matched to the preview tone.**
  - `ambientLight` intensity 0.4, warm-white `#fff5e6`.
  - `directionalLight` key at (3,4,5), intensity 0.8, pure white.
  - `directionalLight` fill at (-4,2,-3), intensity 0.35, cool `#cfd9ff`.
  Mirrors the soft three-point read of `scratch/preview/femur.png`.

**Scene-space units: metres (SCENE_SCALE = 0.001).**
BodyParts3D source units are millimetres. The whole skeleton group is
scaled by 0.001 and recentred at origin so the camera, controls, and
lights operate in human-sized metres. Documented on `SCENE_SCALE` in
`engine/bounds.ts`.

**Camera framing: 35° FOV, 3/4 view, padding 1.35.**
`computeCameraFrame` picks the largest of scaled (width, height, depth)
to set the back-up distance. Direction vector (0.55, 0.35, 1.0)
produces a 3/4 front-right-above view. Near/far derived from distance
to keep clipping wide.

**FemurScene + anatomySeed archived, not deleted.**
Moved to `src/scene/_archive/` with a README explaining what they were
and why. They documented the "before" state and the shape the
selectionStore was designed against — keeping them in tree makes the
registry-driven refactor diffable and preserves the user's hand-authored
seed work as part of project history. Excluded from the live module
graph (App.tsx no longer imports them) and from `tsc -b` via
`tsconfig.app.json` `exclude: ["src/scene/_archive"]` so the typecheck
doesn't trip on relative imports that would now be one extra `../` away.

**Dependency added: `@types/node` (devDependency).**
Required by `vite.config.ts` to type the Node-side middleware
(createReadStream, stat, path resolve, URL). Pinned to `^20.14.0`
matching the Node LTS line. Listed under `devDependencies` only —
zero runtime cost.

## Handoffs

### To 3D Engine, P1.11 — picking + selection + outline

- **selectionStore is intact** and ready to receive selection events.
  The store's `AnatomicalSelection.status` is currently typed as
  `'procedural_proxy'` — P1.11 will need to widen it to the actual
  registry-derived status set (the entries don't carry a status field,
  but the ontology nodes do).
- **EntryMesh attaches `userData.uberonId` on every Mesh** in the loaded
  glb scene graph. GPU picking can read that off the picked Mesh; CPU
  raycast fallback can do the same via `intersect.object.userData`.
- **Shared bone material** must be cloned per-entry when selection
  highlight goes live. The clone-on-mount pattern is already in
  `EntryMesh.useMemo`; switching to per-entry material is a one-line
  change inside the loop.
- **Camera reframe-on-selection** is the agent's hard rule — animated,
  not snapped. `CameraRig` exposes a `controlsRef` so a follow-up can
  call `controls.target.lerpVectors(...)` over a tween.
- The agent's `selection-event-schema.json` contract lives at
  `app/shared/schema/selection-event-schema.json` — P1.11 emits events
  conforming to it.

### To UI agent

- **StructurePanel** is in a placeholder state ("Drag to orbit. Picking
  arrives in P1.11"). When P1.11 wires the store, the panel re-lights up
  automatically because the store hook subscription is unchanged.
- **Header copy** updated to "Phase 1 vertical slice — 79 skeletal
  structures." Coordinate with UI before a future dispatch tweaks it.

## Invocation history

### 2026-05-11 — P1.10 (first invocation)

Loaded the canonical registry, rendered all 79 BP3D-derived own-mesh
entries on the R3F canvas, framed the camera on the combined bounds,
lit with three-point matching the preview tone, retired the procedural
femur seed. Selection wiring deferred to P1.11.

**Files added**:
  - `app/web/src/engine/registry.ts` — types + loader + accessors
  - `app/web/src/engine/loader.ts` — useGLTF + preload helpers, URL builder
  - `app/web/src/engine/material.ts` — shared bone MeshStandardMaterial
  - `app/web/src/engine/bounds.ts` — combined-AABB + camera-frame utility
  - `app/web/src/scene/SkeletalScene.tsx` — R3F Canvas; loads registry,
    renders the 79 own-mesh entries, lighting + camera rig + background
  - `app/web/src/scene/CameraRig.tsx` — PerspectiveCamera + OrbitControls
    fit to the combined bounds
  - `app/web/src/scene/_archive/README.md` — explains the retired seeds
  - `app/web/.claude/launch.json` — preview-MCP dev-server config
    (no-op for verify; saved for future visual-check dispatches)

**Files updated**:
  - `app/web/src/App.tsx` — replaced `FemurScene` with `SkeletalScene`,
    updated header copy
  - `app/web/src/ui/StructurePanel.tsx` — dropped the `FEMUR_SEED`
    placeholder import; panel now shows a "Drag to orbit / Picking
    arrives in P1.11" placeholder until the store gets wired
  - `app/web/src/index.css` — body bg darkened to warm `#1c1816`,
    added `.scene-loading` and `.scene-error` states
  - `app/web/vite.config.ts` — added `canonicalMeshStaticPlugin` to
    serve `/registry.json` and `/meshes/*` from the canonical data tree
  - `app/web/tsconfig.app.json` — excluded `src/scene/_archive`
  - `app/web/tsconfig.node.json` — added `"types": ["node"]`
  - `app/web/package.json` — `@types/node ^20.14.0` devDependency

**Files retired (moved to `src/scene/_archive/`)**:
  - `FemurScene.tsx`
  - `anatomySeed.ts`

**Files preserved untouched per dispatch**:
  - `app/web/src/state/selectionStore.ts`

**Verification**:
  - `npm run typecheck` → clean
  - `npm run validate:schemas` → 11/11 passed
  - `npm run build` → green; bundle 1,059 KB raw / 295 KB gzipped JS
  - Dev-server smoke tests (server started, three HTTP requests):
    - `GET /` → HTTP 200, body contains `<div id="root">`
    - `GET /registry.json` → HTTP 200, valid JSON, 79 entries, version
      `p1.08-bake-1.0.0`
    - `GET /meshes/uberon_0000981/lod0.glb` → HTTP 200, 115,808 bytes,
      first 4 bytes = `glTF` (`0x67 0x6c 0x54 0x46`)

**Visual verification note**: the Claude_Preview MCP requires a
launch.json at the harness CWD, which is read-only in this environment,
so a screenshot-level visual confirmation was not possible from inside
this dispatch. The curl-level assertions verify the registry, the glb
serving path, and the index.html shell; the canvas itself will render
client-side. User-level visual sanity check is recommended on first
manual `npm run dev`.
