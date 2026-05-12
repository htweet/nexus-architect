/**
 * CanvasNodeWrapper — selection + DnD + context chrome for every canvas node.
 *
 * Phase 3 upgrades:
 *   • Double-click enters inline rich-text editing mode (sets editingNodeId)
 *   • Right-click opens NodeContextMenu at cursor position
 *   • Toolbar extended: Lock / Hide / Move Up / Move Down
 *   • Undo history pushed before structural mutations
 *
 * Phase 8 UX overhaul:
 *   • node.styles (base + breakpoint override) applied to wrapper so
 *     every RightSidebar style change reflects instantly on canvas.
 *   • Drag listeners moved to main wrapper div — entire element is
 *     draggable (6 px activation distance prevents accidental drags).
 *   • Hover ring now CSS group-hover only → zero Zustand re-renders on
 *     mouse-move, eliminating the border flicker completely.
 *   • Drag handle is always visible when selected, fades in on hover
 *     via group-hover (pure CSS, no state).
 *   • Toolbar buttons call onPointerDown stopPropagation so they never
 *     accidentally start a drag.
 *
 * Figma-fluid DnD upgrade:
 *   • data-node-id attribute added for SmartGuidesOverlay DOM queries.
 *   • Dragging opacity lowered to 0.2 for a more pronounced "lifted" feel.
 */

import { useCallback, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS }         from '@dnd-kit/utilities';
import {
  Copy, Trash2, GripVertical,
  Lock, Unlock, Eye, EyeOff,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCanvasStore, useSelectionStore, useUIStore } from '@nexus/core';
import type { ActiveBreakpoint } from '@nexus/core';
import { getWidget } from '@/widgets/registry';
import { NodeContextMenu } from './NodeContextMenu';
import { pushHistory } from '@/lib/history';

// ─── Breakpoint → NodeStyles key ─────────────────────────────────────────────

