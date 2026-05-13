/**
 * Addon Registry Store (Phase 8.4)
 * Tracks installed/available addons and handles dynamic loading.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AddonManifest } from '../types/addon.js';
import { BUILT_IN_ADDONS } from '../types/addon.js';

interface AddonState {
  catalogue: AddonManifest[];
  isLoadingCatalogue: boolean;
  installingId: string | null;
  error: string | null;
}
interface AddonActions {
  setCatalogue: (addons: AddonManifest[]) => void;
  installAddon: (id: string) => Promise<void>;
  uninstallAddon: (id: string) => void;
  toggleAddon: (id: string, active: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
export type AddonStore = AddonState & AddonActions;

export const useAddonStore = create<AddonStore>()(
  devtools(
    persist(
      (set, get) => ({
        catalogue: BUILT_IN_ADDONS,
        isLoadingCatalogue: false,
        installingId: null,
        error: null,

        setCatalogue: (addons) =>
          set({ catalogue: addons }, false, 'addons/setCatalogue'),

        installAddon: async (id) => {
          set({ installingId: id, error: null }, false, 'addons/installing');
          // Simulate async install (real impl: fetch+eval addon bundle)
          await new Promise((r) => setTimeout(r, 1200));
          set((s) => ({
            installingId: null,
            catalogue: s.catalogue.map((a) =>
              a.id === id ? { ...a, status: 'installed', isInstalled: true, isActive: true } : a,
            ),
          }), false, 'addons/installed');
        },

        uninstallAddon: (id) =>
          set((s) => ({
            catalogue: s.catalogue.map((a) =>
              a.id === id ? { ...a, status: 'available', isInstalled: false, isActive: false } : a,
            ),
          }), false, 'addons/uninstalled'),

        toggleAddon: (id, active) =>
          set((s) => ({
            catalogue: s.catalogue.map((a) =>
              a.id === id ? { ...a, isActive: active } : a,
            ),
          }), false, 'addons/toggle'),

        setLoading: (loading) =>
          set({ isLoadingCatalogue: loading }, false, 'addons/loading'),

        setError: (error) =>
          set({ error }, false, 'addons/error'),
      }),
      {
        name: 'nexus-addons',
        partialize: (s) => ({ catalogue: s.catalogue }),
      },
    ),
    { name: 'NexusAddonStore' },
  ),
);

export const selectInstalledAddons = (s: AddonStore) =>
  s.catalogue.filter((a) => a.isInstalled);
export const selectActiveAddons = (s: AddonStore) =>
  s.catalogue.filter((a) => a.isActive);
