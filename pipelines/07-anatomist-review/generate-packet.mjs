#!/usr/bin/env node
// pipelines/07-anatomist-review/generate-packet.mjs
//
// Phase 1 step P1.16 - generate a human-readable anatomist review packet
// (Markdown) plus the machine-readable queue manifest (JSON) for the
// 51 P1.15 content records.
//
// Inputs:
//   - data/canonical/ontology/content/*.json   (read-only)
//   - data/canonical/ontology/nodes.json       (read-only, for labels/aliases)
//
// Outputs:
//   - tests/review-queue/<batch_id>/review-packet.md
//   - tests/review-queue/<batch_id>/manifest.json
//
// Zero-dep (Node built-ins only). Read-only with respect to canonical data;
// only writes inside tests/review-queue/<batch_id>/.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');
const contentDir = resolve(repoRoot, 'data', 'canonical', 'ontology', 'content');
const nodesPath = resolve(repoRoot, 'data', 'canonical', 'ontology', 'nodes.json');

const BATCH_ID = process.env.BATCH_ID ?? '2026-05-11-batch-1';
const outDir = resolve(repoRoot, 'tests', 'review-queue', BATCH_ID);
const packetPath = join(outDir, 'review-packet.md');
const manifestPath = join(outDir, 'manifest.json');

// --- Helpers ---

function preferredLabel(node) {
  if (!node || !Array.isArray(node.labels)) return null;
  // Prefer TA2 English, then UBERON English, then any English, then anything.
  const byPref = (src) =>
    node.labels.find((l) => l.lang === 'en' && l.source === src);
  return (
    byPref('TA2')?.text ??
    byPref('UBERON')?.text ??
    node.labels.find((l) => l.lang === 'en')?.text ??
    node.labels[0]?.text ??
    null
  );
}

function latinLabel(node) {
  if (!node || !Array.isArray(node.labels)) return null;
  const la = node.labels.find((l) => l.lang === 'la');
  return la?.text ?? null;
}

function fmaAlias(node) {
  return node?.aliases?.fma ?? null;
}

function formatCitation(c) {
  const parts = [];
  parts.push(`(${c.kind})`);
  parts.push(c.ref);
  if (c.edition) parts.push(`— ${c.edition}`);
  if (c.page) parts.push(`— ${c.page}`);
  if (c.url) parts.push(`<${c.url}>`);
  if (c.retrieved_at) parts.push(`(retrieved ${c.retrieved_at})`);
  return parts.join(' ');
}

// Priority ordering as agreed in content.state.md handoff:
//   1. canaries (femur, mandible, rib 8)
//   2. whole-skull bones
//   3. vertebral column (atypical first, then typical)
//   4. thoracic cage (ribs + sternum)
//   5. limb bones + remaining
// We don't try to be too clever — sort by a priority bucket index, then
// alphabetically by preferred label within each bucket.
// IDs verified against data/canonical/ontology/nodes.json — do not paraphrase
// from memory; the UBERON ranges around 0001676-0001684 mix skull, face,
// and the mandible canary, so each ID is explicit and labelled here.
const CANARIES = new Set([
  'UBERON:0000981', // femur
  'UBERON:0001684', // mandible
  'UBERON:0010757', // rib 8
]);
const SKULL_BONES = new Set([
  'UBERON:0000209', // frontal bone
  'UBERON:0000210', // parietal bone
  'UBERON:0001676', // occipital bone
  'UBERON:0001677', // sphenoid bone
  'UBERON:0001678', // temporal bone
  'UBERON:0001679', // ethmoid bone
  'UBERON:0002397', // maxilla
]);
const ATYPICAL_VERTEBRAE = new Set([
  'UBERON:0001092', // atlas (C1)
  'UBERON:0001093', // axis (C2)
  'UBERON:0004616', // cervical vertebra 7 (C7)
  'UBERON:0003690', // sacrum
]);

function priorityBucket(id) {
  if (CANARIES.has(id)) return 0;
  if (SKULL_BONES.has(id)) return 1;
  if (ATYPICAL_VERTEBRAE.has(id)) return 2;
  return 3; // everything else preserves alphabetical order
}

function sortRecords(records, nodesById) {
  return [...records].sort((a, b) => {
    const ba = priorityBucket(a.structure_id);
    const bb = priorityBucket(b.structure_id);
    if (ba !== bb) return ba - bb;
    const la = preferredLabel(nodesById.get(a.structure_id)) ?? a.structure_id;
    const lb = preferredLabel(nodesById.get(b.structure_id)) ?? b.structure_id;
    return la.localeCompare(lb);
  });
}

