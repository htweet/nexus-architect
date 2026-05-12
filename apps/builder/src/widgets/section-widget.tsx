/**
 * Section widget — a full-width horizontal row with background/padding controls.
 * Equivalent to Elementor's "Section". Contains one droppable inner zone.
 */

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { RectangleHorizontal } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCanvasStore } from '@nexus/core';
import { NodeRenderer } from '@/components/canvas/NodeRenderer';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export interface SectionProps {
  padding:         string;
  background:      string;
  backgroundImage: string;
  minHeight:       string;
  maxWidth:        string;
  textColor:       string;
}

const DEFAULTS: SectionProps = {
  padding:         '64px 20px',
  background:      '',
  backgroundImage: '',
  minHeight:       '120px',
  maxWidth:        '1200px',
  textColor:       '',
};

const SectionRenderer = memo(function SectionRenderer({ nodeId, isPreview }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const { setNodeRef, isOver } = useDroppable({
    id:   `drop:${nodeId}`,
    data: { nodeId, isContainer: true },
  });
  if (!node) return null;

  const p = { ...DEFAULTS, ...(node.props as Partial<SectionProps>) };
  const validChildren = node.children.filter(Boolean) as string[];

  return (
    <div
      className="w-full"
      style={{
        padding:         p.padding,
        background:      p.background || undefined,
        backgroundImage: p.backgroundImage ? `url(${p.backgroundImage})` : undefined,
        backgroundSize:  'cover',
        backgroundPosition: 'center',
        minHeight:       p.minHeight,
        color:           p.textColor || undefined,
      }}
    >
      <div
        ref={setNodeRef}
        className={cn(
          'mx-auto flex flex-col transition-colors duration-150',
          isOver && !isPreview && 'ring-2 ring-inset ring-emerald-400/40 bg-emerald-400/[0.04]',
        )}
        style={{ maxWidth: p.maxWidth, minHeight: '60px' }}
      >
        <SortableContext items={validChildren} strategy={verticalListSortingStrategy}>
          {validChildren.map((id) => <NodeRenderer key={id} nodeId={id} isPreview={isPreview} />)}
        </SortableContext>
        {validChildren.length === 0 && !isPreview && (
          <div className="flex-1 flex items-center justify-center pointer-events-none opacity-30 py-8">
            <p className="text-xs text-gray-400 select-none">Drop widgets here</p>
          </div>
        )}
      </div>
    </div>
  );
});

function SectionInspector({ nodeId }: WidgetInspectorProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  if (!node) return null;

  return (
    <div className="px-4 py-4 flex flex-col gap-3">
      <div
        className="rounded-lg px-4 py-4 flex flex-col gap-1.5"
        style={{ background: 'rgba(16,183,127,0.06)', border: '1px solid rgba(16,183,127,0.15)' }}
      >
        <p className="text-[12px] font-semibold" style={{ color: '#50dea3' }}>
          Section container
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: '#bbcabf' }}>
          Drag widgets into this section from the left panel. Use the <strong style={{ color: '#dde4dd' }}>Style</strong> tab to set background, padding, min height, and other visual properties.
        </p>
      </div>
    </div>
  );
}

export const SectionWidget: WidgetDefinition = {
  type:         'section',
  label:        'Section',
  icon:         RectangleHorizontal,
  category:     'layout',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['row', 'section', 'wrapper', 'hero', 'band', 'stripe'],
  Renderer:     SectionRenderer,
  Inspector:    SectionInspector,
};
