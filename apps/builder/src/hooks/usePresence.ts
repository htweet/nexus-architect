/**
 * usePresence — Phase 7.5 presence heartbeat hook.
 *
 * Polls the REST API every 10 seconds to:
 *   1. Announce this user's presence on the current page.
 *   2. Get other users currently viewing the same page.
 *
 * Updates CollaborationStore.remotePresences so CollaboratorAvatars
 * in the TopBar renders live peer indicators without any changes to
 * existing UI components.
 *
 * Stops polling when the page is hidden (browser tab not focused).
 * Cleans up on unmount.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore, useCollaborationStore, useUserStore } from '@nexus/core';
import { useAdapter } from '@/contexts/AdapterContext';

// Deterministic color from userId — consistent across sessions
function userColor(userId: string): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash + userId.charCodeAt(i)) % colors.length;
  return colors[hash]!;
}

const HEARTBEAT_INTERVAL = 10_000; // 10 seconds

export function usePresence() {
  const adapter       = useAdapter();
  const page          = useCanvasStore((s) => s.page);
  const user          = useUserStore((s) => s.user);
  const upsertPresence = useCollaborationStore((s) => s.upsertPresence);
  const removePresence = useCollaborationStore((s) => s.removePresence);
  const setStatus      = useCollaborationStore((s) => s.setStatus);

  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const pageIdRef      = useRef<string | null>(null);

  const beat = useCallback(async () => {
    if (!adapter.ai || !page?.id || !user) return;
    const color = userColor(user.id);
    try {
      const peers = await adapter.ai.heartbeat(page.id, color);
      setStatus('connected');
      // Sync remote presences into CollaborationStore
      peers.forEach((p) => {
        const presence: import('@nexus/core').RemotePresence = {
          userId:         p.user_id,
          name:           p.user_name,
          color:          p.color,
          selectedNodeId: null,
          cursorPosition: null,
          lastSeenAt:     new Date(p.last_seen).getTime(),
        };
        if (p.avatar_url) presence.avatarUrl = p.avatar_url;
        upsertPresence(presence);
      });
    } catch {
      setStatus('error');
    }
  }, [adapter.ai, page?.id, user]);

  useEffect(() => {
    if (!page?.id || !user) return;

    // Clear old presences when page changes
    if (pageIdRef.current && pageIdRef.current !== page.id) {
      if (adapter.ai && pageIdRef.current) {
        adapter.ai.heartbeat(pageIdRef.current, '#6366f1').catch(() => {});
      }
    }
    pageIdRef.current = page.id;
    setStatus('connecting');

    // Immediate first beat
    beat();

    // Set up polling
    intervalRef.current = setInterval(() => {
      // Don't beat when tab is hidden — saves server resources
      if (!document.hidden) beat();
    }, HEARTBEAT_INTERVAL);

    // Page visibility change handler
    const onVisibilityChange = () => {
      if (!document.hidden) beat();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      setStatus('disconnected');
    };
  }, [page?.id, user?.id, beat]);
}
