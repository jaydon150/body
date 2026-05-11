#!/usr/bin/env node
// pipelines/06-validate-content/validate.mjs
//
// Phase 1 step P1.15 - validate every content record under
// data/canonical/ontology/content/ against
// app/shared/schema/content-record-schema.json.
//
// Same architectural shape as app/web/scripts/validate-schemas.mjs:
//   - Ajv2020 + ajv-formats compile the schema once
//   - one PASS/FAIL line per data file
//   - exit code non-zero on any failure
//
// Additional cross-checks beyond raw schema conformance:
//   - filename basename matches structure_id (collision detection)
//   - structure_id exists in data/canonical/ontology/nodes.json
//   - no record claims confidence='reviewed' in P1.15 (the anatomist-promote
//     step is P1.16; reviewed records in this dispatch would be ahead of
//     governance)
//
// Read-only.

import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from '../../app/web/node_modules/ajv/dist/2020.js';
import addFormatsModule from '../../app/web/node_modules/ajv-formats/dist/index.js';

const addFormats = addFormatsModule.default ?? addFormatsModule;

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const schemaPath = resolve(repoRoot, 'app', 'shared', 'schema', 'content-record-schema.json');
const contentDir = resolve(repoRoot, 'data', 'canonical', 'ontology', 'content');
const nodesPath = resolve(repoRoot, 'data', 'canonical', 'ontology', 'nodes.json');

const ICON_PASS = 'PASS';
const ICON_FAIL = 'FAIL';

let passes = 0;
let failures = 0;

// --- Load schema ---
if (!existsSync(schemaPath)) {
  console.error(`${ICON_FAIL} schema not found at ${schemaPath}`);
  process.exit(1);
}
const schema = JSON.parse(await readFile(schemaPath, 'utf8'));

const ajv = new Ajv2020({
  strict: false,
  allErrors: true,
});
addFormats(ajv);
const validate = ajv.compile(schema);

// --- Load nodes.json for structure_id reference check ---
if (!existsSync(nodesPath)) {
  console.error(`${ICON_FAIL} nodes.json not found at ${nodesPath}`);
  process.exit(1);
}
const nodes = JSON.parse(await readFile(nodesPath, 'utf8'));
const nodeIds = new Set((nodes.nodes ?? []).map((n) => n.id));

// --- Walk content dir ---
if (!existsSync(contentDir)) {
  console.error(`${ICON_FAIL} content dir not found at ${contentDir}`);
  process.exit(1);
}

const files = (await readdir(contentDir))
  .filter((f) => f.endsWith('.json'))
  .sort();

if (files.length === 0) {
  console.error(`${ICON_FAIL} no .json files found in ${contentDir}`);
  process.exit(1);
}

console.log(`Validating ${files.length} content record(s) in ${contentDir}`);
console.log(`Schema: ${schemaPath}`);
console.log('');

for (const file of files) {
  const path = join(contentDir, file);
  const label = file;
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch (err) {
    console.error(`  ${ICON_FAIL} ${label}: cannot read - ${err.message}`);
    failures += 1;
    continue;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`  ${ICON_FAIL} ${label}: invalid JSON - ${err.message}`);
    failures += 1;
    continue;
  }

  const valid = validate(data);
  if (!valid) {
    console.error(`  ${ICON_FAIL} ${label}: schema validation failed`);
    for (const err of validate.errors ?? []) {
      const at = err.instancePath || '<root>';
      const params = err.params ? JSON.stringify(err.params) : '';
      console.error(`      at ${at}: ${err.message}${params ? ' ' + params : ''}`);
    }
    failures += 1;
    continue;
  }

  // Cross-check: filename basename matches structure_id (URL-safe form).
  const expectedFileBase = (data.structure_id ?? '').replace(':', '_').toLowerCase();
  const actualBase = basename(file, '.json');
  if (expectedFileBase !== actualBase) {
    console.error(
      `  ${ICON_FAIL} ${label}: filename "${actualBase}" does not match structure_id "${data.structure_id}" (expected "${expectedFileBase}.json")`,
    );
    failures += 1;
    continue;
  }

  // Cross-check: structure_id exists in nodes.json.
  if (!nodeIds.has(data.structure_id)) {
    console.error(
      `  ${ICON_FAIL} ${label}: structure_id "${data.structure_id}" not found in ${nodesPath}`,
    );
    failures += 1;
    continue;
  }

  // Cross-check: no record claims confidence='reviewed' in this dispatch.
  // The anatomist-promote step is P1.16. The schema itself permits 'reviewed'
  // when citations + reviewed_by are present, but governance forbids it here.
  if (data.confidence === 'reviewed') {
    console.error(
      `  ${ICON_FAIL} ${label}: confidence='reviewed' is forbidden in P1.15 (anatomist sign-off occurs in P1.16)`,
    );
    failures += 1;
    continue;
  }

  console.log(`  ${ICON_PASS} ${label}`);
  passes += 1;
}

console.log('');
console.log(`Result: ${passes} passed, ${failures} failed.`);
process.exit(failures > 0 ? 1 : 0);
