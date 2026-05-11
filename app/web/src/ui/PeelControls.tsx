import {
  selectPeelPreset,
  usePeelStore,
  type PeelPreset,
} from '../state/peelStore';
import { selectRegister, useUiPreferencesStore } from '../state/uiPreferencesStore';
import { labelForPreset, UI_PEEL_ORDER } from './nomenclature';
import { t } from './i18n';

/**
 * Segmented peel-preset control.
 *
 * Renders the four Phase 1 presets (surface / subcutaneous / musculoskeletal
 * / skeletal) as a button group. Active preset is highlighted. Labels
 * derive from `labelForPreset(preset, register)` so the
 * NomenclatureToggle swap is automatic — no separate prop wiring.
 *
 * `visceral` is omitted from the visible cycle because Phase 1 has no
 * organ meshes (its visible UX is identical to `skeletal` minus the
 * skeleton). Phase 2 will re-add it via `UI_PEEL_ORDER_FULL`.
 *
 * Touch targets are sized via CSS (`min-height: 44px` from index.css);
 * the segmented look is achieved with flexbox.
 */
export function PeelControls() {
  const preset = usePeelStore(selectPeelPreset);
  const setPreset = usePeelStore((s) => s.setPreset);
  const register = useUiPreferencesStore(selectRegister);

  return (
    <div className="peel-controls" role="group" aria-label={t('peel.section.label')}>
      <span className="peel-controls__label" aria-hidden="true">
        {t('peel.section.label')}
      </span>
      <div className="peel-controls__segments">
        {UI_PEEL_ORDER.map((p: PeelPreset) => {
          const active = preset === p;
          return (
            <button
              key={p}
              type="button"
              className={[
                'peel-controls__segment',
                active ? 'peel-controls__segment--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={active}
              onClick={() => setPreset(p)}
            >
              {labelForPreset(p, register)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
