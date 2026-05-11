# Agent state: 3d-engine

Append-only state log. Most recent at top.

**Initialized:** 2026-05-11
**Last invocation:** 2026-05-11 (P1.14 — UI ↔ engine integration + iPad touch)

---

## Open items

- **Long-press visual feedback.** P1.14 wires long-press → dive (500ms touch hold), but the touched mesh shows no in-progress hint — the dive simply happens. Subtle pulse on the held mesh would tell the user the gesture is being detected; deferred (would either need a CSS overlay or a new R3F outline variant). Track for P1.18 UX/A11y dispatch.
- **Sternum composite click via breadcrumb.** Dispatch noted: clicking the breadcrumb for sternum should highlight all 3 sub-meshes (manubrium + body + xiphoid). Currently no-op because (a) sternum has no own-mesh registry entry (composite bake deferred per ADR 0008), and (b) the breadcrumb's frame intent would route to `diveStore.dive('UBERON:0000975')` which `CameraRig.ownEntryById` doesn't know about → no dive. **Plumbing exists for the resolver but the composite-children walk needs both an Asset Pipeline bake AND an engine-side resolver to brighten + outline the 3 children together.** Document as P1.16-content-side OR P2 enhancement.

## Closed items (resolved by P1.14)

- **Long-press touch for iPad dive trigger.** Wired in `SkeletalScene.tsx`: pointerdown with `pointerType === 'touch'` arms a 500ms timer; pointerup / pointercancel / motion > 8px cancels; timer fire → `dive(entryId)`. Discriminated from mouse double-click so the two gestures don't race.

## Old open items (from P1.12)

- **Peel UX validation deferred to Phase 2 (no muscle layer to peel).** P1.12
  lands the peel-mode plumbing (preset enum, visibility table, store
  actions, scene-side `visible={false}` cascade), but the Phase 1 registry
  contains only `material_hint === 'bone'` entries. Every preset reduces to
  the same visual output (full skeleton) EXCEPT `'visceral'`, which by
  design hides the skeleton — that one is jarring but mechanically correct
  (visceral view = look past the bones at the organs that aren't present
  yet). Phase 2 adds skin + muscle + organs and the UX gets real.
- **Per-side selection of paired bones (still open from P1.11).** Phase 2+.
- **Long-press touch for iPad dive trigger.** P1.12 wires double-click (350ms)
  + Enter; both ride R3F's pointer abstraction so touch tap-to-select
  works, but a "double-tap to dive" relies on the OS surfacing two
  pointerdown events within the threshold. iPad Safari's gesture stack
  varies (the second tap can be eaten by the long-press handler when the
  user pauses). A tap-and-hold gesture handler beyond R3F's pointer
  abstraction is a P1.14 concern.
- **Constitutional_part_of children stay bright during dive.** The dispatch
  spec rule is "siblings dim; the focused entry AND its
  constitutional_part_of children render full-bright". Phase 1 registry has
  zero `constitutional_part_of` edges for own-mesh entries (only sternum
  composite has them, deferred). `EntryMesh.isBright = focusedId === null
  || focusedId === entry.id` is the Phase 1 form. Phase 2 will need the
  ontology resolver (read relations.json, gather descendants of the
  focused id under `constitutional_part_of`) — a one-line filter widening
  here once that resolver exists.
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

### P1.14 — UI ↔ engine integration + iPad touch (2026-05-11)

**Selection-intent flag on `selectionStore.select`.** The store now carries a `lastIntent: 'none' | 'frame'`. Canvas-clicks pass `'none'` (outline only, no dive); Sidebar / Search / Breadcrumb pass `'frame'` (UI scope). A new `FrameIntentBridge` component inside `SkeletalScene` (mounted as a sibling of SceneContent inside the Canvas tree) subscribes to `selectLastIntent` + `selectLastClickAt` + `selectFirstSelectedId` and dispatches `diveStore.dive(firstSelectedId)` when the latest mutation was a frame intent. Effect keyed on `lastClickAt` so re-selecting the same id with a new frame intent (e.g. clicking the same sidebar entry twice) still re-frames.

Why centralise here vs at every callsite? The Sidebar / Search / Breadcrumb don't import the dive store this way — they declare their intent and let the engine decide. A Phase 2 change ("frame intent should also clear peel" or "frame on a composite resolves to a child") happens in one effect, not three components.