function makeSection(record, node, idx) {
  const label = preferredLabel(node) ?? '<unknown label>';
  const latin = latinLabel(node);
  const fma = fmaAlias(node);
  const ta = record.ta_latin_name;
  const citations = Array.isArray(record.citations) ? record.citations : [];

  const lines = [];
  lines.push(`## ${idx}. ${label}`);
  lines.push('');
  lines.push(`- **Structure ID:** \`${record.structure_id}\``);
  if (fma) lines.push(`- **FMA alias:** \`${fma}\``);
  if (ta) lines.push(`- **TA Latin (record):** *${ta}*`);
  if (latin && latin !== ta) lines.push(`- **TA Latin (nodes.json):** *${latin}*`);
  lines.push(`- **Authored by:** ${record.authored_by ?? '<unspecified>'}`);
  lines.push(`- **Confidence (current):** \`${record.confidence}\``);
  lines.push('');
  lines.push('### Summary');
  lines.push('');
  lines.push(record.summary);
  lines.push('');
  if (record.long_form && record.long_form.trim().length > 0) {
    lines.push('### Long form');
    lines.push('');
    lines.push(record.long_form);
    lines.push('');
  }
  lines.push('### Citations');
  lines.push('');
  if (citations.length === 0) {
    lines.push('_(no citations on record)_');
  } else {
    for (const c of citations) {
      lines.push(`- ${formatCitation(c)}`);
    }
  }
  lines.push('');
  lines.push('### Reviewer action');
  lines.push('');
  lines.push('- [ ] approved as-is');
  lines.push('- [ ] approved with edits');
  lines.push('- [ ] rejected');
  lines.push('- [ ] needs more research');
  lines.push('');
  lines.push('**Reviewer notes:**');
  lines.push('');
  lines.push('> _(free-text notes here; quote-block keeps the markdown clean)_');
  lines.push('');
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

// --- Main ---

async function main() {
  if (!existsSync(contentDir)) {
    console.error(`FAIL content dir not found at ${contentDir}`);
    process.exit(1);
  }
  if (!existsSync(nodesPath)) {
    console.error(`FAIL nodes.json not found at ${nodesPath}`);
    process.exit(1);
  }

  // Load nodes.json -> id -> node lookup.
  const nodesDoc = JSON.parse(await readFile(nodesPath, 'utf8'));
  const nodesById = new Map((nodesDoc.nodes ?? []).map((n) => [n.id, n]));

  // Load all content records.
  const files = (await readdir(contentDir))
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.error(`FAIL no .json files in ${contentDir}`);
    process.exit(1);
  }

  const records = [];
  for (const file of files) {
    const raw = await readFile(join(contentDir, file), 'utf8');
    const data = JSON.parse(raw);
    records.push({ ...data, __filename: file });
  }

  const sorted = sortRecords(records, nodesById);
  const generatedAt = new Date().toISOString();

  // --- Build review packet (Markdown) ---
  const md = [];
  md.push(`# Anatomist Review Packet — Batch ${BATCH_ID}`);
  md.push('');
  md.push(`**Generated:** ${generatedAt}`);
  md.push(`**Records:** ${sorted.length}`);
  md.push(`**Source dispatch:** P1.15 (Content agent first batch)`);
  md.push(`**Confidence at queue time:** \`pending\` (all records)`);
  md.push('');
  md.push('## How to use this packet');
  md.push('');
  md.push('1. Each section below describes one anatomical structure.');
  md.push('2. Read the summary and long-form text.');
  md.push('3. Tick one of the four checkboxes under **Reviewer action**.');
  md.push('4. Add free-text notes (corrections, clarifications, missing landmarks) in the quote block.');
  md.push('5. Mirror your decisions in `manifest.json` so the promotion script can run.');
  md.push('');
  md.push('## Review priority order');
  md.push('');
  md.push('Records are ordered to minimise context-switching:');
  md.push('');
  md.push('1. **Canaries** (femur, mandible, rib 8) — the three highest-visibility structures.');
  md.push('2. **Skull bones** — frontal, parietal, temporal, occipital, sphenoid, ethmoid, maxilla.');
  md.push('3. **Atypical vertebrae** — atlas, axis, C7, sacrum (the rest of the vertebral column follows alphabetically).');
  md.push('4. **All remaining structures** — alphabetical by preferred label.');
  md.push('');
  md.push('---');
  md.push('');

  let idx = 1;
  for (const rec of sorted) {
    md.push(makeSection(rec, nodesById.get(rec.structure_id), idx));
    idx += 1;
  }

  md.push('## Sign-off');
  md.push('');
  md.push('I have reviewed the above 51 records and recorded my decisions both in this Markdown packet and in the companion `manifest.json`.');
  md.push('');
  md.push('- **Anatomist name:** ____________________');
  md.push('- **Credentials / affiliation:** ____________________');
  md.push('- **Date reviewed:** ____________________');
  md.push('- **Signature:** ____________________');
  md.push('');

  await mkdir(outDir, { recursive: true });
  await writeFile(packetPath, md.join('\n'), 'utf8');

  // --- Build manifest.json ---
  const items = sorted.map((rec) => {
    const node = nodesById.get(rec.structure_id);
    return {
      structure_id: rec.structure_id,
      filename: rec.__filename,
      preferred_label: preferredLabel(node) ?? null,
      status: 'queued',
      queued_at: generatedAt,
      reviewed_at: null,
      decision: null,
      reviewer_notes: null,
    };
  });

  const manifest = {
    version: '2026-05-11',
    batch_id: BATCH_ID,
    generated_at: generatedAt,
    anatomist: {
      name: 'TBD',
      credentials: 'TBD',
      contact: 'TBD',
    },
    status: 'queued',
    items,
  };

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(`PASS wrote ${sorted.length} sections to ${packetPath}`);
  console.log(`PASS wrote ${items.length} items to ${manifestPath}`);
}

await main();
