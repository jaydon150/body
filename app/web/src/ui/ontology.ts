import nodesJson from '../../../../data/canonical/ontology/nodes.json';
import relationsJson from '../../../../data/canonical/ontology/relations.json';

/**
 * Read-only ontology indices for the UI layer.
 *
 * The UI agent owns label resolution, tree shape, breadcrumb traversal, and
 * fuzzy search. Per ui.md hard rule #1 ("Never invent anatomical labels"),
 * every label shown to the user is pulled from `nodes.json[].labels[]` via
 * this module. Anatomical names are NEVER hardcoded in components.
 *
 * The JSON files are inlined at build time via Vite's `resolveJsonModule`
 * + `server.fs.allow: [repoRoot]` — no runtime fetch is needed for the
 * ontology graph itself. The mesh-registry IS fetched at runtime by the
 * engine (it's larger and may be regenerated mid-session), but the
 * ontology graph is small (~1500 lines) and stable.
 *
 * Phase 1 graph statistics:
 *   - 119 nodes (1 system, 9 region, 109 structure)
 *   - 148 edges (mostly regional_part_of, member_of, constitutional_part_of)
 *
 * Of these, ~79 structures correspond to a renderable mesh; the rest are
 * regions/composites that group children. The Sidebar tree walks ALL
 * nodes via edges; mesh-existence is a separate concern (the click handler
 * resolves whether a node is renderable).
 */

// ---------------------------------------------------------------------------
// Types — local to UI (kept disjoint from engine/registry's MaterialHint etc.).
// Schema authority: `app/shared/schema/anatomical-id-schema.json`.
// ---------------------------------------------------------------------------

export type NodeKind = 'system' | 'region' | 'structure' | 'composite' | 'sub_structure';
export type NodeStatus = 'pending' | 'reviewed' | 'flagged';
export type LabelSource = 'TA2' | 'UBERON' | 'FMA' | 'hand-curated' | string;

export interface NodeLabel {
  text: string;
  lang: string;
  source: LabelSource;
}

export interface NodeAliases {
  fma?: string;
  ta2?: string;
  snomed?: string;
  [k: string]: string | undefined;
}

export interface OntologyNode {
  id: string;
  labels: NodeLabel[];
  aliases?: NodeAliases;
  kind: NodeKind;
  status: NodeStatus;
}

export type RelationType =
  | 'regional_part_of'
  | 'constitutional_part_of'
  | 'systemic_part_of'
  | 'member_of'
  | 'branch_of'
  | 'tributary_of'
  | 'innervates'
  | 'supplied_by';

export interface OntologyEdge {
  from: string;
  to: string;
  type: RelationType;
  source?: string;
}

// ---------------------------------------------------------------------------
// Raw imports (cast through `unknown` because JSON types are widely typed).
// ---------------------------------------------------------------------------

interface NodesFile {
  version: string;
  nodes: OntologyNode[];
}

interface RelationsFile {
  version: string;
  nodes?: unknown[];
  edges: OntologyEdge[];
}

const NODES = (nodesJson as unknown as NodesFile).nodes;
const EDGES = (relationsJson as unknown as RelationsFile).edges;

// ---------------------------------------------------------------------------
// Pre-built indices (computed once at module load).
// ---------------------------------------------------------------------------

const NODES_BY_ID = new Map<string, OntologyNode>();
for (const node of NODES) {
  NODES_BY_ID.set(node.id, node);
}

/** Edges grouped by `to` (parent id) — answers "what are the children of X?" */
const CHILDREN_OF = new Map<string, OntologyEdge[]>();
/** Edges grouped by `from` (child id) — answers "what is X part of?" */
const PARENTS_OF = new Map<string, OntologyEdge[]>();

for (const edge of EDGES) {
  const childList = CHILDREN_OF.get(edge.to);
  if (childList) {
    childList.push(edge);
  } else {
    CHILDREN_OF.set(edge.to, [edge]);
  }
  const parentList = PARENTS_OF.get(edge.from);
  if (parentList) {
    parentList.push(edge);
  } else {
    PARENTS_OF.set(edge.from, [edge]);
  }
}

