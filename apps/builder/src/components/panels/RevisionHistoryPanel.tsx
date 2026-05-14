/**
 * RevisionHistoryPanel — Phase 5.1
 *
 * Shows a reverse-chronological list of page snapshots saved by auto-save.
 * Each revision shows its timestamp and a "Restore" button.
 *
 * Architecture:
 *   • Fetches from adapter.data.getRevisions(pageId) on mount and whenever
 *     useCanvasStore.lastSavedAt changes (i.e., every successful auto-save).
 *   • Restore calls adapter.data.restoreRevision(pageId, revisionId) which
 *     returns a full NexusPage that is loaded into the canvas via loadPage().
 *   • 100% DB-persistent: revision storage lives in the adapter layer.
 */

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Clock, RefreshCw } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { useAdapter } from '@/contexts/AdapterContext';
import { cn } from '@/lib/cn';
import type { PageRevision } from '@nexus/core';

export function RevisionHistoryPanel() {
  const adapter     = useAdapter();
  const page        = useCanvasStore((s) => s.page);
  const loadPage    = useCanvasStore((s) => s.loadPage);
  const lastSavedAt = useCanvasStore((s) => s.lastSavedAt);

  const [revisions,   setRevisions]   = useState<PageRevision[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchRevisions = useCallback(async () => {
    if (!page) return;
    setLoading(true);
    try {
      const data = await adapter.data.getRevisions(page.id);
      // Newest first
      setRevisions([...data].reverse());
    } catch (err) {
      console.error('[RevisionHistory] Failed to fetch revisions:', err);
    } finally {
      setLoading(false);
    }
  }, [adapter, page?.id]);

  // Re-fetch whenever a save completes or the panel mounts
  useEffect(() => {
    fetchRevisions();
  }, [fetchRevisions, lastSavedAt]);

  const handleRestore = async (rev: PageRevision) => {
    if (!page) return;
    setRestoringId(rev.id);
    try {
      const restored = await adapter.data.restoreRevision(page.id, rev.id);
      loadPage(restored);
    } catch (err) {
      console.error('[RevisionHistory] Failed to restore revision:', err);
    } finally {
      setRestoringId(null);
    }
  };

  // ─── Empty state: no page loaded ──────────────────────────────────────────

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <Clock size={24} style={{ color: '#bbcabf' }} />
        <p className="text-[11px]" style={{ color: '#bbcabf' }}>
          No page loaded.
        </p>
      </div>
    );
  }

  // ─── Panel ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.10)', background: '#09100c' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#bbcabf' }}>
          {revisions.length} revision{revisions.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={fetchRevisions}
          disabled={loading}
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          style={{ color: '#bbcabf' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#50dea3')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#bbcabf')}
        >
          <RefreshCw size={10} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && revisions.length === 0 && (
        <div className="flex justify-center py-8">
          <RefreshCw size={16} className="animate-spin" style={{ color: '#bbcabf' }} />
        </div>
      )}

      {/* Empty state */}
      {!loading && revisions.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <Clock size={22} style={{ color: '#bbcabf' }} />
          <p className="text-[11px] leading-relaxed" style={{ color: '#bbcabf' }}>
            No revisions yet.
            <br />
            Revisions are saved automatically every 2.5 s as you edit.
          </p>
        </div>
      )}

      {/* Revision timeline */}
      {revisions.length > 0 && (
        <div className="flex flex-col">
          {revisions.map((rev, idx) => {
            const date       = new Date(rev.createdAt);
            const isRestoring = restoringId === rev.id;
            const isCurrent  = idx === 0;

            return (
              <div
                key={rev.id}
                data-testid={`revision-item-${rev.id}`}
                className={cn(
                  'group flex items-center justify-between px-3 py-2.5 border-b transition-colors duration-[140ms]',
                  isCurrent
                    ? 'bg-[rgba(255,255,255,0.03)]'
                    : 'hover:bg-[rgba(255,255,255,0.02)]',
                )}
                style={{ borderColor: 'rgba(255,255,255,0.10)' }}
              >
                {/* Left: indicator + label + timestamp */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{
                      background: isCurrent
                        ? '#10b77f'
                        : 'rgba(255,255,255,0.15)',
                      boxShadow: isCurrent ? '0 0 6px rgba(16,183,127,0.30)' : 'none',
                    }}
                  />
                  <div className="min-w-0">
                    <p
                      className="text-[11px] font-semibold truncate"
                      style={{ color: '#dde4dd' }}
                    >
                      {rev.label ?? `Version ${revisions.length - idx}`}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#bbcabf' }}>
                      {date.toLocaleString([], {
                        month:  'short',
                        day:    'numeric',
                        hour:   '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Right: badge or restore button */}
                {isCurrent ? (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ml-2"
                    style={{ background: 'rgba(16,183,127,0.12)', color: '#10b77f' }}
                  >
                    Current
                  </span>
                ) : (
                  <button
                    onClick={() => handleRestore(rev)}
                    disabled={isRestoring}
                    className={cn(
                      'opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md',
                      'text-[10px] font-bold uppercase tracking-wider border shrink-0 ml-2',
                      'transition-all duration-[140ms] disabled:opacity-50',
                    )}
                    style={{
                      borderColor: 'rgba(255,255,255,0.10)',
                      color:       '#bbcabf',
                      background:  '#09100c',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#10b77f';
                      e.currentTarget.style.color       = '#50dea3';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
                      e.currentTarget.style.color       = '#bbcabf';
                    }}
                  >
                    <RotateCcw
                      size={9}
                      strokeWidth={2.5}
                      className={isRestoring ? 'animate-spin' : ''}
                    />
                    {isRestoring ? '…' : 'Restore'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
