/**
 * NexusGrid — CSS Grid layout widget with nested drop zones.
 *
 * This widget demonstrates the "fully wired" nested container pattern:
 *
 *   JSON node (type: 'nexus-grid')
 *     props.columns:   "3"       → gridTemplateColumns: "repeat(3, 1fr)"
 *     props.gap:       "16px"    → gap: "16px"
 *     props.styles:    {...}     → useDynamicStyles() memoized object
 *     node.children:   [id, id, id] → recursively rendered via NodeRenderer
 *
 * The SortableContext wraps the children array so items can be reordered
 * or dragged out/in via the existing DnD infrastructure in Builder.tsx.
 *
 * useNexusContext() makes the edit-mode drop indicator conditional:
 *   • Edit mode  — dashed border + "Drop here" hint when empty
 *   • Preview    — clean, chrome-free output
 */

import { memo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { LayoutGrid } from 'lucide-react';
import { useCanvasStore, useNexusContext } from '@nexus/core';
import { NodeRenderer } from '@/components/canvas/NodeRenderer';
import { useDynamicStyles } from '@/hooks/useDynamicStyles';
import { getVisualNodeStyles } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';
import { InspectorInput, InspectorSection } from './shared';

// ─── Config ───────────────────────────────────────────────────────────────────

interface GridConfig {
  columns:      string | number;  // e.g. "3" | "1fr 2fr" | "repeat(3,1fr)"
  rows:         string;           // e.g. "auto" | "200px 1fr"
  gap:          string;
  columnGap:    string;
  rowGap:       string;
  minRowHeight: string;
  autoFlow:     'row' | 'column' | 'dense';
  styles:       Record<string, string | number>;
}

const DEFAULTS: GridConfig = {
  columns:      '3',
  rows:         'auto',
  gap:          '16px',
  columnGap:    '',
  rowGap:       '',
  minRowHeight: 'auto',
  autoFlow:     'row',
  styles:       {},
};

// ─── Renderer ─────────────────────────────────────────────────────────────────

const NexusGridRenderer = memo(function NexusGridRenderer({ nodeId, isPreview }: WidgetRendererProps) {
  const node       = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const { isEdit } = useNexusContext();

  // Droppable target for palette items dropped directly onto the grid
  const { setNodeRef, isOver } = useDroppable({
    id:   `drop:${nodeId}`,
    data: { accepts: 'widget', containerId: nodeId },
  });

  if (!node) return null;

  const c              = { ...DEFAULTS, ...(node.props as Partial<GridConfig>) };
  const dynamicStyles  = useDynamicStyles(c.styles);
  const visualStyles   = getVisualNodeStyles(node.styles?.base);

  // Build grid template columns — expand pure integer shorthand
  const colTemplate = /^\d+$/.test(String(c.columns))
    ? `repeat(${c.columns}, 1fr)`
    : String(c.columns);

  const children = node.children ?? [];
  const isEmpty  = children.length === 0;

  const gridStyle: React.CSSProperties = {
    display:             'grid',
    gridTemplateColumns: colTemplate,
    gridTemplateRows:    c.rows || 'auto',
    gap:                 c.gap || undefined,
    columnGap:           c.columnGap || undefined,
    rowGap:              c.rowGap    || undefined,
    gridAutoFlow:        c.autoFlow,
    minHeight:           isEmpty && isEdit ? 80 : undefined,
    width:               '100%',
    // Edit-mode drop highlight
    outline: isEdit && isOver ? '2px dashed #10b77f' : undefined,
    outlineOffset: 2,
    ...dynamicStyles,
    ...visualStyles,
  };

  return (
    <div ref={setNodeRef} style={gridStyle} data-nexus-type="nexus-grid">
      <SortableContext items={children} strategy={verticalListSortingStrategy}>
        {children.map((childId) => (
          <NodeRenderer key={childId} nodeId={childId} isPreview={isPreview} />
        ))}
      </SortableContext>

      {/* Empty-state hint — edit mode only */}
      {isEmpty && isEdit && (
        <div
          className="col-span-full flex items-center justify-center rounded-lg text-[11px] font-medium"
          style={{
            minHeight:    80,
            border:       '1px dashed rgba(16,183,127,0.30)',
            color:        'rgba(16,183,127,0.50)',
            background:   'rgba(16,183,127,0.04)',
            pointerEvents: 'none',
          }}
        >
          Drop widgets into this Grid
        </div>
      )}
    </div>
  );
});

// ─── Inspector ────────────────────────────────────────────────────────────────

function NexusGridInspector({ nodeId }: WidgetInspectorProps) {
  const node            = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const updateNodeProps = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;

  const c   = { ...DEFAULTS, ...(node.props as Partial<GridConfig>) };
  const set = (key: keyof GridConfig, value: unknown) =>
    updateNodeProps(nodeId, { ...node.props, [key]: value });

  return (
    <>
      <InspectorSection label="Grid Template" />
      <div className="flex flex-col gap-3 px-3 py-2">
        <InspectorInput label="Columns" value={String(c.columns)} onChange={(v) => set('columns', v)}
          placeholder='3  or  "1fr 2fr"' />
        <InspectorInput label="Rows"    value={c.rows}            onChange={(v) => set('rows', v)}
          placeholder="auto" />
        <InspectorInput label="Gap"     value={c.gap}             onChange={(v) => set('gap', v)}
          placeholder="16px" />
        <InspectorInput label="Col Gap" value={c.columnGap}       onChange={(v) => set('columnGap', v)}
          placeholder="inherit from Gap" />
        <InspectorInput label="Row Gap" value={c.rowGap}          onChange={(v) => set('rowGap', v)}
          placeholder="inherit from Gap" />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.40)' }}>
            Auto Flow
          </label>
          <select
            value={c.autoFlow}
            onChange={(e) => set('autoFlow', e.target.value)}
            className="h-8 rounded px-2 text-[12px]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: '#dde4dd' }}
          >
            <option value="row">Row</option>
            <option value="column">Column</option>
            <option value="dense">Dense</option>
          </select>
        </div>
      </div>
    </>
  );
}

// ─── Widget Definition ────────────────────────────────────────────────────────

export const NexusGridWidget: WidgetDefinition = {
  type:         'nexus-grid',
  label:        'Grid',
  icon:         LayoutGrid,
  category:     'layout',
  keywords:     ['grid', 'css grid', 'layout', 'columns', 'rows', 'container'],
  defaultProps: { ...DEFAULTS },
  Renderer:     NexusGridRenderer,
  Inspector:    NexusGridInspector,
  createChildNodes: () => [],  // Grid starts empty — user drops widgets in
};
