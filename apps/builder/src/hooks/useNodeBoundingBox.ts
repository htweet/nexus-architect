/**
 * useNodeBoundingBox — tracks the viewport-space bounding rect of a canvas node.
 *
 * Uses ResizeObserver + scroll/resize listeners to keep the rect current
 * whenever the element moves, resizes, or the canvas viewport changes.
 * Returns null when nodeId is null or the DOM element is not mounted.
 *
 * Pattern: the hook fires a measure() on every relevant DOM change.
 * All measuring is debounced to a single requestAnimationFrame so callers
 * never see more than one update per paint.
 */

import { useState, useEffect, useRef } from 'react';

export interface BoundingBox {
  top:    number;
  left:   number;
  width:  number;
  height: number;
  right:  number;
  bottom: number;
}

export function useNodeBoundingBox(nodeId: string | null): BoundingBox | null {
  const [box, setBox] = useState<BoundingBox | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!nodeId) {
      setBox(null);
      return;
    }

    let cancelled = false;
    let ro: ResizeObserver | null = null;

    function measure() {
      if (cancelled) return;
      const el = document.querySelector(`[data-node-id="${nodeId}"]`);
      if (!el) {
        setBox(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setBox({
        top:    r.top,
        left:   r.left,
        width:  r.width,
        height: r.height,
        right:  r.right,
        bottom: r.bottom,
      });
    }

    function scheduleRaf() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    }

    // Initial measure
    measure();

    // Watch element for size changes
    const el = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (el) {
      ro = new ResizeObserver(scheduleRaf);
      ro.observe(el);
    }

    // Watch scroll/resize of any ancestor (capture phase)
    window.addEventListener('scroll', scheduleRaf, true);
    window.addEventListener('resize', scheduleRaf);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      ro?.disconnect();
      window.removeEventListener('scroll', scheduleRaf, true);
      window.removeEventListener('resize', scheduleRaf);
    };
  }, [nodeId]);

  return box;
}
