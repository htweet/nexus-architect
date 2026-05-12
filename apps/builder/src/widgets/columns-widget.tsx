/**
 * Columns widget — a row of equal-width droppable column containers.
 * When dropped on the canvas, auto-creates N child "column" container nodes.
 */

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Columns2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCanvasStore } from '@nexus/core';
import { NodeRenderer } from '@/components/canvas/NodeRenderer';
import { InspectorInput, InspectorToggle, InspectorSection } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps, ChildNodeSpec } from './registry';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ColumnsProps {
  columnCount: number;
  gap:         string;
  padding:     string;
  background:  string;
  minHeight:   string;
  verticalAlign: string;
}

const DEFAULTS: ColumnsProps = {
  columnCount:   2,
  gap:           '16px',
  padding:       '40px 16px',
  background:    '',
  minHeight:     '80px',
  verticalAlign: 'stretch',
};

// ─── Single droppable column slot ─────────────────────────────────────────────

const ColumnSlot = memo(function ColumnSlot({ nodeId, isPreview }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const { setNodeRef, isOver } = useDroppable({
    id:   `drop:${nodeId}`,
    data: { nodeId, isContainer: true },
  });
  if (!node) return null;

  const validChildren = node.children.filter(Boolean) as string[];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 flex flex-col min-w-0 transition-colors duration-150',
        isOver && !isPreview && 'ring-2 ring-inset ring-emerald-400/40 bg-emerald-400/[0.04]',
      )}
      style={{ minHeight: '80px' }}
    >
      <SortableContext items={validChildren} strategy={verticalListSortingStrategy}>
        {validChildren.map((id) => <NodeRenderer key={id} nodeId={id} isPreview={isPreview} />)}
      </SortableContext>
      {validChildren.length === 0 && !isPreview && (
        <div className="flex-1 flex items-center justify-center pointer-events-none opacity-30">
          <p className="text-xs text-gray-400 select-none">Drop here</p>
        </div>
      )}
    </div>
  );
});

// ─── Renderer ────────────────────────────────────────────────────────────────

const ColumnsRenderer = memo(function ColumnsRenderer({ nodeId, isPreview }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  if (!node) return null;

  const p = { ...DEFAULTS, ...(node.props as Partial<ColumnsProps>) };
  const validChildren = node.children.filter(Boolean) as string[];

  return (
    <div
      className="w-full flex flex-row"
      style={{
        gap:            p.gap,
        padding:        p.padding,
        background:     p.background || undefined,
        minHeight:      p.minHeight,
        alignItems:     p.verticalAlign,
      }}
    >
      {validChildren.length > 0
        ? validChildren.map((id) => <ColumnSlot key={id} nodeId={id} isPreview={isPreview} />)
        : Array.from({ length: p.columnCount }).map((_, i) => (
            <div key={i} className="flex-1 flex items-center justify-center opacity-20 min-h-[60px]">
              <span className="text-xs text-gray-400">Col {i + 1}</span>
            </div>
          ))
      }
    </div>
  );
});

// ─── Inspector ────────────────────────────────────────────────────────────────

function ColumnsInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p   = { ...DEFAULTS, ...(node.props as Partial<ColumnsProps>) };
  const set = (k: keyof ColumnsProps) => (v: string) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Columns" />
      <InspectorToggle
        label="Count"
        value={String(p.columnCount)}
        options={[
          { value: '2', label: '2' },
          { value: '3', label: '3' },
          { value: '4', label: '4' },
        ]}
        onChange={(v) => update(nodeId, { columnCount: Number(v) })}
      />
      <InspectorInput label="Gap"        value={p.gap}       onChange={set('gap')}       placeholder="16px" />
      <InspectorInput label="Padding"    value={p.padding}   onChange={set('padding')}   placeholder="40px 16px" />
      <InspectorInput label="Min Height" value={p.minHeight} onChange={set('minHeight')} placeholder="80px" />
      <InspectorToggle
        label="Align"
        value={p.verticalAlign}
        options={[
          { value: 'stretch',    label: 'Stretch' },
          { value: 'flex-start', label: 'Top'     },
          { value: 'center',     label: 'Middle'  },
          { value: 'flex-end',   label: 'Bottom'  },
        ]}
        onChange={set('verticalAlign')}
      />
    </div>
  );
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const ColumnsWidget: WidgetDefinition = {
  type:         'columns',
  label:        'Columns',
  icon:         Columns2,
  category:     'layout',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['row', 'columns', 'grid', 'layout', 'section', '2col', '3col'],
  createChildNodes: (props): ChildNodeSpec[] => {
    const count = (props.columnCount as number) ?? 2;
    return Array.from({ length: count }, (_, i) => ({
      type:  'container',
      label: `Column ${i + 1}`,
      props: { direction: 'column', gap: '0px', padding: '0px', background: '', minHeight: '80px' },
    }));
  },
  Renderer:  ColumnsRenderer,
  Inspector: ColumnsInspector,
};
