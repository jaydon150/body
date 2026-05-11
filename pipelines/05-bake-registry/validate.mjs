// pipelines/05-bake-registry/validate.mjs
// Phase 1 step P1.08 — validate the baked registry against
// app/shared/schema/mesh-asset-manifest.json.
//
// Hand-rolled JSON-Schema-Draft-2020-12 subset validator. Same approach as
// pipelines/04-validate-ontology/validate.mjs (zero npm deps; the schema is
// simple enough that a 200-line walker is fully sufficient and avoids
// adding an `ajv` dependency that the rest of the asset pipeline doesn't
// need).
//
// Read-only. Asserts:
//   - top-level: version (string), generated_at (date-time string),
//                entries (array)
//   - each entry conforms to the `entry` $def
//   - each lod conforms to the `lod` $def
//   - bounds is a min/max pair of length-3 number arrays
//   - provenance has source + license (both strings)
//   - id matches the primary-id pattern
//   - material_hint, if present, is in the enum
//   - LOD chain monotonicity (regression guard, not strictly schema-driven):
//       LOD0.triangle_count >= LOD1.triangle_count >= LOD2.triangle_count
//   - canary spot-check on UBERON:0000981 (femur), 0001684 (mandible),
//     0010757 (rib 8)
//   - sternum UBERON:0000975 is NOT in entries[]
//   - femur supersession: entry.lods[0].file is "uberon_0000981/lod0.glb"
//                         (not "procedural/femur-proxy-threejs")

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const REGISTRY_PATH = path.join(REPO_ROOT, "data", "derived", "mesh-registry.json");
const SCHEMA_PATH = path.join(REPO_ROOT, "app", "shared", "schema", "mesh-asset-manifest.json");
const MESH_ROOT = path.join(REPO_ROOT, "data", "canonical", "meshes");

const ID_PATTERN = /^(UBERON:\d{7}|FMA:\d+|BODY:\d+)$/;
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MATERIAL_HINT_ENUM = new Set([
  "bone",
  "muscle",
  "vessel_artery",
  "vessel_vein",
  "nerve",
  "skin",
  "fascia",
  "fat",
  "organ_parenchyma",
  "cartilage",
  "ligament",
  "tendon",
  "generic",
]);
const COMPRESSION_ENUM = new Set(["none", "draco", "meshopt"]);

const ENTRY_ALLOWED_KEYS = new Set([
  "id",
  "lods",
  "bounds",
  "material_hint",
  "provenance",
]);
const LOD_ALLOWED_KEYS = new Set([
  "level",
  "file",
  "triangle_count",
  "vertex_count",
  "byte_size",
  "compression",
]);
const PROVENANCE_ALLOWED_KEYS = new Set([
  "source",
  "license",
  "original_id",
  "ingested_at",
  "edits",
]);
const TOP_ALLOWED_KEYS = new Set(["version", "generated_at", "entries"]);

class Issues {
  constructor() {
    this.errors = [];
  }
  push(path, msg) {
    this.errors.push({ path, msg });
  }
  pass() {
    return this.errors.length === 0;
  }
}

function isPlainObject(x) {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
function isInteger(x) {
  return typeof x === "number" && Number.isInteger(x);
}
function isNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}
function isString(x) {
  return typeof x === "string";
}

function validateBounds(bounds, p, issues) {
  if (!isPlainObject(bounds)) {
    issues.push(p, "bounds is not an object");
    return;
  }
  for (const key of Object.keys(bounds)) {
    if (key !== "min" && key !== "max") {
      issues.push(`${p}.${key}`, `bounds has unexpected key: ${key}`);
    }
  }
  for (const k of ["min", "max"]) {
    const v = bounds[k];
    if (!Array.isArray(v)) {
      issues.push(`${p}.${k}`, `bounds.${k} is not an array`);
      continue;
    }
    if (v.length !== 3) {
      issues.push(`${p}.${k}`, `bounds.${k} must have length 3, got ${v.length}`);
    }
    for (let i = 0; i < v.length; i++) {
      if (!isNumber(v[i])) {
        issues.push(`${p}.${k}[${i}]`, `bounds.${k}[${i}] is not a finite number`);
      }
    }
  }
  if (Array.isArray(bounds.min) && Array.isArray(bounds.max) && bounds.min.length === 3 && bounds.max.length === 3) {
    for (let i = 0; i < 3; i++) {
      if (isNumber(bounds.min[i]) && isNumber(bounds.max[i]) && bounds.min[i] > bounds.max[i]) {
        issues.push(`${p}`, `bounds.min[${i}] (${bounds.min[i]}) > bounds.max[${i}] (${bounds.max[i]})`);
      }
    }
  }
}

