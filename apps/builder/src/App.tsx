/**
 * App root — wires the DataAdapter and boots the user session.
 *
 * Adapter selection priority:
 *   1. VITE_SANDBOX_MODE=true  → SandboxAdapter (no WP required, full localStorage)
 *   2. window.__NEXUS_CONFIG__ → WordPress mode (WPAdapter)
 *   3. Otherwise               → MockAdapter (dev server / E2E tests)
 *
 * Phase 10 additions:
 *   - SandboxAdapter: zero-install dev mode seeded with a rich demo page
 *   - ObservabilityService: initialized before React renders; PostHog + Sentry
 *     when VITE_POSTHOG_KEY / VITE_SENTRY_DSN are set, NullAdapter otherwise
 *   - migratePageData(): every page loaded from storage is run through the
 *     migration runner to ensure schema version compatibility
 */

import { useEffect, useState, lazy, Suspense } from 'react';
import { Builder }         from '@/components/Builder';
import { AdapterProvider } from '@/contexts/AdapterContext';
import { useUserStore, useCanvasStore, ObservabilityService, NullAdapter, migratePageData } from '@nexus/core';
import type { AdapterContext } from '@nexus/core';

// Lazy-load the preview page — only needed in the new preview tab
const PreviewPage = lazy(() => import('@/pages/PreviewPage'));

// ── localStorage key for last active page ──────────────────────────────────
const MOCK_LAST_PAGE_KEY = 'nexus_last_page_id';

// ─── Observability bootstrap ───────────────────────────────────────────────
//
// Called once before any React rendering.  When VITE_POSTHOG_KEY or
// VITE_SENTRY_DSN are set, the real adapters are lazy-loaded and spliced in.
// Until then (and in development) the NullAdapter is a safe no-op.

ObservabilityService.init(NullAdapter);

(async () => {
  const sentryDsn    = import.meta.env.VITE_SENTRY_DSN   as string | undefined;
  const posthogKey   = import.meta.env.VITE_POSTHOG_KEY  as string | undefined;
  const posthogHost  = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

  let errors    = NullAdapter.errors;
  let analytics = NullAdapter.analytics;

  if (sentryDsn) {
    try {
      const { createSentryAdapter } = await import('@nexus/core');
      const sentryRelease = import.meta.env.VITE_SENTRY_RELEASE as string | undefined;
      const s = await createSentryAdapter({
        dsn:         sentryDsn,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT as string ?? 'production',
        ...(sentryRelease ? { release: sentryRelease } : {}),
      });
      errors = s.errors;
    } catch (e) {
      console.warn('[NexusObs] Sentry init failed:', e);
    }
  }

  if (posthogKey) {
    try {
      const { createPostHogAdapter } = await import('@nexus/core');
      const p = await createPostHogAdapter({
        apiKey:   posthogKey,
        ...(posthogHost ? { host: posthogHost } : {}),
        disabled: import.meta.env.DEV && !posthogKey,
      });
      analytics = p.analytics;
    } catch (e) {
      console.warn('[NexusObs] PostHog init failed:', e);
    }
  }

  ObservabilityService.init({ errors, analytics });
})();

// ─── Route detection ───────────────────────────────────────────────────────

function isPreviewRoute(): boolean {
  return new URLSearchParams(window.location.search).has('nx-preview');
}

// ─── Adapter bootstrap ─────────────────────────────────────────────────────

async function resolveAdapter(): Promise<AdapterContext> {
  // 1. Sandbox mode (VITE_SANDBOX_MODE=true)
  if (import.meta.env.VITE_SANDBOX_MODE === 'true') {
    const { SandboxAdapter } = await import('@/lib/sandbox-adapter');
    ObservabilityService.trackSandboxLoaded();
    return {
      data: SandboxAdapter,
      media: {
        search:          async () => ({ items: [], total: 0, totalPages: 0, page: 1, perPage: 20 }),
        openMediaPicker: async () => null,
      },
    } as AdapterContext;
  }

  // 2. WordPress mode
  if (typeof window.__NEXUS_CONFIG__ !== 'undefined') {
    const { createWPAdapterContext } = await import('@nexus/wp-adapter');
    return createWPAdapterContext();
  }

  // 3. Dev / E2E mock
  const { createMockAdapterContext } = await import('@nexus/wp-adapter');
  return createMockAdapterContext();
}

