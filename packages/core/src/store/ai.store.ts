/**
 * AiStore — Zustand store for all Phase 7 AI state.
 *
 * Manages:
 *   - AI settings (model, provider, key configured status)
 *   - Generation state (loading, error, last result)
 *   - Performance audit state (current audit, history)
 *   - Monthly usage tracking (client-side display only)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  AiSettings,
  PerformanceAudit,
  AuditHistoryEntry,
  GenerateLayoutResult,
} from '../types/ai.js';

// ─── State ───────────────────────────────────────────────────────────────────

type AiFeature = 'generate' | 'populate' | 'style-suggest' | 'audit' | 'settings';

interface AiState {
  // Settings
  settings:        AiSettings | null;
  settingsLoaded:  boolean;

  // Per-feature loading / error flags
  loading: Partial<Record<AiFeature, boolean>>;
  errors:  Partial<Record<AiFeature, string | null>>;

  // Last generation result (applied to canvas externally)
  lastGenResult:   GenerateLayoutResult | null;

  // Audit state
  currentAudit:    PerformanceAudit | null;
  auditHistory:    AuditHistoryEntry[];

  // Usage
  usageThisMonth:  number;
  usageLimit:      number; // -1 = unlimited
}

interface AiActions {
  setSettings:      (s: AiSettings) => void;
  setLoading:       (feature: AiFeature, loading: boolean) => void;
  setError:         (feature: AiFeature, error: string | null) => void;
  setLastGenResult: (r: GenerateLayoutResult | null) => void;
  setAudit:         (audit: PerformanceAudit | null) => void;
  setAuditHistory:  (history: AuditHistoryEntry[]) => void;
  incrementUsage:   () => void;
  setUsageLimits:   (used: number, limit: number) => void;
  clearErrors:      () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export type AiStore = AiState & AiActions;

export const useAiStore = create<AiStore>()(
  devtools(
    (set) => ({
      settings:       null,
      settingsLoaded: false,
      loading:        {},
      errors:         {},
      lastGenResult:  null,
      currentAudit:   null,
      auditHistory:   [],
      usageThisMonth: 0,
      usageLimit:     10, // Free tier default — overridden once user loads

      setSettings: (settings) =>
        set({ settings, settingsLoaded: true }, false, 'ai/setSettings'),

      setLoading: (feature, loading) =>
        set((s) => ({ loading: { ...s.loading, [feature]: loading } }), false, `ai/loading/${feature}`),

      setError: (feature, error) =>
        set((s) => ({ errors: { ...s.errors, [feature]: error } }), false, `ai/error/${feature}`),

      setLastGenResult: (r) =>
        set({ lastGenResult: r }, false, 'ai/setLastGenResult'),

      setAudit: (audit) =>
        set({ currentAudit: audit }, false, 'ai/setAudit'),

      setAuditHistory: (history) =>
        set({ auditHistory: history }, false, 'ai/setAuditHistory'),

      incrementUsage: () =>
        set((s) => ({ usageThisMonth: s.usageThisMonth + 1 }), false, 'ai/incrementUsage'),

      setUsageLimits: (used, limit) =>
        set({ usageThisMonth: used, usageLimit: limit }, false, 'ai/setUsageLimits'),

      clearErrors: () =>
        set({ errors: {} }, false, 'ai/clearErrors'),
    }),
    { name: 'NexusAiStore' },
  ),
);

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectAiReady         = (s: AiStore) => s.settingsLoaded && !!s.settings?.hasApiKey;
export const selectAiNeedsSetup    = (s: AiStore) => s.settingsLoaded && !s.settings?.hasApiKey;
export const selectIsGenerating    = (s: AiStore) => !!s.loading.generate;
export const selectIsAuditing      = (s: AiStore) => !!s.loading.audit;
export const selectIsPopulating    = (s: AiStore) => !!s.loading.populate;
export const selectGenerateError   = (s: AiStore) => s.errors.generate ?? null;
export const selectAuditError      = (s: AiStore) => s.errors.audit ?? null;
export const selectUsagePercent    = (s: AiStore) =>
  s.usageLimit === -1 ? 0 : Math.round((s.usageThisMonth / s.usageLimit) * 100);
export const selectUsageAtLimit    = (s: AiStore) =>
  s.usageLimit !== -1 && s.usageThisMonth >= s.usageLimit;
