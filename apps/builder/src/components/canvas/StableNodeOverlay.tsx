/**
 * StableNodeOverlay — Portaled action toolbar + type-label badge.
 *
 * WHY A PORTAL?
 * The action toolbar was previously a child of CanvasNodeWrapper which sits
 * inside the DnD transform tree. When a user applies CSS transforms (rotate,
 * skew, scale) to a node via the Style inspector, the toolbar rotated too —
 * a classic "transformed toolbar" bug seen in Figma ≤ v2.
 *
 * SOLUTION: ReactDOM.createPortal renders the toolbar into document.body,
 * completely outside the canvas transform hierarchy. The element's position
 * is tracked via useNodeBoundingBox (ResizeObserver + scroll listener) which
 * returns fresh viewport-space coordinates on every paint. We then apply
 * `position: fixed` using those coordinates — the toolbar is always
 * perfectly horizontal regardless of the node's CSS transform.
 *
 * PALETTE:
 *   Background:  #121821  (Slate Obsidian)
 *   Border:      #10b77f  (Emerald, 1px)
 *   Badge bg:    #10b77f  (Emerald)
 *   Editing bg:  #f59e0b  (Amber)
 *   Icon stroke: 1.5px
 */

import { useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  ChevronUp, ChevronDown,
  Lock, Unlock, Eye, EyeOff,
  Copy, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCanvasStore, useSelectionStore, useUIStore } from '@nexus/core';
import { getWidget } from '@/widgets/registry';
import { pushHistory } from '@/lib/history';
import { useNodeBoundingBox } from '@/hooks/useNodeBoundingBox';

// ─── Root mount ───────────────────────────────────────────────────────────────

/**
 * Mount once inside Builder (outside DndContext is fine — portal escapes DOM).
 * Reads selection store to decide which node to track.
 */
export function StableNodeOverlay() {
  const primaryId     = useSelectionStore((s) => s.primarySelectedId);
  const editingNodeId = useSelectionStore((s) => s.editingNodeId);
  const isPreview     = useUIStore((s) => s.isPreviewMode);

  if (isPreview || !primaryId) return null;

  return <OverlayForNode nodeId={primaryId} isEditing={editingNodeId === primaryId} />;
}

// ─── Per-node overlay ─────────────────────────────────────────────────────────

interface OverlayForNodeProps {
  nodeId:    string;
  isEditing: boolean;
}

