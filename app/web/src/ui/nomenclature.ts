import type { PeelPreset } from '../state/peelStore';
import type { NomenclatureRegister } from '../state/uiPreferencesStore';
import { t } from './i18n';

/**
 * Single source of truth for the plain ↔ clinical register mapping of
 * peel-preset labels. Per phase-1-spec acceptance criterion #7 the toggle
 * must switch labels EVERYWHERE they appear (PeelControls, Sidebar copy,
 * Breadcrumbs, etc.) — every UI module that needs a preset label calls
 * `labelForPreset(preset, register)` rather than building the mapping
 * locally.
 *
 * Engine state stores the canonical clinical enum (`PeelPreset`); the
 * register is purely a presentation concern.
 *
 * Mapping (per dispatch):
 *   surface          → skin
 *   subcutaneous     → muscle
 *   musculoskeletal  → bone
 *   visceral         → organs
 *   skeletal         → skeleton
 */

const PLAIN_LABEL_KEY: Record<PeelPreset, string> = {
  surface: 'peel.preset.skin',
  subcutaneous: 'peel.preset.muscle',
  musculoskeletal: 'peel.preset.bone',
  visceral: 'peel.preset.organs',
  skeletal: 'peel.preset.skeleton',
};

const CLINICAL_LABEL_KEY: Record<PeelPreset, string> = {
  surface: 'peel.preset.surface',
  subcutaneous: 'peel.preset.subcutaneous',
  musculoskeletal: 'peel.preset.musculoskeletal',
  visceral: 'peel.preset.visceral',
  skeletal: 'peel.preset.skeletal',
};

/** Plain ↔ clinical label for a peel preset, in the active register. */
export function labelForPreset(preset: PeelPreset, register: NomenclatureRegister): string {
  const tableByRegister = register === 'plain' ? PLAIN_LABEL_KEY : CLINICAL_LABEL_KEY;
  return t(tableByRegister[preset]);
}

/**
 * Order presets appear in the UI controls. Note `visceral` is omitted from
 * the Phase 1 cycle (no organ meshes yet — listing the option creates a
 * dead button), but the helper still handles it correctly if Phase 2 wires
 * it back in.
 */
export const UI_PEEL_ORDER: PeelPreset[] = [
  'surface',
  'subcutaneous',
  'musculoskeletal',
  'skeletal',
];

/** Long-form order (Phase 2+ when visceral has content). */
export const UI_PEEL_ORDER_FULL: PeelPreset[] = [
  'surface',
  'subcutaneous',
  'musculoskeletal',
  'visceral',
  'skeletal',
];