**Long-press touch dive (iPad).** `onPointerDown` checks `pointerType === 'touch'` and arms a 500ms timer scoped via a `ref<{ timerId, startX, startY, entryId, pointerId }>`. `onPointerUp` and `onPointerCancel` clear it. A document-level `pointermove` listener cancels if the pointer travels more than 8px from the press origin. If the timer fires, `dive(entryId)` is invoked directly.

Threshold reconciliation:
  - DOUBLE_CLICK_MS = 350 (mouse path).
  - LONG_PRESS_MS = 500 (touch path).
  - Order: a quick double-tap on iPad fires two pointerdowns (50ms each), both well within the 500ms budget — long-press timer is cancelled by the second pointerup before it fires. A double-tap is therefore a no-op as far as dive is concerned (which is consistent with P1.12's mouse behaviour treating only modifier-free double-clicks as dives).
  - LONG_PRESS_MAX_MOVE_PX = 8 — generous enough to absorb finger tremor without swallowing legitimate drag-to-orbit.

The pointer handlers needed new `onPointerUp` + `onPointerCancel` props on `EntryMesh`; these did not exist in P1.11/12. Added cleanly without disturbing the double-click logic.

**`OrbitControls` touch props made explicit.** `enableZoom / enableRotate / enablePan` defaulted to `true`; P1.14 declares them explicitly in `CameraRig` so a future refactor doesn't silently flip them. Damping factor stays at 0.08 (P1.12 set this; verified by the dispatch as appropriate for iPad touch — slightly snappier than the 0.05 Three.js default).

**Pointer-out cancels long-press.** Treating `onPointerOut` as a cancel was a small UX call: if the user starts a press, then their finger drifts off the bone, the gesture is no longer "press on this entry" so the dive should not fire. The `clearHover` call was already in onPointerOut from P1.11; we added `cancelLongPress` alongside.

**Frame-intent bridge inside the Canvas, not at AppShell level.** The bridge is a React component (`<FrameIntentBridge />`) rendered inside `<Canvas>`. Could have been a `useEffect` at AppShell scope outside the Canvas — chose inside-Canvas because the dive store IS engine-scoped state and the bridge is conceptually an engine concern (translating "user wants to frame X" into "camera, dive to X"). UI's frame-intent declarations remain pure data through the selection store; engine consumes.

### P1.12 — peel mode + dive-deeper camera animation (2026-05-11)

**Peel preset storage: canonical clinical enum, not plain register.**
The store keys on the schema enum `surface | subcutaneous | musculoskeletal
| visceral | skeletal`. The plain-vs-clinical nomenclature toggle the user
requested (`skin / muscle / bone` vs `surface / subcutaneous /
musculoskeletal`) is a UI render-time transform — engine state stays in
the canonical register so it conforms to `peel_state.preset` in
`selection-event-schema.json` without translation. P1.13 owns the label
toggle.

**Visibility table per preset, keyed on `material_hint`.**
`PRESET_VISIBLE_HINTS` declares which `material_hint` values render under
each preset. The decision: `'visceral'` hides the skeleton (canonical
clinical meaning — opening the body wall to view organs); `'skeletal'`
hides everything but bone, cartilage, ligament, generic; `'surface'`
shows everything. Phase 1 has only `bone` so every preset except
`'visceral'` is visually equivalent. Documented in code comments + the
state file's open items.

**Sibling-dim technique: two shared materials, swapped at render time.**
The shared bone material was a single instance reused across all 79
entries (P1.10) — outlines lived outside the material (P1.11) so they
didn't disturb that. Dimming requires per-entry opacity, which forks the
sharing model. Two options:
  (a) Clone the material per entry (O(N) materials).
  (b) Two shared variants (`bright`, `dim`), swap via the `material` prop.
We chose (b). The dim variant is the bright material cloned ONCE per
material type with `transparent=true`, `opacity=0.18`, `depthWrite=false`
(to dodge transparent-sort weirdness without losing depth test). The
swap is a JSX prop change, not a per-frame material allocation — works
within R3F's declarative model cleanly. Phase 1 only has one
`material_hint` (`bone`), so practically there are 2 shared materials in
the scene regardless of how many entries.

Alternative (a) was rejected because it scales linearly with the
ontology (Phase 2 adds 100+ muscles + skin + organs); 2 materials beats
several hundred clones for GPU state churn.

Alternative considered: uniform-on-material approach (set an `opacity`
uniform per entry via `onBeforeCompile`). Rejected because it needs a
custom shader path and the dim quality only needs to be readable, not
artistic.

**Dive animation: lerp via `useFrame`, no animation library.**
The rig latches `from = current camera pose`, `to = computeDivePose(entry)`
at the moment `focusedId` changes, then interpolates inside `useFrame`
with quadratic ease-in-out over `DIVE_ANIMATION_DURATION_MS = 600 ms`.
600 ms is long enough to read as a deliberate movement (vs the agent
hard-rule "snap" failure mode) and short enough not to feel sluggish on
repeat dives. The duration is exported from `diveCamera.ts` so a future
UX dispatch can tune without touching the rig.

OrbitControls is disabled for the duration of the lerp so user drag
doesn't fight the animation; re-enabled on completion. The lerp uses one
allocated `scratch` pose reused every frame (zero per-frame allocation).

**Dive framing: along the existing view direction, not a fixed angle.**
The target camera position is `target + direction * fitDistance`, where
`direction` is the current camera-to-scene-centre vector. This makes the
dive feel like "zoom in along where you were looking" rather than
"teleport to a new angle" — preserves the user's mental orbit while
focusing the framing. Fallback to the initial 3/4 vector if the camera
happens to sit exactly on the dive target (avoids divide-by-zero).
Padding 1.6 (vs initial frame 1.35) — slightly more breathing room for
small entries like single vertebrae.

**Double-click threshold: 350 ms (dispatch spec).**
The OS default is 250 ms; the dispatch's stated value 350 ms is the
slower side because the spatial-3D context (users intermix clicks with
orbit drags) drops legitimate double-clicks at 250 ms. Detection lives
in `SkeletalScene.onPointerDown`: snapshot `lastClickAt` + first-selected
id BEFORE the new select mutation, compare against the just-clicked
entry, fire `dive()` if `delta <= 350ms && sameEntry && noModifiers`.
Modifiers suppress dive (the user explicitly meant multi-select).

**Keyboard Enter triggers dive on a unique single selection.**
Document-level `keydown` listener (mounts once per `<SkeletalScene>`).
Enter while exactly one entry is selected calls `dive(firstSelectedId)`.
Multi-select + Enter is intentionally a no-op (ambiguous which one to
dive into). Form-input targets are excluded so Enter inside a future
search field doesn't accidentally dive. UI agent (P1.13) owns full
focus-management for screen readers; this listener is the engine's
minimum viable Enter handler.

**Dive store breadcrumb: explicit `ascendStack`, plus `clearDive`.**
Stack-based history lets the UI render the full path
("Skeletal > Vertebral column > C1") and call `ascend()` to pop one
level at a time. `clearDive()` pops the whole stack — bound to the
"home"/breadcrumb-root affordance the UI will surface (P1.13). The
store's `dive(id)` is idempotent on same-id (no animation churn when the
user double-clicks repeatedly).

