/**
 * Dynamic Data Store (Phase 8.3)
 * Manages available data sources and per-node prop bindings.
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DataSource, FieldBinding } from '../types/dynamic-data.js';
import { WP_CORE_SOURCE, WOO_SOURCE } from '../types/dynamic-data.js';

interface DynamicDataState {
  /** All data sources available in this WP installation. */
  sources: DataSource[];
  /** Per-node prop bindings. Key = "nodeId:propKey". */
  bindings: Record<string, FieldBinding>;
  /** Which node+prop is currently being bound (for picker modal). */
  activePicker: { nodeId: string; propKey: string } | null;
  isLoadingSources: boolean;
}
interface DynamicDataActions {
  setSources: (sources: DataSource[]) => void;
  setSourceAvailability: (sourceId: string, available: boolean) => void;
  addBinding: (binding: FieldBinding) => void;
  removeBinding: (nodeId: string, propKey: string) => void;
  clearNodeBindings: (nodeId: string) => void;
  openPicker: (nodeId: string, propKey: string) => void;
  closePicker: () => void;
  setLoadingSources: (loading: boolean) => void;
}
export type DynamicDataStore = DynamicDataState & DynamicDataActions;

const bindingKey = (nodeId: string, propKey: string) => `${nodeId}:${propKey}`;

export const useDynamicDataStore = create<DynamicDataStore>()(
  devtools(
    (set) => ({
      sources: [WP_CORE_SOURCE, WOO_SOURCE],
      bindings: {},
      activePicker: null,
      isLoadingSources: false,

      setSources: (sources) =>
        set({ sources }, false, 'dynData/setSources'),

      setSourceAvailability: (sourceId, available) =>
        set((s) => ({
          sources: s.sources.map((src) =>
            src.id === sourceId ? { ...src, isAvailable: available } : src,
          ),
        }), false, 'dynData/setAvailability'),

      addBinding: (binding) =>
        set((s) => ({
          bindings: {
            ...s.bindings,
            [bindingKey(binding.nodeId, binding.propKey)]: binding,
          },
        }), false, 'dynData/addBinding'),

      removeBinding: (nodeId, propKey) =>
        set((s) => {
          const next = { ...s.bindings };
          delete next[bindingKey(nodeId, propKey)];
          return { bindings: next };
        }, false, 'dynData/removeBinding'),

      clearNodeBindings: (nodeId) =>
        set((s) => ({
          bindings: Object.fromEntries(
            Object.entries(s.bindings).filter(([k]) => !k.startsWith(`${nodeId}:`)),
          ),
        }), false, 'dynData/clearNode'),

      openPicker: (nodeId, propKey) =>
        set({ activePicker: { nodeId, propKey } }, false, 'dynData/openPicker'),

      closePicker: () =>
        set({ activePicker: null }, false, 'dynData/closePicker'),

      setLoadingSources: (loading) =>
        set({ isLoadingSources: loading }, false, 'dynData/setLoading'),
    }),
    { name: 'NexusDynamicDataStore' },
  ),
);

export const selectBinding = (nodeId: string, propKey: string) =>
  (s: DynamicDataStore) => s.bindings[bindingKey(nodeId, propKey)] ?? null;
export const selectNodeBindings = (nodeId: string) =>
  (s: DynamicDataStore) =>
    Object.values(s.bindings).filter((b) => b.nodeId === nodeId);
export const selectActiveSources = (s: DynamicDataStore) =>
  s.sources.filter((src) => src.isAvailable);
