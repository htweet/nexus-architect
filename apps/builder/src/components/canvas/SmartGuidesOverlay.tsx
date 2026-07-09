/**
 * SmartGuidesOverlay — Figma-style drag UX layer.
 *
 * Mounts inside DndContext. Uses useDndMonitor to track cursor position on
 * every drag frame. Renders three layers — all pointer-events-none, fixed:
 *
 *   1. Smart guide lines — 1px dashed measurement lines + pixel-distance
 *      badges connecting the ghost's edges to the hovered element's edges.
 *
 *   2. Drop Insertion Line — a 2px Emerald (#10b77f) horizontal rule with
 *      terminus circles that snaps between siblings to show the exact
 *      insertion point. Animates with a 80ms spring (CSS transform transition
 *      on the SVG <g> group) so it glides rather than pops.
 *
 *   3. Cursor tooltip — live W/H + X/Y readout at 10px monospace.
 *
 * PALETTE UPGRADE (matching Executive Dark + Emerald accent):
 *   Guide lines:      #0D99FF  (blue — spatial measurement)
 *   Insertion line:   #10b77f  (emerald — active drop indicator)
 *   Tooltip border:   rgba(16,183,127,0.30)
 */

import { useState, useRef } from 'react';
import { useDndMonitor }     from '@dnd-kit/core';
import type { DragMoveEvent } from '@dnd-kit/core';
import { useDragOver }       from '@/contexts/DragOverContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DragMetrics {
  cursorX:       number;
  cursorY:       number;
  activeW:       number;
  activeH:       number;
  overRect:      DOMRect | null;
  aboveMidpoint: boolean;
}

