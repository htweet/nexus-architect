/**
 * Builder — root layout shell.
 *
 * Phase 3 upgrades:
 *   • DragOverContext.Provider wraps the tree so containers can read overId
 *   • onDragOver tracks the active overId for visual drop indicators
 *   • handleDragEnd fixes cross-parent drops (node over a sibling in another container)
 *   • Undo/Redo wired to HistoryStore + keyboard shortcuts Ctrl+Z / Ctrl+Shift+Z
 *
 * Figma-fluid DnD upgrade:
 *   • SmartGuidesOverlay — DOM-aware distance guide lines + pixel badges
 *   • Fluid insertion line — thin blue line between siblings
 *   • DragGhost — 1:1 widget clone with rotate(2deg) + drop shadow
 *   • Cursor tooltip — live W/H and X/Y readout
 */

import { useEffect, useCallback, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { cn } from '@/lib/cn';
import { TopBar }     from '@/components/TopBar';
import { LeftPanel }  from '@/components/LeftPanel';
import { RightPanel }   from '@/components/RightPanel';
import { Canvas }     from '@/components/Canvas';
import { SmartGuidesOverlay } from '@/components/canvas/SmartGuidesOverlay';
import {
  useUIStore, useUserStore, useCanvasStore, useSelectionStore,
  useHistoryStore,
} from '@nexus/core';
import { getWidget }  from '@/widgets/registry';
import type { ChildNodeSpec } from '@/widgets/registry';
import { createNode, createPage } from '@nexus/core';
import { DragOverProvider } from '@/contexts/DragOverContext';
import { pushHistory } from '@/lib/history';
import { useAutoSave }   from '@/hooks/useAutoSave';
import { usePresence }   from '@/hooks/usePresence';
import { SaveErrorToast } from '@/components/ui/SaveErrorToast';

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────

function useBuilderShortcuts() {
  const setBreakpoint   = useUIStore((s) => s.setBreakpoint);
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel= useUIStore((s) => s.toggleRightPanel);
  const isPreviewMode   = useUIStore((s) => s.isPreviewMode);
  const enterPreview    = useUIStore((s) => s.enterPreview);
  const exitPreview     = useUIStore((s) => s.exitPreview);
  const zoomIn          = useUIStore((s) => s.zoomIn);
  const zoomOut         = useUIStore((s) => s.zoomOut);
  const resetZoom       = useUIStore((s) => s.resetZoom);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (target.contentEditable === 'true') return;

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          e.preventDefault();
          const entry = useHistoryStore.getState().redo();
          if (entry) useCanvasStore.getState().loadPage(entry.snapshot);
        } else {
          e.preventDefault();
          const currentPage = useCanvasStore.getState().page ?? undefined;
          const entry = useHistoryStore.getState().undo(currentPage);
          if (entry) useCanvasStore.getState().loadPage(entry.snapshot);
        }
        return;
      }

      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'd' || e.key === 'D') setBreakpoint('desktop');
        if (e.key === 't' || e.key === 'T') setBreakpoint('tablet');
        if (e.key === 'm' || e.key === 'M') setBreakpoint('mobile');
        if (e.key === 'p' || e.key === 'P') isPreviewMode ? exitPreview() : enterPreview();
        if (e.key === 'Escape') {
          if (isPreviewMode) { exitPreview(); return; }
          const { editingNodeId, setEditingNode } = useSelectionStore.getState();
          if (editingNodeId) { setEditingNode(null); return; }
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && !isPreviewMode) {
          const { primarySelectedId, clearSelection } = useSelectionStore.getState();
          if (primarySelectedId) {
            pushHistory('Delete');
            useCanvasStore.getState().removeNode(primarySelectedId);
            clearSelection();
          }
        }
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn(); }
        if (e.key === '-')                  { e.preventDefault(); zoomOut(); }
        if (e.key === '0')                  { e.preventDefault(); resetZoom(); }
        if ((e.key === 'd' || e.key === 'D') && !e.shiftKey) {
          e.preventDefault();
          const { primarySelectedId, selectNode } = useSelectionStore.getState();
          if (primarySelectedId) {
            pushHistory('Duplicate');
            const newId = useCanvasStore.getState().duplicateNode(primarySelectedId);
            if (newId) selectNode(newId);
          }
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        if (e.key === 'l' || e.key === 'L') { e.preventDefault(); toggleLeftPanel(); }
        if (e.key === 'r' || e.key === 'R') { e.preventDefault(); toggleRightPanel(); }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPreviewMode, setBreakpoint, enterPreview, exitPreview, zoomIn, zoomOut, resetZoom, toggleLeftPanel, toggleRightPanel]);
}

