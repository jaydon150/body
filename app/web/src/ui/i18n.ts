/**
 * Minimal i18n table for UI copy.
 *
 * Per ui.md hard rule #2 ("All copy is i18n-keyed even in v1") every string
 * shown in chrome — not anatomical labels (those come from `nodes.json`),
 * not content prose (Content agent) — flows through `t(key)`. Phase 1 ships
 * English-only; Phase 4 localization wires `LANG` selection here without
 * touching call sites.
 *
 * Conventions:
 *   - Keys are dot-delimited: `surface.section.what`.
 *   - Values are strings; no interpolation in v1.
 *   - Anatomical names are NEVER in this table. They are pulled from
 *     `nodes.json[].labels[]` and rendered raw.
 */

export type Lang = 'en';

type StringTable = Record<string, string>;

const en: StringTable = {
  'app.header.title': 'body',
  'app.header.subtitle': 'Interactive 3D atlas — Phase 1 vertical slice',
  'app.footer.about': 'About this atlas',
  'app.footer.license': 'AGPL-3.0 source · CC-BY-SA-2.1-JP meshes',

  'sidebar.title': 'Anatomy',
  'sidebar.empty': 'Loading anatomy...',
  'sidebar.toggle.open': 'Open sidebar',
  'sidebar.toggle.close': 'Close sidebar',
  'sidebar.tree.aria': 'Anatomical hierarchy',

  'breadcrumbs.aria': 'Selected structure breadcrumb',
  'breadcrumbs.root': 'Skeletal system',
  'breadcrumbs.none': 'No selection',
  'breadcrumbs.ascend': 'Ascend one level',

  'search.placeholder': 'Search structures...',
  'search.open': 'Open search',
  'search.close': 'Close search',
  'search.empty': 'Type to search anatomical structures',
  'search.no_results': 'No matches',
  'search.shortcut_hint': 'Ctrl/Cmd + K',

  'detail.aria': 'Selected structure detail',
  'detail.empty.title': 'No structure selected',
  'detail.empty.body': 'Click a bone in the viewer or pick one from the sidebar to begin.',
  'detail.synonyms': 'Also known as',
  'detail.identifiers': 'Identifiers',
  'detail.content.pending': 'Content authoring in progress.',
  'detail.content.loading': 'Loading description...',
  'detail.content.missing': 'No description authored yet for this structure.',
  'detail.content.error': 'Could not load description.',
  'detail.content.section_title': 'Description',
  'detail.citations.section_title': 'Citations',
  'detail.confidence.pending': 'pending anatomist review',
  'detail.confidence.flagged': 'flagged for review',

  'peel.section.label': 'Peel layer',
  'peel.preset.skin': 'Skin',
  'peel.preset.muscle': 'Muscle',
  'peel.preset.bone': 'Bone',
  'peel.preset.organs': 'Organs',
  'peel.preset.skeleton': 'Skeleton',
  'peel.preset.surface': 'Surface',
  'peel.preset.subcutaneous': 'Subcutaneous',
  'peel.preset.musculoskeletal': 'Musculoskeletal',
  'peel.preset.visceral': 'Visceral',
  'peel.preset.skeletal': 'Skeletal',

  'nomenclature.toggle.aria': 'Toggle nomenclature register',
  'nomenclature.plain': 'Plain',
  'nomenclature.clinical': 'Clinical',

  'attribution.title': 'About this atlas',
  'attribution.intro':
    'This educational atlas is built from open, attributed anatomical sources. Per CC-BY-SA, attribution travels with every distributed asset.',
  'attribution.sources_heading': 'Upstream sources',
  'attribution.project_license_heading': 'This project',
  'attribution.project_license_body':
    'Source code: AGPL-3.0-or-later. Anatomical meshes: CC-BY-SA-2.1-JP (BodyParts3D). Authored prose and curated ontology: CC-BY-SA-4.0.',
  'attribution.close': 'Close',

  'a11y.live_region.selected': 'Selected:',
  'a11y.skip_to_canvas': 'Skip to 3D viewer',
};

// Phase 1 is English-only. The lookup is structured so a Phase 4
// localization dispatch can plug additional tables in without touching
// call sites.
const tables: Record<Lang, StringTable> = {
  en,
};

let currentLang: Lang = 'en';

export function setLang(lang: Lang): void {
  currentLang = lang;
}

export function getLang(): Lang {
  return currentLang;
}

/**
 * Look up a UI string by key. Falls back to the key itself if missing —
 * better to show a debuggable key than to crash. CI in Phase 4 will lint
 * for missing keys.
 */
export function t(key: string): string {
  const table = tables[currentLang];
  return table[key] ?? key;
}
