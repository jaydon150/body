# Agent state: 3d-engine

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 (P1.11)

---

## Open items

- **Pick-through-transparency.** P1.11 picks the front-most raycaster hit
  only. Once organs/skin layers are added in later phases, selecting a
  bone through translucent tissue requires walking the intersection list
  past transparent hits (or splitting picking by render order). Deferred
  to Phase 2.
- **Per-side selection of paired bones.** P1.11 ships Option A from the
  dispatch — clicking either half of a paired bone selects the whole
  UBERON entry; both halves outline together. Per-side ("left femur"
  distinct from "right femur") needs the BP3D source to carry side
  metadata and a sub-mesh id convention. Deferred to Phase 2+.
- **True GPU picking via colour-buffer render target.** Agent hard rule
  #2 mandates GPU picking for production; P1.11 uses Three.js's CPU
  raycaster (which is what R3F's pointer events ride on). Acceptable at
  current scale (79 meshes, hover/click latency is fine) but should be
  upgraded before the full anatomy ships. Render-to-id-target picker is
  the standard path; tag every sub-mesh with a unique colour, render to
  offscreen FBO, read back at the pointer pixel.
- **Accessibility — keyboard selection.** P1.11 ships pointer-only.
  Selecting a structure with the keyboard (tab through entries,
  arrow-keys to step, Enter to select) is P1.13's responsibility (UI
  agent owns focus management); the store already supports the API the
  keyboard handler will need (`select(id, { mode })`).
- **GPU picking precision when nerves run through bone.** Agent
  escalation trigger — flagged for future dispatch when nerve meshes are
  added.
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

### P1.11 — picking + selection state machine + outline (2026-05-11)

**Picking implementation: R3F pointer events on React-owned `<mesh>` JSX.**
P1.10's `EntryMesh` mounted a cloned drei `gltf.scene` via `<primitive>`,
which is opaque to React children — drei's `<Outlines>` needs to be a
child of a `<mesh>` so it can read `parent.geometry` in
`useLayoutEffect`. The P1.11 rewrite traverses the loaded glb scene once
in `extractSubMeshes`, pulls out each `THREE.Mesh`'s baked-world matrix
+ geometry, then mounts them as React-owned `<mesh>` elements with
`matrixAutoUpdate=false`. Pointer events attach naturally and outlines
can be conditional children. The shared bone material stays shared
(one instance across all 79 entries) since outlining lives outside the
material.

**Selection event transport: state IS the event, no side channel.**
Dispatch instructions are explicit — "the state IS the event" for Phase
1. The `selectionStore` is the single source of truth; UI subscribes via
`useSelectionStore(selector)`. `engine/selectionEvent.ts` ships a typed
`buildSelectionEvent()` whose output conforms to
`selection-event-schema.json` (validated five sample event shapes against
the schema during P1.11 dev — all pass), but it is NOT called from the
runtime path. Future expansion (worker dispatch, analytics, server
mirror) wraps store mutations in `buildSelectionEvent()` calls without
changing the store's public surface.

**Outline implementation: drei `<Outlines>` (inverted-hull, screenspace).**
Chosen over Three.js post-process `OutlinePass`:
  - Already a dependency; zero bundle delta on the EffectComposer path.
  - Lives as a child of the highlighted mesh — no global render-pass
    pipeline to wire into the R3F scene.
  - `screenspace: true` + `thickness: 0.02` gives the requested ~2 px
    constant outline regardless of camera distance.
  - The drei mesh has `raycast: () => null` semantics (an empty
    BackSide shell), so it doesn't pollute the picker.
  - `OutlinePass` would have been the right call if peel-mode required
    cross-system outlining or LOD-aware silhouette compositing —
    revisit when those land.

**Outline color: saturated cyan `#3aa5d9`.**
On the warm-dark background `#1c1816` and warm off-white bone material
`#ebe0c9`, a cool-cyan outline gives clean figure-ground separation.
The alternative warm-orange `#e08c3c` was rejected — too close in hue
to the bone material, the outline blurs into the silhouette at distance.
Selection outline opacity 1.0, thickness 0.02 (screenspace ≈ 2 px).

