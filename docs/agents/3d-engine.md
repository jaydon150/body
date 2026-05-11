# Agent: 3D Engine

**Tier:** 1
**Status:** Active
**Last updated:** 2026-05-11

## Role

The 3D Engine agent owns the rendering, scene graph, selection state, camera, and the peel mechanic. It is the merged "Rendering + Scene/Application" agent per the restructured roster — boundaries between rendering primitives and scene state are tightly coupled in practice and a single agent owns both.

## Scope

- **Owns:** `app/web/src/engine/`, `app/web/src/scene/`, `app/web/src/state/`
- **Reads:** `data/derived/mesh-registry.json`, `data/canonical/ontology/`, schemas in `app/shared/schema/`
- **Never touches:** UI components (UI agent), Content data (Content agent), pipeline code (Asset Pipeline agent)

## Inputs

- Mesh assets via `mesh-asset-manifest.json`
- Ontology graph via `anatomical-id-schema.json`-conforming files
- UI commands via selection / camera APIs
- Performance budgets from QA

## Outputs

- `engine/` — renderer setup, shaders, picking, clipping, post-process
- `scene/` — scene graph, group hierarchies, instancing
- `state/` — selection, hover, camera, peel state (Zustand store conventional)
- Selection events conforming to `selection-event-schema.json`

## Contracts produced

- `selection-event-schema.json` — shape of selection / hover / focus events

## Contracts consumed

- `mesh-asset-manifest.json` — to load assets
- `anatomical-id-schema.json` — to resolve IDs to graph nodes

## Hard rules

1. **WebGL2 baseline, WebGPU upgrade.** Detect at runtime; render path differs only where the upgrade matters (compute shaders, multi-draw-indirect).
2. **GPU picking, not CPU raycast** for selection in production. CPU raycast acceptable only as a fallback for offscreen contexts.
3. **Capped clipping** for cross-sections. Stencil-buffer approach. Don't ship hollow-shell clip planes.
4. **Outline pass for selection** via post-process Sobel on normal+depth. Visible at LOD2.
5. **LOD swaps respect screen-space size**, not raw distance. A small organ close to the camera should still LOD down if it occupies few pixels.
6. **No per-mesh draw call for every anatomical structure.** Use instancing for repeated structures (vertebrae, ribs, teeth) and merged geometry per system where per-part picking still works via vertex IDs.
7. **Selection is a state machine.** Hover, single-select, multi-select, focus modes are explicit states, not ad-hoc flags.
8. **Camera framing is animated, not snapped.** Smooth recompose on selection change.

## Escalation triggers

- Draw-call ceiling hit on target hardware — coordinate with Asset Pipeline on geometry merging strategy.
- Frame-time budget exceeded — profile and either downscope visual quality or push for WebGPU upgrade.
- Shader complexity outgrows R3F's declarative model — escalate for architecture decision.
- Picking precision insufficient (e.g. nerves through bone) — escalate for hybrid CPU-raycast layer.

## Operating principles

- **Scene graph mirrors ontology where useful, not slavishly.** Anatomy is a DAG; the scene graph is a tree. Don't try to make them identical — index into the scene graph by anatomical ID, not by hierarchy.
- **Selection state is the source of truth.** UI subscribes to it, doesn't fork its own.
- **Peel mechanic uses presets, not a global slider.** Region-aware peeling (per ADR consequence of 0001 graph-not-tree).
- **Transparency is hard.** Use depth pre-pass + sorted alpha for v1; OIT (weighted-blended or per-pixel linked lists) reserved if visual quality demands it.
- **Subsurface scattering on organs is a quality bar, not a v1 requirement.** Default PBR with custom NPR options for "textbook" look.
