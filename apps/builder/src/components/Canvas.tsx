/**
 * Canvas — the main editing viewport.
 *
 * Renders the recursive NodeRenderer tree starting from the page root node.
 * Hosts the DnD drop zone for palette items (handled via DndContext in Builder).
 * The zoom + breakpoint toolbar floats at the bottom.
 *
 * Phase 9 additions:
 *   - CanvasErrorBoundary wraps NodeRenderer for crash recovery
 *   - PerformanceOverlay shown in DEV mode only (zero prod footprint)
 */

import { useCallback, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { LayoutGrid, Wand2, Maximize2, Minus, Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { NodeRenderer }        from '@/components/canvas/NodeRenderer';
import { BreadcrumbBar }       from '@/components/canvas/BreadcrumbBar';
import { CanvasErrorBoundary } from '@/components/canvas/CanvasErrorBoundary';
import { PerformanceOverlay }  from '@/components/canvas/PerformanceOverlay';
import {
  useUIStore,
  useCanvasStore,
  useSelectionStore,
  BREAKPOINT_CANVAS_WIDTHS,
} from '@nexus/core';

// --- Empty State ---------------------------------------------------------------

function EmptyCanvasState() {
  const openLeftPanel = useUIStore((s) => s.openLeftPanel);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 select-none pointer-events-none">
      {/* Icon box -- emerald glow */}
      <div
        className="relative h-20 w-20 rounded-2xl flex items-center justify-center"
        style={{
          background: '#09100c',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 0 32px rgba(16,183,127,0.15)',
        }}
      >
        <LayoutGrid size={32} style={{ color: '#10b77f', opacity: 0.85 }} />
        {/* Emerald dot accent */}
        <div
          className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full"
          style={{ background: '#10b77f' }}
        />
      </div>

      <div className="text-center max-w-xs">
        <h2
          className="text-xl font-semibold mb-2"
          style={{ color: '#dde4dd' }}
        >
          Start{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #34D399 0%, #10b77f 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Building
          </span>
        </h2>
        <p className="text-sm" style={{ color: '#bbcabf' }}>
          Drag a widget from the left panel, or kick off with a template.
        </p>
      </div>

      <div className="flex items-center gap-3 pointer-events-auto">
        <Button variant="subtle" size="md" onClick={() => openLeftPanel('widgets')}>
          <LayoutGrid size={13} />
          Browse Widgets
        </Button>
        <Button variant="accent" size="md" onClick={() => openLeftPanel('templates')}>
          <Wand2 size={13} />
          Use a Template
        </Button>
      </div>

      <p className="text-xs animate-pulse" style={{ color: '#bbcabf' }}>
        or drag anything directly onto the canvas
      </p>
    </div>
  );
}

// --- Preview Exit Bar ----------------------------------------------------------

function PreviewExitBar() {
  const exitPreview = useUIStore((s) => s.exitPreview);

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 animate-fade-in"
      style={{
        background: '#0e1511',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="h-2 w-2 rounded-full animate-pulse"
        style={{ background: '#10b77f' }}
      />
      <span
        className="text-xs font-semibold tracking-wide uppercase"
        style={{ color: '#bbcabf' }}
      >
        Preview Mode
      </span>
      <div className="h-3 w-px mx-1" style={{ background: 'rgba(255,255,255,0.10)' }} />
      <button
        onClick={exitPreview}
        title="Exit Preview (Esc)"
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-[180ms] hover:opacity-90"
        style={{ background: '#10b77f', color: '#ffffff' }}
      >
        <X size={11} strokeWidth={2.5} />
        Exit Preview
      </button>
    </div>
  );
}

// --- Canvas Toolbar ------------------------------------------------------------

function CanvasToolbar({ containerRef }: { containerRef: React.RefObject<HTMLElement | null> }) {
  const zoomLevel        = useUIStore((s) => s.zoomLevel);
  const activeBreakpoint = useUIStore((s) => s.activeBreakpoint);
  const zoomIn           = useUIStore((s) => s.zoomIn);
  const zoomOut          = useUIStore((s) => s.zoomOut);
  const resetZoom        = useUIStore((s) => s.resetZoom);
  const setZoom          = useUIStore((s) => s.setZoom);
  const canvasWidth      = BREAKPOINT_CANVAS_WIDTHS[activeBreakpoint];

  const handleFitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container) { resetZoom(); return; }

    const available = container.clientWidth - 48;
    if (!canvasWidth || available <= 0) {
      resetZoom();
      return;
    }

    const fitZoom = available / canvasWidth;
    setZoom(fitZoom);
  }, [containerRef, canvasWidth, resetZoom, setZoom]);

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-lg px-1.5 py-1 animate-fade-in"
      style={{
        background: '#0e1511',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {canvasWidth && (
        <>
          <span
            className="text-xs px-2 font-mono"
            style={{ color: '#bbcabf' }}
          >
            {canvasWidth}px
          </span>
          <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.10)' }} />
        </>
      )}

      <Tooltip content="Zoom out (-)" side="top">
        <Button variant="ghost" size="xs" iconOnly onClick={zoomOut}>
          <Minus size={12} />
        </Button>
      </Tooltip>

      <Tooltip content="Reset zoom (0)" side="top">
        <button
          onClick={resetZoom}
          className="min-w-[44px] text-center text-xs font-mono transition-colors duration-[180ms]"
          style={{ color: '#bbcabf' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#dde4dd')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#bbcabf')}
        >
          {Math.round(zoomLevel * 100)}%
        </button>
      </Tooltip>

      <Tooltip content="Zoom in (+)" side="top">
        <Button variant="ghost" size="xs" iconOnly onClick={zoomIn}>
          <Plus size={12} />
        </Button>
      </Tooltip>

      <div className="h-3 w-px" style={{ background: 'rgba(255,255,255,0.10)' }} />

      <Tooltip content="Fit canvas to view" side="top">
        <Button variant="ghost" size="xs" iconOnly onClick={handleFitToView}>
          <Maximize2 size={12} />
        </Button>
      </Tooltip>
    </div>
  );
}

// --- Canvas -------------------------------------------------------------------

export function Canvas() {
  const zoomLevel        = useUIStore((s) => s.zoomLevel);
  const activeBreakpoint = useUIStore((s) => s.activeBreakpoint);
  const isPreviewMode    = useUIStore((s) => s.isPreviewMode);
  const page             = useCanvasStore((s) => s.page);
  const clearCanvas      = useCanvasStore((s) => s.clearCanvas);
  const clearSelection   = useSelectionStore((s) => s.clearSelection);

  const containerRef = useRef<HTMLElement | null>(null);

  const canvasWidth = BREAKPOINT_CANVAS_WIDTHS[activeBreakpoint];

  const { setNodeRef: setEmptyDropRef, isOver: isEmptyOver } = useDroppable({
    id:   'canvas-frame',
    data: { isEmptyCanvas: true },
  });

  const hasContent = page !== null;

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) clearSelection();
    },
    [clearSelection],
  );

  // Clear canvas handler passed to error boundary for recovery UI
  const handleClearCanvas = useCallback(() => {
    clearSelection();
    clearCanvas?.();
  }, [clearCanvas, clearSelection]);

  return (
    <main
      ref={containerRef}
      className={cn(
        'relative flex-1 overflow-auto',
        isPreviewMode && 'cursor-default',
      )}
      style={{ background: '#09100c' }}
    >
      {/* Floating "Exit Preview" bar -- only in preview mode */}
      {isPreviewMode && <PreviewExitBar />}

      <div
        className="flex min-h-full items-start justify-center py-8 px-6"
        onClick={handleCanvasClick}
      >
        {/* Page frame -- white canvas, the user's actual page */}
        <div
          ref={setEmptyDropRef}
          data-testid="canvas-area"
          className={cn(
            'relative min-h-[600px] w-full rounded-lg overflow-visible',
            'transition-[width,transform] duration-[300ms] ease-[cubic-bezier(0.2,0,0.2,1)]',
          )}
          style={{
            background:      '#ffffff',
            color:           '#111827',
            boxShadow:       '0 4px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06)',
            outline:         isEmptyOver && !isPreviewMode
              ? '2px solid #10b77f'
              : '1px solid rgba(255,255,255,0.08)',
            maxWidth:        canvasWidth ? `${canvasWidth}px` : '100%',
            transform:       `scale(${zoomLevel})`,
            transformOrigin: 'top center',
          }}
        >
          {hasContent ? (
            <CanvasErrorBoundary onClearCanvas={handleClearCanvas}>
              <NodeRenderer nodeId={page.rootNodeId} isPreview={isPreviewMode} />
            </CanvasErrorBoundary>
          ) : (
            <EmptyCanvasState />
          )}

          {/* Breadcrumb ancestor trail -- edit mode only */}
          {!isPreviewMode && <BreadcrumbBar />}
        </div>
      </div>

      {!isPreviewMode && <CanvasToolbar containerRef={containerRef} />}

      {/* Dev-only performance monitor -- zero production footprint */}
      {!isPreviewMode && import.meta.env.DEV && <PerformanceOverlay />}
    </main>
  );
}
