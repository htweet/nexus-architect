import { memo } from 'react';
import { Space } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorInput, getVisualNodeStyles } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export interface SpacerProps { height: string; }
const DEFAULTS: SpacerProps = { height: '40px' };

const SpacerRenderer = memo(function SpacerRenderer({ nodeId, isPreview }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  if (!node) return null;
  const p = { ...DEFAULTS, ...(node.props as Partial<SpacerProps>) };
  const visualOverrides = getVisualNodeStyles(node.styles?.base as Record<string, string>);
  return (
    <div style={{ height: p.height, width: '100%', ...visualOverrides }} className="relative">
      {!isPreview && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100">
          <span className="text-[10px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded">{p.height}</span>
        </div>
      )}
    </div>
  );
});

function SpacerInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p = { ...DEFAULTS, ...(node.props as Partial<SpacerProps>) };
  return (
    <div className="px-3 pb-3">
      <InspectorInput label="Height" value={p.height} onChange={(v) => update(nodeId, { height: v })} placeholder="40px" hint="Sets the vertical gap between elements" />
    </div>
  );
}

export const SpacerWidget: WidgetDefinition = {
  type: 'spacer', label: 'Spacer', icon: Space, category: 'layout',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>, keywords: ['gap', 'space', 'padding', 'whitespace'],
  Renderer: SpacerRenderer, Inspector: SpacerInspector,
};
