/**
 * Root widget — the top-level page container.
 * Never shows in the widget palette. Never wrapped in CanvasNodeWrapper.
 * Its children are the user's top-level sections/containers.
 */

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCanvasStore } from '@nexus/core';
import { NodeRenderer } from '@/components/canvas/NodeRenderer';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

const RootRenderer = memo(function RootRenderer({ nodeId, isPreview }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  const { setNodeRef, isOver } = useDroppable({
    id:   nodeId,
    data: { nodeId, isContainer: true },
  });

  if (!node) return null;

  // Filter out any falsy entries that may have been left by failed addNode calls
  const validChildren = node.children.filter(Boolean) as string[];
  const isEmpty = validChildren.length === 0;

  return (
    <div
      ref={setNodeRef}
      data-testid="root-node"
      className={cn(
        'relative w-full min-h-full flex flex-col',
        isOver && !isPreview && 'bg-emerald/[0.03]',
        'transition-colors duration-150',
      )}
    >
      <SortableContext items={validChildren} strategy={verticalListSortingStrategy}>
        {validChildren.map((childId) => (
          <NodeRenderer key={childId} nodeId={childId} isPreview={isPreview} />
        ))}
      </SortableContext>

      {isEmpty && !isPreview && (
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none',
            isOver && 'opacity-0',
          )}
        >
          <p className="text-xs text-text-muted/40 select-none">
            Drop your first widget here
          </p>
        </div>
      )}
    </div>
  );
});

function RootInspector(_: WidgetInspectorProps) {
  return null; // Root doesn't appear in inspector — page settings do
}

export const RootWidget: WidgetDefinition = {
  type:         'root',
  label:        'Root',
  icon:         LayoutGrid,
  category:     'layout',
  defaultProps: {},
  Renderer:     RootRenderer,
  Inspector:    RootInspector,
};
