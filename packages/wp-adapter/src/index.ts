/**
 * WPAdapter — the ONLY file in the project permitted to reference WordPress globals.
 *
 * Implements every method of DataAdapter and MediaAdapter using the
 * Nexus REST API via ApiClient. Zero hardcoded WP globals in core.
 *
 * Per ADR 001: the AdapterContext is injected at the React app root.
 * No component imports WPAdapter directly.
 *
 * Phase 6 additions:
 *   • publishPage in the mock adapter now calls compilePage() to generate
 *     actual static HTML + CSS, stored in the mock "publish cache" map.
 *   • Returns staticHtml in PublishResult so the PublishDialog can show
 *     compiled output size and the preview can render the static output.
 */

import {
  type DataAdapter,
  type MediaAdapter,
  type AdapterUser,
  type AdapterContext,
  type NexusPage,
  type MediaItem,
  type PaginationParams,
  type PaginatedResult,
  type PublishResult,
  type PageRevision,
  compilePage,
  createPage as createPageSchema,
} from '@nexus/core';

import { ApiClient, NexusApiError } from './api-client.js';
import type {
  WPUserResponse,
  WPPaginatedResponse,
  WPMediaItem,
  WPPublishResult,
  WPPingResult,
  NexusWindowConfig,
} from './types.js';

export { NexusApiError } from './api-client.js';
export type { NexusWindowConfig } from './types.js';

// ─── Shared helper ────────────────────────────────────────────────────────────

function mapMediaItem(raw: WPMediaItem): MediaItem {
  return {
    id:       raw.id,
    url:      raw.url,
    filename: raw.filename,
    mimeType: raw.mimeType,
    ...(raw.width  != null && { width:  raw.width }),
    ...(raw.height != null && { height: raw.height }),
    alt:      raw.alt,
    caption:  raw.caption,
    sizes:    raw.sizes,
  };
}

// ─── WPAdapter ────────────────────────────────────────────────────────────────

export class WPAdapter implements DataAdapter {
  private readonly client: ApiClient;

  constructor(config: { baseUrl: string; nonce: string }) {
    this.client = new ApiClient(config.baseUrl, config.nonce);
  }

  async getCurrentUser(): Promise<AdapterUser> {
    const data = await this.client.get<WPUserResponse>('/user');
    return {
      id:        data.id,
      name:      data.name,
      email:     data.email,
      tier:      data.tier,
      siteCount: data.siteCount,
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
    };
  }

  async getPage(id: string): Promise<NexusPage> {
    return this.client.get<NexusPage>(`/pages/${id}`);
  }

  async listPages(params?: PaginationParams): Promise<PaginatedResult<NexusPage>> {
    const res = await this.client.get<WPPaginatedResponse<NexusPage>>('/pages', {
      per_page: params?.perPage ?? 50,
      page:     params?.page    ?? 1,
    });
    return {
      items:      res.items,
      total:      res.total,
      totalPages: res.totalPages,
      page:       res.page,
      perPage:    res.perPage,
    };
  }

  async createPage(data: Pick<NexusPage, 'title' | 'slug'>): Promise<NexusPage> {
    return this.client.post<NexusPage>('/pages', {
      title: data.title,
      slug:  data.slug,
    });
  }

  async updatePage(id: string, data: Partial<NexusPage>): Promise<NexusPage> {
    return this.client.put<NexusPage>(`/pages/${id}`, data);
  }

  async deletePage(id: string): Promise<void> {
    await this.client.delete<{ deleted: boolean }>(`/pages/${id}`);
  }

  async publishPage(id: string): Promise<PublishResult> {
    const res = await this.client.post<WPPublishResult>(`/pages/${id}/publish`);
    return {
      id:          res.id,
      published:   res.published,
      publishedAt: res.publishedAt,
      pageUrl:     res.pageUrl,
      ...(res.staticHtml != null && { staticHtml: res.staticHtml }),
    };
  }

  async getRevisions(pageId: string): Promise<PageRevision[]> {
    const res = await this.client.get<{ items: PageRevision[] }>(`/pages/${pageId}/revisions`);
    return res.items;
  }

