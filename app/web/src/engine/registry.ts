/**
 * Registry types + loader for `data/derived/mesh-registry.json`.
 *
 * The schema authority is `app/shared/schema/mesh-asset-manifest.json`.
 * Full Ajv-2020 validation runs in CI (`npm run validate:schemas`); this
 * module performs only the runtime shape checks that a loader needs to fail
 * loudly on a corrupted/empty/wrong-typed registry. ADR 0008 governs the
 * own-mesh vs composite entry shapes.
 *
 * Phase 1 (P1.10) consumes the 79 own-mesh entries. Composites (e.g. sternum,
 * deferred per ADR 0008 follow-up bake) are recognised but not rendered.
 */
export type PrimaryId = `UBERON:${string}` | `FMA:${string}` | `BODY:${string}`;

export type MaterialHint =
  | 'bone'
  | 'muscle'
  | 'vessel_artery'
  | 'vessel_vein'
  | 'nerve'
  | 'skin'
  | 'fascia'
  | 'fat'
  | 'organ_parenchyma'
  | 'cartilage'
  | 'ligament'
  | 'tendon'
  | 'generic';

export type Compression = 'none' | 'draco' | 'meshopt';

export interface Lod {
  level: number;
  file: string;
  triangle_count: number;
  vertex_count?: number;
  byte_size?: number;
  compression?: Compression;
}

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface Provenance {
  source: string;
  license: string;
  original_id?: string;
  ingested_at?: string;
  edits?: string[];
}

export interface OwnMeshEntry {
  id: PrimaryId;
  lods: Lod[];
  bounds: Bounds;
  material_hint?: MaterialHint;
  provenance: Provenance;
}

export interface CompositeEntry {
  id: PrimaryId;
  composite_children: PrimaryId[];
  material_hint?: MaterialHint;
}

export type RegistryEntry = OwnMeshEntry | CompositeEntry;

export interface MeshRegistry {
  version: string;
  generated_at: string;
  entries: RegistryEntry[];
}

export function isOwnMeshEntry(entry: RegistryEntry): entry is OwnMeshEntry {
  return (entry as OwnMeshEntry).lods !== undefined;
}

export function isCompositeEntry(entry: RegistryEntry): entry is CompositeEntry {
  return (entry as CompositeEntry).composite_children !== undefined;
}

/**
 * Light runtime validation. Throws on shape errors; the message names the
 * specific field so a typo or upstream pipeline change is debuggable from the
 * browser console.
 */
function assertRegistryShape(value: unknown): asserts value is MeshRegistry {
  if (!value || typeof value !== 'object') {
    throw new Error('mesh-registry: top-level value is not an object');
  }
  const v = value as Record<string, unknown>;
  if (typeof v.version !== 'string' || v.version.length === 0) {
    throw new Error('mesh-registry: missing or empty `version`');
  }
  if (typeof v.generated_at !== 'string' || v.generated_at.length === 0) {
    throw new Error('mesh-registry: missing or empty `generated_at`');
  }
  if (!Array.isArray(v.entries)) {
    throw new Error('mesh-registry: `entries` is not an array');
  }
  for (let i = 0; i < v.entries.length; i += 1) {
    const entry = v.entries[i] as Record<string, unknown>;
    if (!entry || typeof entry !== 'object') {
      throw new Error(`mesh-registry: entries[${i}] is not an object`);
    }
    if (typeof entry.id !== 'string') {
      throw new Error(`mesh-registry: entries[${i}].id is not a string`);
    }
    const hasLods = Array.isArray(entry.lods);
    const hasChildren = Array.isArray(entry.composite_children);
    if (hasLods === hasChildren) {
      throw new Error(
        `mesh-registry: entries[${i}] (${entry.id}) must have exactly one of \`lods\` or \`composite_children\` (ADR 0008)`,
      );
    }
    if (hasLods) {
      const lods = entry.lods as unknown[];
      if (lods.length === 0) {
        throw new Error(`mesh-registry: entries[${i}] (${entry.id}) has empty lods`);
      }
      for (let j = 0; j < lods.length; j += 1) {
        const lod = lods[j] as Record<string, unknown>;
        if (typeof lod?.file !== 'string' || lod.file.length === 0) {
          throw new Error(
            `mesh-registry: entries[${i}] (${entry.id}).lods[${j}].file is not a non-empty string`,
          );
        }
        if (typeof lod.level !== 'number') {
          throw new Error(
            `mesh-registry: entries[${i}] (${entry.id}).lods[${j}].level is not a number`,
          );
        }
      }
      if (!entry.bounds || typeof entry.bounds !== 'object') {
        throw new Error(`mesh-registry: entries[${i}] (${entry.id}) own-mesh entry missing bounds`);
      }
    }
  }
}

let cached: MeshRegistry | null = null;
let inflight: Promise<MeshRegistry> | null = null;

/**
 * Fetches `/registry.json` (served by the Vite dev middleware — see
 * `vite.config.ts`). Memoised so repeated calls share one network round-trip.
 */
export async function loadRegistry(url = '/registry.json'): Promise<MeshRegistry> {
  if (cached) {
    return cached;
  }
  if (inflight) {
    return inflight;
  }
  inflight = (async () => {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`mesh-registry: fetch ${url} failed with HTTP ${res.status}`);
    }
    const json: unknown = await res.json();
    assertRegistryShape(json);
    cached = json;
    return json;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Synchronous accessor; only valid after `loadRegistry()` has resolved. */
export function getRegistry(): MeshRegistry {
  if (!cached) {
    throw new Error('mesh-registry: getRegistry() called before loadRegistry() resolved');
  }
  return cached;
}

export function getEntries(): RegistryEntry[] {
  return getRegistry().entries;
}

export function getOwnMeshEntries(): OwnMeshEntry[] {
  return getRegistry().entries.filter(isOwnMeshEntry);
}

export function getCompositeEntries(): CompositeEntry[] {
  return getRegistry().entries.filter(isCompositeEntry);
}

export function getEntryById(id: PrimaryId | string): RegistryEntry | undefined {
  return getRegistry().entries.find((entry) => entry.id === id);
}

/** Test-seam: clears the memoised registry. Not used in production code. */
export function _resetRegistryCache(): void {
  cached = null;
  inflight = null;
}
