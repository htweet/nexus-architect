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
 *
 * VAE Task 143: RLS visibility guard + data-bind init on page load.
 * VAE Task 145: previewRole-based visibility check.
 * VAE Task 146: action engine wiring (event handlers on node).
 */

import { memo, useEffect, useMemo } from 'react';
import { Shield } from 'lucide-react';
import { useCanvasStore, useUIStore, useNodeProps, useDataBindStore, actionEngine } from '@nexus/core';
import type { NexusNode } from '@nexus/core';
import { getWidget }      from '@/widgets/registry';
import { CanvasNodeWrapper }   from './CanvasNodeWrapper';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

interface NodeRendererProps {
  nodeId: string;
  isPreview?: boolean | undefined;
}

// ─── RLS visibility check ────────────────────────────────────────────────────

/** Evaluate a condition from a VisibilityRule against the current data-bind values. */
function evaluateRlsCondition(
  condition: { variableId: string; operator: string; value: unknown } | undefined,
  bindValues: Record<string, unknown>,
): boolean {
  if (!condition) return true;
  const actual = bindValues[condition.variableId];
  const expected = condition.value;
  switch (condition.operator) {
    case 'eq':  return actual === expected;
    case 'neq': return actual !== expected;
    case 'gt':  return Number(actual) > Number(expected);
    case 'gte': return Number(actual) >= Number(expected);
    case 'lt':  return Number(actual) < Number(expected);
    case 'lte': return Number(actual) <= Number(expected);
    case 'contains':
      return typeof actual === 'string' && actual.includes(String(expected));
    case 'notContains':
      return typeof actual === 'string' && !actual.includes(String(expected));
    case 'isEmpty':  return actual === '' || actual == null;
    case 'notEmpty': return actual !== '' && actual != null;
    default: return true;
  }
}

function useRlsVisibility(node: NexusNode | undefined | null) {
  const previewRole  = useUIStore((s) => s.previewRole);
  const roleConfig   = useCanvasStore((s) => s.page?.roleConfig);
  const bindValues   = useDataBindStore((s) => s.values);

  return useMemo(() => {
    if (!node) return true;
    const rule = node.rlsVisibility;
    if (!rule || rule.roles.length === 0) return true;

    const hierarchy = roleConfig?.roleHierarchy ?? [];
    const effectiveRole = previewRole ?? roleConfig?.guestRole ?? 'guest';
    const currentIndex = hierarchy.indexOf(effectiveRole);

    // Find the minimum index required (i.e. minimum privileged role in the list)
    const requiredIndices = rule.roles
      .map((r) => hierarchy.indexOf(r))
      .filter((i) => i >= 0);

    if (requiredIndices.length === 0) return true; // roles not in hierarchy = public
    const minRequired = Math.min(...requiredIndices);
    const roleAllowed = currentIndex >= minRequired;

    // If role check fails, no need to evaluate condition
    if (!roleAllowed) return false;

    // Evaluate optional condition (AND logic with role check)
    return evaluateRlsCondition(rule.condition, bindValues);
  }, [node, previewRole, roleConfig, bindValues]);
}

// ─── Action handlers ─────────────────────────────────────────────────────────

function useActionHandlers(node: NexusNode | undefined | null, resolvedProps: Record<string, unknown>) {
  return useMemo(() => {
    if (!node?.actions?.length) return {};
    const handlers: Record<string, (e: React.SyntheticEvent) => void> = {};
    for (const pipeline of node.actions) {
      const trigger = pipeline.trigger;
      const evtName = `on${trigger.charAt(0).toUpperCase()}${trigger.slice(1)}`;
      handlers[evtName] = (e: React.SyntheticEvent) => {
        e.preventDefault?.();
        void actionEngine.execute(pipeline, { event: e.nativeEvent, nodeProps: resolvedProps });
      };
    }
    return handlers;
  }, [node?.actions, resolvedProps]);
}

// ─── NodeRenderer ─────────────────────────────────────────────────────────────

export const NodeRenderer = memo(function NodeRenderer({ nodeId, isPreview }: NodeRendererProps) {
  const node        = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const isPreviewMode = useUIStore((s) => s.isPreviewMode);
  const isVisible   = useRlsVisibility(node);

  // VAE: resolved props (data-bind) — passed to action handlers
  const resolvedProps = useNodeProps(nodeId);
  const actionHandlers = useActionHandlers(node, resolvedProps);

  // Suppress hidden nodes
  if (!node || node.hidden) return null;

  // RLS: in preview/compile mode, fully hide restricted nodes
  if (!isVisible && (isPreview || isPreviewMode)) return null;

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

  // RLS: in edit mode, dim restricted nodes with an overlay badge
  if (!isVisible && !isPreview && !isPreviewMode) {
    const requiredRoles = node.rlsVisibility?.roles ?? [];
    return (
      <WidgetErrorBoundary nodeId={nodeId} nodeType={node.type} isPreview={isPreview ?? false}>
        <CanvasNodeWrapper nodeId={nodeId} isPreview={isPreview}>
          <div style={{ position: 'relative', opacity: 0.3 }} {...actionHandlers}>
            <widgetDef.Renderer nodeId={nodeId} isPreview={isPreview} />
            {/* Role badge overlay */}
            <div
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(18,24,33,0.85)',
                border: '1px solid rgba(16,183,127,0.30)',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 10,
                color: '#10b77f',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              <Shield size={9} strokeWidth={1.5} />
              {requiredRoles.join(', ') || 'restricted'}
            </div>
          </div>
        </CanvasNodeWrapper>
      </WidgetErrorBoundary>
    );
  }

  return (
    <WidgetErrorBoundary nodeId={nodeId} nodeType={node.type} isPreview={isPreview ?? false}>
      <CanvasNodeWrapper nodeId={nodeId} isPreview={isPreview}>
        <div {...(Object.keys(actionHandlers).length > 0 ? actionHandlers : {})}>
          <widgetDef.Renderer nodeId={nodeId} isPreview={isPreview} />
        </div>
      </CanvasNodeWrapper>
    </WidgetErrorBoundary>
  );
});

// ─── Page load init effect (used at app level) ────────────────────────────────

/**
 * Hook to sync data-bind store when the canvas page changes.
 * Should be called once at the app root (e.g. in App.tsx or Canvas).
 */
export function useDataBindPageSync() {
  const page = useCanvasStore((s) => s.page);

  useEffect(() => {
    if (!page) return;
    import('@nexus/core').then(({ useDataBindStore }) => {
      useDataBindStore.getState().initFromPage(page.variables ?? []);
    }).catch(() => {});
  }, [page?.id, page?.variables]);
}