**Hover treatment: dimmer + thinner outline in the same cyan.**
Unified visual language (one accent colour for "engine pays attention to
this thing"), with the selected outline dominant. Hover thickness 0.012
(~60% of selection), opacity 0.55, transparent on. The alternative —
material emissive bump — was rejected because hover would force per-
entry material clones just for the hover frame; outlines-only keeps the
shared bone material truly shared.

**Paired-bone selection rule: Option A (whole entry).**
When the user clicks ONE sub-mesh of a paired bone (e.g. one half of
the mandible or one rib), the whole `entry.id` selects and both sub-
meshes outline together. Both sub-meshes carry the same UBERON id on
`userData.entryId`, so they are indistinguishable to the picker — the
schema's `entry.id` is the unit of selection. Per-side selection ("left
femur" distinct from "right femur") deferred to Phase 2 (open item).

**Modifier-key → selection mode mapping.**
  - no modifiers → `replace` (single-select)
  - shift → `add` (extend selection)
  - ctrl / meta → `toggle` (add or remove)
Lives in `engine/picking.ts:modeFromModifiers()`. P1.13 UI may override
when surfacing a "compare" mode; the store API takes the mode
explicitly so a future caller can drive any mapping.

**Background-click deselects.**
`<group>`'s `onPointerMissed` handler clears selection on primary-button
empty-space click. Standard 3D-viewer UX; matches the schema's `clear`
event-type.

**StructurePanel rewritten to read the new store shape.**
P1.10's `AnatomicalSelection { id, label, latinLabel, materialHint,
status }` is retained as a deprecated exported type (one-release
back-compat for anything still importing it). The runtime store keys
selection by UBERON id only; label resolution against the ontology is
P1.13's job. The panel now shows first-selected id + multi-select count
+ hover read-out.

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

### To 3D Engine, P1.12 — peel mode + dive camera

- **Peel mode hides meshes via `visible: false`.** The picker already
  respects this — `resolveEntryIdFromObject` in `engine/picking.ts` walks
  the parent chain checking `visible !== false`. A hidden sub-mesh
  cannot be picked even if the raycaster intersects it (defensive: also
  protects against bounds-overlap with hidden organs).
- **Dive camera reads `selectFirstSelectedId` from the store.** The
  store exposes `selectFirstSelectedId(state)` as a stable selector;
  `lastClickAt` is wall-clock-timestamped on every selection mutation so
  a double-click detector (two `lastClickAt` deltas under ~300 ms with
  the same `firstSelectedId`) can fire a `camera_intent: 'dive'`.
- **Selection-driven camera reframe.** The agent's hard rule is animated
  reframe, not snap. `CameraRig` already exposes `controlsRef`; a
  `useEffect` on `selectFirstSelectedId` change can lerp
  `controls.target` toward the selected entry's centroid (computable
  from the registry bounds + scene transforms). Not yet wired.
- **Selection-event camera intent.** `buildSelectionEvent({ cameraIntent:
  'dive' | 'frame' | 'orbit' })` is the typed surface for dive/reframe
  intents when P1.12 starts emitting events.

### To UI agent, P1.13 — wire selection store into the UI

- **Store shape** (`app/web/src/state/selectionStore.ts`):
    - `hovered: { id: string | null }`
    - `selected: { ids: Set<string> }`
    - `lastClickAt: number`
    - Actions: `setHovered`, `clearHover`, `select(id, { mode })`,
      `clearSelection`
- **Named selectors** ship for stable references in components:
  `selectHoveredId`, `selectSelectedIds`, `selectFirstSelectedId`,
  `selectIsSelected(id)`.
- **Label resolution is UI's job.** The store only knows UBERON ids.
  Resolve to label / latin / definition via the ontology nodes file
  (`data/canonical/ontology/nodes.json`) — that lookup is what the
  panel + sidebar both need. A small `useEntryLabel(id)` hook is the
  natural shape; engine doesn't ship it because nodes resolution is
  a UI/ontology concern.
- **`AnatomicalSelection` interface is now deprecated** but still
  exported for one cycle. Replace with direct id usage + the label hook.
- **Keyboard accessibility** is unimplemented (open item). The store
  API supports it — `select(id, { mode: 'replace' | 'add' | 'toggle' })`
  is the entry point for an Enter / Space keyboard handler.
- **Empty-space click clears selection** at the canvas level. UI may
  want to expose a "deselect" button for keyboard users; calls
  `clearSelection()`.
- **Sidebar highlight on hover** — `useSelectionStore(selectHoveredId)`
  gives the currently hovered entry id; sidebar items can compare to
  themselves to add a highlight class. Mirrors what `SkeletalScene`
  already does for the outline.

### To 3D Engine, P1.11 — picking + selection + outline (HISTORICAL — completed)

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

### 2026-05-11 — P1.11 (second invocation)

Wired GPU picking (via R3F pointer events on React-owned `<mesh>` JSX,
backed by Three.js's Raycaster — production GPU-FBO upgrade flagged as
open item), extended the selectionStore into a real state machine with
hover + multi-select + last-click-at, and lit selected entries with
drei `<Outlines>` in saturated cyan. Hover gets a thinner, dimmer
outline in the same hue. Background-click deselects; shift/ctrl
modifiers map to add/toggle selection modes. Paired-bone clicks select
the whole UBERON entry (Option A).

**Files added**:
  - `app/web/src/engine/picking.ts` — entry-id resolution, modifier
    extraction, intersection picking, modifier → mode mapping
  - `app/web/src/engine/outline.ts` — outline + hover-treatment color/
    thickness/opacity constants
  - `app/web/src/engine/selectionEvent.ts` — typed event builder
    conforming to `selection-event-schema.json` (state IS the event in
    Phase 1; this is the typed surface for future side-channel emission)

**Files updated**:
  - `app/web/src/state/selectionStore.ts` — full rewrite to the new
    state-machine shape (`hovered`, `selected.ids`, `lastClickAt`,
    `setHovered`/`clearHover`/`select`/`clearSelection`) +
    named selectors (`selectHoveredId`, `selectSelectedIds`,
    `selectFirstSelectedId`, `selectIsSelected`). `AnatomicalSelection`
    kept as a deprecated export for one-cycle UI back-compat.
  - `app/web/src/scene/SkeletalScene.tsx` — `EntryMesh` rewritten to
    extract glb sub-meshes into a flat list, render each as React-
    owned `<mesh>` with the shared bone material; `<Outlines>` mounts
    conditionally as a child when the entry is selected/hovered.
    `SkeletonGroup` wires pointer handlers (onPointerOver/Out/Down,
    onPointerMissed) that read intersections, resolve entry ids, and
    dispatch to the store.
  - `app/web/src/ui/StructurePanel.tsx` — rewritten to read the new
    store shape (first-selected id + multi-select count + hover); no
    longer references the deprecated label/latin fields, those are
    P1.13's resolution to make against the ontology.

**Verification**:
  - `npm run verify` → all green (`typecheck` clean, `validate:schemas`
    11/11 passed, `build` succeeded — 1,066 KB raw / 298 KB gzipped JS,
    ~7 KB delta from P1.10 for drei `Outlines`).
  - Out-of-band schema sanity: built five sample event shapes
    (`hover`, `select`, `multi_select_add`, `clear`, `deselect`) via
    `buildSelectionEvent()`-equivalent JSON and validated each against
    `selection-event-schema.json` with Ajv 2020 — all five pass.
  - Dev-server smoke test: `npm run dev` came up in 315 ms; four GETs:
    - `GET /` → HTTP 200, valid index.html
    - `GET /src/main.tsx` → HTTP 200, 2,336 B
    - `GET /src/scene/SkeletalScene.tsx` → HTTP 200, 40,136 B
    - `GET /src/state/selectionStore.ts` → HTTP 200, 9,106 B
    - `GET /registry.json` → HTTP 200, 105,707 B
  - Dev log clean — no warnings, no errors.

**Visual verification note**: as in P1.10, no headless-browser harness
is available from inside this dispatch. The curl-level assertions cover
module transformation + registry serving; canvas-side picking + outline
rendering requires a manual `npm run dev` + click-test by the user.

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
