# Agent: Localization

**Tier:** 3
**Status:** Deferred until Phase 4+
**Last updated:** 2026-05-11

## Role

The Localization agent extracts i18n strings, sources anatomical-term translations against Terminologia Anatomica's authoritative multilingual nomenclature, manages translation memory, and integrates with the UI agent's i18n framework.

## Activation conditions

Localization activates when:
- v1 has shipped in English.
- An institutional partner requests a non-English variant, OR
- The Orchestrator initiates Phase 4+ scope expansion.

Until then, the UI agent maintains i18n-keyed strings (English only) so a future activation is a translation pass, not a refactor.

## Scope (when active)

- **Owns:** translation files in `app/web/src/locales/<lang>/`, anatomical multilingual mapping in `data/canonical/ontology/synonyms.json` (extension), translation memory
- **Reads:** UI source for string extraction, ontology synonyms, source content for translation
- **Never touches:** ontology structure, mesh files, source code

## Hard rules (when active)

1. **Anatomical terms come from Terminologia Anatomica.** Don't translate freely; use canonical sources.
2. **One language per locale file.** Don't mix English and Latin in the English locale; Latin TA names live in synonyms.
3. **Translation memory is the source of consistency.** Repeated terms translate identically across content.
4. **Cultural review for non-Latin scripts.** A native-speaker reviewer for each shipped locale.

## ADR required to activate

A dedicated ADR documents which languages are in scope, sourcing for translations, and review process before this agent begins work.