function validateLod(lod, p, issues) {
  if (!isPlainObject(lod)) {
    issues.push(p, "lod is not an object");
    return;
  }
  for (const key of Object.keys(lod)) {
    if (!LOD_ALLOWED_KEYS.has(key)) {
      issues.push(`${p}.${key}`, `lod has unexpected key: ${key}`);
    }
  }
  if (!isInteger(lod.level) || lod.level < 0) {
    issues.push(`${p}.level`, "level must be a non-negative integer");
  }
  if (!isString(lod.file)) {
    issues.push(`${p}.file`, "file must be a string");
  }
  if (!isInteger(lod.triangle_count) || lod.triangle_count < 0) {
    issues.push(`${p}.triangle_count`, "triangle_count must be a non-negative integer");
  }
  if (lod.vertex_count !== undefined) {
    if (!isInteger(lod.vertex_count) || lod.vertex_count < 0) {
      issues.push(`${p}.vertex_count`, "vertex_count must be a non-negative integer");
    }
  }
  if (lod.byte_size !== undefined) {
    if (!isInteger(lod.byte_size) || lod.byte_size < 0) {
      issues.push(`${p}.byte_size`, "byte_size must be a non-negative integer");
    }
  }
  if (lod.compression !== undefined) {
    if (!COMPRESSION_ENUM.has(lod.compression)) {
      issues.push(`${p}.compression`, `compression must be one of: ${[...COMPRESSION_ENUM].join("|")}`);
    }
  }
}

function validateProvenance(prov, p, issues) {
  if (!isPlainObject(prov)) {
    issues.push(p, "provenance is not an object");
    return;
  }
  for (const key of Object.keys(prov)) {
    if (!PROVENANCE_ALLOWED_KEYS.has(key)) {
      issues.push(`${p}.${key}`, `provenance has unexpected key: ${key}`);
    }
  }
  if (!isString(prov.source)) {
    issues.push(`${p}.source`, "source must be a string");
  }
  if (!isString(prov.license)) {
    issues.push(`${p}.license`, "license must be a string");
  }
  if (prov.original_id !== undefined && !isString(prov.original_id)) {
    issues.push(`${p}.original_id`, "original_id must be a string");
  }
  if (prov.ingested_at !== undefined) {
    if (!isString(prov.ingested_at) || !DATE_PATTERN.test(prov.ingested_at)) {
      issues.push(`${p}.ingested_at`, `ingested_at must be a YYYY-MM-DD date string`);
    }
  }
  if (prov.edits !== undefined) {
    if (!Array.isArray(prov.edits)) {
      issues.push(`${p}.edits`, "edits must be an array");
    } else {
      for (let i = 0; i < prov.edits.length; i++) {
        if (!isString(prov.edits[i])) {
          issues.push(`${p}.edits[${i}]`, "edits items must be strings");
        }
      }
    }
  }
}