// ─── User + Page Initializer ───────────────────────────────────────────────

function UserInitializer({ adapter }: { adapter: AdapterContext }) {
  const setUser    = useUserStore((s) => s.setUser);
  const setLoading = useUserStore((s) => s.setLoading);
  const loadPage   = useCanvasStore((s) => s.loadPage);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const userPromise = adapter.data
      .getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setUser(user);
          // Identify user in observability
          ObservabilityService.setUser({ id: user.id, email: user.email, tier: user.tier });
        }
      })
      .catch((err) => {
        console.error('[NexusArchitect] Failed to load current user:', err);
        ObservabilityService.captureException(err instanceof Error ? err : new Error(String(err)));
        if (!cancelled) {
          setUser({ id: 'fallback-guest', name: 'Guest', email: '', tier: 'free', siteCount: 0 });
        }
      });

    const restorePromise = (async () => {
      try {
        const lastId = localStorage.getItem(MOCK_LAST_PAGE_KEY);
        if (!lastId) return;
        const raw  = await adapter.data.getPage(lastId);
        // Phase 10.3: run migrations before loading into the store
        const { page, migrated, appliedMigrations } = migratePageData(raw);
        if (migrated) {
          console.info('[NexusMigration] Page migrated on load:', appliedMigrations);
          // Re-save migrated page so it's up-to-date in storage
          adapter.data.updatePage(page.id, page).catch(() => {});
        }
        if (!cancelled) loadPage(page);
      } catch {
        // Silently ignore — page may have been deleted or first boot
      }
    })();

    Promise.all([userPromise, restorePromise]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [adapter, setUser, setLoading, loadPage]);

  return null;
}

// ─── App ───────────────────────────────────────────────────────────────────

export default function App() {
  if (isPreviewRoute()) {
    return (
      <Suspense fallback={null}>
        <PreviewPage />
      </Suspense>
    );
  }
  return <BuilderApp />;
}

function BuilderApp() {
  const [adapter,   setAdapter]   = useState<AdapterContext | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    resolveAdapter()
      .then(setAdapter)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Unknown boot error';
        console.error('[NexusArchitect] Adapter boot failed:', err);
        ObservabilityService.captureException(
          err instanceof Error ? err : new Error(msg),
          { extra: { location: 'adapter_boot' } },
        );
        setBootError(msg);
      });
  }, []);

  if (bootError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-space">
        <div className="max-w-sm rounded-xl border border-red-500/30 bg-red-900/20 p-6 text-center">
          <p className="text-sm font-semibold text-red-400 mb-2">Builder failed to initialise</p>
          <p className="text-xs text-text-muted font-mono break-all">{bootError}</p>
        </div>
      </div>
    );
  }

  if (!adapter) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-space"
        aria-label="Loading Nexus Architect"
        data-testid="builder-boot-loading"
      >
        <div className="flex flex-col items-center gap-4">
          <svg width="48" height="48" viewBox="0 0 26 26" fill="none"
            xmlns="http://www.w3.org/2000/svg" className="animate-pulse" aria-hidden>
            <defs>
              <linearGradient id="boot-logo-grad" x1="0" y1="0" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
            <rect width="26" height="26" rx="6" fill="url(#boot-logo-grad)" />
            <path d="M7 19V7H9.6L16.4 15.4V7H19V19H16.4L9.6 10.6V19H7Z" fill="white" />
          </svg>
          <p className="text-sm text-text-muted">Initialising builder...</p>
        </div>
      </div>
    );
  }

  return (
    <AdapterProvider adapter={adapter}>
      <UserInitializer adapter={adapter} />
      <Builder />
    </AdapterProvider>
  );
}