const EMPTY: DragMetrics = {
  cursorX: 0, cursorY: 0,
  activeW: 0, activeH: 0,
  overRect: null, aboveMidpoint: false,
};

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function queryNodeEl(id: string | null): Element | null {
  if (!id) return null;
  const stripped = id.replace(/^drop:/, '');
  return document.querySelector(`[data-node-id="${stripped}"]`);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SmartGuidesOverlay() {
  const { activeId, overId } = useDragOver();
  const [m, setM]            = useState<DragMetrics>(EMPTY);

  // Track previous insertY so CSS transition has something to animate FROM
  const prevInsertY = useRef<number | null>(null);

  useDndMonitor({
    onDragMove(event: DragMoveEvent) {
      const src     = event.activatorEvent as PointerEvent;
      const cursorX = (src.clientX ?? 0) + event.delta.x;
      const cursorY = (src.clientY ?? 0) + event.delta.y;

      const activeEl  = queryNodeEl(activeId);
      const overEl    = queryNodeEl(overId);
      const activeRect = activeEl?.getBoundingClientRect();
      const overRect   = overEl?.getBoundingClientRect() ?? null;

      setM({
        cursorX,
        cursorY,
        activeW:       activeRect?.width  ?? 0,
        activeH:       activeRect?.height ?? 0,
        overRect,
        aboveMidpoint: overRect
          ? cursorY < overRect.top + overRect.height / 2
          : false,
      });
    },
    onDragEnd()    { setM(EMPTY); prevInsertY.current = null; },
    onDragCancel() { setM(EMPTY); prevInsertY.current = null; },
  });

  // Only render while a drag is active and we have a real cursor position
  if (!activeId || m.cursorX === 0) return null;

  const { cursorX, cursorY, activeW, activeH, overRect, aboveMidpoint } = m;

  // ── Ghost box (centred on cursor) ─────────────────────────────────────────
  const ghostLeft   = cursorX - activeW / 2;
  const ghostTop    = cursorY - activeH / 2;
  const ghostRight  = ghostLeft + activeW;
  const ghostBottom = ghostTop  + activeH;
  const ghostMidX   = cursorX;
  const ghostMidY   = cursorY;

  // ── Smart guide lines ─────────────────────────────────────────────────────
  type GuideSpec = {
    x1: number; y1: number; x2: number; y2: number;
    lx: number; ly: number; label: string; vertical: boolean;
  };
  const guides: GuideSpec[] = [];

  if (overRect && activeW > 0 && activeH > 0) {
    const push = (
      x1: number, y1: number, x2: number, y2: number,
      lx: number, ly: number,
      dist: number,
      vertical: boolean,
    ) => {
      if (dist > 2 && dist < 800) {
        guides.push({ x1, y1, x2, y2, lx, ly, label: `${dist}`, vertical });
      }
    };

    // Left gap
    push(
      overRect.left,  ghostMidY, ghostLeft,  ghostMidY,
      (overRect.left + ghostLeft) / 2, ghostMidY - 12,
      Math.round(Math.abs(ghostLeft - overRect.left)), false,
    );
    // Right gap
    push(
      ghostRight, ghostMidY, overRect.right, ghostMidY,
      (ghostRight + overRect.right) / 2, ghostMidY - 12,
      Math.round(Math.abs(ghostRight - overRect.right)), false,
    );
    // Top gap
    push(
      ghostMidX, overRect.top, ghostMidX, ghostTop,
      ghostMidX + 8, (overRect.top + ghostTop) / 2,
      Math.round(Math.abs(ghostTop - overRect.top)), true,
    );
    // Bottom gap
    push(
      ghostMidX, ghostBottom, ghostMidX, overRect.bottom,
      ghostMidX + 8, (ghostBottom + overRect.bottom) / 2,
      Math.round(Math.abs(ghostBottom - overRect.bottom)), true,
    );
  }

  // ── Insertion line ────────────────────────────────────────────────────────
  // Show ONLY for sibling-level drops (no `drop:` prefix = not container drop)
  const isContainerDrop = !overId || overId.startsWith('drop:');
  const insertY = (!isContainerDrop && overRect)
    ? (aboveMidpoint ? overRect.top : overRect.bottom)
    : null;

  // When insertY is valid, update prevInsertY for the next frame
  if (insertY !== null) prevInsertY.current = insertY;
  // Use the previous value as the CSS starting point when insertY disappears
  const displayY = insertY ?? prevInsertY.current;

  return (
    <>
      {/* ── SVG layer: guides + insertion line ──────────────────────────── */}
      <svg
        className="fixed inset-0 pointer-events-none"
        style={{ width: '100vw', height: '100vh', zIndex: 998, overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Smart guide lines (blue — spatial reference) */}
        {guides.map((g, i) => {
          const charW  = 6.5;
          const badgeW = Math.max(g.label.length * charW + 10, 22);
          return (
            <g key={i}>
              <line
                x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}
                stroke="#0D99FF" strokeWidth={1}
                strokeDasharray="4 2" opacity={0.85}
              />
              {g.vertical ? (
                <>
                  <line x1={g.x1 - 5} y1={g.y1} x2={g.x1 + 5} y2={g.y1}
                    stroke="#0D99FF" strokeWidth={1} />
                  <line x1={g.x2 - 5} y1={g.y2} x2={g.x2 + 5} y2={g.y2}
                    stroke="#0D99FF" strokeWidth={1} />
                </>
              ) : (
                <>
                  <line x1={g.x1} y1={g.y1 - 5} x2={g.x1} y2={g.y1 + 5}
                    stroke="#0D99FF" strokeWidth={1} />
                  <line x1={g.x2} y1={g.y2 - 5} x2={g.x2} y2={g.y2 + 5}
                    stroke="#0D99FF" strokeWidth={1} />
                </>
              )}
              <rect
                x={g.lx - badgeW / 2} y={g.ly - 7}
                width={badgeW} height={14} rx={3}
                fill="#0D99FF"
              />
              <text
                x={g.lx} y={g.ly + 4}
                textAnchor="middle"
                fill="white" fontSize={9}
                fontFamily="ui-monospace,'Cascadia Code',monospace"
                fontWeight={700}
              >
                {g.label}
              </text>
            </g>
          );
        })}

        {/*
          ── Insertion Line (emerald — active drop indicator) ───────────────
          The <g> element uses CSS `transform: translateY(${y}px)` + a
          cubic-bezier spring transition.  SVG inline transform supports CSS
          transitions in all modern browsers.  All child elements use y=0 so
          the group's translateY positions everything.
        */}
        {displayY !== null && overRect && (
          <g
            style={{
              transform:  `translateY(${displayY}px)`,
              transition: 'transform 80ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* Main 2px rule */}
            <line
              x1={overRect.left  - 8} y1={0}
              x2={overRect.right + 8} y2={0}
              stroke="#10b77f" strokeWidth={2}
            />
            {/* Left terminus circle */}
            <circle
              cx={overRect.left  - 8} cy={0}
              r={4} fill="none" stroke="#10b77f" strokeWidth={2}
            />
            {/* Right terminus circle */}
            <circle
              cx={overRect.right + 8} cy={0}
              r={4} fill="none" stroke="#10b77f" strokeWidth={2}
            />
          </g>
        )}
      </svg>

      {/* ── Cursor dimension tooltip ─────────────────────────────────────── */}
      <div
        className="fixed pointer-events-none select-none"
        style={{
          left:           cursorX + 16,
          top:            cursorY + 18,
          zIndex:         1000,
          background:     'rgba(8,12,22,0.94)',    // #080c16 bg
          border:         '1px solid rgba(16,183,127,0.30)',  // emerald tint
          borderRadius:   5,
          padding:        '4px 8px',
          backdropFilter: 'blur(6px)',
          minWidth:       80,
          boxShadow:      '0 4px 16px rgba(0,0,0,0.5)',
        }}
      >
        {activeW > 0 && (
          <div style={{
            color: '#dde4dd', fontSize: 10,
            fontFamily: 'ui-monospace, monospace',
            lineHeight: 1.55, letterSpacing: '0.03em',
          }}>
            <span style={{ color: '#10b77f' }}>W</span>
            <span style={{ color: '#bbcabf' }}>: </span>
            {Math.round(activeW)}
            <span style={{ color: '#bbcabf', margin: '0 4px' }}>·</span>
            <span style={{ color: '#10b77f' }}>H</span>
            <span style={{ color: '#bbcabf' }}>: </span>
            {Math.round(activeH)}
          </div>
        )}
        <div style={{
          color: '#8fa899', fontSize: 10,
          fontFamily: 'ui-monospace, monospace',
          lineHeight: 1.55, letterSpacing: '0.03em',
        }}>
          <span style={{ color: '#50dea3' }}>X</span>
          <span>: </span>
          {Math.round(cursorX)}
          <span style={{ color: '#bbcabf', margin: '0 4px' }}>·</span>
          <span style={{ color: '#50dea3' }}>Y</span>
          <span>: </span>
          {Math.round(cursorY)}
        </div>
      </div>
    </>
  );
}
