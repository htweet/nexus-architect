/**
 * Cloud Sync Store (Phase 8.6)
 * Agency tier: sync global components across multiple client sites.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error' | 'conflict';

export interface SyncedSite {
  id: string;
  name: string;
  url: string;
  lastSync: string | null;
  status: SyncStatus;
  componentCount: number;
  pageCount: number;
}

export interface SyncComponent {
  id: string;
  name: string;
  type: 'header' | 'footer' | 'section' | 'design-tokens';
  lastModified: string;
  /** Site IDs where this component is up-to-date. */
  syncedSites: string[];
  /** Site IDs awaiting the next push. */
  pendingSites: string[];
  hasConflict: boolean;
}

interface CloudSyncState {
  isConnected: boolean;
  cloudAccountEmail: string | null;
  sites: SyncedSite[];
  components: SyncComponent[];
  isSyncing: boolean;
  lastGlobalSync: string | null;
  error: string | null;
}
interface CloudSyncActions {
  connect: (email: string) => void;
  disconnect: () => void;
  setSites: (sites: SyncedSite[]) => void;
  setComponents: (components: SyncComponent[]) => void;
  syncAll: () => Promise<void>;
  syncSite: (siteId: string) => Promise<void>;
  resolveConflict: (componentId: string, resolution: 'local' | 'remote') => void;
  setError: (error: string | null) => void;
}
export type CloudSyncStore = CloudSyncState & CloudSyncActions;

const MOCK_SITES: SyncedSite[] = [
  { id: 'site-1', name: 'Acme Corp', url: 'https://acme.com', lastSync: '2026-05-12T10:00:00Z', status: 'synced', componentCount: 4, pageCount: 12 },
  { id: 'site-2', name: 'Globex Media', url: 'https://globex.io', lastSync: '2026-05-11T15:30:00Z', status: 'pending', componentCount: 3, pageCount: 7 },
  { id: 'site-3', name: 'New Client', url: 'https://newclient.co', lastSync: null, status: 'pending', componentCount: 0, pageCount: 0 },
];
const MOCK_COMPONENTS: SyncComponent[] = [
  { id: 'comp-header', name: 'Global Header', type: 'header', lastModified: '2026-05-12T09:00:00Z', syncedSites: ['site-1'], pendingSites: ['site-2', 'site-3'], hasConflict: false },
  { id: 'comp-footer', name: 'Global Footer', type: 'footer', lastModified: '2026-05-10T14:00:00Z', syncedSites: ['site-1', 'site-2'], pendingSites: ['site-3'], hasConflict: false },
  { id: 'comp-tokens', name: 'Design Tokens', type: 'design-tokens', lastModified: '2026-05-12T11:00:00Z', syncedSites: [], pendingSites: ['site-1', 'site-2', 'site-3'], hasConflict: false },
  { id: 'comp-hero', name: 'Hero Section', type: 'section', lastModified: '2026-05-09T08:00:00Z', syncedSites: ['site-1', 'site-2'], pendingSites: [], hasConflict: true },
];

export const useCloudSyncStore = create<CloudSyncStore>()(
  devtools(
    (set, get) => ({
      isConnected: false,
      cloudAccountEmail: null,
      sites: [],
      components: [],
      isSyncing: false,
      lastGlobalSync: null,
      error: null,

      connect: (email) => set({
        isConnected: true, cloudAccountEmail: email,
        sites: MOCK_SITES, components: MOCK_COMPONENTS,
      }, false, 'cloudSync/connect'),

      disconnect: () => set({
        isConnected: false, cloudAccountEmail: null,
        sites: [], components: [],
      }, false, 'cloudSync/disconnect'),

      setSites: (sites) => set({ sites }, false, 'cloudSync/setSites'),
      setComponents: (components) => set({ components }, false, 'cloudSync/setComponents'),

      syncAll: async () => {
        set({ isSyncing: true, error: null }, false, 'cloudSync/syncAll:start');
        await new Promise((r) => setTimeout(r, 2000));
        set((s) => ({
          isSyncing: false,
          lastGlobalSync: new Date().toISOString(),
          sites: s.sites.map((site) => ({ ...site, status: 'synced' as SyncStatus, lastSync: new Date().toISOString() })),
          components: s.components.map((c) => ({ ...c, syncedSites: [...c.syncedSites, ...c.pendingSites], pendingSites: [] })),
        }), false, 'cloudSync/syncAll:done');
      },

      syncSite: async (siteId) => {
        set({ isSyncing: true }, false, 'cloudSync/syncSite:start');
        await new Promise((r) => setTimeout(r, 1000));
        set((s) => ({
          isSyncing: false,
          sites: s.sites.map((site) =>
            site.id === siteId
              ? { ...site, status: 'synced' as SyncStatus, lastSync: new Date().toISOString() }
              : site,
          ),
        }), false, 'cloudSync/syncSite:done');
      },

      resolveConflict: (componentId, resolution) =>
        set((s) => ({
          components: s.components.map((c) =>
            c.id === componentId ? { ...c, hasConflict: false } : c,
          ),
        }), false, `cloudSync/resolve:${resolution}`),

      setError: (error) => set({ error }, false, 'cloudSync/setError'),
    }),
    { name: 'NexusCloudSyncStore' },
  ),
);

export const selectPendingCount = (s: CloudSyncStore) =>
  s.components.reduce((n, c) => n + c.pendingSites.length, 0);
export const selectConflictCount = (s: CloudSyncStore) =>
  s.components.filter((c) => c.hasConflict).length;
