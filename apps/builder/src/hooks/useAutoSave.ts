/**
 * useAutoSave — Debounced background save wired to the CanvasStore's isDirty flag.
 *
 * Blueprint Phase 6.1 requirements:
 *   "Changes are auto-saved to a draft revision every 30 seconds and on every
 *    significant mutation. Auto-save is non-blocking."
 *
 * Two-tier save strategy:
 *   1. MUTATION-TRIGGERED (debounce): page change → 2.5 s timer → save.
 *      Subscribes to page object (not just isDirty) so EVERY mutation resets
 *      the debounce — even rapid sequential edits when isDirty is already true.
 *   2. INTERVAL FALLBACK (30 s): fires regardless of dirty flag, ensures
 *      that even a page with no explicit mutations gets persisted periodically.
 *      Skipped if the last mutation-save ran within the past 5 seconds.
 *
 * Blueprint Phase 2.4 requirement (preserved):
 *   "The UI updates instantly from local state, and the adapter syncs to
 *    the database in the background. If the sync fails, the error is
 *    surfaced non-intrusively without reverting the user's work."
 *
 * Strict Mode fix (critical):
 *   React Strict Mode tears down and remounts effects immediately after mount.
 *   The cleanup cancels any pending debounce timer. On remount the isDirty
 *   subscription does NOT re-fire (isDirty is still true — no change), so the
 *   timer would never be rescheduled. Fix: check isDirty on every effect mount
 *   and re-arm the timer if the canvas is already dirty.
 *
 * Stale-closure fix:
 *   adapter is read via adapterRef (updated every render) instead of being
 *   captured in the effect closure. This means the effect deps no longer include
 *   adapter — avoiding spurious teardown/remount cycles when the adapter object
 *   identity changes.
 *
 * Never blocks the UI. Never reverts user work on failure.
 * Auto-save is disabled during preview mode (no point saving a read-only view).
 */

import { useEffect, useRef, type MutableRefObject } from 'react';
import { useCanvasStore, useUIStore } from '@nexus/core';
import type { AdapterContext } from '@nexus/core';
import { NexusApiError } from '@nexus/wp-adapter';
import { useAdapter } from '@/contexts/AdapterContext';

const DEBOUNCE_MS  = 2_500;  // 2.5 s after last mutation
const INTERVAL_MS  = 30_000; // 30 s periodic fallback (blueprint 6.1)
const SKIP_WINDOW  = 5_000;  // skip interval if debounce saved within this window

export function useAutoSave() {
  const adapter       = useAdapter();
  const isPreview     = useUIStore((s) => s.isPreviewMode);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef  = useRef<number>(0); // epoch ms of last successful save

  // ── Stale-closure guard ───────────────────────────────────────────────────
  // adapterRef is updated on every render so doSave always sees the current
  // adapter without needing to be in any effect dependency array.
  const adapterRef = useRef<AdapterContext>(adapter);
  adapterRef.current = adapter;

  // ── Core save function (shared by both tiers) ─────────────────────────────
  // Defined as a plain function and stored in a ref so both the subscription
  // callback and the interval always call the latest version regardless of
  // which render's closure they were captured in.

  function doSave(source: 'debounce' | 'interval'): Promise<void> {
    return _doSave(source, adapterRef, lastSavedRef);
  }

  const doSaveRef = useRef<typeof doSave>(doSave);
  doSaveRef.current = doSave; // refresh every render — no stale closures

  // ── Tier 1: mutation-triggered debounce ───────────────────────────────────
  // Subscribes to the PAGE OBJECT (not isDirty) so every mutation — including
  // rapid sequential edits when isDirty is already true — resets the timer.
  // On mount we also check isDirty in case a Strict Mode teardown just wiped
  // a pending timer while the canvas was already dirty.

  useEffect(() => {
    if (isPreview) return;

    // STRICT MODE FIX: re-arm timer if already dirty on mount
    if (useCanvasStore.getState().isDirty) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void doSaveRef.current('debounce'), DEBOUNCE_MS);
    }

    const unsub = useCanvasStore.subscribe(
      (state) => state.page, // fire on every page mutation (new object ref)
      (_page, _prevPage) => {
        if (!useCanvasStore.getState().isDirty) return; // loadPage sets isDirty=false — skip
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => void doSaveRef.current('debounce'), DEBOUNCE_MS);
      },
    );

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // adapter intentionally omitted — accessed via adapterRef to avoid
    // tearing down subscriptions on adapter identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview]);

  // ── Tier 2: 30-second periodic interval fallback ──────────────────────────

  useEffect(() => {
    if (isPreview) return;

    intervalRef.current = setInterval(() => void doSaveRef.current('interval'), INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // adapter intentionally omitted — accessed via adapterRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview]);
}

// ── Extracted async save logic (keeps the hook body synchronous & testable) ──

async function _doSave(
  source: 'debounce' | 'interval',
  adapterRef: MutableRefObject<AdapterContext>,
  lastSavedRef: MutableRefObject<number>,
): Promise<void> {
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
    await adapterRef.current.data.updatePage(page.id, page);
    markSaved();
    lastSavedRef.current = Date.now();
  } catch (err) {
    // ── Upsert fallback ──────────────────────────────────────────────────────
    // Page was created locally (first drag-drop or template apply) but has
    // no backend record yet. Create a stub, then patch with full state.
    if (err instanceof NexusApiError && err.status === 404) {
      try {
        await adapterRef.current.data.createPage({ title: page.title, slug: page.slug });
        await adapterRef.current.data.updatePage(page.id, page);
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
    // ────────────────────────────────────────────────────────────────────────
    const message = err instanceof Error ? err.message : 'Save failed. Please try again.';
    setSaveError(message);
    console.error(`[AutoSave][${source}] Failed to save page:`, err);
  }
}
