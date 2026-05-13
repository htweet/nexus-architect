# Nexus Architect — Adapter Interface Reference

> **Version:** 1.0 (Phase 10)  
> **Package:** `@nexus/core`  
> **Type:** `NexusDataAdapter`

---

## The Prime Directive

The React builder engine **never calls WordPress APIs directly**.
All data operations flow through the `NexusDataAdapter` interface.
Swapping backends (WP → Supabase) requires implementing this interface;
the builder's React tree requires zero changes.

---

## Interface Definition

```ts
// packages/core/src/types/adapter.ts
export type NexusDataAdapter = DataAdapterWithTemplates;

// Expands to:
export interface DataAdapter {
  // Page CRUD
  getPage(id: string): Promise<NexusPage>;
  createPage(data: Pick<NexusPage, 'title' | 'slug'>): Promise<NexusPage>;
  updatePage(id: string, data: Partial<NexusPage>): Promise<NexusPage>;
  deletePage(id: string): Promise<void>;
  listPages(params?: PaginationParams): Promise<PaginatedResult<NexusPage>>;

  // Publishing
  publishPage(id: string): Promise<PublishResult>;

  // Revision History
  getRevisions(pageId: string): Promise<PageRevision[]>;
  saveRevision(pageId: string): Promise<PageRevision>;
  restoreRevision(pageId: string, revisionId: string): Promise<NexusPage>;

  // Media
  uploadMedia(file: File): Promise<MediaItem>;
  listMedia(params?: PaginationParams): Promise<PaginatedResult<MediaItem>>;

  // User
  getCurrentUser(): Promise<AdapterUser>;
}

// Optional template support mixin
export interface TemplateAdapter {
  listTemplates(params?: PaginationParams): Promise<PaginatedResult<NexusTemplate>>;
  saveTemplate(data: Omit<NexusTemplate, 'id' | 'createdAt'>): Promise<NexusTemplate>;
  applyTemplate(templateId: string, pageId: string): Promise<NexusPage>;
  deleteTemplate(id: string): Promise<void>;
}
```

---

## Available Adapters

### WPAdapter (Production)

Backed by the WordPress REST API. Used when the builder runs inside the
WordPress plugin.

```ts
// Automatically configured in App.tsx when window.__NEXUS_CONFIG__ is present
import { WPAdapter } from '@/lib/wp-adapter';
```

Endpoints used:

| Operation      | Endpoint                              |
|----------------|---------------------------------------|
| Page CRUD      | `GET/POST/PUT/DELETE /nexus/v1/pages` |
| Publish        | `POST /nexus/v1/pages/:id/publish`    |
| Revisions      | `GET /nexus/v1/pages/:id/revisions`   |
| Media upload   | `POST /wp/v2/media`                   |
| Current user   | `GET /wp/v2/users/me`                 |

### SandboxAdapter (Development)

Fully localStorage-backed. No WordPress installation required.
Activated with `VITE_SANDBOX_MODE=true`.

```ts
// .env.development.local
VITE_SANDBOX_MODE=true
```

Features:
- Persists all pages under `nexus_sandbox_pages_*` keys
- Auto-seeds a rich demo page on first launch
- Media upload returns deterministic picsum.photos placeholder URLs
- Publish simulates 400ms network round-trip

### MockAdapter (Fallback)

In-memory adapter used when neither WP config nor sandbox mode is active.
Data is lost on page reload; intended for integration testing only.

---

## Implementing a Custom Adapter

```ts
import type { NexusDataAdapter } from '@nexus/core';

export const MyAdapter: NexusDataAdapter = {
  async getPage(id) {
    const res = await fetch(`https://my-api.com/pages/${id}`);
    return res.json();
  },

  async createPage(data) {
    const res = await fetch('https://my-api.com/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // ... implement all required methods

  async getCurrentUser() {
    return { id: '1', name: 'Dev User', email: 'dev@example.com', tier: 'professional', siteCount: 1 };
  },
};
```

### Registering the Adapter

Pass your adapter to `AdapterContext.Provider` in your application root:

```tsx
import { AdapterContext } from '@/contexts/AdapterContext';
import { MyAdapter } from './my-adapter';

<AdapterContext.Provider value={{ data: MyAdapter, ai: NullAiAdapter }}>
  <Builder />
</AdapterContext.Provider>
```

---

## Error Handling

All adapter methods should reject with a plain `Error` object.
The builder surfaces error messages to the user via the save-error toast.
For typed errors (e.g. 404, 403), extend `Error` with a `status` property:

```ts
export class NexusApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'NexusApiError';
  }
}
```

---

## Schema Versioning

All pages returned by the adapter are automatically passed through the
`MigrationRunner` on load. This ensures forward-compatible data regardless
of which schema version the adapter persists.

```ts
import { migratePageData } from '@nexus/core';

const raw   = await adapter.data.getPage(id);
const result = migratePageData(raw);
if (result.migrated) {
  await adapter.data.updatePage(id, result.page); // persist migrated data
}
return result.page;
```

---

*Last updated: Phase 10 — Developer Experience*
