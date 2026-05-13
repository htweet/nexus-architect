/**
 * Nexus Architect — Adapter Interface
 *
 * THE PRIME DIRECTIVE: The core builder engine never calls WordPress APIs
 * directly. All data operations flow through this interface. The current
 * implementation is WPAdapter. Future: SupabaseAdapter (Phase 13 SaaS).
 *
 * To swap backends entirely, implement this interface. The React engine
 * requires zero changes.
 */

import type { NexusPage, PageRevision } from './schema.js';
import type { AiAdapter } from './ai.js';

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

export interface AdapterUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  tier: 'free' | 'personal' | 'professional' | 'agency';
  siteCount: number;
}

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  alt: string;
  caption?: string;
  mimeType: string;
  width?: number;
  height?: number;
  sizes: Record<string, { url: string; width: number; height: number }>;
}

export interface PublishResult {
  id: string;
  published: boolean;
  publishedAt: string;
  pageUrl: string;
  staticHtml?: string;
}

export interface AdapterError {
  code: 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION' | 'NETWORK' | 'UNKNOWN';
  message: string;
  details?: Record<string, unknown>;
}

// ─── Data Adapter Interface ───────────────────────────────────────────────────

/**
 * Every method returns a Promise that resolves with data or rejects with
 * an Error (use NexusApiError from wp-adapter for status codes).
 * The core engine never inspects error shapes — it only surfaces them to the UI.
 */
export interface DataAdapter {
  // ── Page CRUD ────────────────────────────────────────────────────────────
  getPage(id: string): Promise<NexusPage>;
  createPage(data: Pick<NexusPage, 'title' | 'slug'>): Promise<NexusPage>;
  updatePage(id: string, data: Partial<NexusPage>): Promise<NexusPage>;
  deletePage(id: string): Promise<void>;
  listPages(params?: PaginationParams): Promise<PaginatedResult<NexusPage>>;

  // ── Publishing ───────────────────────────────────────────────────────────
  publishPage(id: string): Promise<PublishResult>;

  // ── Revisions ────────────────────────────────────────────────────────────
  getRevisions(pageId: string): Promise<PageRevision[]>;
  restoreRevision(pageId: string, revisionId: string): Promise<NexusPage>;

  // ── Media ────────────────────────────────────────────────────────────────
  getMediaLibrary(params?: PaginationParams): Promise<PaginatedResult<MediaItem>>;

  // ── Auth ─────────────────────────────────────────────────────────────────
  getCurrentUser(): Promise<AdapterUser>;

  // ── Health ───────────────────────────────────────────────────────────────
  ping(): Promise<{ ok: boolean; latencyMs: number }>;
}

// ─── Media Adapter Interface ─────────────────────────────────────────────────

/**
 * Decouples the media picker UI from the underlying media library.
 * WP implementation opens the native WordPress media modal.
 * SaaS implementation opens a custom asset picker.
 */
export interface MediaAdapter {
  search(query: string, params?: PaginationParams): Promise<PaginatedResult<MediaItem>>;
  openMediaPicker(): Promise<MediaItem | null>;
}

// ─── Adapter Context ─────────────────────────────────────────────────────────

/** Injected at the React app root. Never imported directly inside components. */
export interface AdapterContext {
  data:  DataAdapter;
  media: MediaAdapter;
  /** Phase 7: AI adapter. Optional — degrades gracefully when absent. */
  ai?:   AiAdapter;
}

// ─── Template Adapter (optional extension) ────────────────────────────────────

import type { NexusTemplate } from './schema.js';

/**
 * Template CRUD — optional mixin on DataAdapter.
 * Adapters that don't implement templates return empty lists gracefully.
 */
export interface TemplateAdapter {
  listTemplates(): Promise<NexusTemplate[]>;
  saveTemplate(template: NexusTemplate): Promise<NexusTemplate>;
  deleteTemplate(id: string): Promise<void>;
}

/** Full adapter with optional template support */
export type DataAdapterWithTemplates = DataAdapter & Partial<TemplateAdapter>;

/**
 * Canonical alias for the core data adapter interface.
 * Builder code should use this name; DataAdapter is the underlying type.
 */
export type NexusDataAdapter = DataAdapterWithTemplates;