const BP_KEY: Record<ActiveBreakpoint, 'base' | 'md' | 'sm'> = {
  desktop: 'base',
  tablet:  'md',
  mobile:  'sm',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasNodeWrapperProps {
  nodeId: string;
  isPreview?: boolean | undefined;
  children: ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CanvasNodeWrapper({ nodeId, isPreview, children }: CanvasNodeWrapperProps) {
  const node           = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const removeNode     = useCanvasStore((s) => s.removeNode);
  const duplicateNode  = useCanvasStore((s) => s.duplicateNode);
  const toggleLock     = useCanvasStore((s) => s.toggleNodeLock);
  const toggleHidden   = useCanvasStore((s) => s.toggleNodeHidden);
  const moveNode       = useCanvasStore((s) => s.moveNode);
  const selectNode     = useSelectionStore((s) => s.selectNode);
  const clearSelection = useSelectionStore((s) => s.clearSelection);
  const selectedIds    = useSelectionStore((s) => s.selectedIds);
  const setHovered     = useSelectionStore((s) => s.setHovered);
  const editingNodeId  = useSelectionStore((s) => s.editingNodeId);
  const setEditingNode = useSelectionStore((s) => s.setEditingNode);

  // ── Breakpoint-aware style merge ─────────────────────────────────────────
  const activeBreakpoint = useUIStore((s) => s.activeBreakpoint);

  const isSelected = selectedIds.includes(nodeId);
  const isEditing  = editingNodeId === nodeId;

  // ── Merge node.styles[base] + node.styles[bpKey] for inline style ────────
  const computedNodeStyles = (() => {
    if (!node?.styles) return {} as React.CSSProperties;
    const bpKey    = BP_KEY[activeBreakpoint];
    const base     = (node.styles.base ?? {}) as React.CSSProperties;
    const override = bpKey !== 'base' ? ((node.styles[bpKey] ?? {}) as React.CSSProperties) : {};
    return { ...base, ...override } as React.CSSProperties;
  })();

  // ── DnD ──────────────────────────────────────────────────────────────────
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id:       nodeId,
    disabled: (isPreview ?? false) || (node?.locked ?? false) || isEditing,
    data:     { nodeId, parentId: node?.parentId },
  });

  /**
   * Merge order:
   *   1. User-defined node styles (dimensions, typography, colours …)
   *   2. DnD transform — must always sit on top so dragged elements move correctly
   *   3. Dragging opacity — 0.2 gives a pronounced "lifted off canvas" feel
   */
  const style: React.CSSProperties = {
    ...computedNodeStyles,
    transform:  CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    ...(isDragging ? { opacity: 0.2 } : {}),
  };

  // ── Sibling helpers ───────────────────────────────────────────────────────
  const getSiblings = useCallback(() => {
    if (!node?.parentId) return [];
    const page = useCanvasStore.getState().page;
    return page?.nodeMap[node.parentId]?.children.filter(Boolean) ?? [];
  }, [node?.parentId]);

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPreview || node?.locked) return;
      e.stopPropagation();
      if (e.shiftKey) {
        useSelectionStore.getState().toggleNodeSelection(nodeId);
      } else {
        selectNode(nodeId);
      }
    },
    [isPreview, node?.locked, nodeId, selectNode],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPreview || node?.locked) return;
      e.stopPropagation();
      const widgetDef = getWidget(node?.type ?? '');
      if (widgetDef && ['heading', 'paragraph', 'button', 'richtext'].includes(node?.type ?? '')) {
        selectNode(nodeId);
        setEditingNode(nodeId);
      }
    },
    [isPreview, node, nodeId, selectNode, setEditingNode],
  );

  // Hover → used by LayersPanel for sync; visuals handled via CSS group-hover
  const handleMouseEnter = useCallback(() => {
    if (!isPreview && !node?.locked) setHovered(nodeId);
  }, [isPreview, node?.locked, nodeId, setHovered]);

  const handleMouseLeave = useCallback(() => {
    if (!isPreview) setHovered(null);
  }, [isPreview, setHovered]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      pushHistory('Delete');
      removeNode(nodeId);
      clearSelection();
    },
    [nodeId, removeNode, clearSelection],
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

  if (!node) return null;

  const widgetDef   = getWidget(node.type);
  const label       = node.label ?? widgetDef?.label ?? node.type;
  const siblings    = getSiblings();
  const myIndex     = siblings.indexOf(nodeId);
  const canMoveUp   = myIndex > 0;
  const canMoveDown = myIndex >= 0 && myIndex < siblings.length - 1;

  // Only attach DnD listeners when not in preview / locked / editing mode
  const dndProps = !isPreview && !node.locked && !isEditing
    ? { ...attributes, ...listeners }
    : {};

  return (
    <NodeContextMenu nodeId={nodeId}>
      <div
        ref={setNodeRef}
        data-node-id={nodeId}
        style={style}
        {...dndProps}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          'relative group/node',
          !isPreview && 'nexus-canvas-node',
          !isPreview && isSelected && !isEditing && 'nexus-node-selected',
          !isPreview && isEditing && 'nexus-node-editing',
          node.locked && 'pointer-events-none opacity-60',
          !isPreview && !node.locked && !isEditing
            && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {/* ── Drag handle badge (left gutter) ────────────────────────────── */}
        {!isPreview && !isEditing && (
          <div
            className={cn(
              'absolute -left-6 top-1/2 -translate-y-1/2 z-[100]',
              'flex h-6 w-5 items-center justify-center',
              'rounded-l-md bg-[#10b77f] text-white pointer-events-none',
              'transition-opacity duration-150',
              isSelected
                ? 'opacity-90'
                : 'opacity-0 group-hover/node:opacity-70',
            )}
          >
            <GripVertical size={11} />
          </div>
        )}

        {/* ── Type label badge (top-left, only when selected) ─────────────── */}
        {!isPreview && isSelected && (
          <div
            className={cn(
              'absolute -top-9 left-0 z-[100]',
              'inline-flex items-center px-2.5 py-1',
              'rounded-tr-md text-white select-none pointer-events-none',
              'text-[11px] font-medium leading-none',
              isEditing ? 'bg-[#f59e0b]' : 'bg-[#10b77f]',
            )}
          >
            {isEditing ? '✏ Editing' : label}
          </div>
        )}

        {/* ── Action toolbar (top-right, only when selected + not editing) ── */}
        {!isPreview && isSelected && !isEditing && (
          <div
            className={cn(
              'absolute -top-9 right-0 z-[100]',
              'flex items-center gap-1.5 h-8 px-2',
              'rounded-t-md bg-[#0e1511] border border-[rgba(255,255,255,0.10)]',
            )}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleMoveUp}
              disabled={!canMoveUp}
              className="flex h-6 w-7 items-center justify-center rounded text-[#bbcabf] hover:text-[#dde4dd] hover:bg-[rgba(255,255,255,0.05)] transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={handleMoveDown}
              disabled={!canMoveDown}
              className="flex h-6 w-7 items-center justify-center rounded text-[#bbcabf] hover:text-[#dde4dd] hover:bg-[rgba(255,255,255,0.05)] transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move down"
            >
              <ChevronDown size={14} />
            </button>

            <div className="h-5 w-px mx-0.5" style={{ background: 'rgba(255,255,255,0.10)' }} />

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
              {node.locked ? <Lock size={13} /> : <Unlock size={13} />}
            </button>
            <button
              onClick={handleToggleHidden}
              className={cn(
                'flex h-6 w-7 items-center justify-center rounded transition-colors duration-150',
                node.hidden
                  ? 'text-[#bbcabf] opacity-50'
                  : 'text-[#bbcabf] hover:text-[#dde4dd] hover:bg-[rgba(255,255,255,0.05)]',
              )}
              title={node.hidden ? 'Show' : 'Hide'}
            >
              {node.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>

            <div className="h-5 w-px mx-0.5" style={{ background: 'rgba(255,255,255,0.10)' }} />

            <button
              onClick={handleDuplicate}
              className="flex h-6 w-7 items-center justify-center rounded text-[#bbcabf] hover:text-[#dde4dd] hover:bg-[rgba(255,255,255,0.05)] transition-colors duration-150"
              title="Duplicate (⌘D)"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="flex h-6 w-7 items-center justify-center rounded text-[#bbcabf] hover:text-[#ffb4ab] hover:bg-error/10 transition-colors duration-150"
              title="Delete (⌫)"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {/* ── Widget content ── */}
        {children}
      </div>
    </NodeContextMenu>
  );
}
