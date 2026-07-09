/**
 * LayersTree -- Recursive Layers Panel
 *
 * Renders the full page JSON tree as an interactive layer list:
 *   - 11px dense text, 26px row height
 *   - Widget type icon from registry
 *   - Emerald 2px left border + bg tint for active node
 *   - Eye/EyeOff (hidden) + Lock/Unlock toggles revealed on hover
 *   - HTML5 drag-to-reorder within the same parent via canvas moveNode
 *   - Dim + italic for hidden layers
 */

import { memo, useState, useRef, useCallback } from 'react';
import {
  Eye, EyeOff, Lock, Unlock,
  ChevronRight, ChevronDown, Square,
} from 'lucide-react';
import { useCanvasStore, useSelectionStore } from '@nexus/core';
import { getWidget } from '@/widgets/registry';
import { cn } from '@/lib/cn';

// --- Types -------------------------------------------------------------------

interface LayerItemProps {
  nodeId:       string;
  depth:        number;
  search?:      string | undefined;
  draggingId:   string | null;
  dropTargetId: string | null;
  onDragStart:  (nodeId: string) => void;
  onDragOver:   (nodeId: string) => void;
  onDrop:       (targetId: string) => void;
  onDragEnd:    () => void;
}

// --- LayerItem (recursive) ---------------------------------------------------

