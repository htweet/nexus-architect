/**
 * App root — wires the DataAdapter and boots the user session.
 *
 * Adapter selection strategy:
 *   1. If window.__NEXUS_CONFIG__ exists -> WordPress mode (WPAdapter)
 *   2. Otherwise -> Mock adapter (dev server / E2E tests)
 *
 * This is the ONLY place in the app that knows about WordPress.
 * Everything below this component is 100% platform-agnostic.
 *
 * Phase 6.2: Detects ?nx-preview URL parameter → renders PreviewPage
 * (clean page view in a new tab, no builder chrome).
 *
 * Auto-restore: on dev-mode startup the mock adapter reads localStorage
 * to find the last edited page and reloads it into the canvas automatically,
 * so work survives page refreshes without a real WordPress backend.
 */

import { useEffect, useState, lazy, Suspense } from 'react';
import { Builder } from '@/components/Builder';
import { AdapterProvider } from '@/contexts/AdapterContext';
import { useUserStore, useCanvasStore } from '@nexus/core';
import type { AdapterContext } from '@nexus/core';

// Lazy-load the preview page — it's only needed in the new preview tab
const PreviewPage = lazy(() => import('@/pages/PreviewPage'));

// ── localStorage key that the mock adapter writes ─────────────────────────────
const MOCK_LAST_PAGE_KEY = 'nexus_last_page_id';

// --- Route detection ---------------------------------------------------------

function isPreviewRoute(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.has('nx-preview');
}

// --- Adapter bootstrap -------------------------------------------------------

async function resolveAdapter(): Promise<AdapterContext> {
  if (typeof window.__NEXUS_CONFIG__ !== 'undefined') {
    const { createWPAdapterContext } = await import('@nexus/wp-adapter');
    return createWPAdapterContext();
  }
  const { createMockAdapterContext } = await import('@nexus/wp-adapter');
  return createMockAdapterContext();
}

// --- User + Page Initializer -------------------------------------------------

function UserInitializer({ adapter }: { adapter: AdapterContext }) {
  const setUser    = useUserStore((s) => s.setUser);
  const setLoading = useUserStore((s) => s.setLoading);
  const loadPage   = useCanvasStore((s) => s.loadPage);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Boot user + restore last saved page in parallel
    const userPromise = adapter.data
      .getCurrentUser()
      .then((user) => { if (!cancelled) setUser(user); })
      .catch((err) => {
        console.error('[NexusArchitect] Failed to load current user:', err);
        if (!cancelled) {
          setUser({
            id:        'fallback-guest',
            name:      'Guest',
            email:     '',
            tier:      'free',
            siteCount: 0,
          });
        }
      });

    // Auto-restore: load the last active page from the adapter (mock reads
    // from localStorage; WP adapter reads from the REST API).
    const restorePromise = (async () => {
      try {
        const lastId = localStorage.getItem(MOCK_LAST_PAGE_KEY);
        if (!lastId) return;
        const page = await adapter.data.getPage(lastId);
        if (!cancelled) loadPage(page);
      } catch {
        // Silently ignore — page may have been deleted or adapter may not
        // have the page yet (e.g. first boot). Canvas will remain empty.
      }
    })();

    Promise.all([userPromise, restorePromise]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [adapter, setUser, setLoading, loadPage]);

  return null;
}

// --- App ---------------------------------------------------------------------

export default function App() {
  // ── Phase 6.2: preview route ─────────────────────────────────────────────
  if (isPreviewRoute()) {
    return (
      <Suspense fallback={null}>
        <PreviewPage />
      </Suspense>
    );
  }

  // ── Normal builder boot ───────────────────────────────────────────────────
  return <BuilderApp />;
}

function BuilderApp() {
  const [adapter,   setAdapter]   = useState<AdapterContext | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    resolveAdapter()
      .then(setAdapter)
      .catch((err: unknown) => {
        console.error('[NexusArchitect] Adapter boot failed:', err);
        setBootError(err instanceof Error ? err.message : 'Unknown boot error');
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
          <svg
            width="48" height="48" viewBox="0 0 26 26"
            fill="none" xmlns="http://www.w3.org/2000/svg"
            className="animate-pulse" aria-hidden={true}
          >
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
