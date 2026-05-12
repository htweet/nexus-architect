/**
 * Container widget — a flexbox div that holds child widgets.
 * Acts as both a draggable node AND a droppable zone.
 */

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCanvasStore } from '@nexus/core';
import { NodeRenderer } from '@/components/canvas/NodeRenderer';
import { InspectorToggle, InspectorSection } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

// ─── Default props ────────────────────────────────────────────────────────────

export interface ContainerProps {
  direction:  'column' | 'row';
  justify:    string;
  align:      string;
  gap:        string;
  padding:    string;
  background: string;
  minHeight:  string;
}

const DEFAULTS: ContainerProps = {
  direction:  'column',
  justify:    'flex-start',
  align:      'stretch',
  gap:        '0px',
  padding:    '16px',
  background: '',
  minHeight:  '80px',
};

// ─── Renderer ────────────────────────────────────────────────────────────────

const ContainerRenderer = memo(function ContainerRenderer({ nodeId, isPreview }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const { setNodeRef, isOver } = useDroppable({
    id:   `drop:${nodeId}`,
    data: { nodeId, isContainer: true },
  });

  if (!node) return null;

  const p = { ...DEFAULTS, ...(node.props as Partial<ContainerProps>) };
  const strategy = p.direction === 'row' ? horizontalListSortingStrategy : verticalListSortingStrategy;
  // Filter out any stale falsy entries that may appear in the children array
  const validChildren = node.children.filter(Boolean) as string[];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-full transition-colors duration-150',
        isOver && !isPreview && 'ring-2 ring-inset ring-emerald/40 bg-emerald/[0.04]',
      )}
      style={{
        flexDirection:  p.direction,
        justifyContent: p.justify,
        alignItems:     p.align,
        gap:            p.gap,
        padding:        p.padding,
        background:     p.background || undefined,
        minHeight:      p.minHeight,
      }}
    >
      <SortableContext items={validChildren} strategy={strategy}>
        {validChildren.map((childId) => (
          <NodeRenderer key={childId} nodeId={childId} isPreview={isPreview} />
        ))}
      </SortableContext>

      {validChildren.length === 0 && !isPreview && (
        <div className="flex-1 flex items-center justify-center pointer-events-none opacity-40">
          <p className="text-xs text-text-muted select-none">Drop here</p>
        </div>
      )}
    </div>
  );
});

// ─── Inspector ────────────────────────────────────────────────────────────────

function ContainerInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;

  const p   = { ...DEFAULTS, ...(node.props as Partial<ContainerProps>) };
  const set = (k: keyof ContainerProps) => (v: string) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Layout" />
      <InspectorToggle
        label="Direction"
        value={p.direction}
        options={[{ value: 'column', label: '↕ Column' }, { value: 'row', label: '↔ Row' }]}
        onChange={set('direction')}
      />
      <p className="text-[11px] leading-relaxed px-0.5" style={{ color: '#bbcabf' }}>
        Use the <strong style={{ color: '#dde4dd' }}>Style</strong> tab to configure gap, padding, min height, and all other visual properties.
      </p>
    </div>
  );
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const ContainerWidget: WidgetDefinition = {
  type:         'container',
  label:        'Container',
  icon:         LayoutGrid,
  category:     'layout',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['div', 'wrapper', 'box', 'flex', 'section'],
  Renderer:     ContainerRenderer,
  Inspector:    ContainerInspector,
};
