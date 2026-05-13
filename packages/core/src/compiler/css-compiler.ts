/**
 * Nexus Architect — CSS Compiler
 *
 * Blueprint Phase 6.3 requirement:
 *   "As the user styles elements, the builder accumulates a set of used
 *    utility classes. At publish time, a compiler walks the final page tree
 *    and generates a scoped, minimal CSS file containing only the styles
 *    actually used on that page. This output is typically 2–8 KB per page."
 *
 * Strategy:
 *   1. Walk every NexusNode in the page.
 *   2. For each node, generate a scoped CSS class: .nx-{sanitised-id}
 *   3. Emit base styles + responsive breakpoint overrides (mobile-first).
 *   4. Inject global design tokens as CSS custom properties on :root.
 *   5. Emit animation keyframe library (only included once).
 *   6. Return: { css: string, classNames: Record<nodeId, className> }
 *
 * Output is valid, minification-ready CSS with no unused rules.
 * This file has ZERO WordPress dependencies and is platform-agnostic.
 */

import type { NexusPage } from '../types/schema.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompiledCss {
  /** Complete CSS text ready to embed in <style> or write to a .css file */
  css: string;
  /** Maps nodeId → generated CSS class name for use by the HTML compiler */
  classNames: Record<string, string>;
  /** Approximate size in KB */
  sizeKb: number;
}

// ─── Breakpoint media queries (mobile-first) ──────────────────────────────────

const BREAKPOINT_QUERIES: Record<string, string> = {
  sm:  '@media (min-width:640px)',
  md:  '@media (min-width:768px)',
  lg:  '@media (min-width:1024px)',
  xl:  '@media (min-width:1280px)',
  '2xl': '@media (min-width:1536px)',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** camelCase or already-kebab → kebab-case CSS property name */
function toKebab(prop: string): string {
  if (prop.startsWith('--')) return prop; // CSS custom prop: preserve as-is
  return prop.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/** Sanitise a node ID to a valid CSS class suffix */
function sanitiseId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '-');
}

/** Serialise a style object to CSS declaration block lines */
function styleLines(styles: Record<string, string>, indent = ''): string {
  return Object.entries(styles)
    .filter(([k]) => !k.startsWith('--nx-entrance') &&
                     !k.startsWith('--nx-enter-duration') &&
                     !k.startsWith('--nx-enter-delay'))
    .map(([k, v]) => `${indent}${toKebab(k)}:${v};`)
    .join('\n');
}

// ─── Animation keyframes ─────────────────────────────────────────────────────

const ANIMATION_KEYFRAMES = `
@keyframes nx-fade-in{from{opacity:0}to{opacity:1}}
@keyframes nx-slide-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes nx-slide-down{from{opacity:0;transform:translateY(-24px)}to{opacity:1;transform:translateY(0)}}
@keyframes nx-slide-left{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
@keyframes nx-slide-right{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}
@keyframes nx-zoom-in{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
@keyframes nx-zoom-out{from{opacity:0;transform:scale(1.1)}to{opacity:1;transform:scale(1)}}
@keyframes nx-bounce-in{0%{opacity:0;transform:scale(0.8)}60%{transform:scale(1.05)}80%{transform:scale(0.97)}100%{opacity:1;transform:scale(1)}}
`.trim();

/** Map entrance value → @keyframes name */
const ENTRANCE_MAP: Record<string, string> = {
  'fade-in':    'nx-fade-in',
  'slide-up':   'nx-slide-up',
  'slide-down': 'nx-slide-down',
  'slide-left': 'nx-slide-left',
  'slide-right':'nx-slide-right',
  'zoom-in':    'nx-zoom-in',
  'zoom-out':   'nx-zoom-out',
  'bounce-in':  'nx-bounce-in',
};

// ─── Base reset ───────────────────────────────────────────────────────────────

const BASE_RESET = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#111}
img,video{max-width:100%;height:auto;display:block}
a{color:inherit;text-decoration:none}
button{cursor:pointer;border:none;background:none;font:inherit}
#nx-root{width:100%;min-height:100vh}
`.trim();

// ─── Intersection observer script (entrance animations) ───────────────────────

export const ENTRANCE_OBSERVER_SCRIPT = `
(function(){
  if(!window.IntersectionObserver)return;
  var els=document.querySelectorAll('[data-nx-entrance]');
  if(!els.length)return;
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.style.animationPlayState='running';
        io.unobserve(e.target);
      }
    });
  },{threshold:0.12});
  els.forEach(function(el){
    el.style.animationPlayState='paused';
    io.observe(el);
  });
})();
`.trim();

// ─── Main compiler ────────────────────────────────────────────────────────────

export function compileCss(page: NexusPage): CompiledCss {
  const blocks: string[] = [];
  const classNames: Record<string, string> = {};
  let hasAnimations = false;

  // 1. Base reset
  blocks.push(BASE_RESET);

  // 2. Global design tokens → :root CSS custom properties
  const tokenEntries = Object.entries(page.globalStyles ?? {});
  if (tokenEntries.length > 0) {
    const lines = tokenEntries.map(([k, v]) => `  ${k}:${v};`).join('\n');
    blocks.push(`:root{\n${lines}\n}`);
  }

  // 3. Per-node styles
  for (const [nodeId, node] of Object.entries(page.nodeMap)) {
    if (node.hidden) continue;

    const cls = `nx-${sanitiseId(nodeId)}`;
    classNames[nodeId] = cls;

    const baseParts: string[] = [];

    // Base styles (excluding animation custom props — handled separately)
    const baseStyles = node.styles.base ?? {};
    const baseDecls = styleLines(baseStyles);
    if (baseDecls) baseParts.push(baseDecls);

    // Entrance animation
    const entrance = baseStyles['--nx-entrance'];
    if (entrance && entrance !== 'none') {
      const keyframe  = ENTRANCE_MAP[entrance] ?? entrance;
      const duration  = baseStyles['--nx-enter-duration'] ?? '0.6s';
      const delay     = baseStyles['--nx-enter-delay']    ?? '0s';
      baseParts.push(`animation:${keyframe} ${duration} ${delay} both;`);
      hasAnimations = true;
    }

    if (baseParts.length > 0) {
      blocks.push(`.${cls}{\n${baseParts.join('\n')}\n}`);
    }

    // Breakpoint overrides
    for (const [bp, query] of Object.entries(BREAKPOINT_QUERIES)) {
      const bpStyles = node.styles[bp as 'sm' | 'md' | 'lg' | 'xl' | '2xl'] ?? {};
      const decls    = styleLines(bpStyles, '  ');
      if (decls) {
        blocks.push(`${query}{\n.${cls}{\n${decls}\n}\n}`);
      }
    }
  }

  // 4. Animation keyframes (only if any node uses entrance animations)
  if (hasAnimations) {
    blocks.push(ANIMATION_KEYFRAMES);
  }

  const css    = blocks.join('\n');
  const sizeKb = parseFloat((new TextEncoder().encode(css).byteLength / 1024).toFixed(2));

  return { css, classNames, sizeKb };
}
