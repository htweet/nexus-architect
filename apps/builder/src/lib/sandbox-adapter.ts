/**
 * SandboxAdapter -- fully localStorage-backed adapter for development.
 *
 * Spin up with: VITE_SANDBOX_MODE=true npm run dev
 * All data persists under the 'nexus_sandbox_' localStorage prefix.
 */

import type {
  NexusDataAdapter,
  PaginatedResult,
  AdapterUser,
  MediaItem,
  PublishResult,
} from '@nexus/core';
import type { NexusPage, NexusTemplate, PageRevision } from '@nexus/core';
import { createPage, CURRENT_SCHEMA_VERSION } from '@nexus/core';
import { migratePageData } from '@nexus/core';
import { seedDemoPage } from './seed-demo-page.js';

const LS_PREFIX = 'nexus_sandbox_';

// ── Storage helpers ───────────────────────────────────────────────────────────

function lsGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function lsSet(key: string, value: unknown): void {
  localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
}

function lsDel(key: string): void {
  localStorage.removeItem(LS_PREFIX + key);
}

// Internal upsert — not part of the public interface
function _savePage(page: NexusPage): void {
  const pages = lsGet<NexusPage[]>('pages') ?? [];
  const updated = { ...page, updatedAt: new Date().toISOString() };
  const idx = pages.findIndex((p) => p.id === page.id);
  if (idx >= 0) pages[idx] = updated;
  else pages.unshift(updated);
  lsSet('pages', pages);
  lsSet(`page_${page.id}`, updated);
}

// ── Seed on first launch ──────────────────────────────────────────────────────

function ensureDemoPage(): void {
  const existing = lsGet<NexusPage[]>('pages');
  if (existing && existing.length > 0) return;
  const demo = seedDemoPage();
  lsSet('pages', [demo]);
  lsSet(`page_${demo.id}`, demo);
  console.info('[NexusSandbox] Demo page seeded:', demo.title);
}

// ── Sandbox User ──────────────────────────────────────────────────────────────

const SANDBOX_USER: AdapterUser = {
  id:        'sandbox-user-001',
  name:      'Sandbox Developer',
  email:     'dev@nexus-architect.local',
  tier:      'agency',
  siteCount: 1,
};

// ── SandboxAdapter ────────────────────────────────────────────────────────────

export const SandboxAdapter: NexusDataAdapter = {

  // Auth
  async getCurrentUser(): Promise<AdapterUser> {
    return SANDBOX_USER;
  },

  // Health
  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    const t = Date.now();
    return { ok: true, latencyMs: Date.now() - t };
  },

  // Page CRUD
  async getPage(id: string): Promise<NexusPage> {
    ensureDemoPage();
    const raw = lsGet<NexusPage>(`page_${id}`);
    if (!raw) {
      const pages = lsGet<NexusPage[]>('pages') ?? [];
      const first = pages[0];
      if (!first) throw new Error(`[SandboxAdapter] No pages found`);
      return first;
    }
    const { page } = migratePageData(raw);
    return page;
  },

  async listPages(): Promise<PaginatedResult<NexusPage>> {
    ensureDemoPage();
    const pages = lsGet<NexusPage[]>('pages') ?? [];
    return { items: pages, total: pages.length, totalPages: 1, page: 1, perPage: 50 };
  },

  async createPage(data: Pick<NexusPage, 'title' | 'slug'>): Promise<NexusPage> {
    const page = createPage(data);
    _savePage(page);
    return page;
  },

  async updatePage(id: string, data: Partial<NexusPage>): Promise<NexusPage> {
    const existing = lsGet<NexusPage>(`page_${id}`);
    if (!existing) throw new Error(`[SandboxAdapter] Page not found: ${id}`);
    const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    _savePage(updated);
    return updated;
  },

  async deletePage(id: string): Promise<void> {
    lsDel(`page_${id}`);
    lsSet('pages', (lsGet<NexusPage[]>('pages') ?? []).filter((p) => p.id !== id));
  },

  // Publishing
  async publishPage(id: string): Promise<PublishResult> {
    const page = lsGet<NexusPage>(`page_${id}`);
    await new Promise((r) => setTimeout(r, 400));
    const result: PublishResult = {
      id,
      published:   true,
      publishedAt: new Date().toISOString(),
      pageUrl:     `http://localhost:3000/preview/${page?.slug ?? id}`,
      staticHtml:  `<!-- Sandbox publish: ${page?.title ?? id} -->`,
    };
    lsSet(`published_${id}`, result);
    return result;
  },

  // Revisions
  async getRevisions(pageId: string): Promise<PageRevision[]> {
    return lsGet<PageRevision[]>(`revisions_${pageId}`) ?? [];
  },

  async restoreRevision(pageId: string, revisionId: string): Promise<NexusPage> {
    const revs = lsGet<PageRevision[]>(`revisions_${pageId}`) ?? [];
    const rev  = revs.find((r) => r.id === revisionId);
    if (!rev) throw new Error(`[SandboxAdapter] Revision not found: ${revisionId}`);
    _savePage(rev.snapshot);
    return rev.snapshot;
  },

  // Media (via DataAdapter.getMediaLibrary)
  async getMediaLibrary(): Promise<PaginatedResult<MediaItem>> {
    return { items: [], total: 0, totalPages: 0, page: 1, perPage: 20 };
  },

  // Templates (TemplateAdapter mixin)
  async listTemplates(): Promise<NexusTemplate[]> {
    return lsGet<NexusTemplate[]>('templates') ?? [];
  },

  async saveTemplate(template: NexusTemplate): Promise<NexusTemplate> {
    const templates = lsGet<NexusTemplate[]>('templates') ?? [];
    const idx = templates.findIndex((t) => t.id === template.id);
    if (idx >= 0) templates[idx] = template;
    else templates.unshift(template);
    lsSet('templates', templates);
    return template;
  },

  async deleteTemplate(id: string): Promise<void> {
    lsSet('templates', (lsGet<NexusTemplate[]>('templates') ?? []).filter((t) => t.id !== id));
  },
};