  async restoreRevision(pageId: string, revisionId: string): Promise<NexusPage> {
    return this.client.post<NexusPage>(`/pages/${pageId}/revisions/${revisionId}/restore`);
  }

  async getMediaLibrary(params?: PaginationParams): Promise<PaginatedResult<MediaItem>> {
    const res = await this.client.get<WPPaginatedResponse<WPMediaItem>>('/media', {
      per_page: params?.perPage ?? 40,
      page:     params?.page    ?? 1,
    });
    return {
      items:      res.items.map((m) => this.mapMediaItem(m)),
      total:      res.total,
      totalPages: res.totalPages,
      page:       res.page,
      perPage:    res.perPage,
    };
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    const t0  = performance.now();
    const res = await this.client.get<WPPingResult>('/ping');
    return { ok: res.ok, latencyMs: Math.round(performance.now() - t0) };
  }

  private mapMediaItem(raw: WPMediaItem): MediaItem {
    return mapMediaItem(raw);
  }
}

// ─── WPMediaAdapter ───────────────────────────────────────────────────────────

export class WPMediaAdapter implements MediaAdapter {
  private readonly client: ApiClient;

  constructor(config: { baseUrl: string; nonce: string }) {
    this.client = new ApiClient(config.baseUrl, config.nonce);
  }

  async search(query: string, params?: PaginationParams): Promise<PaginatedResult<MediaItem>> {
    const res = await this.client.get<WPPaginatedResponse<WPMediaItem>>('/media', {
      search:   query,
      per_page: params?.perPage ?? 40,
      page:     params?.page    ?? 1,
    });
    return {
      items: res.items.map((m: WPMediaItem) => mapMediaItem(m)),
      total: res.total, totalPages: res.totalPages,
      page: res.page, perPage: res.perPage,
    };
  }

  async openMediaPicker(): Promise<MediaItem | null> {
    return Promise.resolve(null);
  }
}

// ─── Factory: WP production ───────────────────────────────────────────────────

export function createWPAdapterContext(): AdapterContext {
  const config = window.__NEXUS_CONFIG__;
  if (!config) {
    throw new Error(
      '[NexusArchitect] window.__NEXUS_CONFIG__ is not defined. ' +
      'Make sure the PHP plugin rendered the builder page correctly.',
    );
  }

  const adapterConfig = { baseUrl: config.apiUrl, nonce: config.nonce };

  const client = new ApiClient(config.apiUrl, config.nonce);
  return {
    data:  new WPAdapter(adapterConfig),
    media: new WPMediaAdapter(adapterConfig),
    ai:    new WPAiAdapter(client),
  };
}

// ─── Factory: Mock / Dev / E2E ────────────────────────────────────────────────

/**
 * createMockAdapterContext — fully functional adapter for dev / E2E testing.
 *
 * Persistence layer: localStorage (key: nexus_mock_db).
 * Pages and revisions survive page reloads so auto-save is genuinely durable
 * even without a WordPress backend.  Switching to WPAdapter in production
 * replaces this entire layer without touching any core builder code.
 *
 * Phase 6 additions (preserved):
 *   • publishPage calls compilePage() to generate real static HTML + CSS.
 *   • PublishResult includes staticHtml so the UI can display compile stats.
 */

const MOCK_DB_KEY        = 'nexus_mock_db';
const MOCK_LAST_PAGE_KEY = 'nexus_last_page_id';

interface MockDb {
  pages:     Record<string, NexusPage>;
  revisions: Record<string, PageRevision[]>;
}

function loadMockDb(): MockDb {
  try {
    const raw = localStorage.getItem(MOCK_DB_KEY);
    if (raw) return JSON.parse(raw) as MockDb;
  } catch { /* ignore */ }
  return { pages: {}, revisions: {} };
}

function saveMockDb(db: MockDb): void {
  try {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('[MockAdapter] localStorage write failed:', e);
  }
}

