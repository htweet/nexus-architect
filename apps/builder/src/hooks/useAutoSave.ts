/**
 * useAutoSave — Debounced background save wired to the CanvasStore's isDirty flag.
 *
 * Blueprint Phase 6.1 requirements:
 *   "Changes are auto-saved to a draft revision every 30 seconds and on every
 *    significant mutation. Auto-save is non-blocking."
 *
 * Two-tier save strategy:
 *   1. MUTATION-TRIGGERED (debounce): isDirty → 2.5 s timer → save.
 *      Resets on every new mutation. Fast feedback for active editing.
 *   2. INTERVAL FALLBACK (30 s): fires regardless of dirty flag, ensures
 *      that even a page with no explicit mutations gets persisted periodically.
 *      Skipped if the last mutation-save ran within the past 5 seconds.
 *
 * Blueprint Phase 2.4 requirement (preserved):
 *   "The UI updates instantly from local state, and the adapter syncs to
 *    the database in the background. If the sync fails, the error is
 *    surfaced non-intrusively without reverting the user's work."
 *
 * Never blocks the UI. Never reverts user work on failure.
 * Auto-save is disabled during preview mode (no point saving a read-only view).
 */

import { useEffect, useRef } from 'react';
import { useCanvasStore, useUIStore } from '@nexus/core';
import { NexusApiError } from '@nexus/wp-adapter';
import { useAdapter } from '@/contexts/AdapterContext';

const DEBOUNCE_MS  = 2_500;  // 2.5 s after last mutation
const INTERVAL_MS  = 30_000; // 30 s periodic fallback (blueprint 6.1)
const SKIP_WINDOW  = 5_000;  // skip interval if debounce saved within this window

export function useAutoSave() {
  const adapter       = useAdapter();
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef  = useRef<number>(0); // epoch ms of last successful save
  const isPreview     = useUIStore((s) => s.isPreviewMode);

  // ── Core save function (shared by both tiers) ─────────────────────────────

  async function doSave(source: 'debounce' | 'interval'): Promise<void> {
    const { page, setSaving, markSaved, setSaveError, isDirty } = useCanvasStore.getState();

    // Interval-tier: skip if nothing changed since last save
    if (source === 'interval') {
      const msSinceSave = Date.now() - lastSavedRef.current;
      if (!isDirty && msSinceSave < INTERVAL_MS * 2) return;
      if (msSinceSave < SKIP_WINDOW) return; // debounce just fired
    }

    if (!page) return;

    setSaving(true);
    try {
      await adapter.data.updatePage(page.id, page);
      markSaved();
      lastSavedRef.current = Date.now();
    } catch (err) {
      // ── Upsert fallback ────────────────────────────────────────────────────
      // Page was created locally (first drag-drop or template apply) but has
      // no backend record yet. Create a stub, then patch with full state.
      if (err instanceof NexusApiError && err.status === 404) {
        try {
          await adapter.data.createPage({ title: page.title, slug: page.slug });
          await adapter.data.updatePage(page.id, page);
          markSaved();
          lastSavedRef.current = Date.now();
          return;
        } catch (upsertErr) {
          const upsertMsg = upsertErr instanceof Error
            ? upsertErr.message
            : 'Save failed. Please try again.';
          setSaveError(upsertMsg);
          console.error('[AutoSave] Upsert fallback failed:', upsertErr);
          return;
        }
      }
      // ──────────────────────────────────────────────────────────────────────
      const message = err instanceof Error ? err.message : 'Save failed. Please try again.';
      setSaveError(message);
      console.error(`[AutoSave][${source}] Failed to save page:`, err);
    }
  }

  // ── Tier 1: mutation-triggered debounce ───────────────────────────────────

  useEffect(() => {
    if (isPreview) return;

    const unsub = useCanvasStore.subscribe(
      (state) => state.isDirty,
      (isDirty) => {
        if (!isDirty) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void doSave('debounce'), DEBOUNCE_MS);
      },
    );

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, isPreview]);

  // ── Tier 2: 30-second periodic interval fallback ──────────────────────────

  useEffect(() => {
    if (isPreview) return;

    intervalRef.current = setInterval(() => void doSave('interval'), INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, isPreview]);
}
