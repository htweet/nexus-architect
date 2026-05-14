/**
 * CanvasNodeWrapper — selection ring + DnD chrome for every canvas node.
 *
 * The action toolbar (Move / Lock / Hide / Duplicate / Delete) and the
 * type-label badge have been extracted into StableNodeOverlay (a React Portal)
 * so they remain perfectly horizontal even when the node has CSS transforms
 * (rotate, skew, scale) applied via the Style inspector.
 *
 * This wrapper is responsible for:
 *   • Applying breakpoint-aware merged styles to the element
 *   • Providing useSortable DnD handles (whole-element drag)
 *   • Rendering the 1px Emerald selection ring (pure CSS, no JS re-render on hover)
 *   • Rendering the left-gutter drag handle badge
 *   • Isolating CSS `filter` onto an inner wrapper so it doesn't bleed onto
 *     absolutely-positioned overlays
 *   • Forwarding click / double-click / hover events to selection store
 */

import { useCallback, type ReactNode } from 'react';
import { useSortable }           from '@dnd-kit/sortable';
import { CSS }                   from '@dnd-kit/utilities';
import { GripVertical, Database } from 'lucide-react';
import { cn }                    from '@/lib/cn';
import { useCanvasStore, useSelectionStore, useUIStore, useDataBindStore } from '@nexus/core';
import type { ActiveBreakpoint } from '@nexus/core';
import { getWidget }             from '@/widgets/registry';
import { NodeContextMenu }       from './NodeContextMenu';

// ─── Breakpoint → NodeStyles key ─────────────────────────────────────────────

const BP_KEY: Record<ActiveBreakpoint, 'base' | 'md' | 'sm'> = {
  desktop: 'base',
  tablet:  'md',
  mobile:  'sm',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasNodeWrapperProps {
  nodeId:     string;
  isPreview?: boolean | undefined;
  children:   ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CanvasNodeWrapper({ nodeId, isPreview, children }: CanvasNodeWrapperProps) {
  const node           = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const selectNode     = useSelectionStore((s) => s.selectNode);
  const selectedIds    = useSelectionStore((s) => s.selectedIds);
  const setHovered     = useSelectionStore((s) => s.setHovered);
  const editingNodeId  = useSelectionStore((s) => s.editingNodeId);
  const setEditingNode = useSelectionStore((s) => s.setEditingNode);
  const activeBreakpoint = useUIStore((s) => s.activeBreakpoint);
  const bindVariables  = useDataBindStore((s) => s.variables);

  // BOUND badge: true if any stateBinding references a real variable
  const isBound = !isPreview && (() => {
    const bindings = node?.stateBindings ?? [];
    if (!bindings.length) return false;
    const varIds = new Set(bindVariables.map((v) => v.id));
    return bindings.some((b) => varIds.has(b.variableId));
  })();

  // Broken-binding flag: a stateBinding exists but the variable has been deleted
  const hasBrokenBinding = !isPreview && (() => {
    const bindings = node?.stateBindings ?? [];
    if (!bindings.length) return false;
    const varIds = new Set(bindVariables.map((v) => v.id));
    return bindings.some((b) => !varIds.has(b.variableId));
  })();

  const isSelected = selectedIds.includes(nodeId);
  const isEditing  = editingNodeId === nodeId;

  // ── Breakpoint-aware style merge ─────────────────────────────────────────
  const computedNodeStyles = (() => {
    if (!node?.styles) return {} as React.CSSProperties;
    const bpKey    = BP_KEY[activeBreakpoint];
    const base     = (node.styles.base   ?? {}) as React.CSSProperties;
    const override = bpKey !== 'base'
      ? ((node.styles[bpKey] ?? {}) as React.CSSProperties)
      : {};
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
   * Style merge order:
   *   1. User-defined node styles (dimensions, typography, colours …)
   *   2. DnD transform — only injected while actively dragging/settling
   *   3. Dragging opacity — 0.4 so insertion lines are visible underneath
   *      (the DragOverlay shows a full-opacity ghost clone)
   *
   * filter is split off to an inner wrapper (see bottom of JSX) so
   * `filter: blur(…)` doesn't create a stacking context that swallows
   * any fixed-position overlays rendered as portals (StableNodeOverlay).
   */
  const { filter: cssFilter, ...computedStylesWithoutFilter } =
    computedNodeStyles as React.CSSProperties & { filter?: string };

  const dndTransform = CSS.Transform.toString(transform);
  const style: React.CSSProperties = {
    ...computedStylesWithoutFilter,
    ...(dndTransform             ? { transform: dndTransform } : {}),
    ...(dndTransform && transition ? { transition }            : {}),
    ...(isDragging               ? { opacity: 0.4 }           : {}),
  };

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

  const handleMouseEnter = useCallback(() => {
    if (!isPreview && !node?.locked) setHovered(nodeId);
  }, [isPreview, node?.locked, nodeId, setHovered]);

  const handleMouseLeave = useCallback(() => {
    if (!isPreview) setHovered(null);
  }, [isPreview, setHovered]);

  if (!node) return null;

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
          !isPreview && isEditing  && 'nexus-node-editing',
          node.locked  && 'pointer-events-none opacity-60',
          !isPreview && !node.locked && !isEditing
            && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {/* ── Left-gutter drag-handle badge ──────────────────────────────── */}
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

        {/* ── BOUND / broken-binding badge ───────────────────────────────── */}
        {(isBound || hasBrokenBinding) && (
          <div
            title={hasBrokenBinding ? 'Broken binding — variable deleted' : 'Data-bound node'}
            style={{
              position:    'absolute',
              top:          2,
              left:         2,
              display:      'flex',
              alignItems:   'center',
              gap:           3,
              background:   hasBrokenBinding ? 'rgba(245,158,11,0.12)' : 'rgba(16,183,127,0.12)',
              border:       `1px solid ${hasBrokenBinding ? 'rgba(245,158,11,0.35)' : 'rgba(16,183,127,0.30)'}`,
              borderRadius:  3,
              padding:      '1px 4px',
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.04em',
              color:         hasBrokenBinding ? '#f59e0b' : '#10b77f',
              pointerEvents: 'none',
              zIndex:        20,
            }}
          >
            <Database size={8} strokeWidth={2} />
            {hasBrokenBinding ? '⚠ BROKEN' : 'BOUND'}
          </div>
        )}

        {/* ── Widget content ─────────────────────────────────────────────── */}
        {/* filter isolated here so StableNodeOverlay portal is never blurred */}
        {cssFilter
          ? <div style={{ filter: cssFilter, width: '100%', height: '100%' }}>{children}</div>
          : children
        }
      </div>
    </NodeContextMenu>
  );
}
       