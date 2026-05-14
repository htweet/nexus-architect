/**
 * HistoryStore — Undo / Redo engine.
 *
 * Stores snapshots of the CanvasStore page state.
 * Records granular labeled actions (not blind full-page saves)
 * so undo/redo feels meaningful and the undo stack label
 * shows "Undo: Move Section" instead of "Undo: Edit".
 *
 * 100-entry cap prevents memory pressure on long sessions.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { NexusPage } from '../types/schema.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  label: string;
  snapshot: NexusPage;
  timestamp: number;
}

const MAX_HISTORY = 100;

interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

interface HistoryActions {
  /**
   * Record a new history entry BEFORE a mutation is applied.
   * Call this before the CanvasStore action, not after.
   */
  push: (label: string, snapshot: NexusPage) => void;

  /**
   * Returns the most recent past entry (pre-mutation snapshot) and moves it to future.
   * Pass `redoSnapshot` (the current canvas state BEFORE undoing) so that redo
   * correctly restores the post-mutation state, not the pre-mutation state.
   */
  undo: (redoSnapshot?: NexusPage) => HistoryEntry | null;

  /** Returns the most recent future entry and moves it to past. */
  redo: () => HistoryEntry | null;

  /** Wipe history (e.g. on page load). */
  clear: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export type HistoryStore = HistoryState & HistoryActions;

export const useHistoryStore = create<HistoryStore>()(
  devtools(
    (set, get) => ({
      past: [],
      future: [],

      push: (label, snapshot) =>
        set(
          (state) => {
            const newPast = [
              ...state.past.slice(-(MAX_HISTORY - 1)),
              { label, snapshot, timestamp: Date.now() },
            ];
            return {
              past: newPast,
              future: [], // Any new action clears the redo stack
            };
          },
          false,
          `history/push(${label})`,
        ),

      undo: (redoSnapshot?: NexusPage) => {
        const { past, future } = get();
        if (past.length === 0) return null;

        const entry = past[past.length - 1]!;
        // The redo entry should restore the POST-mutation state (current canvas),
        // not the pre-mutation snapshot stored in `entry`.
        const futureEntry: HistoryEntry = redoSnapshot
          ? { ...entry, snapshot: redoSnapshot }
          : entry;
        set(
          {
            past: past.slice(0, -1),
            future: [futureEntry, ...future],
          },
          false,
          'history/undo',
        );
        return entry;
      },

      redo: () => {
        const { past, future } = get();
        if (future.length === 0) return null;

        const entry = future[0]!;
        set(
          {
            past: [...past, entry],
            future: future.slice(1),
          },
          false,
          'history/redo',
        );
        return entry;
      },

      clear: () => set({ past: [], future: [] }, false, 'history/clear'),
    }),
    { name: 'NexusHistoryStore' },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectCanUndo    = (state: HistoryStore) => state.past.length > 0;
export const selectCanRedo    = (state: HistoryStore) => state.future.length > 0;
export const selectUndoLabel  = (state: HistoryStore) => state.past.at(-1)?.label ?? null;
export const selectRedoLabel  = (state: HistoryStore) => state.future[0]?.label ?? null;
