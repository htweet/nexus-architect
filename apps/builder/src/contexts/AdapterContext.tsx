/**
 * AdapterContext — React context that provides the DataAdapter and MediaAdapter
 * to the entire builder tree.
 *
 * Rules (enforced by types):
 *   - No component imports WPAdapter directly.
 *   - Components read adapters via useAdapter() hook only.
 *   - The actual adapter instance is created ONE TIME at the App root.
 *
 * This is the seam that makes the builder platform-agnostic:
 *   WordPress  → pass createWPAdapterContext() result here
 *   SaaS       → pass createSupabaseAdapterContext() result here
 *   Tests      → pass createMockAdapterContext() result here
 */

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import type { AdapterContext } from '@nexus/core';

// ─── Context ─────────────────────────────────────────────────────────────────

const AdapterCtx = createContext<AdapterContext | null>(null);
AdapterCtx.displayName = 'NexusAdapterContext';

// ─── Provider ────────────────────────────────────────────────────────────────

interface AdapterProviderProps {
  adapter: AdapterContext;
  children: ReactNode;
}

export function AdapterProvider({ adapter, children }: AdapterProviderProps) {
  return (
    <AdapterCtx.Provider value={adapter}>
      {children}
    </AdapterCtx.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * useAdapter — returns the full AdapterContext.
 * Throws if used outside of <AdapterProvider>.
 */
export function useAdapter(): AdapterContext {
  const ctx = useContext(AdapterCtx);
  if (!ctx) {
    throw new Error(
      '[NexusArchitect] useAdapter() must be called inside <AdapterProvider>. ' +
      'Make sure AdapterProvider wraps your component tree at the App root.',
    );
  }
  return ctx;
}

/** Convenience accessor for just the DataAdapter. */
export function useDataAdapter() {
  return useAdapter().data;
}

/** Convenience accessor for just the MediaAdapter. */
export function useMediaAdapter() {
  return useAdapter().media;
}
