/**
 * Addon Registry Store — Phase M2 (production runtime)
 *
 * installAddon() now calls the real addon-loader instead of a fake setTimeout.
 * The loader is injected as a dependency (addonLoaderRef) to keep this package
 * free of builder-app imports (decoupled architecture).
 *
 * licenseKey — stored here so every part of the builder can gate premium addons.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AddonManifest } from '../types/addon.js';
import { BUILT_IN_ADDONS }   from '../types/addon.js';

// ─── Loader interface (injected from apps/builder to avoid circular dep) ──────

export interface AddonLoaderRef {
  loadAddon:   (manifest: AddonManifest) => Promise<string[]>;
  unloadAddon: (manifest: AddonManifest) => void;
}

// The builder wires this at startup via setAddonLoader()
let _loader: AddonLoaderRef | null = null;

export function setAddonLoader(loader: AddonLoaderRef): void {
  _loader = loader;
}

// ─── State / Actions ──────────────────────────────────────────────────────────

interface AddonState {
  catalogue:          AddonManifest[];
  isLoadingCatalogue: boolean;
  installingId:       string | null;
  error:              string | null;
  catalogueError:     string | null;
  /** Stored license key (validated server-side on each install attempt). */
  licenseKey:         string;
}

interface AddonActions {
  // Catalogue
  fetchCatalogue:  (endpoint: string) => Promise<void>;
  setCatalogue:    (addons: AddonManifest[]) => void;
  retryCatalogue:  (endpoint: string) => Promise<void>;
  // Lifecycle
  installAddon:    (id: string) => Promise<void>;
  uninstallAddon:  (id: string) => void;
  toggleAddon:     (id: string, active: boolean) => void;
  // License
  setLicenseKey:   (key: string) => void;
  // Misc
  setLoading:      (loading: boolean) => void;
  setError:        (error: string | null) => void;
}

export type AddonStore = AddonState & AddonActions;

export const useAddonStore = create<AddonStore>()(
  devtools(
    persist(
      (set, get) => ({
        catalogue:          BUILT_IN_ADDONS,
        isLoadingCatalogue: false,
        installingId:       null,
        error:              null,
        catalogueError:     null,
        licenseKey:         '',

        // ── Catalogue fetch ─────────────────────────────────────────────────
        fetchCatalogue: async (endpoint) => {
          set({ isLoadingCatalogue: true, catalogueError: null }, false, 'addons/fetching');
          try {
            const res  = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = (await res.json()) as { addons?: AddonManifest[] };
            const remote: AddonManifest[] = data.addons ?? (data as AddonManifest[]);

            // Merge remote catalogue with local installed state
            const local    = get().catalogue;
            const localMap = new Map(local.map((a) => [a.id, a]));
            const merged   = remote.map((r) => {
              const existing = localMap.get(r.id);
              // Preserve installation state; use remote metadata
              return existing
                ? { ...r, isInstalled: existing.isInstalled, isActive: existing.isActive, status: existing.status }
                : r;
            });
            set({ catalogue: merged, isLoadingCatalogue: false }, false, 'addons/catalogueFetched');
          } catch (err) {
            set(
              { isLoadingCatalogue: false, catalogueError: String(err) },
              false,
              'addons/catalogueError',
            );
          }
        },

        retryCatalogue: async (endpoint) => {
          set({ catalogueError: null }, false, 'addons/retry');
          await get().fetchCatalogue(endpoint);
        },

        setCatalogue: (addons) =>
          set({ catalogue: addons }, false, 'addons/setCatalogue'),

        // ── Install ─────────────────────────────────────────────────────────
        installAddon: async (id) => {
          const manifest = get().catalogue.find((a) => a.id === id);
          if (!manifest) return;

          // License gate for paid addons
          if ((manifest.licenseRequired || manifest.price > 0) && !get().licenseKey) {
            set({ error: `License required to install "${manifest.name}".` }, false, 'addons/licenseRequired');
            return;
          }

          set({ installingId: id, error: null }, false, 'addons/installing');

          try {
            if (_loader) {
              await _loader.loadAddon(manifest);
            } else {
              // Fallback: no loader wired yet (dev / SSR scenario) — just flip state
              await new Promise((r) => setTimeout(r, 600));
            }

            set(
              (s) => ({
                installingId: null,
                catalogue: s.catalogue.map((a) =>
                  a.id === id
                    ? { ...a, status: 'installed', isInstalled: true, isActive: true }
                    : a,
                ),
              }),
              false,
              'addons/installed',
            );
          } catch (err) {
            set(
              (s) => ({
                installingId: null,
                error: String(err),
                catalogue: s.catalogue.map((a) =>
                  a.id === id ? { ...a, status: 'error' } : a,
                ),
              }),
              false,
              'addons/installError',
            );
          }
        },

        // ── Uninstall ────────────────────────────────────────────────────────
        uninstallAddon: (id) => {
          const manifest = get().catalogue.find((a) => a.id === id);
          if (manifest && _loader) {
            try { _loader.unloadAddon(manifest); } catch { /* swallow */ }
          }
          set(
            (s) => ({
              catalogue: s.catalogue.map((a) =>
                a.id === id
                  ? { ...a, status: 'available', isInstalled: false, isActive: false }
                  : a,
              ),
            }),
            false,
            'addons/uninstalled',
          );
        },

        // ── Toggle active ────────────────────────────────────────────────────
        toggleAddon: (id, active) => {
          const manifest = get().catalogue.find((a) => a.id === id);
          if (manifest && _loader) {
            if (active) {
              // Re-activate: reload bundle
              _loader.loadAddon(manifest).catch(() => {});
            } else {
              // Deactivate: run cleanup + unregister widgets
              _loader.unloadAddon(manifest);
            }
          }
          set(
            (s) => ({
              catalogue: s.catalogue.map((a) =>
                a.id === id ? { ...a, isActive: active } : a,
              ),
            }),
            false,
            'addons/toggle',
          );
        },

        // ── License ──────────────────────────────────────────────────────────
        setLicenseKey: (key) =>
          set({ licenseKey: key, error: null }, false, 'addons/licenseKey'),

        // ── Misc ─────────────────────────────────────────────────────────────
        setLoading: (loading) =>
          set({ isLoadingCatalogue: loading }, false, 'addons/loading'),

        setError: (error) =>
          set({ error }, false, 'addons/error'),
      }),
      {
        name: 'nexus-addons',
        partialize: (s) => ({
          catalogue:  s.catalogue,
          licenseKey: s.licenseKey,
        }),
      },
    ),
    { name: 'NexusAddonStore' },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectInstalledAddons = (s: AddonStore) =>
  s.catalogue.filter((a) => a.isInstalled);
export const selectActiveAddons = (s: AddonStore) =>
  s.catalogue.filter((a) => a.isActive);
export const selectLicenseKey = (s: AddonStore) => s.licenseKey;
