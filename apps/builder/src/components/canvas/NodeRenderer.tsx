/**
 * NodeRenderer — the recursive heart of the canvas.
 *
 * Architectural note:
 *   This component knows nothing about specific widgets. It queries the
 *   WidgetRegistry for the node's type and delegates all rendering to
 *   that widget's `Renderer` component. This keeps the renderer open
 *   for extension (new widgets) without modification.
 *
 *   Root node: rendered bare (no selection chrome) — it IS the canvas.
 *   All other nodes: wrapped in CanvasNodeWrapper for selection/DnD chrome.
 *
 * Phase 9.2: Every render path is wrapped in WidgetErrorBoundary so that
 *   a single broken widget cannot crash the entire canvas tree.
 */

import { memo } from 'react';
import { useCanvasStore } from '@nexus/core';
import { getWidget }      from '@/widgets/registry';
import { CanvasNodeWrapper }   from './CanvasNodeWrapper';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

interface NodeRendererProps {
  nodeId: string;
  isPreview?: boolean | undefined;
}

export const NodeRenderer = memo(function NodeRenderer({ nodeId, isPreview }: NodeRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);

  if (!node || node.hidden) return null;

  const widgetDef = getWidget(node.type);

  if (!widgetDef) {
    // Unknown widget type — render a warning placeholder in edit mode only
    if (isPreview) return null;
    return (
      <div className="p-3 text-xs text-error border border-error/20 rounded bg-error/5">
        Unknown widget type: <code className="font-mono">{node.type}</code>
      </div>
    );
  }

  // Root is special — no chrome, no DnD wrapper
  if (node.type === 'root') {
    return (
      <WidgetErrorBoundary nodeId={nodeId} nodeType={node.type} isPreview={isPreview ?? false}>
        <widgetDef.Renderer nodeId={nodeId} isPreview={isPreview} />
      </WidgetErrorBoundary>
    );
  }

  return (
    <WidgetErrorBoundary nodeId={nodeId} nodeType={node.type} isPreview={isPreview ?? false}>
      <CanvasNodeWrapper nodeId={nodeId} isPreview={isPreview}>
        <widgetDef.Renderer nodeId={nodeId} isPreview={isPreview} />
      </CanvasNodeWrapper>
    </WidgetErrorBoundary>
  );
});