function OverlayForNode({ nodeId, isEditing }: OverlayForNodeProps) {
  const node          = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const removeNode    = useCanvasStore((s) => s.removeNode);
  const duplicateNode = useCanvasStore((s) => s.duplicateNode);
  const toggleLock    = useCanvasStore((s) => s.toggleNodeLock);
  const toggleHidden  = useCanvasStore((s) => s.toggleNodeHidden);
  const moveNode      = useCanvasStore((s) => s.moveNode);
  const selectNode    = useSelectionStore((s) => s.selectNode);
  const clearSel      = useSelectionStore((s) => s.clearSelection);

  const box = useNodeBoundingBox(nodeId);

  // ── Sibling helpers ─────────────────────────────────────────────────────────
  const getSiblings = useCallback(() => {
    if (!node?.parentId) return [] as string[];
    return (
      useCanvasStore.getState().page?.nodeMap[node.parentId]?.children.filter(Boolean) ?? []
    );
  }, [node?.parentId]);

  // ── Event handlers ──────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      pushHistory('Delete');
      removeNode(nodeId);
      clearSel();
    },
    [nodeId, removeNode, clearSel],
  );

  const handleDuplicate = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      pushHistory('Duplicate');
      const newId = duplicateNode(nodeId);
      if (newId) selectNode(newId);
    },
    [nodeId, duplicateNode, selectNode],
  );

  const handleToggleLock = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      pushHistory('Toggle Lock');
      toggleLock(nodeId);
    },
    [nodeId, toggleLock],
  );

  const handleToggleHidden = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      pushHistory('Toggle Visibility');
      toggleHidden(nodeId);
    },
    [nodeId, toggleHidden],
  );

  const handleMoveUp = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!node?.parentId) return;
      const siblings = getSiblings();
      const idx = siblings.indexOf(nodeId);
      if (idx <= 0) return;
      pushHistory('Move Up');
      moveNode(nodeId, node.parentId, idx - 1);
    },
    [node?.parentId, nodeId, getSiblings, moveNode],
  );

  const handleMoveDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!node?.parentId) return;
      const siblings = getSiblings();
      const idx = siblings.indexOf(nodeId);
      if (idx < 0 || idx >= siblings.length - 1) return;
      pushHistory('Move Down');
      moveNode(nodeId, node.parentId, idx + 2);
    },
    [node?.parentId, nodeId, getSiblings, moveNode],
  );

  if (!node || !box) return null;

  const widgetDef   = getWidget(node.type);
  const label       = node.label ?? widgetDef?.label ?? node.type;
  const siblings    = getSiblings();
  const myIndex     = siblings.indexOf(nodeId);
  const canMoveUp   = myIndex > 0;
  const canMoveDown = myIndex >= 0 && myIndex < siblings.length - 1;

  // ── Y positioning — clamp so toolbar never escapes viewport top ─────────────
  const TOOLBAR_H = 32;
  const GAP       = 2;           // px between toolbar bottom and element top
  const rawTop    = box.top - TOOLBAR_H - GAP;
  const topY      = rawTop < 4 ? box.bottom + GAP : rawTop;

  // ── Portal content ──────────────────────────────────────────────────────────
  const content = (
    <>
      {/* ── Type-label / Editing badge — anchored to element left edge ────── */}
      <div
        style={{
          position:      'fixed',
          top:           topY,
          left:          box.left,
          zIndex:        9998,
          pointerEvents: 'none',
          userSelect:    'none',
        }}
        className={cn(
          'inline-flex items-center px-2.5 py-1',
          'rounded-t-md text-white',
          'text-[11px] font-medium leading-none',
          isEditing ? 'bg-[#f59e0b]' : 'bg-[#10b77f]',
        )}
      >
        {isEditing ? '✏ Editing' : label}
      </div>

      {/* ── Action toolbar — visible only when not in editing mode ───────── */}
      {!isEditing && (
        <div
          style={{
            position: 'fixed',
            top:      topY,
            // right-aligned to element's right edge via viewport calculation
            right:    Math.max(0, window.innerWidth - box.right),
            zIndex:   9999,
          }}
          className={cn(
            'flex items-center gap-1.5 h-8 px-2',
            'rounded-tl-md',               // badge is top-left, toolbar is top-right
            'bg-[#121821]',                // Slate Obsidian background
            'border border-[#10b77f]',     // Emerald 1px border
            'shadow-[0_8px_32px_rgba(0,0,0,0.7)]',
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Move up */}
          <button
            onClick={handleMoveUp}
            disabled={!canMoveUp}
            className="flex h-6 w-7 items-center justify-center rounded text-[#bbcabf] hover:text-[#dde4dd] hover:bg-white/5 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ChevronUp size={14} strokeWidth={1.5} />
          </button>

          {/* Move down */}
          <button
            onClick={handleMoveDown}
            disabled={!canMoveDown}
            className="flex h-6 w-7 items-center justify-center rounded text-[#bbcabf] hover:text-[#dde4dd] hover:bg-white/5 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ChevronDown size={14} strokeWidth={1.5} />
          </button>

          <div className="h-5 w-px mx-0.5 bg-white/10" />

          {/* Lock / Unlock */}
          <button
            onClick={handleToggleLock}
            className={cn(
              'flex h-6 w-7 items-center justify-center rounded transition-colors duration-150',
              node.locked
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-[#bbcabf] hover:text-amber-400 hover:bg-amber-400/10',
            )}
            title={node.locked ? 'Unlock' : 'Lock'}
          >
            {node.locked
              ? <Lock   size={13} strokeWidth={1.5} />
              : <Unlock size={13} strokeWidth={1.5} />}
          </button>

          {/* Show / Hide */}
          <button
            onClick={handleToggleHidden}
            className={cn(
              'flex h-6 w-7 items-center justify-center rounded transition-colors duration-150',
              node.hidden
                ? 'text-[#bbcabf] opacity-50'
                : 'text-[#bbcabf] hover:text-[#dde4dd] hover:bg-white/5',
            )}
            title={node.hidden ? 'Show' : 'Hide'}
          >
            {node.hidden
              ? <EyeOff size={13} strokeWidth={1.5} />
              : <Eye    size={13} strokeWidth={1.5} />}
          </button>

          <div className="h-5 w-px mx-0.5 bg-white/10" />

          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            className="flex h-6 w-7 items-center justify-center rounded text-[#bbcabf] hover:text-[#dde4dd] hover:bg-white/5 transition-colors duration-150"
            title="Duplicate (⌘D)"
          >
            <Copy size={14} strokeWidth={1.5} />
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="flex h-6 w-7 items-center justify-center rounded text-[#bbcabf] hover:text-[#ffb4ab] hover:bg-red-500/10 transition-colors duration-150"
            title="Delete (⌫)"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </>
  );

  return ReactDOM.createPortal(content, document.body);
}