**Store exposure via `window.__peelStore` / `window.__diveStore` in dev.**
Zustand stores are already module-level singletons — any importer gets
the same instance, so UI sidebar wiring (P1.13) needs nothing beyond the
import. The `window` handles are dev-only (gated on `import.meta.env.DEV`)
so you can hot-poke `__peelStore.getState().setPreset('skeletal')` from
the console while debugging without remounting the canvas.

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

### To P1.17 (QA — visual regression + perf budgets)

- **iPad on-device perf check** of the long-press + dive lerp + sibling-dim render loop. Phase 1 acceptance #17 is "smooth on iPad portrait at 30+ fps." P1.10/11/12 confirmed iPad rendering at smoke-test level; P1.14 added the long-press timer + the FrameIntentBridge subscription + new global `pointermove` listener (passive, but still on every move). None of these should impact frame time — the timer is plain `setTimeout`, the bridge is a React effect that fires on selection mutation only, and the move listener does at most a square-distance compare per event — but worth measuring.
- **Frame-intent bridge timing**: the bridge fires `dive()` synchronously in the effect after a `'frame'` selection. The CameraRig then latches a fresh dive on its own subscription. There's one render cycle between the two — visible as a 16ms lag between selection and lerp start. If this becomes noticeable, the bridge could call `useDiveStore.getState().dive(id)` directly without a useEffect indirection (would skip the React reconciliation gap). Not done in P1.14 because (a) 16ms is below the perception threshold, and (b) the effect form is the React-idiomatic shape.
- **Double-click vs long-press race on iPad**: dispatch noted iPad Safari can drop the second tap of a double-tap. The long-press path is now the iPad-canonical dive trigger; the double-tap path stays wired (it works on mouse and on touch when iOS delivers both pointerdowns). QA should verify both paths fire on the target devices.

