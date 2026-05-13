/**
 * White-Label Store (Phase 8.2)
 * Persists brand config via the adapter. Falls back to defaults for free users.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { WhiteLabelConfig } from '../types/whitelabel.js';
import { DEFAULT_WHITE_LABEL } from '../types/whitelabel.js';

interface WhiteLabelState {
  config: WhiteLabelConfig;
  isDirty: boolean;
}
interface WhiteLabelActions {
  updateConfig: (partial: Partial<WhiteLabelConfig>) => void;
  resetConfig: () => void;
  markSaved: () => void;
}
export type WhiteLabelStore = WhiteLabelState & WhiteLabelActions;

export const useWhiteLabelStore = create<WhiteLabelStore>()(
  devtools(
    persist(
      (set) => ({
        config: { ...DEFAULT_WHITE_LABEL },
        isDirty: false,

        updateConfig: (partial) =>
          set((s) => ({ config: { ...s.config, ...partial }, isDirty: true }),
            false, 'whiteLabel/update'),

        resetConfig: () =>
          set({ config: { ...DEFAULT_WHITE_LABEL }, isDirty: false },
            false, 'whiteLabel/reset'),

        markSaved: () => set({ isDirty: false }, false, 'whiteLabel/saved'),
      }),
      { name: 'nexus-whitelabel-config' },
    ),
    { name: 'NexusWhiteLabelStore' },
  ),
);

export const selectWhiteLabelConfig = (s: WhiteLabelStore) => s.config;
export const selectBrandName = (s: WhiteLabelStore) =>
  s.config.enabled ? s.config.brandName : 'Nexus Architect';
export const selectPrimaryColor = (s: WhiteLabelStore) =>
  s.config.enabled ? s.config.primaryColor : '#10b77f';
