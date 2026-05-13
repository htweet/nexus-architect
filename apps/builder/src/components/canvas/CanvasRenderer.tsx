/**
 * CanvasRenderer — The Nexus Architect Canvas Render Loop.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  ARCHITECTURAL OVERVIEW                                         │
 * │                                                                 │
 * │  JSON Tree (Zustand pageStore)                                  │
 * │       │                                                         │
 * │       ▼                                                         │
 * │  CanvasRenderer  ──► nodeMap[rootNodeId]                        │
 * │       │                                                         │
 * │       ▼  (recursive)                                            │
 * │  NodeRenderer ──► getWidget(node.type) ──► widgetDef.Renderer   │
 * │       │                         ↑                               │
 * │       │               WidgetRegistry lookup                     │
 * │       │                                                         │
 * │       ▼  (edit mode only)                                       │
 * │  CanvasNodeWrapper ──► selection ring, DnD handles, context menu│
 * │                                                                 │
 * │  Every widget accesses its own config via:                      │
 * │    const node = useCanvasStore(s => s.page?.nodeMap?.[nodeId])  │
 * │    const { text, color, ... } = node.props                      │
 * │                                                                 │
 * │  Smart Components use useNexusContext() to switch behaviour:    │
 * │    const { isEdit } = useNexusContext()                         │
 * │    // disable real API calls while designing                    │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * This component is the ONLY entry-point into the render tree.
 * It is consumed by both Canvas.tsx (edit) and the preview compiler.
 */

import { memo } from 'react';
import { useCanvasStore } from '@nexus/core';
import { NodeRenderer }   from './NodeRenderer';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasRendererProps {
  /**
   * When true the entire tree renders without CanvasNodeWrapper chrome —
   * no selection rings, no drag handles, no context menus.
   * Used by the preview tab and the static HTML compiler.
   */
  isPreview?: boolean;
}

// ─── CanvasRenderer ───────────────────────────────────────────────────────────

export const CanvasRenderer = memo(function CanvasRenderer({ isPreview = false }: CanvasRendererProps) {
  const page = useCanvasStore((s) => s.page);

  if (!page) return null;

  /*
   * The recursive descent starts at rootNodeId.
   * NodeRenderer handles the full tree via its own recursive calls to itself
   * for every child listed in node.children.
   *
   * Widget rendering pipeline per node:
   *   1. getWidget(node.type)         — registry lookup (O(1) Map)
   *   2. widgetDef.Renderer           — the React component
   *   3. props injected via nodeId    — widget reads from store
   *   4. CanvasNodeWrapper (edit only) — selection / DnD chrome
   */
  return (
    <NodeRenderer
      nodeId={page.rootNodeId}
      isPreview={isPreview}
    />
  );
});
