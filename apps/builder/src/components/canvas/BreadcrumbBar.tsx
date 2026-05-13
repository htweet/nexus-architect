/**
 * BreadcrumbBar -- Canvas selection path navigator.
 *
 * Displays the ancestor chain of the currently selected node as a
 * horizontal breadcrumb trail: Page > Section > Container > Button
 *
 * Clicking any crumb selects that node, letting the designer quickly
 * navigate up the tree without losing context.
 *
 * Placement: absolute bar at the bottom of the canvas page frame.
 */

import { memo, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useCanvasStore, useSelectionStore } from '@nexus/core';
import { getWidget } from '@/widgets/registry';

// --- Types --------------------------------------------------------------------

type BreadcrumbNode = {
  id: string;
  type: string;
  label?: string;
  parentId?: string | null;
};

// --- Ancestor builder ---------------------------------------------------------

function buildAncestorChain(
  nodeMap: Record<string, BreadcrumbNode>,
  targetId: string,
): string[] {
  const chain: string[] = [];
  let current: string | null | undefined = targetId;
  while (current) {
    const node: BreadcrumbNode | undefined = nodeMap[current];
    if (!node) break;
    chain.unshift(current);
    if (node.type === 'root') break;
    current = node.parentId;
  }
  return chain;
}

// --- BreadcrumbBar ------------------------------------------------------------

export const BreadcrumbBar = memo(function BreadcrumbBar() {
  const page       = useCanvasStore((s) => s.page);
  const selectedId = useSelectionStore((s) => s.primarySelectedId);
  const selectNode = useSelectionStore((s) => s.selectNode);

  const chain = useMemo(() => {
    if (!page || !selectedId) return [];
    return buildAncestorChain(
      page.nodeMap as Record<string, BreadcrumbNode>,
      selectedId,
    );
  }, [page, selectedId]);

  // Don't render if nothing is selected or only root is in chain
  if (chain.length <= 1) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex items-center px-4 gap-0.5 select-none pointer-events-auto"
      style={{
        height:      28,
        background:  'rgba(8,12,22,0.92)',
        borderTop:   '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {chain.map((nodeId, idx) => {
        const node      = page?.nodeMap?.[nodeId] as BreadcrumbNode | undefined;
        if (!node) return null;
        const widgetDef = getWidget(node.type);
        const label     = node.label ?? widgetDef?.label ?? node.type;
        const isLast    = idx === chain.length - 1;
        const isRoot    = node.type === 'root';

        return (
          <span key={nodeId} className="flex items-center gap-0.5">
            {idx > 0 && (
              <ChevronRight
                size={9}
                strokeWidth={1.5}
                style={{ color: 'rgba(255,255,255,0.20)', flexShrink: 0 }}
              />
            )}
            <button
              onClick={() => { if (!isRoot) selectNode(nodeId); }}
              disabled={isRoot}
              className="px-1.5 py-0.5 rounded transition-colors duration-100"
              style={{
                fontFamily:    "'JetBrains Mono', 'Fira Code', monospace",
                fontSize:      10,
                fontWeight:    isLast ? 600 : 400,
                letterSpacing: '0.05em',
                color: isLast
                  ? '#10b77f'
                  : isRoot
                    ? 'rgba(255,255,255,0.25)'
                    : 'rgba(255,255,255,0.50)',
                cursor: isRoot ? 'default' : 'pointer',
                textTransform: 'capitalize',
              }}
              onMouseEnter={(e) => {
                if (!isRoot && !isLast) e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
              }}
              onMouseLeave={(e) => {
                if (!isRoot && !isLast) e.currentTarget.style.color = 'rgba(255,255,255,0.50)';
              }}
            >
              {isRoot ? 'Page' : label}
            </button>
          </span>
        );
      })}
    </div>
  );
});
