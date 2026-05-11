import { useEffect, useState } from 'react';

/**
 * Hook returning the content record for a structure id.
 *
 * Wired in P1.14:
 *
 *   1. URL convention: an UBERON id like `UBERON:0000981` maps to
 *      `/content/uberon_0000981.json` — matches the on-disk filename
 *      convention the Content agent (P1.15) writes. The mapping handles
 *      `UBERON:`, `FMA:`, and `BODY:` namespaces identically (lowercase
 *      namespace + underscore + digits).
 *   2. Vite middleware route `/content/<filename>` serves the file from
 *      `data/canonical/ontology/content/<filename>` (see vite.config.ts).
 *      Production deploy is out of scope for Phase 1 — same caveat as the
 *      `/meshes/` and `/registry.json` routes.
 *   3. SWR-style in-memory cache keyed by id. Avoids re-fetching the same
 *      record across selection toggles and across mount/unmount cycles of
 *      the DetailPanel. Eviction is process-bounded — Phase 1 has 51
 *      records total, well under any browser-memory threshold worth
 *      worrying about. The cache is module-level (Module = single page
 *      load), not a React store, because no other component needs to
 *      observe content state.
 *   4. Status state machine: `'idle' | 'loading' | 'present' | 'missing' |
 *      'error'`. The 404 case is distinct from network/parse error so the
 *      DetailPanel can render "pending anatomist review" specifically
 *      rather than a generic failure.
 *
 * Phase 1 dispatch decision: the panel renders `pending` content (P1.15
 * writes `confidence: "pending"` on every record it ships in this phase).
 * A visible badge tells the user the content has not passed anatomist
 * review yet — see DetailPanel.tsx for the rendering policy.
 */

export type ContentStatus = 'idle' | 'loading' | 'present' | 'missing' | 'error';

export interface ContentCitation {
  kind: string;
  ref: string;
  edition?: string;
  page?: string;
  url?: string;
  retrieved_at?: string;
}

export interface ContentRecord {
  structure_id: string;
  summary: string;
  long_form?: string;
  ta_latin_name?: string;
  citations?: ContentCitation[];
  confidence: 'reviewed' | 'pending' | 'flagged';
  authored_by?: string;
  reviewed_by?: string;
  review_notes?: string;
  last_updated: string;
}

export interface UseStructureContentResult {
  /** True while the fetch is in flight. */
  loading: boolean;
  /** Status state machine — `'missing'` is distinct from `'error'`. */
  status: ContentStatus;
  /** The resolved record, or null when none exists / not yet authored. */
  record: ContentRecord | null;
  /** Error message if the fetch failed; null otherwise. */
  error: string | null;
}

/**
 * Turn a primary id (`UBERON:0000981`) into the URL the middleware serves
 * the corresponding content file from. Returns null if the id doesn't
 * match the expected primary-id pattern (defensive — never construct a
 * URL we can't validate).
 *
 * Pattern: `<NAMESPACE>:<digits>` → `/content/<namespace>_<digits>.json`.
 */
export function contentUrlForId(id: string): string | null {
  const m = id.match(/^([A-Z]+):(\d+)$/);
  if (!m) return null;
  const namespace = m[1].toLowerCase();
  return `/content/${namespace}_${m[2]}.json`;
}

interface CacheEntry {
  status: ContentStatus;
  record: ContentRecord | null;
  error: string | null;
}

/**
 * Module-scoped cache shared across all hook instances. Two-tier — finished
 * results live in `cache`; in-flight requests live in `inflight` so two
 * mounts of the same id deduplicate down to one network call.
 */
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CacheEntry>>();

function fetchAndCache(id: string, url: string): Promise<CacheEntry> {
  const existing = inflight.get(id);
  if (existing) return existing;
  const promise = (async (): Promise<CacheEntry> => {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.status === 404) {
        const entry: CacheEntry = { status: 'missing', record: null, error: null };
        cache.set(id, entry);
        return entry;
      }
      if (!res.ok) {
        const entry: CacheEntry = {
          status: 'error',
          record: null,
          error: `HTTP ${res.status}`,
        };
        cache.set(id, entry);
        return entry;
      }
      const json = (await res.json()) as ContentRecord;
      // Defensive shape check — refuse to render a record whose
      // structure_id doesn't match the requested id (cache poisoning
      // wouldn't really matter here, but it's a 3-line cost for sanity).
      if (json.structure_id !== id) {
        const entry: CacheEntry = {
          status: 'error',
          record: null,
          error: `content structure_id ${json.structure_id} != requested ${id}`,
        };
        cache.set(id, entry);
        return entry;
      }
      const entry: CacheEntry = { status: 'present', record: json, error: null };
      cache.set(id, entry);
      return entry;
    } catch (err) {
      const entry: CacheEntry = {
        status: 'error',
        record: null,
        error: err instanceof Error ? err.message : String(err),
      };
      cache.set(id, entry);
      return entry;
    } finally {
      inflight.delete(id);
    }
  })();
  inflight.set(id, promise);
  return promise;
}

/**
 * Reactive hook that fetches a content record for the given id. Re-runs
 * whenever the id changes; cancels writes from stale fetches via a local
 * `cancelled` flag.
 */
export function useStructureContent(id: string | null): UseStructureContentResult {
  const [state, setState] = useState<UseStructureContentResult>(() => {
    if (!id) {
      return { loading: false, status: 'idle', record: null, error: null };
    }
    const cached = cache.get(id);
    if (cached) {
      return {
        loading: false,
        status: cached.status,
        record: cached.record,
        error: cached.error,
      };
    }
    return { loading: true, status: 'loading', record: null, error: null };
  });

  useEffect(() => {
    if (!id) {
      setState({ loading: false, status: 'idle', record: null, error: null });
      return;
    }
    const url = contentUrlForId(id);
    if (!url) {
      // Unknown id namespace — treat as missing rather than error so the
      // panel renders the standard "pending" hint instead of a network
      // failure pill.
      setState({ loading: false, status: 'missing', record: null, error: null });
      return;
    }
    const cached = cache.get(id);
    if (cached) {
      setState({
        loading: false,
        status: cached.status,
        record: cached.record,
        error: cached.error,
      });
      return;
    }
    setState({ loading: true, status: 'loading', record: null, error: null });
    let cancelled = false;
    fetchAndCache(id, url).then((entry) => {
      if (cancelled) return;
      setState({
        loading: false,
        status: entry.status,
        record: entry.record,
        error: entry.error,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}

/** Test-seam: clears the in-memory cache. Not used in production code. */
export function _resetContentCache(): void {
  cache.clear();
  inflight.clear();
}
