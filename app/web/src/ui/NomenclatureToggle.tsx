import {
  selectRegister,
  useUiPreferencesStore,
} from '../state/uiPreferencesStore';
import { t } from './i18n';

/**
 * Plain ↔ clinical nomenclature toggle.
 *
 * Per phase-1-spec acceptance criterion #7: switches the user-facing
 * peel-preset labels between plain (`skin / muscle / bone / organs /
 * skeleton`) and clinical (`surface / subcutaneous / musculoskeletal /
 * visceral / skeletal`) registers everywhere they appear.
 *
 * The actual mapping lives in `nomenclature.ts` — components call
 * `labelForPreset(preset, register)` and re-render when `register` flips.
 *
 * Default: plain (per spec v0.2).
 */
export function NomenclatureToggle() {
  const register = useUiPreferencesStore(selectRegister);
  const setRegister = useUiPreferencesStore((s) => s.setRegister);

  return (
    <div
      className="nomenclature-toggle"
      role="group"
      aria-label={t('nomenclature.toggle.aria')}
    >
      <button
        type="button"
        className={[
          'nomenclature-toggle__option',
          register === 'plain' ? 'nomenclature-toggle__option--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-pressed={register === 'plain'}
        onClick={() => setRegister('plain')}
      >
        {t('nomenclature.plain')}
      </button>
      <button
        type="button"
        className={[
          'nomenclature-toggle__option',
          register === 'clinical' ? 'nomenclature-toggle__option--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-pressed={register === 'clinical'}
        onClick={() => setRegister('clinical')}
      >
        {t('nomenclature.clinical')}
      </button>
    </div>
  );
}
