/**
 * PerformanceOverlay — dev-only FPS / render-count monitor.
 *
 * Floats in the bottom-right of the canvas in development mode.
 * Shows:
 *   - Instantaneous FPS (requestAnimationFrame delta)
 *   - Rolling 5-second average FPS
 *   - Current node count in the page tree
 *
 * Rendered ONLY when import.meta.env.DEV === true.
 * Zero production bundle footprint — the import is tree-shaken away.
 */

import { useEffect, useRef, useState } from 'react';
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

// --- FPS colour ---------------------------------------------------------------

function fpsColor(fps: number): string {
  if (fps >= 55) return '#34D399'; // emerald — smooth
  if (fps >= 30) return '#F59E0B'; // amber  — degraded
  return '#EF4444';                // red    — janky
}

// --- Node count helper --------------------------------------------------------

function countNodes(nodeMap: Record<string, unknown> | undefined): number {
  return nodeMap ? Object.keys(nodeMap).length : 0;
}

// --- Component ----------------------------------------------------------------

export function PerformanceOverlay() {
  const { fps, avgFps } = useFps();
  const page            = useCanvasStore((s) => s.page);
  const nodeCount       = countNodes(
    page?.nodeMap as Record<string, unknown> | undefined
  );

  const color = fpsColor(fps);

  return (
    <div
      data-testid="performance-overlay"
      className="absolute bottom-16 right-4 z-50 select-none pointer-events-none"
      style={{
        background:     '#0a0f0c',
        border:         '1px solid rgba(255,255,255,0.08)',
        borderRadius:   '8px',
        padding:        '8px 12px',
        minWidth:       '140px',
        boxShadow:      '0 4px 20px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        fontFamily:     `'JetBrains Mono', 'Fira Code', monospace`,
        fontSize:       '11px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 mb-2 pb-1.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Activity size={10} style={{ color: '#10b77f' }} />
        <span style={{ color: '#bbcabf', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Perf Monitor
        </span>
      </div>

      {/* FPS row */}
      <div className="flex justify-between items-baseline mb-1">
        <span style={{ color: '#6b7f72' }}>FPS</span>
        <span style={{ color, fontWeight: 700, fontSize: '14px' }}>
          {fps}
        </span>
      </div>

      {/* Avg FPS row */}
      <div className="flex justify-between items-baseline mb-1">
        <span style={{ color: '#6b7f72' }}>Avg 5s</span>
        <span style={{ color: fpsColor(avgFps) }}>
          {avgFps}
        </span>
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
  );
}
