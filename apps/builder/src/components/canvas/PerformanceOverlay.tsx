/**
 * PerformanceOverlay — dev-only FPS / render-count monitor.
 *
 * Floats in the canvas area in development mode. Draggable via the header.
 * Shows:
 *   - Instantaneous FPS (requestAnimationFrame delta)
 *   - Rolling 5-second average FPS
 *   - Current node count in the page tree
 *
 * Rendered ONLY when import.meta.env.DEV === true.
 * Zero production bundle footprint — the import is tree-shaken away.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';

// --- FPS hook -----------------------------------------------------------------

function useFps() {
  const [fps, setFps]       = useState(60);
  const [avgFps, setAvgFps] = useState(60);
  const frameRef            = useRef<number>(0);
  const lastRef             = useRef<number>(performance.now());
  const historyRef          = useRef<number[]>([]);

  useEffect(() => {
    let running = true;

    function tick(now: number) {
      if (!running) return;
      const delta = now - lastRef.current;
      lastRef.current = now;

      if (delta > 0) {
        const inst = Math.round(1000 / delta);
        setFps(Math.min(inst, 999));

        historyRef.current.push(inst);
        // Keep ~5 s of history at ~60fps
        if (historyRef.current.length > 300) historyRef.current.shift();

        const sum = historyRef.current.reduce((a, b) => a + b, 0);
        setAvgFps(Math.round(sum / historyRef.current.length));
      }

      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { fps, avgFps };
}

// --- Color helper -------------------------------------------------------------

function fpsColor(f: number): string {
  if (f >= 55) return '#10b77f';
  if (f >= 30) return '#f59e0b';
  return '#ef4444';
}

// --- Component ----------------------------------------------------------------

export function PerformanceOverlay() {
  const nodeCount = useCanvasStore(
    s => Object.keys(s.page?.nodeMap ?? {}).length,
  );

  const { fps, avgFps } = useFps();
  const color           = fpsColor(fps);

  // ── Drag state ──────────────────────────────────────────────────────────
  const elRef       = useRef<HTMLDivElement>(null);
  const dragging    = useRef(false);
  const dragOffset  = useRef({ x: 0, y: 0 });

  const [pos,      setPos]      = useState<{ x: number; y: number } | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = elRef.current;
    if (!el) return;
    const elRect = el.getBoundingClientRect();
    const parent = el.parentElement;
    const pr     = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };

    // Compute current position relative to parent (handles first drag from CSS default)
    const curX = elRect.left - pr.left;
    const curY = elRect.top  - pr.top;

    dragging.current    = true;
    // Store mouse offset *within* the element (screen coords) so onMove can
    // correctly place the element: rawX = e.clientX - pr.left - offsetInEl.x
    dragOffset.current  = { x: e.clientX - elRect.left, y: e.clientY - elRect.top };
    setPos({ x: curX, y: curY });
    setGrabbing(true);
  }, []);

  // Global mouse-move / mouse-up handlers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !elRef.current) return;
      const parent = elRef.current.parentElement;
      const pr     = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 };
      const pw     = parent?.clientWidth  ?? 9999;
      const ph     = parent?.clientHeight ?? 9999;
      const ew     = elRef.current.offsetWidth;
      const eh     = elRef.current.offsetHeight;

      const rawX = e.clientX - pr.left - dragOffset.current.x;
      const rawY = e.clientY - pr.top  - dragOffset.current.y;

      setPos({
        x: Math.max(0, Math.min(rawX, pw - ew)),
        y: Math.max(0, Math.min(rawY, ph - eh)),
      });
    };

    const onUp = () => {
      dragging.current = false;
      setGrabbing(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, []);

  // ── Positioning ─────────────────────────────────────────────────────────
  const posStyle: React.CSSProperties = pos
    ? { left: pos.x, top: pos.y }
    : {};

  return (
    <div
      ref={elRef}
      data-testid="performance-overlay"
      className={
        pos
          ? 'absolute z-50 select-none'
          : 'absolute bottom-[72px] right-5 z-50 select-none'
      }
      style={{
        ...posStyle,
        background:     '#0a1009',
        border:         '1px solid rgba(16,183,127,0.18)',
        borderRadius:   '10px',
        padding:        '10px 14px',
        minWidth:       '156px',
        boxShadow:      '0 4px 20px rgba(0,0,0,0.25), 0 0 0 1px rgba(16,183,127,0.08)',
        backdropFilter: 'blur(12px)',
        fontFamily:     `'JetBrains Mono', 'Fira Code', monospace`,
        fontSize:       '11px',
        cursor:         grabbing ? 'grabbing' : 'default',
      }}
    >
      {/* ── Drag handle: header row ────────────────────────────────────── */}
      <div
        className="flex items-center gap-1.5 mb-2 pb-1.5"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          cursor:       grabbing ? 'grabbing' : 'grab',
          userSelect:   'none',
        }}
        onMouseDown={handleHeaderMouseDown}
      >
        <Activity size={10} style={{ color: '#10b77f' }} />
        <span style={{ color: '#bbcabf', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Perf Monitor
        </span>
        {/* Drag-affordance grip dots */}
        <span
          style={{ marginLeft: 'auto', color: '#3a5040', fontSize: 9, letterSpacing: '2px', lineHeight: 1 }}
          aria-hidden
        >
          ⋮⋮
        </span>
      </div>

      {/* ── Data rows (read-only) ─────────────────────────────────────── */}
      <div className="pointer-events-none">
        {/* FPS row */}
        <div className="flex justify-between items-baseline mb-1">
          <span style={{ color: '#6b7f72' }}>FPS</span>
          <span style={{ color, fontWeight: 700, fontSize: '14px' }}>{fps}</span>
        </div>

        {/* Avg FPS row */}
        <div className="flex justify-between items-baseline mb-1">
          <span style={{ color: '#6b7f72' }}>Avg 5s</span>
          <span style={{ color: fpsColor(avgFps) }}>{avgFps}</span>
        </div>

        {/* Node count */}
        <div
          className="flex justify-between items-baseline pt-1.5 mt-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span style={{ color: '#6b7f72' }}>Nodes</span>
          <span style={{ color: '#dde4dd' }}>{nodeCount}</span>
        </div>
      </div>
    </div>
  );
}