function validateEntry(entry, p, issues) {
  if (!isPlainObject(entry)) {
    issues.push(p, "entry is not an object");
    return;
  }
  for (const key of Object.keys(entry)) {
    if (!ENTRY_ALLOWED_KEYS.has(key)) {
      issues.push(`${p}.${key}`, `entry has unexpected key: ${key}`);
    }
  }
  // Required: id
  if (!isString(entry.id) || !ID_PATTERN.test(entry.id)) {
    issues.push(`${p}.id`, `id must match ${ID_PATTERN}`);
  }
  // Required: lods (minItems: 1)
  if (!Array.isArray(entry.lods) || entry.lods.length < 1) {
    issues.push(`${p}.lods`, "lods must be a non-empty array");
  } else {
    for (let i = 0; i < entry.lods.length; i++) {
      validateLod(entry.lods[i], `${p}.lods[${i}]`, issues);
    }
  }
  // Required: bounds
  if (entry.bounds === undefined) {
    issues.push(`${p}.bounds`, "bounds is required");
  } else {
    validateBounds(entry.bounds, `${p}.bounds`, issues);
  }
  // Required: provenance
  if (entry.provenance === undefined) {
    issues.push(`${p}.provenance`, "provenance is required");
  } else {
    validateProvenance(entry.provenance, `${p}.provenance`, issues);
  }
  // Optional: material_hint
  if (entry.material_hint !== undefined && !MATERIAL_HINT_ENUM.has(entry.material_hint)) {
    issues.push(`${p}.material_hint`, `material_hint must be one of the enum values`);
  }
}

function validateRegistry(reg, issues) {
  if (!isPlainObject(reg)) {
    issues.push("$", "top-level must be an object");
    return;
  }
  for (const key of Object.keys(reg)) {
    if (!TOP_ALLOWED_KEYS.has(key)) {
      issues.push(`$.${key}`, `top-level has unexpected key: ${key}`);
    }
  }
  if (!isString(reg.version)) {
    issues.push("$.version", "version must be a string");
  }
  if (!isString(reg.generated_at) || !DATE_TIME_PATTERN.test(reg.generated_at)) {
    issues.push("$.generated_at", "generated_at must be an ISO-8601 UTC date-time (YYYY-MM-DDTHH:MM:SSZ)");
  }
  if (!Array.isArray(reg.entries)) {
    issues.push("$.entries", "entries must be an array");
    return;
  }
  for (let i = 0; i < reg.entries.length; i++) {
    validateEntry(reg.entries[i], `$.entries[${i}]`, issues);
  }
}

// ---- Extra (non-schema) checks ------------------------------------------

function checkLodMonotonicity(reg, issues) {
  for (let i = 0; i < reg.entries.length; i++) {
    const e = reg.entries[i];
    if (!Array.isArray(e.lods) || e.lods.length < 2) continue;
    const sorted = [...e.lods].sort((a, b) => a.level - b.level);
    for (let k = 1; k < sorted.length; k++) {
      const prev = sorted[k - 1];
      const cur = sorted[k];
      if (cur.triangle_count > prev.triangle_count) {
        issues.push(
          `$.entries[${i}].lods`,
          `LOD${cur.level} tris (${cur.triangle_count}) > LOD${prev.level} tris (${prev.triangle_count})`,
        );
      }
    }
  }
}

function checkSternumOmitted(reg, issues) {
  const sternum = reg.entries.find((e) => e.id === "UBERON:0000975");
  if (sternum) {
    issues.push(
      `$.entries`,
      `UBERON:0000975 (sternum) should NOT be in this bake (composite — P1.09 schema upgrade pending)`,
    );
  }
}

function checkFemurSupersession(reg, issues) {
  const femur = reg.entries.find((e) => e.id === "UBERON:0000981");
  if (!femur) {
    issues.push(`$.entries`, "UBERON:0000981 (femur) missing from registry");
    return;
  }
  const lod0 = femur.lods?.find((l) => l.level === 0);
  if (!lod0) {
    issues.push(`$.entries[UBERON:0000981]`, "femur missing LOD0");
    return;
  }
  if (lod0.file.startsWith("procedural/")) {
    issues.push(
      `$.entries[UBERON:0000981].lods[0].file`,
      `femur LOD0 still references procedural proxy: ${lod0.file}`,
    );
  }
  if (lod0.file !== "uberon_0000981/lod0.glb") {
    issues.push(
      `$.entries[UBERON:0000981].lods[0].file`,
      `expected 'uberon_0000981/lod0.glb', got '${lod0.file}'`,
    );
  }
}

function checkExpectedEntryCount(reg, issues) {
  if (reg.entries.length !== 79) {
    issues.push(
      `$.entries`,
      `expected 79 entries, got ${reg.entries.length}`,
    );
  }
}

