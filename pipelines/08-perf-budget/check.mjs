#!/usr/bin/env node
/**
 * pipelines/08-perf-budget/check.mjs
 *
 * Phase 1 step P1.17 — performance budget enforcement.
 *
 * Three budgets, each independently checked. Any violation exits non-zero
 * with a clear, multi-line message. All budgets passing prints a summary
 * table and exits 0.
 *
 * Budgets:
 *   1. Main JS chunk (post-build, gzipped) < 320 KB
 *      Reads every .js asset under app/web/dist/assets/, picks the largest
 *      (the entry chunk; today Vite emits a single chunk), gzips it via
 *      Node's zlib, asserts size.
 *   2. mesh-registry.json entries === 79
 *      Reads data/derived/mesh-registry.json and counts entries[].
 *   3. Total lod*.glb bytes across data/canonical/meshes/ < 16 MB
 *      Walks every uberon_NNNNNNN/ directory, sums lod0/1/2.glb file sizes.
 *
 * Zero npm deps — Node built-ins only (fs, path, zlib, url).
 *
 * Run:
 *   node pipelines/08-perf-budget/check.mjs
 *
 * or via the app/web npm script:
 *   npm run perf:check
 *
 * Exit codes:
 *   0 = all budgets pass
 *   1 = at least one budget violated
 *   2 = a required input is missing (e.g. dist/ not built yet)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..', '..');

// ---------- budgets -------------------------------------------------

const BUDGETS = {
  /** Main JS chunk, gzipped, in bytes. */
  main_js_gzip_max: 320 * 1024, // 320 KB
  /** Exact entry count in mesh-registry.json. */
  mesh_registry_entries: 79,
  /** Total bytes across every lod*.glb in data/canonical/meshes/. */
  canonical_meshes_total_max: 16 * 1024 * 1024, // 16 MB
};

// ---------- helpers -------------------------------------------------

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function fmtPct(used, max) {
  const pct = (used / max) * 100;
  return `${pct.toFixed(1)}%`;
}

/**
 * Find every .js file under app/web/dist/assets/. Returns absolute paths
 * sorted by size descending (so the entry chunk is first).
 */
function findDistJsFiles() {
  const assetsDir = resolve(repoRoot, 'app', 'web', 'dist', 'assets');
  let entries;
  try {
    entries = readdirSync(assetsDir, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      console.error(
        `FAIL: app/web/dist/assets/ does not exist.\n` +
        `      Run \`npm run build\` in app/web first.`,
      );
      process.exit(2);
    }
    throw err;
  }
  const out = [];
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!ent.name.endsWith('.js')) continue;
    if (ent.name.endsWith('.map')) continue;
    const full = join(assetsDir, ent.name);
    out.push({ path: full, name: ent.name, size: statSync(full).size });
  }
  out.sort((a, b) => b.size - a.size);
  return out;
}

// ---------- checks --------------------------------------------------

const results = [];

// Check 1 — main JS chunk gzipped size.
{
  const js = findDistJsFiles();
  if (js.length === 0) {
    console.error('FAIL: app/web/dist/assets/ contains no .js files. Run `npm run build`.');
    process.exit(2);
  }
  const main = js[0];
  const buf = readFileSync(main.path);
  const gz = gzipSync(buf, { level: 9 });
  const ok = gz.length < BUDGETS.main_js_gzip_max;
  results.push({
    name: 'main JS chunk (gzipped)',
    detail: main.name,
    used: gz.length,
    max: BUDGETS.main_js_gzip_max,
    extra: `raw ${fmtBytes(main.size)}`,
    pass: ok,
  });
}

// Check 2 — mesh-registry.json entry count.
{
  const registryPath = resolve(repoRoot, 'data', 'derived', 'mesh-registry.json');
  let registry;
  try {
    registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      console.error(`FAIL: ${registryPath} not found. Bake the registry first (pipelines/05-bake-registry).`);
      process.exit(2);
    }
    throw err;
  }
  const count = Array.isArray(registry.entries) ? registry.entries.length : 0;
  const ok = count === BUDGETS.mesh_registry_entries;
  results.push({
    name: 'mesh-registry.json entries',
    detail: 'expected exactly 79',
    used: count,
    max: BUDGETS.mesh_registry_entries,
    extra: ok ? null : `mismatch: expected ${BUDGETS.mesh_registry_entries}, got ${count}`,
    pass: ok,
    isCount: true,
  });
}

// Check 3 — total bytes across data/canonical/meshes/**/lod*.glb.
{
  const meshesRoot = resolve(repoRoot, 'data', 'canonical', 'meshes');
  let total = 0;
  let lodFiles = 0;
  let entryDirs = 0;
  let dirs;
  try {
    dirs = readdirSync(meshesRoot, { withFileTypes: true });
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      console.error(`FAIL: ${meshesRoot} not found.`);
      process.exit(2);
    }
    throw err;
  }
  for (const dir of dirs) {
    if (!dir.isDirectory()) continue;
    entryDirs += 1;
    const sub = join(meshesRoot, dir.name);
    const files = readdirSync(sub);
    for (const f of files) {
      if (!f.startsWith('lod') || !f.endsWith('.glb')) continue;
      total += statSync(join(sub, f)).size;
      lodFiles += 1;
    }
  }
  const ok = total < BUDGETS.canonical_meshes_total_max;
  results.push({
    name: 'canonical meshes (total LOD bytes)',
    detail: `${lodFiles} glbs across ${entryDirs} dirs`,
    used: total,
    max: BUDGETS.canonical_meshes_total_max,
    extra: null,
    pass: ok,
  });
}

// ---------- report --------------------------------------------------

const W = (s, n) => String(s).padEnd(n);

console.log('');
console.log('perf-budget check');
console.log('-----------------');
let failed = 0;
for (const r of results) {
  const tag = r.pass ? 'PASS' : 'FAIL';
  if (!r.pass) failed += 1;
  const usedFmt = r.isCount ? String(r.used) : fmtBytes(r.used);
  const maxFmt = r.isCount ? String(r.max) : fmtBytes(r.max);
  const pctFmt = r.isCount ? '' : ` (${fmtPct(r.used, r.max)})`;
  console.log(
    `  ${tag}  ${W(r.name, 36)} ${W(usedFmt + pctFmt, 22)} / ${maxFmt}` +
    (r.extra ? `   [${r.extra}]` : '') +
    (r.detail && !r.extra?.includes(r.detail) ? `\n        ${r.detail}` : ''),
  );
}
console.log('');

if (failed > 0) {
  console.error(`perf-budget: ${failed} violation${failed > 1 ? 's' : ''}.`);
  process.exit(1);
}
console.log('perf-budget: all checks passed.');
process.exit(0);