// ─── DnD helpers ─────────────────────────────────────────────────────────────

const CONTAINER_TYPES = new Set(['root', 'container', 'section']);

function resolveDropContainer(overId: string): string | null {
  const page = useCanvasStore.getState().page;
  if (!page) return null;
  if (overId === 'canvas-frame') return page.rootNodeId;
  const stripped = String(overId).replace(/^drop:/, '');
  if (page.nodeMap[stripped]) {
    const node = page.nodeMap[stripped]!;
    if (CONTAINER_TYPES.has(node.type)) return stripped;
    return node.parentId ?? page.rootNodeId;
  }
  return page.rootNodeId;
}

function resolveCanvasDropTarget(
  activeNodeId: string,
  overId: string,
): { parentId: string; index: number } | null {
  const page = useCanvasStore.getState().page;
  if (!page) return null;

  const hasDropPrefix = String(overId).startsWith('drop:');
  const stripped   = String(overId).replace(/^drop:/, '');
  const overNode   = page.nodeMap[stripped];
  const activeNode = page.nodeMap[activeNodeId];
  if (!activeNode) return null;
  if (!overNode)   return null;

  if (hasDropPrefix && CONTAINER_TYPES.has(overNode.type)) {
    const validChildren = overNode.children.filter((c) => c !== activeNodeId && Boolean(c));
    return { parentId: stripped, index: validChildren.length };
  }

  if (!hasDropPrefix && overNode.type === 'root') {
    const validChildren = overNode.children.filter((c) => c !== activeNodeId && Boolean(c));
    return { parentId: stripped, index: validChildren.length };
  }

  const parentId = overNode.parentId ?? page.rootNodeId;
  const parent   = page.nodeMap[parentId];
  if (!parent) return null;

  const validChildren = parent.children.filter(Boolean);
  let idx = validChildren.indexOf(stripped);
  if (idx === -1) idx = validChildren.length;

  if (activeNode.parentId === parentId) {
    const oldIdx     = validChildren.indexOf(activeNodeId);
    const newChildren = arrayMove(validChildren, oldIdx, idx);
    const finalIdx    = newChildren.indexOf(activeNodeId);
    return { parentId, index: finalIdx };
  }

  return { parentId, index: idx };
}

// ─── Drag Ghost — 1:1 widget clone rendered inside DragOverlay ───────────────