function checkAllReferencedFilesExist(reg, issues) {
  for (let i = 0; i < reg.entries.length; i++) {
    const e = reg.entries[i];
    if (!Array.isArray(e.lods)) continue;
    for (let k = 0; k < e.lods.length; k++) {
      const lod = e.lods[k];
      if (!isString(lod.file)) continue;
      const abs = path.join(MESH_ROOT, lod.file);
      if (!fs.existsSync(abs)) {
        issues.push(
          `$.entries[${i}].lods[${k}].file`,
          `referenced file does not exist: ${abs}`,
        );
      }
    }
  }
}

function checkCanaries(reg, issues, results) {
  const canaryIds = ["UBERON:0000981", "UBERON:0001684", "UBERON:0010757"];
  for (const id of canaryIds) {
    const e = reg.entries.find((x) => x.id === id);
    if (!e) {
      issues.push(`canary`, `canary ${id} missing from entries`);
      results.push({ id, status: "MISSING" });
      continue;
    }
    const lod0 = e.lods?.find((l) => l.level === 0);
    const lod1 = e.lods?.find((l) => l.level === 1);
    const lod2 = e.lods?.find((l) => l.level === 2);
    const ok = !!(lod0 && lod1 && lod2);
    const boundsNonEmpty =
      e.bounds &&
      !(e.bounds.min[0] === e.bounds.max[0] &&
        e.bounds.min[1] === e.bounds.max[1] &&
        e.bounds.min[2] === e.bounds.max[2]);
    if (!ok) {
      issues.push(`canary ${id}`, `canary ${id} missing one or more LODs`);
    }
    if (!boundsNonEmpty) {
      issues.push(`canary ${id}`, `canary ${id} bounds are empty/degenerate`);
    }
    if (e.material_hint !== "bone") {
      issues.push(`canary ${id}`, `canary ${id} material_hint != 'bone' (got '${e.material_hint}')`);
    }
    results.push({
      id,
      status: ok && boundsNonEmpty && e.material_hint === "bone" ? "OK" : "FAIL",
      lod_levels: e.lods.map((l) => l.level).sort(),
      bounds: e.bounds,
      original_id: e.provenance?.original_id,
      material_hint: e.material_hint,
      lod_tris: {
        lod0: lod0?.triangle_count,
        lod1: lod1?.triangle_count,
        lod2: lod2?.triangle_count,
      },
    });
  }
}

// ---- Main ----------------------------------------------------------------

function main() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error(`FAIL: registry not found at ${REGISTRY_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`FAIL: schema not found at ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const reg = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));

  const issues = new Issues();
  validateRegistry(reg, issues);
  checkExpectedEntryCount(reg, issues);
  checkLodMonotonicity(reg, issues);
  checkSternumOmitted(reg, issues);
  checkFemurSupersession(reg, issues);
  checkAllReferencedFilesExist(reg, issues);

  const canaryResults = [];
  checkCanaries(reg, issues, canaryResults);

  console.log("=== mesh-registry validation report ===");
  console.log(`registry: ${REGISTRY_PATH}`);
  console.log(`schema:   ${SCHEMA_PATH}`);
  console.log(`entries:  ${Array.isArray(reg.entries) ? reg.entries.length : "(n/a)"}`);
  console.log(`version:  ${reg.version}`);
  console.log(`generated_at: ${reg.generated_at}`);
  console.log();
  console.log("--- canary spot-check ---");
  for (const r of canaryResults) {
    console.log(`  ${r.id}: ${r.status} | levels=${JSON.stringify(r.lod_levels)} | original_id='${r.original_id}' | material_hint='${r.material_hint}'`);
    console.log(`    bounds.min=${JSON.stringify(r.bounds?.min)}`);
    console.log(`    bounds.max=${JSON.stringify(r.bounds?.max)}`);
    console.log(`    tris: LOD0=${r.lod_tris.lod0}, LOD1=${r.lod_tris.lod1}, LOD2=${r.lod_tris.lod2}`);
  }
  console.log();

  if (issues.pass()) {
    console.log("PASS: 0 issues.");
    process.exit(0);
  } else {
    console.log(`FAIL: ${issues.errors.length} issue(s):`);
    for (const e of issues.errors) {
      console.log(`  ${e.path}: ${e.msg}`);
    }
    process.exit(1);
  }
}

main();
