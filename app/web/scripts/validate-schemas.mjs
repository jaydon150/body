#!/usr/bin/env node
// Phase 0 schema validator.
// Walks app/shared/schema/, parses each JSON, asserts minimal JSON Schema metadata.
// Phase 1+ will swap this for full ajv-based meta-schema validation.

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaDir = resolve(__dirname, '..', '..', 'shared', 'schema');

const REQUIRED_METADATA = ['$schema', '$id', 'title', 'description'];
const STRUCTURAL_REQUIRED_ANY = ['type', '$defs', 'properties', '$ref'];

let failures = 0;
let checked = 0;

const entries = await readdir(schemaDir);
const schemaFiles = entries.filter((f) => f.endsWith('.json'));

if (schemaFiles.length === 0) {
  console.error(`No schemas found in ${schemaDir}`);
  process.exit(1);
}

for (const file of schemaFiles) {
  const path = join(schemaDir, file);
  const raw = await readFile(path, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`✗ ${file}: invalid JSON — ${err.message}`);
    failures += 1;
    continue;
  }

  const missingMeta = REQUIRED_METADATA.filter((k) => !(k in parsed));
  if (missingMeta.length > 0) {
    console.error(`✗ ${file}: missing required metadata: ${missingMeta.join(', ')}`);
    failures += 1;
    continue;
  }

  const hasStructural = STRUCTURAL_REQUIRED_ANY.some((k) => k in parsed);
  if (!hasStructural) {
    console.error(`✗ ${file}: missing structural keys (need one of: ${STRUCTURAL_REQUIRED_ANY.join(', ')})`);
    failures += 1;
    continue;
  }

  console.log(`✓ ${file}`);
  checked += 1;
}

console.log(`\n${checked} schema(s) passed, ${failures} failed.`);
process.exit(failures > 0 ? 1 : 0);
