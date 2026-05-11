/**
 * Typed builder for selection events.
 *
 * Conforms to `app/shared/schema/selection-event-schema.json` (Architect-
 * owned contract). Phase 1 does NOT emit events through a side channel —
 * the selectionStore IS the event stream and UI subscribes directly. This
 * module exists so:
 *
 *   1. Selection-state mutations have a single typed shape to construct
 *      against, enforced at build time.
 *   2. A future dispatch can wire `dispatchSelectionEvent(...)` into a
 *      worker, analytics sink, or server channel without re-typing the
 *      payload from scratch.
 *
 * The schema's `event_type` enum is the union below. Schemas with
 * `additionalProperties: false` mean we must NOT include keys not declared
 * in the schema — keep this in sync if the schema evolves.
 */

export type SelectionEventType =
  | 'hover'
  | 'select'
  | 'multi_select_add'
  | 'multi_select_remove'
  | 'focus'
  | 'deselect'
  | 'clear'
  | 'peel_change'
  | 'camera_change';

export type CameraIntent = 'none' | 'frame' | 'orbit' | 'dive';

export type PeelPreset =
  | 'surface'
  | 'subcutaneous'
  | 'musculoskeletal'
  | 'visceral'
  | 'skeletal';

export interface SelectionEventTarget {
  /** Primary anatomy-graph id (UBERON:NNNNNNN | FMA:NNN | BODY:NNN). */
  id: string;
  screen_position?: { x: number; y: number };
  world_position?: [number, number, number];
}

export interface ModifierKeys {
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export interface SelectionEvent {
  event_type: SelectionEventType;
  /** ISO-8601 UTC. */
  timestamp: string;
  targets?: SelectionEventTarget[];
  modifier_keys?: ModifierKeys;
  camera_intent?: CameraIntent;
  peel_state?: { preset?: PeelPreset };
}

export interface BuildSelectionEventInput {
  type: SelectionEventType;
  targets?: SelectionEventTarget[];
  modifierKeys?: ModifierKeys;
  cameraIntent?: CameraIntent;
  peelPreset?: PeelPreset;
}

/**
 * Constructs a selection event matching the schema. The output is suitable
 * for direct JSON-stringify and post-validation against the JSON schema in
 * tests; the runtime layer in P1.11 calls this only for shape compliance
 * (no side-effects).
 */
export function buildSelectionEvent(input: BuildSelectionEventInput): SelectionEvent {
  const event: SelectionEvent = {
    event_type: input.type,
    timestamp: new Date().toISOString(),
  };
  if (input.targets && input.targets.length > 0) {
    event.targets = input.targets;
  }
  if (input.modifierKeys) {
    const mk: ModifierKeys = {};
    if (input.modifierKeys.shift) mk.shift = true;
    if (input.modifierKeys.ctrl) mk.ctrl = true;
    if (input.modifierKeys.alt) mk.alt = true;
    if (input.modifierKeys.meta) mk.meta = true;
    // Omit entirely if no modifier was held (schema says omitted = false).
    if (Object.keys(mk).length > 0) {
      event.modifier_keys = mk;
    }
  }
  if (input.cameraIntent && input.cameraIntent !== 'none') {
    event.camera_intent = input.cameraIntent;
  }
  if (input.peelPreset) {
    event.peel_state = { preset: input.peelPreset };
  }
  return event;
}