function DragGhost({ nodeId }: { nodeId: string }) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  if (!node) return null;
  const widgetDef = getWidget(node.type);
  if (!widgetDef) return null;
  // Render the widget's own Renderer in isolation (no CanvasNodeWrapper chrome,
  // no useSortable — so no isDragging opacity applied).
  return <widgetDef.Renderer nodeId={nodeId} isPreview />;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function Builder() {
  useBuilderShortcuts();
  useAutoSave();
  usePresence();

  const isPreviewMode   = useUIStore((s) => s.isPreviewMode);
  const rightPanelOpen  = useUIStore((s) => s.rightPanelOpen);
  const isUserLoading   = useUserStore((s) => s.isLoading);

  const [activeDragType,  setActiveDragType]  = useState<'palette' | 'canvas' | null>(null);
  const [activeDragId,    setActiveDragId]    = useState<string | null>(null);
  const [activeDragLabel, setActiveDragLabel] = useState<string>('');
  const [dragOverState, setDragOverState] = useState<{ activeId: string | null; overId: string | null }>({
    activeId: null, overId: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data   = event.active.data.current;
    const nodeId = String(event.active.id);
    setDragOverState({ activeId: nodeId, overId: null });

    if (data?.type === 'palette') {
      const def = getWidget(data.widgetType as string);
      setActiveDragType('palette');
      setActiveDragId(null);
      setActiveDragLabel(def?.label ?? String(data.widgetType));
    } else {
      setActiveDragType('canvas');
      setActiveDragId(nodeId);
      const node = useCanvasStore.getState().page?.nodeMap[nodeId];
      const def  = node ? getWidget(node.type) : undefined;
      setActiveDragLabel(node?.label ?? def?.label ?? 'Element');
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setDragOverState({
      activeId: String(event.active.id),
      overId:   event.over ? String(event.over.id) : null,
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragType(null);
    setActiveDragId(null);
    setActiveDragLabel('');
    setDragOverState({ activeId: null, overId: null });

    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;

    // ── Palette drop → create new node ──────────────────────────────────────
    if (activeData?.type === 'palette') {
      const widgetType = activeData.widgetType as string;
      const widgetDef  = getWidget(widgetType);
      if (!widgetDef) return;

      let page = useCanvasStore.getState().page;
      if (!page) {
        page = createPage({ title: 'Untitled Page', slug: 'untitled-page' });
        useCanvasStore.getState().loadPage(page);
      }

      const targetId = resolveDropContainer(String(over.id));
      if (!targetId) return;

      pushHistory(`Add ${widgetDef.label}`);

      const newNode = createNode({
        id:    `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        type:  widgetType,
        props: { ...widgetDef.defaultProps },
      });

      useCanvasStore.getState().addNode(newNode, targetId);

      if (widgetDef.createChildNodes) {
        const childSpecs = widgetDef.createChildNodes({ ...widgetDef.defaultProps });
        const addChildrenRecursive = (specs: ChildNodeSpec[], parentId: string) => {
          specs.forEach((spec) => {
            const child = createNode({
              id:    `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
              type:  spec.type,
              props: spec.props,
              ...(spec.label !== undefined && { label: spec.label }),
            });
            useCanvasStore.getState().addNode(child, parentId);
            if (spec.children?.length) addChildrenRecursive(spec.children, child.id);
          });
        };
        addChildrenRecursive(childSpecs, newNode.id);
      }

      useSelectionStore.getState().selectNode(newNode.id);
      return;
    }

    // ── Canvas drag → reorder / cross-parent move ────────────────────────────
    if (active.id === over.id) return;

    const result = resolveCanvasDropTarget(String(active.id), String(over.id));
    if (!result) return;

    const { parentId: newParentId, index: newIndex } = result;
    const page = useCanvasStore.getState().page;
    if (!page) return;

    const activeNode = page.nodeMap[String(active.id)];
    if (!activeNode) return;

    const isSamePosition =
      activeNode.parentId === newParentId &&
      page.nodeMap[newParentId]?.children.indexOf(String(active.id)) === newIndex;

    if (isSamePosition) return;

    pushHistory('Move Element');
    useCanvasStore.getState().moveNode(String(active.id), newParentId, newIndex);
  }, []);

  if (isUserLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-space">
        <div className="flex flex-col items-center gap-4">
          <svg width="48" height="48" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse">
            <defs>
              <linearGradient id="builder-boot-grad" x1="0" y1="0" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop offset="0%"   stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
            <rect width="26" height="26" rx="6" fill="url(#builder-boot-grad)" />
            <path d="M7 19V7H9.6L16.4 15.4V7H19V19H16.4L9.6 10.6V19H7Z" fill="white" />
          </svg>
          <p className="text-sm text-text-muted">Initializing builder…</p>
        </div>
      </div>
    );
  }

  return (
    <DragOverProvider value={dragOverState}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div data-testid="builder-shell" className="builder-shell">
          {!isPreviewMode && <TopBar />}
          <div className="builder-workarea">
            {!isPreviewMode && <LeftPanel />}
            <Canvas />
            {!isPreviewMode && rightPanelOpen && <RightPanel />}
          </div>
        </div>

        {/* Figma-fluid drag overlays — mounted inside DndContext for useDndMonitor access */}
        {!isPreviewMode && <SmartGuidesOverlay />}

        {/* ── Drag Ghost (DragOverlay) ───────────────────────────────────── */}
        <DragOverlay
          dropAnimation={{
            duration: 180,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {/* Canvas-element ghost: 1:1 clone with rotate + shadow */}
          {activeDragType === 'canvas' && activeDragId && (
            <div
              style={{
                transform:    'rotate(2deg) translateZ(0)',
                boxShadow:    '0 24px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(13,153,255,0.18)',
                borderRadius: 4,
                overflow:     'hidden',
                opacity:      0.96,
                cursor:       'grabbing',
              }}
            >
              <DragGhost nodeId={activeDragId} />
            </div>
          )}

          {/* Palette ghost: branded pill */}
          {activeDragType === 'palette' && (
            <div
              style={{
                display:       'flex',
                alignItems:    'center',
                gap:           6,
                padding:       '7px 14px',
                borderRadius:  8,
                background:    '#0D99FF',
                color:         'white',
                fontSize:      12,
                fontWeight:    700,
                letterSpacing: '0.01em',
                boxShadow:     '0 12px 30px rgba(0,0,0,0.45)',
                cursor:        'grabbing',
                userSelect:    'none',
                transform:     'rotate(2deg)',
              }}
            >
              {activeDragLabel}
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <SaveErrorToast />
    </DragOverProvider>
  );
}