### To UX/A11y (P1.18)

- **Reduced-motion + dive lerp**: the existing CSS `prefers-reduced-motion` block disables CSS animations / transitions but does NOT touch the Three.js `useFrame` lerp inside CameraRig. A user with `prefers-reduced-motion: reduce` still sees the 600ms camera tween. The right behaviour is probably "snap to target" — the dive store has the new `focusedId` immediately, the CameraRig just lerps. Adding `matchMedia('(prefers-reduced-motion: reduce)').matches` check at the latch point in CameraRig (setting `durationMs: 0`) would honour the preference. Deferred to P1.18.
- **Long-press visual feedback** (also under Open items) — silent gesture is bad a11y. Add a subtle scale pulse or outline pulse on the touched mesh during the 500ms press window.
- **Pointer-events on hidden meshes**: P1.12 wired `<group visible={false}>` cascade for peel-hidden entries, and picking already short-circuits in `resolveEntryIdFromObject`. The long-press timer arms in `onPointerDown` BEFORE the picker resolves — confirmed `pickFromIntersections` returns `null` for hidden meshes, which means `hit` is null and the early return fires, so the timer never arms. Worth double-checking that R3F doesn't dispatch pointerdown on a `visible: false` group at all (per Three.js doc it shouldn't — invisible objects are excluded from raycaster intersections by default).

### To Content (Content agent)

- **`/content/<id>.json` middleware route is live.** Any record file you write to `data/canonical/ontology/content/` is fetchable at `/content/<basename>.json` from the dev server. The DetailPanel renders it immediately on selection. No additional Content-side wiring needed.

### To UI agent, P1.13 — sidebar + breadcrumbs + peel toggle + search + panel

- **Peel store** (`app/web/src/state/peelStore.ts`):
    - State: `preset: 'surface' | 'subcutaneous' | 'musculoskeletal' |
      'visceral' | 'skeletal'`, default `'surface'`.
    - Actions: `setPreset(preset)`, `cyclePreset()`.
    - Selectors: `selectPeelPreset`, `selectIsMeshVisible(materialHint)`.
    - Pure visibility predicate: `isMeshVisibleForPreset(preset, materialHint)`.
    - `PEEL_PRESET_CYCLE` is the default cycle (`surface →
      subcutaneous → musculoskeletal → skeletal → surface…`). UI may
      rebind to a different cycle (e.g. `skin → muscle → bone` only) by
      not calling `cyclePreset` and calling `setPreset` explicitly.
- **Nomenclature toggle (plain vs clinical) is UI's job, not engine's.** The
  engine stores the canonical enum. UI maintains a separate
  display-register store and renders the label via a lookup:
    - `'surface'` ↔ `'skin'`
    - `'subcutaneous'` ↔ `'subcutaneous'` (no plain equivalent)
    - `'musculoskeletal'` ↔ `'muscle'`
    - `'visceral'` ↔ `'visceral'`
    - `'skeletal'` ↔ `'bone'`
  Per the user's P1.10 refinement: plain primary, clinical secondary
  surfaced behind a toggle.
- **Dive store** (`app/web/src/state/diveStore.ts`):
    - State: `focusedId: string | null`, `ascendStack: string[]`,
      `diveStartedAt: number`, `fromPose: CameraPose | null`.
    - Actions: `dive(entryId)`, `ascend()`, `clearDive()`.
    - Selectors: `selectFocusedId`, `selectAscendStack`,
      `selectDiveStartedAt`, `selectIsFocused(id)`.
    - Breadcrumb: read `selectFocusedId` + `selectAscendStack`; the path
      to render is `[...ascendStack, focusedId]` (filter `null`). UI's
      back-button calls `ascend()`; "home"/clear calls `clearDive()`.
- **Camera animates automatically.** UI doesn't need to choreograph the
  camera — calling `dive(id)` or `ascend()` is enough. The CameraRig
  observes `focusedId` and lerps.
- **Peel-mode UI toggle wires to `setPreset` or `cyclePreset`.** No engine
  changes needed.
- **Sidebar tree** continues to read from the selection store as in
  P1.13's handoff from P1.11. Diving into an entry does not change
  selection state; the two stores are intentionally orthogonal.

### To 3D Engine, P1.14 — full integration