// Relation types that drive the sidebar tree hierarchy. The graph is a DAG
// (ADR 0001) so a node may have multiple parents; the sidebar picks one
// canonical chain via this priority order.
const TREE_RELATION_TYPES: ReadonlySet<RelationType> = new Set<RelationType>([
  'regional_part_of',
  'constitutional_part_of',
  'member_of',
  'systemic_part_of',
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** All ontology nodes (read-only — caller must not mutate). */
export function getAllNodes(): readonly OntologyNode[] {
  return NODES;
}

export function getNode(id: string): OntologyNode | undefined {
  return NODES_BY_ID.get(id);
}

/**
 * Children of a node via tree-relevant edge types (regional/constitutional/
 * member/systemic). Returns deterministically-sorted child ids (by
 * preferred label) so React keys are stable across renders.
 */
export function getChildren(id: string): OntologyNode[] {
  const edges = CHILDREN_OF.get(id);
  if (!edges) return [];
  const out: OntologyNode[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    if (!TREE_RELATION_TYPES.has(edge.type)) continue;
    if (seen.has(edge.from)) continue;
    const child = NODES_BY_ID.get(edge.from);
    if (!child) continue;
    seen.add(edge.from);
    out.push(child);
  }
  out.sort((a, b) => preferredLabel(a).localeCompare(preferredLabel(b)));
  return out;
}

/**
 * Parents of a node. Returns at most one per relation type. Used by
 * breadcrumb-trail construction. A DAG may have multiple parents; for the
 * breadcrumb we prefer regional > constitutional > member > systemic.
 */
export function getPrimaryParent(id: string): OntologyNode | undefined {
  const edges = PARENTS_OF.get(id);
  if (!edges) return undefined;
  const priority: RelationType[] = [
    'regional_part_of',
    'constitutional_part_of',
    'member_of',
    'systemic_part_of',
  ];
  for (const rel of priority) {
    const e = edges.find((x) => x.type === rel);
    if (e) {
      const p = NODES_BY_ID.get(e.to);
      if (p) return p;
    }
  }
  return undefined;
}

/**
 * Walks up the primary-parent chain from `id` to a root, returning the
 * trail INCLUDING the starting node, oldest-ancestor first. Loops are
 * guarded; the DAG should be acyclic but we don't trust upstream blindly.
 */
export function ancestorTrail(id: string): OntologyNode[] {
  const out: OntologyNode[] = [];
  const seen = new Set<string>();
  let cursor: OntologyNode | undefined = NODES_BY_ID.get(id);
  while (cursor) {
    if (seen.has(cursor.id)) break;
    seen.add(cursor.id);
    out.push(cursor);
    cursor = getPrimaryParent(cursor.id);
  }
  return out.reverse();
}

/**
 * Preferred display label. Order:
 *   1. First label with `source === 'TA2'` and `lang === 'en'`.
 *   2. First English label.
 *   3. First label of any kind.
 *   4. The id itself (fallback for orphan nodes; should never happen for
 *      reviewed nodes but the UI must not crash on pending/draft data).
 */
export function preferredLabel(node: OntologyNode | undefined): string {
  if (!node) return '';
  const labels = node.labels ?? [];
  const ta2En = labels.find((l) => l.source === 'TA2' && l.lang === 'en');
  if (ta2En) return ta2En.text;
  const anyEn = labels.find((l) => l.lang === 'en');
  if (anyEn) return anyEn.text;
  if (labels[0]) return labels[0].text;
  return node.id;
}

/** Latin TA2 label, or empty string if none. */
export function latinLabel(node: OntologyNode | undefined): string {
  if (!node) return '';
  const la = node.labels?.find((l) => l.source === 'TA2' && l.lang === 'la');
  return la?.text ?? '';
}

/**
 * All non-preferred labels for the synonyms list. Excludes the preferred
 * label and duplicates by `text`.
 */
export function synonymLabels(node: OntologyNode | undefined): NodeLabel[] {
  if (!node) return [];
  const preferred = preferredLabel(node);
  const seen = new Set<string>([preferred]);
  const out: NodeLabel[] = [];
  for (const l of node.labels ?? []) {
    if (seen.has(l.text)) continue;
    seen.add(l.text);
    out.push(l);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sidebar tree shape
// ---------------------------------------------------------------------------

export interface TreeNode {
  node: OntologyNode;
  /** Pre-computed children for this depth band, sorted by preferred label. */
  children: TreeNode[];
  depth: number;
}

/**
 * Builds the Sidebar tree. Per dispatch:
 *   Root  = Skeletal system (UBERON:0001434)
 *   Depth 1 = axial + appendicular (regional children)
 *   Depth 2 = their regional children
 *   Depth 3+ collapsed (rendered as a "+N more" leaf to avoid jam-packing)
 *
 * Capped at `maxDepth = 3` from the root. Tweak when Phase 2 lands.
 */
export function buildSidebarTree(rootId: string = 'UBERON:0001434', maxDepth = 3): TreeNode | null {
  const root = NODES_BY_ID.get(rootId);
  if (!root) return null;
  const walk = (id: string, depth: number): TreeNode => {
    const node = NODES_BY_ID.get(id)!;
    if (depth >= maxDepth) {
      return { node, children: [], depth };
    }
    const children = getChildren(id).map((c) => walk(c.id, depth + 1));
    return { node, children, depth };
  };
  return walk(rootId, 0);
}

/**
 * Flatten a tree into the order the user will tab through it (depth-first,
 * children-after-parent). Used for keyboard navigation.
 */
export function flattenTree(tree: TreeNode, expanded: ReadonlySet<string>): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    out.push(n);
    if (expanded.has(n.node.id)) {
      for (const c of n.children) walk(c);
    }
  };
  walk(tree);
  return out;
}

// ---------------------------------------------------------------------------
// Search — small fuzzy implementation
// ---------------------------------------------------------------------------

export interface SearchResult {
  node: OntologyNode;
  /** Label that matched (preferred or synonym). */
  matchedLabel: string;
  /** Higher = better match. */
  score: number;
}

/**
 * Pre-built searchable index: for every node, list every label text +
 * the node it points to. Built once at module load.
 */
interface SearchEntry {
  node: OntologyNode;
  label: string;
  lower: string;
}
const SEARCH_ENTRIES: SearchEntry[] = (() => {
  const out: SearchEntry[] = [];
  for (const node of NODES) {
    for (const l of node.labels ?? []) {
      out.push({ node, label: l.text, lower: l.text.toLowerCase() });
    }
    // Also index the FMA alias as a searchable token — fast-path for
    // power-users who paste a code.
    if (node.aliases?.fma) {
      out.push({ node, label: node.aliases.fma, lower: node.aliases.fma.toLowerCase() });
    }
    out.push({ node, label: node.id, lower: node.id.toLowerCase() });
  }
  return out;
})();

/**
 * Tiny fuzzy match: lowercase-substring → strong score; per-word prefix →
 * medium score; otherwise no match. For ~200 nodes this is trivially fast
 * and good enough for Phase 1. Phase 2 may swap in MiniSearch or Fuse if
 * the corpus grows.
 *
 * Scoring intuition:
 *   - exact prefix of preferred label: 100
 *   - exact substring of preferred label: 80
 *   - exact prefix of any label: 60
 *   - exact substring of any label: 40
 *   - per-word prefix in any label: 25
 *   - levenshtein-1 match (typo): 10
 *   - else: 0 (skip)
 */
export function search(query: string, limit = 8): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const scoreFor = (entry: SearchEntry): number => {
    if (entry.lower === q) return 110;
    if (entry.lower.startsWith(q)) {
      const isPreferred = preferredLabel(entry.node).toLowerCase() === entry.lower;
      return isPreferred ? 100 : 60;
    }
    if (entry.lower.includes(q)) {
      const isPreferred = preferredLabel(entry.node).toLowerCase() === entry.lower;
      return isPreferred ? 80 : 40;
    }
    // per-word prefix
    const words = entry.lower.split(/\s+/);
    if (words.some((w) => w.startsWith(q))) return 25;
    // Levenshtein-1 fallback for short queries to catch typos like "atlss".
    if (q.length >= 4 && q.length <= 12 && levenshtein1(q, entry.lower)) return 10;
    return 0;
  };

  // Aggregate per node — keep the highest-scoring label.
  const byNode = new Map<string, SearchResult>();
  for (const entry of SEARCH_ENTRIES) {
    const s = scoreFor(entry);
    if (s === 0) continue;
    const existing = byNode.get(entry.node.id);
    if (!existing || s > existing.score) {
      byNode.set(entry.node.id, { node: entry.node, matchedLabel: entry.label, score: s });
    }
  }

  const ranked = Array.from(byNode.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tiebreak: shorter label first (likely more relevant).
    return a.matchedLabel.length - b.matchedLabel.length;
  });
  return ranked.slice(0, limit);
}

/**
 * Returns true if `query` is within Levenshtein-1 of any substring of
 * `target` of length `query.length` or `query.length±1`. Cheap typo fallback.
 */
function levenshtein1(query: string, target: string): boolean {
  // Only useful when target is short-ish — skip very long descriptive labels
  // to keep search fast.
  if (target.length > 60) return false;
  const ql = query.length;
  for (let start = 0; start <= target.length - ql + 1; start++) {
    for (const w of [ql - 1, ql, ql + 1]) {
      if (w <= 0) continue;
      const slice = target.slice(start, start + w);
      if (slice.length !== w) continue;
      if (within1Edit(query, slice)) return true;
    }
  }
  return false;
}

/** Two strings are within 1 edit (insert/delete/replace). */
function within1Edit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (a.length === b.length) {
      i++;
      j++;
    } else if (a.length > b.length) {
      i++;
    } else {
      j++;
    }
  }
  // remainder counts
  if (i < a.length) edits += a.length - i;
  if (j < b.length) edits += b.length - j;
  return edits <= 1;
}
