/**
 * Nexus Architect — Page Compiler Entry Point
 *
 * Blueprint Phase 6.3:
 *   "On publish, the output strategy is static HTML compilation — not a PHP
 *    template that re-renders the JSON on every page request."
 *
 * Usage:
 *   import { compilePage } from '@nexus/core/compiler';
 *   const result = compilePage(page);
 *   // result.html → complete <!DOCTYPE html> document
 *   // result.css  → scoped stylesheet (also embedded in result.html)
 *   // result.sizeKb → total size
 */

export { compileCss, ENTRANCE_OBSERVER_SCRIPT } from './css-compiler.js';
export type { CompiledCss } from './css-compiler.js';

export { compileHtml } from './html-compiler.js';
export type { HtmlCompileOptions } from './html-compiler.js';

import type { NexusPage } from '../types/schema.js';
import { compileCss }  from './css-compiler.js';
import { compileHtml } from './html-compiler.js';

export interface CompileResult {
  /** Complete self-contained HTML document */
  html: string;
  /** The scoped CSS text (also embedded inside html) */
  css: string;
  /** Total compiled size in KB */
  sizeKb: number;
  /** Stats for observability / Lighthouse advisor */
  stats: {
    nodeCount:    number;
    cssRuleCount: number;
    hasAnimations: boolean;
  };
}

/**
 * compilePage — the single entry point for the full compilation pipeline.
 *
 * 1. Runs the CSS compiler  → scoped stylesheet + class name map
 * 2. Runs the HTML compiler → complete <!DOCTYPE html> document
 * 3. Returns both outputs + stats
 */
export function compilePage(page: NexusPage): CompileResult {
  // Step 1: compile CSS + get class name map
  const { css, classNames, sizeKb: cssKb } = compileCss(page);

  // Step 2: compile HTML using the class names
  const html = compileHtml(page, { compiledCss: css, classNames });

  // Stats
  const htmlKb      = parseFloat((new TextEncoder().encode(html).byteLength / 1024).toFixed(2));
  const cssRuleCount = (css.match(/\{/g) ?? []).length;
  const hasAnimations = css.includes('@keyframes');

  return {
    html,
    css,
    sizeKb: htmlKb,
    stats: {
      nodeCount:    Object.keys(page.nodeMap).length,
      cssRuleCount,
      hasAnimations,
    },
  };
}