- **Touch-tap-and-hold for iPad dive trigger** is a P1.14 concern. R3F's
  pointer abstraction handles tap-to-select and pinch-to-zoom via
  OrbitControls' touch handlers, but a "double-tap to dive" gesture is
  flaky on iPad Safari because the second tap can race the long-press
  handler. The right shape is probably:
    - Tap-and-hold (≥500 ms) on an entry → dive
    - Single tap → select
    - Drag → orbit / pan
  This needs a touch-specific gesture handler (Pointer Events with
  `pointerType === 'touch'` discrimination, or use Hammer.js's
  press recognizer). Out of scope for P1.12; flagged here.
- **Touch double-tap fallback** also needs explicit handling — current
  `pointerdown` double-detection works on touch but iPad Safari's
  300ms-click-delay legacy and the gesture-recognition race can drop the
  second tap. Worth measuring before adding a new path.

### To 3D Engine, P1.12 (HISTORICAL — completed) — peel mode + dive camera

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

### 2026-05-11 — P1.14 (fourth invocation, cross-domain with UI)

Cross-domain dispatch — also acting as UI agent (second invocation; see `ui.state.md` for the UI-side notes). Engine-side workstreams: intent flag on selection store, FrameIntentBridge for sidebar/search/breadcrumb → dive, long-press touch dive on iPad, OrbitControls explicit touch props.

**Files added** (none — all changes were extensions to existing files).

**Files updated**:
  - `app/web/src/state/selectionStore.ts` — extended `select(id, { mode, intent })` with `intent: 'none' | 'frame'`. New `lastIntent` field + `selectLastIntent` / `selectLastClickAt` selectors. Dev-window global `__selectionStore` for console debugging.
  - `app/web/src/scene/SkeletalScene.tsx` — added new `FrameIntentBridge` component rendered inside Canvas; subscribes to selection intent + lastClickAt + first-selected-id and dispatches `diveStore.dive()` on frame intent. Pointer handlers extended with `onPointerUp` + `onPointerCancel` + global `pointermove` cancel-on-motion. Long-press timer wired in `onPointerDown` (touch-only via `pointerType === 'touch'`, 500ms threshold, 8px max-move budget). Canvas-clicks now pass `{ intent: 'none' }` explicitly. EntryMesh props extended to plumb the new handlers.
  - `app/web/src/scene/CameraRig.tsx` — `OrbitControls` `enableZoom / enableRotate / enablePan` declared explicitly (defaults were `true`; explicit reads as a deliberate contract).

**Files preserved untouched per dispatch scope**:
  - `app/web/src/engine/{picking,outline,registry,bounds,loader,material,diveCamera,selectionEvent}.ts` — engine primitives unchanged; integration sits one layer up (scene + state).
  - `app/web/src/state/{peelStore,diveStore,uiPreferencesStore}.ts` — store shapes unchanged.

**Verification**:
  - `npm run verify` → all green:
    - `typecheck` clean (TypeScript caught nothing — confidence in the new intent / pointer prop signatures).
    - `validate:schemas` 11/11 passed.
    - `build` succeeded — `1,135.68 kB raw / 311.52 kB gzipped JS` (~+1 kB delta from P1.13 for FrameIntentBridge + extended pointer handlers).
  - Dev-server smoke tests (server was already running on :5173 from a prior dispatch; 7 HTTP requests):
    - `GET /` → 200
    - `GET /registry.json` → 200 (105,707 bytes)
    - `GET /meshes/uberon_0000981/lod0.glb` → 200 (115,808 bytes)
    - `GET /content/uberon_0000981.json` → 200 (2,499 bytes)
    - `GET /content/uberon_0000209.json` → 200 (1,882 bytes)
    - `GET /content/uberon_99999999.json` → 404
    - `GET /content/..%2F..%2Fetc%2Fpasswd` → 404 (path-traversal guard)
  - Static call-graph reasoning: traced the five spec-required flows. Sound:
    - Sidebar click → `select(id, { intent: 'frame' })` → FrameIntentBridge effect fires → `diveStore.dive(id)` → CameraRig latches new dive → lerp. ✓
    - Cmd-K → AppShell listener → `setSearchOpen(true)` → Search mounts → user picks → `select(id, { intent: 'frame' })` → same dive flow. ✓
    - Canvas click → `select(id, { intent: 'none' })` → no dive (bridge effect short-circuits on non-frame intent). ✓
    - Canvas double-click → second `select(id, { intent: 'none' })` PLUS direct `dive(id)` (DOUBLE_CLICK_MS gate). ✓
    - iPad long-press → 500ms timer fires → direct `dive(entryId)`. ✓