export const LayerItem = memo(function LayerItem({
  nodeId, depth, search,
  draggingId, dropTargetId,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: LayerItemProps) {
  const node         = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const selected     = useSelectionStore((s) => s.primarySelectedId);
  const selectNode   = useSelectionStore((s) => s.selectNode);
  const toggleLock   = useCanvasStore((s) => s.toggleNodeLock);
  const toggleHidden = useCanvasStore((s) => s.toggleNodeHidden);
  const [expanded, setExpanded] = useState(true);

  if (!node) return null;

  // Root node: render children directly (no row for root itself)
  if (node.type === 'root') {
    return (
      <>
        {node.children.filter(Boolean).map((childId) => (
          <LayerItem
            key={childId} nodeId={childId} depth={0} search={search}
            draggingId={draggingId} dropTargetId={dropTargetId}
            onDragStart={onDragStart} onDragOver={onDragOver}
            onDrop={onDrop} onDragEnd={onDragEnd}
          />
        ))}
      </>
    );
  }

  const def         = getWidget(node.type);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isSelected  = selected === nodeId;
  const isDragging  = draggingId === nodeId;
  const isDropTarget = dropTargetId === nodeId;
  const TypeIcon    = def?.icon;
  const label       = (node as { label?: string }).label ?? def?.label ?? node.type;

  const matchesSearch = !search ||
    label.toLowerCase().includes(search.toLowerCase()) ||
    node.type.toLowerCase().includes(search.toLowerCase());

  return (
    <div>
      {/* Drop-before indicator line */}
      {isDropTarget && draggingId && draggingId !== nodeId && (
        <div
          style={{
            height: 2, marginLeft: `${10 + depth * 14}px`,
            marginRight: 8, marginBottom: -1,
            background: '#10b77f', borderRadius: 2,
          }}
        />
      )}

      {matchesSearch && (
        <div
          draggable={!node.locked}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.effectAllowed = 'move';
            onDragStart(nodeId);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDragOver(nodeId);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDrop(nodeId);
          }}
          onDragEnd={(e) => { e.stopPropagation(); onDragEnd(); }}
          onClick={() => selectNode(nodeId)}
          className={cn(
            'group flex items-center pr-1 rounded-[3px] mx-1 select-none',
            'transition-colors duration-[80ms]',
            node.locked ? 'cursor-default' : 'cursor-pointer',
            isDragging && 'opacity-30 pointer-events-none',
          )}
          style={{
            paddingLeft: `${4 + depth * 14}px`,
            height:      26,
            background:  isSelected ? 'rgba(16,183,127,0.11)' : 'transparent',
            borderLeft:  isSelected ? '2px solid #10b77f' : '2px solid transparent',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          {/* Expand / collapse chevron */}
          <button
            className="w-4 h-4 flex items-center justify-center flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) setExpanded((v) => !v);
            }}
          >
            {hasChildren
              ? (expanded
                  ? <ChevronDown  size={10} strokeWidth={1.5} style={{ color: isSelected ? '#50dea3' : '#485a4e' }} />
                  : <ChevronRight size={10} strokeWidth={1.5} style={{ color: isSelected ? '#50dea3' : '#485a4e' }} />)
              : <span className="w-4 block" />}
          </button>

          {/* Widget type icon */}
          <span
            className="flex-shrink-0 mx-1"
            style={{ color: isSelected ? '#50dea3' : node.hidden ? '#2e3e32' : '#586860' }}
          >
            {TypeIcon
              ? <TypeIcon size={12} strokeWidth={1.5} />
              : <Square   size={12} strokeWidth={1.5} />}
          </span>

          {/* Layer label */}
          <span
            className="flex-1 min-w-0 text-[11px] truncate leading-none"
            style={{
              color:     node.hidden ? 'rgba(187,202,191,0.28)' : isSelected ? '#d0f5e4' : '#9eb5a4',
              fontStyle: node.hidden ? 'italic' : 'normal',
            }}
          >
            {label}
          </span>

          {/* Lock indicator badge (always visible when locked) */}
          {node.locked && !isSelected && (
            <Lock size={10} strokeWidth={1.5} style={{ color: '#10b77f', flexShrink: 0, marginRight: 2 }} />
          )}

          {/* Visibility + Lock actions (hover / selected) */}
          <span
            className={cn(
              'flex items-center gap-px flex-shrink-0 transition-opacity duration-100',
              'opacity-0 group-hover:opacity-100',
              (isSelected || node.hidden || node.locked) && 'opacity-100',
            )}
          >
            <button
              title={node.hidden ? 'Show layer' : 'Hide layer'}
              onClick={(e) => { e.stopPropagation(); toggleHidden(nodeId); }}
              className="w-5 h-5 flex items-center justify-center rounded"
              style={{ color: node.hidden ? '#10b77f' : '#3e4e42' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#dde4dd')}
              onMouseLeave={(e) => (e.currentTarget.style.color = node.hidden ? '#10b77f' : '#3e4e42')}
            >
              {node.hidden
                ? <EyeOff size={11} strokeWidth={1.5} />
                : <Eye    size={11} strokeWidth={1.5} />}
            </button>

            <button
              title={node.locked ? 'Unlock layer' : 'Lock layer'}
              onClick={(e) => { e.stopPropagation(); toggleLock(nodeId); }}
              className="w-5 h-5 flex items-center justify-center rounded"
              style={{ color: node.locked ? '#10b77f' : '#3e4e42' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#dde4dd')}
              onMouseLeave={(e) => (e.currentTarget.style.color = node.locked ? '#10b77f' : '#3e4e42')}
            >
              {node.locked
                ? <Lock   size={11} strokeWidth={1.5} />
                : <Unlock size={11} strokeWidth={1.5} />}
            </button>
          </span>
        </div>
      )}

      {/* Recursive children */}
      {expanded && hasChildren && (
        <div>
          {node.children.filter(Boolean).map((childId) => (
            <LayerItem
              key={childId} nodeId={childId} depth={depth + 1} search={search}
              draggingId={draggingId} dropTargetId={dropTargetId}
              onDragStart={onDragStart} onDragOver={onDragOver}
              onDrop={onDrop} onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// --- LayersTree (root container) ---------------------------------------------

export const LayersTree = memo(function LayersTree({ search }: { search?: string }) {
  const page     = useCanvasStore((s) => s.page);
  const moveNode = useCanvasStore((s) => s.moveNode);

  const [draggingId,   setDraggingId]   = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dragNodeRef                     = useRef<string | null>(null);

  const handleDragStart = useCallback((nodeId: string) => {
    dragNodeRef.current = nodeId;
    setDraggingId(nodeId);
  }, []);

  const handleDragOver = useCallback((nodeId: string) => {
    if (dragNodeRef.current && nodeId !== dragNodeRef.current) {
      setDropTargetId(nodeId);
    }
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    const sourceId = dragNodeRef.current;
    if (!sourceId || !page || sourceId === targetId) {
      setDraggingId(null); setDropTargetId(null); return;
    }

    const targetNode = page.nodeMap[targetId];
    if (!targetNode || !targetNode.parentId) {
      setDraggingId(null); setDropTargetId(null); return;
    }

    const parent = page.nodeMap[targetNode.parentId];
    if (!parent) { setDraggingId(null); setDropTargetId(null); return; }

    const targetIndex = parent.children.indexOf(targetId);
    if (targetIndex !== -1) {
      moveNode(sourceId, targetNode.parentId, targetIndex);
    }

    setDraggingId(null);
    setDropTargetId(null);
    dragNodeRef.current = null;
  }, [page, moveNode]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDropTargetId(null);
    dragNodeRef.current = null;
  }, []);

  if (!page) {
    return (
      <p className="px-3.5 py-2 text-[11px] italic" style={{ color: '#485a4e' }}>
        No page open
      </p>
    );
  }

  return (
    <div className="py-1">
      <LayerItem
        nodeId={page.rootNodeId}
        depth={0}
        search={search}
        draggingId={draggingId}
        dropTargetId={dropTargetId}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      />
    </div>
  );
});
