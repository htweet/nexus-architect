/**
 * CollaborationStore — Phase 13 stub.
 *
 * This store is intentionally minimal in Phase 0.
 * The WebSocket connection, CRDT operation broadcasting, and
 * cursor sync are all Phase 7/13 work. The store shape is defined
 * now so the rest of the system can reference it without a future
 * structural refactor.
 *
 * What IS active now: presence awareness scaffolding.
 * The "Jane is editing this page" indicator in the TopBar reads from here.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RemotePresence {
  userId: string;
  name: string;
  avatarUrl?: string;
  color: string;
  selectedNodeId: string | null;
  cursorPosition: { x: number; y: number } | null;
  lastSeenAt: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface CollaborationState {
  status: ConnectionStatus;
  remotePresences: Record<string, RemotePresence>;
  localClientId: string | null;
  pendingOps: number;
}

interface CollaborationActions {
  setStatus: (status: ConnectionStatus) => void;
  setLocalClientId: (id: string) => void;
  upsertPresence: (presence: RemotePresence) => void;
  removePresence: (userId: string) => void;
  clearPresences: () => void;
  incrementPendingOps: () => void;
  decrementPendingOps: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export type CollaborationStore = CollaborationState & CollaborationActions;

export const useCollaborationStore = create<CollaborationStore>()(
  devtools(
    (set) => ({
      status: 'disconnected',
      remotePresences: {},
      localClientId: null,
      pendingOps: 0,

      setStatus: (status) => set({ status }, false, 'collab/setStatus'),

      setLocalClientId: (id) => set({ localClientId: id }, false, 'collab/setLocalClientId'),

      upsertPresence: (presence) =>
        set(
          (state) => ({
            remotePresences: {
              ...state.remotePresences,
              [presence.userId]: presence,
            },
          }),
          false,
          'collab/upsertPresence',
        ),

      removePresence: (userId) =>
        set(
          (state) => {
            const next = { ...state.remotePresences };
            delete next[userId];
            return { remotePresences: next };
          },
          false,
          'collab/removePresence',
        ),

      clearPresences: () => set({ remotePresences: {} }, false, 'collab/clearPresences'),

      incrementPendingOps: () =>
        set((s) => ({ pendingOps: s.pendingOps + 1 }), false, 'collab/incrementPendingOps'),

      decrementPendingOps: () =>
        set((s) => ({ pendingOps: Math.max(0, s.pendingOps - 1) }), false, 'collab/decrementPendingOps'),
    }),
    { name: 'NexusCollaborationStore' },
  ),
);

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectActiveCollaborators = (state: CollaborationStore) =>
  Object.values(state.remotePresences).filter(
    (p) => Date.now() - p.lastSeenAt < 30_000, // Only show presences active within 30s
  );

export const selectIsConnected = (state: CollaborationStore) =>
  state.status === 'connected';