**Visual verification note**: same caveat as prior invocations — no headless-browser harness inside the dispatch. Canvas-side long-press behaviour requires manual on-iPad test.

### 2026-05-11 — P1.12 (third invocation)

Landed peel-mode plumbing (canonical schema enum stored, visibility
table keyed on `material_hint`, scene-side `visible` cascade) and
dive-deeper camera animation (600ms ease-in-out lerp on `focusedId`
change, sibling dimming via two shared materials, double-click 350ms
threshold, keyboard Enter on unique single selection). Phase 1 registry
has only `bone` entries, so the peel UX activates fully only in Phase 2;
mechanical plumbing is correct.

**Files added**:
  - `app/web/src/state/peelStore.ts` — Zustand store with `preset` +
    `setPreset` + `cyclePreset`; `isMeshVisibleForPreset(preset, hint)`
    pure predicate; visibility table per preset (5 presets × ~13
    material hints).
  - `app/web/src/state/diveStore.ts` — Zustand store with `focusedId` +
    `ascendStack` + `diveStartedAt` + `fromPose`; actions `dive`,
    `ascend`, `clearDive`, `setFromPose`; named selectors.
  - `app/web/src/engine/diveCamera.ts` — `computeDivePose(entry, opts)`
    fits an entry's world-space bounds to the camera FOV;
    `easeInOutQuad`, `lerpCameraPose` utilities;
    `DIVE_ANIMATION_DURATION_MS = 600`.

**Files updated**:
  - `app/web/src/scene/SkeletalScene.tsx` — wires peel-mode visibility
    via `<group visible={...}>`, sibling dimming via two shared
    materials (`bright` / `dim`), double-click → `dive` (350ms
    threshold, modifier-suppressed), keyboard Enter → `dive` on unique
    single-selection. `EntryMesh` gains `isBright` + `isVisible` props.
    Host div now `tabIndex={0}` so keyboard focus is grabbable.
  - `app/web/src/scene/CameraRig.tsx` — observes
    `useDiveStore(selectFocusedId)` + `selectDiveStartedAt`; latches
    from-pose + to-pose on transition; lerps in `useFrame` with
    quadratic ease-in-out; disables OrbitControls during the animation
    + re-enables on completion. Accepts `entries: RegistryEntry[]` so
    it can look up the dive target by id.

**Files preserved untouched per dispatch scope**:
  - `app/web/src/state/selectionStore.ts` — already exposed
    `lastClickAt` (P1.11) which P1.12 reads for double-click detection.
    No store-shape change.
  - `app/web/src/ui/*` — UI scope is P1.13.
  - `app/web/src/engine/{picking,outline,registry,bounds,loader,material,selectionEvent}.ts` — unchanged.

**Verification**:
  - `npm run verify` → all green:
    - `typecheck` clean.
    - `validate:schemas` 11/11 passed (7 schema files + 4 data files).
    - `build` succeeded — `1,070.75 kB raw / 299.46 kB gzipped JS`
      (~12 KB delta from P1.11 for the two new stores + diveCamera
      utility + scene-side wiring).
  - Dev-server smoke tests (server started; 8 HTTP requests):
    - `GET /` → 200
    - `GET /registry.json` → 200
    - `GET /meshes/uberon_0000981/lod0.glb` → 200
    - `GET /src/state/peelStore.ts` → 200
    - `GET /src/state/diveStore.ts` → 200
    - `GET /src/engine/diveCamera.ts` → 200
    - `GET /src/scene/SkeletalScene.tsx` → 200
    - `GET /src/scene/CameraRig.tsx` → 200
  - Static reasoning on peel mechanics: with the Phase 1 registry
    (every `material_hint === 'bone'`), `surface` /
    `subcutaneous` / `musculoskeletal` / `skeletal` all return the
    same boolean (`true`) from `isMeshVisibleForPreset`, so the
    skeleton renders identically under those four. `visceral` returns
    `false` for `bone`, so the user would see an empty scene with
    only the lights — mechanically correct (visceral view hides the
    skeleton because organs would be visible underneath), but visually
    unsurprising in Phase 1.

**Visual verification note**: as in prior invocations, no headless-
browser harness is available from inside this dispatch. The curl-level
assertions cover module transformation + registry serving + glb
serving; canvas-side dive animation, sibling dimming, and double-click
behaviour require a manual `npm run dev` + interaction test by the
user.

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
