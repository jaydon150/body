#!/usr/bin/env node
// Phase 1 schema validator (P1.09).
//
// Two phases:
//   Phase 1 — meta-schema validation:
//     Every JSON file in app/shared/schema/ is itself a valid JSON Schema 2020-12 document.
//   Phase 2 — data-against-schema:
//     Each relevant canonical / derived data file validates against its matching schema.
//
// Exit code non-zero on any failure. One pass/fail line per file in either phase.

import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..', '..');
const schemaDir = resolve(repoRoot, 'app', 'shared', 'schema');

// Data-against-schema pairings. Path is relative to repoRoot.
// `schema` is the basename of the schema file under app/shared/schema/.
// `data` is the canonical/derived data file we expect to validate.
const DATA_PAIRINGS = [
  {
    data: 'data/canonical/ontology/nodes.json',
    schema: 'anatomical-id-schema.json',
    description: 'anatomy nodes (kind=structure/region/system)',
  },
  {
    data: 'data/canonical/ontology/relations.json',
    schema: 'anatomical-id-schema.json',
    description: 'anatomy edges (typed DAG relations)',
  },
  {
    data: 'data/canonical/ontology/synonyms.json',
    schema: 'anatomical-id-schema.json',
    description: 'anatomy synonyms placeholder (retired per ADR 0008; still validates as a degenerate version-only document)',
  },
  {
    data: 'data/derived/mesh-registry.json',
    schema: 'mesh-asset-manifest.json',
    description: 'baked mesh registry (P1.08 output)',
  },
];

const ICON_PASS = '✓'; // ✓
const ICON_FAIL = '✗'; // ✗

let failures = 0;
let passes = 0;

// --- Ajv setup ---
const ajv = new Ajv2020({
  strict: false, // tolerate unknown keywords (e.g. 'examples' if added later) without failing
  allErrors: true,
});
addFormats.default(ajv);

// Load all schemas first so $ref between them (if any) resolves; also so we can
// look up each by basename in the data-pairing phase.
const schemaEntries = (await readdir(schemaDir))
  .filter((f) => f.endsWith('.json'))
  .sort();

if (schemaEntries.length === 0) {
  console.error(`No schemas found in ${schemaDir}`);
  process.exit(1);
}

/** @type {Map<string, object>} basename -> parsed schema object */
const schemasByName = new Map();

console.log('Phase 1 - meta-schema validation:');
console.log(`(${schemaEntries.length} schema file(s) in ${schemaDir})`);

for (const file of schemaEntries) {
  const path = join(schemaDir, file);
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    console.error(`  ${ICON_FAIL} ${file}: cannot read - ${err.message}`);
    failures += 1;
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`  ${ICON_FAIL} ${file}: invalid JSON - ${err.message}`);
    failures += 1;
    continue;
  }

  // Confirm declared $schema is the 2020-12 dialect we're validating against.
  if (parsed.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    console.error(
      `  ${ICON_FAIL} ${file}: $schema is "${parsed.$schema}"; expected "https://json-schema.org/draft/2020-12/schema"`,
    );
    failures += 1;
    continue;
  }

  // Validate the schema document itself against the JSON Schema 2020-12 meta-schema.
  const metaValid = ajv.validateSchema(parsed);
  if (!metaValid) {
    console.error(`  ${ICON_FAIL} ${file}: not a valid JSON Schema 2020-12 document`);
    for (const err of ajv.errors ?? []) {
      console.error(`      at ${err.instancePath || '<root>'}: ${err.message}`);
    }
    failures += 1;
    continue;
  }

  // Also compile (ajv.compile) to catch issues meta-schema validation doesn't (e.g. unresolvable $ref).
  try {
    ajv.compile(parsed);
  } catch (err) {
    console.error(`  ${ICON_FAIL} ${file}: schema fails to compile - ${err.message}`);
    failures += 1;
    continue;
  }

  schemasByName.set(file, parsed);
  console.log(`  ${ICON_PASS} ${file}`);
  passes += 1;
}

console.log('');
console.log('Phase 2 - data-against-schema validation:');
console.log(`(${DATA_PAIRINGS.length} data file(s))`);

for (const pairing of DATA_PAIRINGS) {
  const dataPath = resolve(repoRoot, pairing.data);
  const schemaName = pairing.schema;
  const label = `${pairing.data} -> ${schemaName}`;

  if (!existsSync(dataPath)) {
    console.error(`  ${ICON_FAIL} ${label}: data file not found at ${dataPath}`);
    failures += 1;
    continue;
  }

  if (!schemasByName.has(schemaName)) {
    console.error(`  ${ICON_FAIL} ${label}: schema "${schemaName}" not found in ${schemaDir}`);
    failures += 1;
    continue;
  }

  let dataRaw;
  try {
    dataRaw = await readFile(dataPath, 'utf8');
  } catch (err) {
    console.error(`  ${ICON_FAIL} ${label}: cannot read - ${err.message}`);
    failures += 1;
    continue;
  }

  let data;
  try {
    data = JSON.parse(dataRaw);
  } catch (err) {
    console.error(`  ${ICON_FAIL} ${label}: invalid JSON - ${err.message}`);
    failures += 1;
    continue;
  }

  // Compile validator fresh per pairing so error reports are scoped.
  let validate;
  try {
    validate = ajv.compile(schemasByName.get(schemaName));
  } catch (err) {
    console.error(`  ${ICON_FAIL} ${label}: schema compile error - ${err.message}`);
    failures += 1;
    continue;
  }

  const valid = validate(data);
  if (!valid) {
    console.error(`  ${ICON_FAIL} ${label} (${pairing.description})`);
    for (const err of validate.errors ?? []) {
      const path = err.instancePath || '<root>';
      const params = err.params ? JSON.stringify(err.params) : '';
      console.error(`      at ${path}: ${err.message}${params ? ' ' + params : ''}`);
    }
    failures += 1;
    continue;
  }

  console.log(`  ${ICON_PASS} ${label}`);
  passes += 1;
}

console.log('');
console.log(`Result: ${passes} passed, ${failures} failed.`);
process.exit(failures > 0 ? 1 : 0);
