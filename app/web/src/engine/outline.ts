/**
 * Selection outline + hover-highlight visual contract (P1.11).
 *
 * Decision (3d-engine, P1.11):
 *   - Outline implementation: drei's `<Outlines>` (mesh-local inverted-hull
 *     shell with screenspace thickness). Reasons:
 *       * Already in deps; no extra package.
 *       * Plays nicely with R3F's declarative model — outlines live as a
 *         child of the highlighted mesh, no global EffectComposer pipeline
 *         to manage.
 *       * `screenspace: true` gives the requested ~2–3 px constant width.
 *       * No interaction with our pointer event raycaster — drei outlines
 *         are non-pickable (raycast: () => null in implementation).
 *     Post-process `OutlinePass` was the alternative; deferred until peel
 *     mode or LOD-aware outlining demands a global pass.
 *
 *   - Outline color: SATURATED CYAN `#3aa5d9` — chosen over warm orange.
 *     On the warm dark background `#1c1816` and warm off-white bone
 *     `#ebe0c9`, a cool-cyan outline gives the cleanest figure-ground
 *     separation. Orange (`#e08c3c`) was the alternative considered;
 *     too close in hue to the bone material — the outline would blur into
 *     the silhouette at distance.
 *
 *   - Thickness: 0.02 in drei's `screenspace` units, which renders as
 *     roughly 2 px at the dpr range we ship. Tunable here without touching
 *     the scene.
 *
 *   - Hover treatment: a thinner, more transparent outline in the SAME
 *     cyan. This keeps the visual language unified (one accent colour for
 *     "engine pays attention to this thing") while leaving the selected
 *     outline visually dominant. A material emissive bump was the
 *     alternative; rejected because we'd need per-entry material clones
 *     just for hover, and the outline-only approach is zero-cost on the
 *     material side (the shared bone material stays shared).
 */

export const SELECTION_OUTLINE_COLOR = '#3aa5d9';
export const SELECTION_OUTLINE_THICKNESS = 0.02; // screenspace units
export const SELECTION_OUTLINE_OPACITY = 1.0;

export const HOVER_OUTLINE_COLOR = '#3aa5d9';
export const HOVER_OUTLINE_THICKNESS = 0.012; // ~60% of selection
export const HOVER_OUTLINE_OPACITY = 0.55;

export interface OutlineStyle {
  color: string;
  thickness: number;
  opacity: number;
  /** Higher renderOrder draws on top; selection beats hover when both apply. */
  renderOrder: number;
}

export const SELECTION_OUTLINE: OutlineStyle = {
  color: SELECTION_OUTLINE_COLOR,
  thickness: SELECTION_OUTLINE_THICKNESS,
  opacity: SELECTION_OUTLINE_OPACITY,
  renderOrder: 2,
};

export const HOVER_OUTLINE: OutlineStyle = {
  color: HOVER_OUTLINE_COLOR,
  thickness: HOVER_OUTLINE_THICKNESS,
  opacity: HOVER_OUTLINE_OPACITY,
  renderOrder: 1,
};
