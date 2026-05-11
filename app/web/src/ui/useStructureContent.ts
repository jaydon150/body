import { useEffect, useState } from 'react';

/**
 * Hook returning the content record for a structure id.
 *
 * For P1.13 this returns `null` for every id — Content (P1.15) is running
 * in parallel and `data/canonical/ontology/content/*.json` may or may not
 * exist when this lands. The DetailPanel renders a "Content authoring in
 * progress" placeholder when the hook resolves to null/undefined.
 *
 * P1.14 will:
 *
 *   1. Wire a Vite middleware route `/ontology/content/<id>.json` (or do
 *      a bundle-time import of the content directory once Content has
 *      written files).
 *   2. Replace the body of this hook with the actual fetch, returning a
 *      typed `ContentRecord` matching `content-record-schema.json`.
 *   3. Add a build-time gate: only `confidence: "reviewed"` records ship
 *      in production builds (phase-1-spec acceptance #13 requirement;
 *      Phase 1 dev shows whatever the file says).
 *
 * The component contract (returned shape) is locked here so swapping the
 * implementation in P1.14 is a one-file change.
 */

export interface ContentRecord {
  structure_id: string;
  summary: string;
  long_form?: string;
  ta_latin_name?: string;
  citations?: Array<{
    kind: string;
    ref: string;
    edition?: string;
    page?: string;
    url?: string;
    retrieved_at?: string;
  }>;
  confidence: 'reviewed' | 'pending' | 'flagged';
  authored_by?: string;
  reviewed_by?: string;
  review_notes?: string;
  last_updated: string;
}

export interface UseStructureContentResult {
  /** True while the fetch is in flight (always false for the P1.13 stub). */
  loading: boolean;
  /** The resolved record, or null when none exists / not yet authored. */
  record: ContentRecord | null;
  /** Error message if the fetch failed; null otherwise. */
  error: string | null;
}

/**
 * Phase 1 stub. Always resolves to `{ loading: false, record: null,
 * error: null }`. Will be replaced by an actual fetch in P1.14.
 */
export function useStructureContent(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id: string | null,
): UseStructureContentResult {
  const [state] = useState<UseStructureContentResult>({
    loading: false,
    record: null,
    error: null,
  });

  // Effect placeholder — leaves the dependency array stable so P1.14 can
  // drop in a real fetch without component-level changes.
  useEffect(() => {
    // intentional no-op in P1.13
  }, [id]);

  return state;
}
