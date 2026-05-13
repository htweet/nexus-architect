/**
 * Nexus Architect — Core Page Schema
 *
 * This schema is the DNA of the entire product. Every feature —
 * rendering, undo/redo, collaboration, AI generation, cloud sync —
 * depends on the stability of these types.
 *
 * CRDT READINESS: The `_ops` field on every NexusNode is an append-only
 * operation log that remains empty until real-time collaboration is
 * activated in Phase 13. The schema cost is near-zero; the future
 * retrofit cost without it would be a full rewrite.
 */

// ─── Breakpoints ────────────────────────────────────────────────────────────

export type Breakpoint = 'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const BREAKPOINT_WIDTHS: Record<Breakpoint, number> = {
  base: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// ─── Styles ──────────────────────────────────────────────────────────────────

/** Responsive style map. Each breakpoint overrides the base. */
export type NodeStyles = Partial<Record<Breakpoint, Record<string, string>>>;

/** Per-breakpoint visibility flags. */
export type NodeVisibility = Partial<Record<Breakpoint, boolean>>;

// ─── Interactions ────────────────────────────────────────────────────────────

export type NodeActionType = 'navigate' | 'scroll-to' | 'open-modal' | 'close-modal' | 'custom';

export interface NodeAction {
  type: NodeActionType;
  payload?: Record<string, unknown>;
}

export interface NodeInteraction {
  hoverStyles?: Record<string, string>;
  onClick?: NodeAction;
  onHover?: NodeAction;
}

// ─── CRDT Operation Log ──────────────────────────────────────────────────────

/**
 * A single CRDT operation. Initially empty on all nodes.
 * Activated when Phase 13 ships real-time collaboration via Yjs/Automerge.
 * The lamportClock provides causal ordering across concurrent clients.
 */
export interface CRDTOperation {
  readonly id: string;
  readonly type: 'insert' | 'update' | 'delete' | 'move';
  readonly nodeId: string;
  readonly field?: string;
  readonly value?: unknown;
  readonly lamportClock: number;
  readonly clientId: string;
  readonly timestamp: number;
}

// ─── Node ────────────────────────────────────────────────────────────────────

/**
 * The fundamental unit of every page. Nodes form a flat map (not a nested
 * tree) for O(1) lookup and safe tree manipulation without deep clones.
 */
export interface NexusNode {
  readonly id: string;

  /** Widget type key registered in the Widget Registry (e.g. 'heading', 'container') */
  type: string;

  /** Parent node ID. Null only for the root node. */
  parentId: string | null;

  /** Ordered array of child node IDs. Source of truth for tree structure. */
  children: string[];

  /** Widget-specific configuration props. Shape is owned by each widget's schema. */
  props: Record<string, unknown>;

  /** Responsive style overrides per breakpoint. */
  styles: NodeStyles;

  /** Per-breakpoint visibility. Undefined means visible at all breakpoints. */
  visibility: NodeVisibility;

  /** Click/hover interaction configuration. */
  interactions: NodeInteraction;

  /** When true, the node cannot be selected, moved, or edited on canvas. */
  locked: boolean;

  /** When true, the node is hidden in the canvas but remains in the tree. */
  hidden: boolean;

  /** Optional human-readable label for the Layers panel. */
  label?: string;

  /** Schema version stamp. Consumed by the migrator in Phase 10. */
  readonly _v: number;

  /**
   * CRDT operation log. Empty array until collaboration is activated.
   * Never mutate this directly — always append via the collaboration store.
   */
  readonly _ops: CRDTOperation[];
}

// ─── Page ────────────────────────────────────────────────────────────────────

export interface NexusSeoMeta {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  favicon?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

/**
 * A complete page design. The nodeMap is the flat registry of all nodes;
 * rootNodeId is the entry point for the renderer tree walk.
 */
export interface NexusPage {
  readonly id: string;
  title: string;
  slug: string;
  description?: string;

  /** Entry point for the recursive renderer. */
  rootNodeId: string;

  /** Flat node registry. O(1) lookup by ID. */
  nodeMap: Record<string, NexusNode>;

  /** Site-wide CSS custom properties (design tokens). */
  globalStyles: Record<string, string>;

  /** Custom CSS injected into the published page <head>. */
  customCss?: string;

  /** Custom JS injected before </body> on the published page. */
  customJs?: string;

  seoMeta: NexusSeoMeta;

  /** Schema version — incremented on every breaking schema change. */
  readonly schemaVersion: number;

  readonly createdAt: string;
  updatedAt: string;
}

// ─── Page Revision ───────────────────────────────────────────────────────────

export interface PageRevision {
  readonly id: string;
  readonly pageId: string;
  readonly snapshot: NexusPage;
  readonly createdAt: string;
  readonly label?: string;
}

// ─── Page Template ───────────────────────────────────────────────────────────

export interface NexusTemplate {
  readonly id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  /** Snapshot of the page nodeMap + root structure (no page meta). */
  snapshot: Pick<NexusPage, 'rootNodeId' | 'nodeMap' | 'globalStyles'>;
  readonly createdAt: string;
}

// ─── Schema version ───────────────────────────────────────────────────────────

export const CURRENT_SCHEMA_VERSION = 1;

// ─── Factory helpers ─────────────────────────────────────────────────────────

export function createNode(overrides: Partial<NexusNode> & Pick<NexusNode, 'type'>): NexusNode {
  return {
    parentId: null,
    children: [],
    props: {},
    styles: {},
    visibility: {},
    interactions: {},
    locked: false,
    hidden: false,
    _v: CURRENT_SCHEMA_VERSION,
    _ops: [],
    ...overrides,
    // id is required — must be provided in overrides or generated
    id: overrides.id ?? `node-${crypto.randomUUID()}`,
  };
}

export function createPage(
  overrides: Partial<Pick<NexusPage, 'id'>> & Pick<NexusPage, 'title' | 'slug'>,
): NexusPage {
  const id      = overrides.id ?? `page-${crypto.randomUUID()}`;
  const rootId  = `root-${id}`;
  const rootNode = createNode({ id: rootId, type: 'root' });

  // Destructure id out of overrides so the spread never creates a duplicate key.
  const { id: _overrideId, ...restOverrides } = overrides;

  return {
    id,
    rootNodeId: rootId,
    nodeMap: { [rootId]: rootNode },
    globalStyles: {},
    customCss: '',
    customJs: '',
    seoMeta: {},
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...restOverrides,
  };
}
