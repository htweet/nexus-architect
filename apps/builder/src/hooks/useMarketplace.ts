/**
 * useMarketplace.ts — Phase M4: Remote Catalogue Fetch
 *
 * Fetches the addon catalogue from a configurable endpoint.
 * Falls back gracefully to BUILT_IN_ADDONS when the network is unavailable.
 * Merges remote metadata with local installed-state from useAddonStore.
 *
 * Endpoint priority:
 *   1. VITE_MARKETPLACE_ENDPOINT env variable
 *   2. /wp-json/nexus/v1/addons (WP phase default)
 *   3. Mock response using BUILT_IN_ADDONS (dev / offline fallback)
 */

import { useEffect, useCallback } from 'react';
import { useAddonStore } from '@nexus/core';

// ── Endpoint resolution ───────────────────────────────────────────────────────

const MARKETPLACE_ENDPOINT: string =
  (import.meta.env.VITE_MARKETPLACE_ENDPOINT as string | undefined) ??
  '/wp-json/nexus/v1/addons';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseMarketplaceReturn {
  addons:             ReturnType<typeof useAddonStore.getState>['catalogue'];
  isLoading:          boolean;
  error:              string | null;
  catalogueError:     string | null;
  installingId:       string | null;
  licenseKey:         string;
  install:            (id: string) => Promise<void>;
  uninstall:          (id: string) => void;
  toggle:             (id: string, active: boolean) => void;
  setLicenseKey:      (key: string) => void;
  retry:              () => void;
}

export function useMarketplace(): UseMarketplaceReturn {
  const catalogue        = useAddonStore((s) => s.catalogue);
  const isLoading        = useAddonStore((s) => s.isLoadingCatalogue);
  const error            = useAddonStore((s) => s.error);
  const catalogueError   = useAddonStore((s) => s.catalogueError);
  const installingId     = useAddonStore((s) => s.installingId);
  const licenseKey       = useAddonStore((s) => s.licenseKey);
  const fetchCatalogue   = useAddonStore((s) => s.fetchCatalogue);
  const retryCatalogue   = useAddonStore((s) => s.retryCatalogue);
  const installAddon     = useAddonStore((s) => s.installAddon);
  const uninstallAddon   = useAddonStore((s) => s.uninstallAddon);
  const toggleAddon      = useAddonStore((s) => s.toggleAddon);
  const setLicenseKeyFn  = useAddonStore((s) => s.setLicenseKey);

  // Fetch catalogue on first mount
  useEffect(() => {
    // Only fetch if we haven't fetched yet (catalogueError = null AND isLoading = false)
    // This avoids re-fetching on every panel open
    if (!isLoading && !catalogueError) {
      void fetchCatalogue(MARKETPLACE_ENDPOINT);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = useCallback(() => {
    void retryCatalogue(MARKETPLACE_ENDPOINT);
  }, [retryCatalogue]);

  return {
    addons:        catalogue,
    isLoading,
    error,
    catalogueError,
    installingId,
    licenseKey,
    install:       installAddon,
    uninstall:     uninstallAddon,
    toggle:        toggleAddon,
    setLicenseKey: setLicenseKeyFn,
    retry,
  };
}