export function createMockAdapterContext(overrides?: Partial<AdapterContext>): AdapterContext {
  // ── Bootstrap from localStorage ────────────────────────────────────────────
  const db = loadMockDb();

  // In-memory revisions map (revisions are session-only; pages are durable)
  const revisions = new Map<string, PageRevision[]>(
    Object.entries(db.revisions ?? {}),
  );
  let revCounter = 0;

  // Helpers to keep localStorage in sync
  function getPages(): Record<string, NexusPage> {
    return loadMockDb().pages;
  }

  function flushPage(page: NexusPage): void {
    const current = loadMockDb();
    current.pages[page.id] = page;
    current.revisions = Object.fromEntries(revisions.entries());
    saveMockDb(current);
    // Track last active page for auto-restore on reload
    try { localStorage.setItem(MOCK_LAST_PAGE_KEY, page.id); } catch { /* ignore */ }
  }

  function dropPage(id: string): void {
    const current = loadMockDb();
    delete current.pages[id];
    delete current.revisions[id];
    saveMockDb(current);
    revisions.delete(id);
    try {
      if (localStorage.getItem(MOCK_LAST_PAGE_KEY) === id) {
        localStorage.removeItem(MOCK_LAST_PAGE_KEY);
      }
    } catch { /* ignore */ }
  }

  function pushRevision(page: NexusPage, label?: string) {
    const rev: PageRevision = {
      id:        `rev-${++revCounter}-${Date.now()}`,
      pageId:    page.id,
      snapshot:  structuredClone(page),
      createdAt: new Date().toISOString(),
      ...(label ? { label } : {}),
    };
    const list = revisions.get(page.id) ?? [];
    revisions.set(page.id, [...list, rev]);
  }

  const publishCache = new Map<string, { html: string; css: string; sizeKb: number; publishedAt: string }>();

  const mockData: DataAdapter = {

    async getCurrentUser(): Promise<AdapterUser> {
      return {
        id:        'mock-user-1',
        name:      'Developer',
        email:     'dev@nexusarchitect.io',
        tier:      'professional',
        siteCount: 3,
      };
    },

    async getPage(id: string): Promise<NexusPage> {
      const page = getPages()[id];
      if (!page) throw new NexusApiError(404, 'nexus_not_found', `Page ${id} not found`);
      return structuredClone(page);
    },

    async listPages(): Promise<PaginatedResult<NexusPage>> {
      const items = Object.values(getPages());
      return { items, total: items.length, totalPages: 1, page: 1, perPage: 50 };
    },

    async createPage(data: Pick<NexusPage, 'title' | 'slug'>): Promise<NexusPage> {
      const page = createPageSchema({ title: data.title, slug: data.slug });
      flushPage(page);
      return structuredClone(page);
    },

    async updatePage(id: string, data: Partial<NexusPage>): Promise<NexusPage> {
      const existing = getPages()[id];
      if (!existing) {
        const fresh = { ...data, id, updatedAt: new Date().toISOString() } as NexusPage;
        flushPage(fresh);
        pushRevision(fresh);
        return structuredClone(fresh);
      }
      const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
      flushPage(updated);
      pushRevision(updated);
      return structuredClone(updated);
    },

    async deletePage(id: string): Promise<void> {
      dropPage(id);
      publishCache.delete(id);
    },

    async publishPage(id: string): Promise<PublishResult> {
      const page = getPages()[id];
      if (!page) throw new NexusApiError(404, 'nexus_not_found', `Page ${id} not found`);

      const compiled    = compilePage(page);
      const publishedAt = new Date().toISOString();

      publishCache.set(id, {
        html:        compiled.html,
        css:         compiled.css,
        sizeKb:      compiled.sizeKb,
        publishedAt,
      });

      const publishedPage: NexusPage = { ...page, updatedAt: publishedAt };
      flushPage(publishedPage);
      pushRevision(publishedPage, `Published ${new Date(publishedAt).toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      })}`);

      return {
        id,
        published:   true,
        publishedAt,
        pageUrl:     `http://localhost:3000/preview/${page.slug}`,
        staticHtml:  compiled.html,
      };
    },

    async getRevisions(pageId: string): Promise<PageRevision[]> {
      return structuredClone(revisions.get(pageId) ?? []);
    },

    async restoreRevision(pageId: string, revisionId: string): Promise<NexusPage> {
      const revList = revisions.get(pageId) ?? [];
      const rev     = revList.find((r) => r.id === revisionId);
      if (!rev) throw new NexusApiError(404, 'nexus_not_found', `Revision ${revisionId} not found`);
      const restored: NexusPage = { ...rev.snapshot, updatedAt: new Date().toISOString() };
      flushPage(restored);
      pushRevision(
        restored,
        `Restored from ${new Date(rev.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      );
      return structuredClone(restored);
    },

    async getMediaLibrary(): Promise<PaginatedResult<MediaItem>> {
      return { items: [], total: 0, totalPages: 0, page: 1, perPage: 40 };
    },

    async ping(): Promise<{ ok: boolean; latencyMs: number }> {
      return { ok: true, latencyMs: 0 };
    },
  };

  const mockMedia: MediaAdapter = {
    async search(): Promise<PaginatedResult<MediaItem>> {
      return { items: [], total: 0, totalPages: 0, page: 1, perPage: 40 };
    },
    async openMediaPicker(): Promise<MediaItem | null> {
      return null;
    },
  };

  return {
    data:  overrides?.data  ?? mockData,
    media: overrides?.media ?? mockMedia,
    ai:    new MockAiAdapter(),
  };
}

// ─── WPAiAdapter ──────────────────────────────────────────────────────────────

import type {
  AiAdapter, AiSettings, GenerateLayoutResult, PerformanceAudit,
  AuditResult, PresencePeer,
} from '@nexus/core';

export class WPAiAdapter implements AiAdapter {
  constructor(private readonly client: ApiClient) {}

  async getSettings(): Promise<AiSettings> {
    return this.client.get<AiSettings>('/ai/settings');
  }

  async saveSettings(provider: string, model: string, apiKey: string): Promise<void> {
    await this.client.post('/ai/settings', { provider, model, apiKey });
  }

  async generateLayout(prompt: string, pageId: string): Promise<GenerateLayoutResult> {
    return this.client.post<GenerateLayoutResult>('/ai/generate', { prompt, pageId });
  }

  async populateContent(
    nodeMap: Record<string, unknown>,
    context: string,
    pageId: string,
  ): Promise<Record<string, unknown>> {
    const res = await this.client.post<{ nodeMap: Record<string, unknown> }>(
      '/ai/populate',
      { nodeMap, context, pageId },
    );
    return res.nodeMap;
  }

  async suggestStyles(
    currentTokens: Record<string, string>,
    changedToken: string,
  ): Promise<Record<string, string>> {
    const res = await this.client.post<{ suggestions: Record<string, string> }>(
      '/ai/style-suggest',
      { currentTokens, changedToken },
    );
    return res.suggestions;
  }

  async auditPage(pageId: string): Promise<PerformanceAudit> {
    return this.client.post<PerformanceAudit>(`/ai/audit/${pageId}`);
  }

  async getAudit(pageId: string): Promise<AuditResult> {
    return this.client.get<AuditResult>(`/ai/audit/${pageId}`);
  }

  async heartbeat(pageId: string, color: string): Promise<PresencePeer[]> {
    const res = await this.client.post<{ peers: PresencePeer[] }>(
      `/presence/${pageId}/heartbeat`,
      { color },
    );
    return res.peers;
  }

  async getPresence(pageId: string): Promise<PresencePeer[]> {
    const res = await this.client.get<{ peers: PresencePeer[] }>(`/presence/${pageId}`);
    return res.peers;
  }
}

// ─── Mock AI Adapter (for dev / no-WP mode) ──────────────────────────────────

export class MockAiAdapter implements AiAdapter {
  async getSettings(): Promise<AiSettings> {
    return {
      provider:  'openai',
      model:     'gpt-4o-mini',
      hasApiKey: true,  // true in mock mode so all AI sub-tabs are testable
      models:    [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini (fast, low cost)',  provider: 'openai' },
        { id: 'gpt-4o',      name: 'GPT-4o (best quality)',          provider: 'openai' },
      ],
    };
  }

  async saveSettings(): Promise<void> {}

  async generateLayout(prompt: string): Promise<GenerateLayoutResult> {
    // Demo mock response
    const heroId   = `hero-${Date.now()}`;
    const headId   = `head-${Date.now()}`;
    const paraId   = `para-${Date.now()}`;
    const btnId    = `btn-${Date.now()}`;
    const rootId   = `root-${Date.now()}`;
    return {
      rootNodeId: rootId,
      nodeMap: {
        [rootId]: {
          id: rootId, type: 'container', parentId: null,
          children: [heroId],
          props: { direction: 'column', padding: '0', background: '' },
          styles: {}, visibility: {}, interactions: {}, locked: false, hidden: false, _v: 1, _ops: [],
        },
        [heroId]: {
          id: heroId, type: 'container', parentId: rootId,
          children: [headId, paraId, btnId],
          props: { direction: 'column', padding: '80px 40px', align: 'center', background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', minHeight: '60vh' },
          styles: {}, visibility: {}, interactions: {}, locked: false, hidden: false, _v: 1, _ops: [],
        },
        [headId]: {
          id: headId, type: 'heading', parentId: heroId, children: [],
          props: { text: `Generated: ${prompt.slice(0, 50)}`, level: 'h1', align: 'center' },
          styles: { base: { color: '#fff', fontSize: '3rem', fontWeight: '800' } },
          visibility: {}, interactions: {}, locked: false, hidden: false, _v: 1, _ops: [],
        },
        [paraId]: {
          id: paraId, type: 'paragraph', parentId: heroId, children: [],
          props: { html: 'AI-generated layout — connect an API key for full generation.' },
          styles: { base: { color: 'rgba(255,255,255,0.7)', maxWidth: '540px', margin: '0 auto', textAlign: 'center' } },
          visibility: {}, interactions: {}, locked: false, hidden: false, _v: 1, _ops: [],
        },
        [btnId]: {
          id: btnId, type: 'button', parentId: heroId, children: [],
          props: { text: 'Get Started', variant: 'solid', size: 'lg', url: '#' },
          styles: { base: { marginTop: '24px' } },
          visibility: {}, interactions: {}, locked: false, hidden: false, _v: 1, _ops: [],
        },
      },
    };
  }

  async populateContent(nodeMap: Record<string, unknown>): Promise<Record<string, unknown>> {
    return nodeMap;
  }

  async suggestStyles(tokens: Record<string, string>): Promise<Record<string, string>> {
    return tokens;
  }

  async auditPage(): Promise<PerformanceAudit> {
    return {
      auditId:  'mock-audit-1',
      score:    78,
      findings: [
        { id: 'f1', severity: 'medium', category: 'performance',   title: 'Images without lazy loading',   description: 'Some images load eagerly above the fold.',              recommendation: 'Add loading="lazy" to below-fold images.',           impact: 'Medium' },
        { id: 'f2', severity: 'low',    category: 'seo',           title: 'Missing meta description',     description: 'No meta description found on this page.',              recommendation: 'Add a 140–160 character meta description.',          impact: 'Low'    },
        { id: 'f3', severity: 'high',   category: 'accessibility', title: 'Images missing alt text',      description: '2 images have no alt attribute.',                      recommendation: 'Add descriptive alt text to all images.',            impact: 'High'   },
        { id: 'f4', severity: 'low',    category: 'best-practices','title': 'No H1 tag found',            description: 'Every page should have exactly one H1 heading.',       recommendation: 'Add a primary H1 heading to establish page hierarchy.', impact: 'Low' },
      ],
      htmlSize: 24500,
      cssSize:  3200,
    };
  }

  async getAudit(): Promise<AuditResult> {
    return { latest: null, history: [] };
  }

  async heartbeat(): Promise<PresencePeer[]> { return []; }
  async getPresence(): Promise<PresencePeer[]> { return []; }
}
