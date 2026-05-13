import { memo } from 'react';
import { Minus } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorInput, InspectorSelect, InspectorSection, InspectorColor, getVisualNodeStyles } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export interface DividerProps {
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  color: string;
  thickness: string;
  width: string;
  margin: string;
}
const DEFAULTS: DividerProps = { style: 'solid', color: '#E5E7EB', thickness: '1px', width: '100%', margin: '16px 0' };

const DividerRenderer = memo(function DividerRenderer({ nodeId }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  if (!node) return null;
  const p = { ...DEFAULTS, ...(node.props as Partial<DividerProps>) };
  const visualOverrides = getVisualNodeStyles(node.styles?.base as Record<string, string>);
  return (
    <hr style={{ borderStyle: p.style, borderColor: p.color, borderTopWidth: p.thickness, width: p.width, margin: p.margin, ...visualOverrides }} />
  );
});

function DividerInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p   = { ...DEFAULTS, ...(node.props as Partial<DividerProps>) };
  const set = (k: keyof DividerProps) => (v: string) => update(nodeId, { [k]: v });
  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Style" />
      <InspectorSelect label="Line Style" value={p.style}
        options={[{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }, { value: 'double', label: 'Double' }]}
        onChange={set('style')} />
      <InspectorColor label="Color" value={p.color} onChange={set('color')} />
      <InspectorInput label="Thickness" value={p.thickness} onChange={set('thickness')} placeholder="1px" />
      <InspectorInput label="Width"     value={p.width}     onChange={set('width')}     placeholder="100%" />
      <InspectorInput label="Margin"    value={p.margin}    onChange={set('margin')}    placeholder="16px 0" />
    </div>
  );
}

export const DividerWidget: WidgetDefinition = {
  type: 'divider', label: 'Divider', icon: Minus, category: 'content',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>, keywords: ['hr', 'line', 'separator', 'rule'],
  Renderer: DividerRenderer, Inspector: DividerInspector,
};
