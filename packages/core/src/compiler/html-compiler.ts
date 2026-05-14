/**
 * Nexus Architect — HTML Compiler
 *
 * Blueprint Phase 6.3 requirement:
 *   "The Node tree is walked by a server-side compiler that outputs a
 *    complete, self-contained HTML file. No React, no JSON parsing, no PHP
 *    database query at page-load time — the output is pure HTML and CSS."
 *
 * Strategy:
 *   1. Walk node tree starting from rootNodeId.
 *   2. Each node type maps to a semantic HTML element.
 *   3. Node CSS classes come from the CSS compiler's classNames map.
 *   4. Output is a complete <!DOCTYPE html> document with:
 *      - SEO meta tags (title, description, OG tags)
 *      - PWA head tags (manifest, SW registration, install prompt deferral) [VAE Gap F]
 *      - Compiled scoped CSS in <style>
 *      - Custom CSS from page.customCss
 *      - __NEXUS_STATE__ inline script (data-bind initial values) [VAE Gap A]
 *      - Semantic HTML body
 *      - Intersection Observer script for entrance animations
 *      - Custom JS from page.customJs
 *
 * This file has ZERO WordPress dependencies and is platform-agnostic.
 */

import type { NexusPage, NexusNode } from '../types/schema.js';
import type { NexusVariable }        from '../types/dataBind.js';
import type { PWAConfig }            from '../types/pwa.js';
import { ENTRANCE_OBSERVER_SCRIPT }  from './css-compiler.js';
import { generatePWAHeadTags, generateNexusStateScript } from './pwa.js';

// ─── Security helpers ─────────────────────────────────────────────────────────

/** Escape text content to prevent XSS */
function escHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape attribute values */
function escAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** Validate URL — only allow http/https/relative */
function safeUrl(url: string): string {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('//') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return escAttr(trimmed);
  }
  // Relative URLs are fine
  if (!trimmed.startsWith('javascript:') && !trimmed.startsWith('data:')) {
    return escAttr(trimmed);
  }
  return ''; // block javascript: and data: URLs
}

// ─── YouTube embed helper ─────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  return match ? (match[1] ?? null) : null;
}

// ─── Entrance animation data attribute ───────────────────────────────────────

function entranceAttr(node: NexusNode): string {
  const entrance = node.styles.base?.['--nx-entrance'];
  return entrance && entrance !== 'none' ? ' data-nx-entrance="1"' : '';
}

// ─── Widget HTML renderers ────────────────────────────────────────────────────

function renderChildren(
  node: NexusNode,
  nodeMap: Record<string, NexusNode>,
  classNames: Record<string, string>,
  depth: number,
): string {
  if (!node.children.length) return '';
  return node.children
    .map((childId) => renderNode(childId, nodeMap, classNames, depth + 1))
    .filter(Boolean)
    .join('\n');
}

function renderNode(
  nodeId: string,
  nodeMap: Record<string, NexusNode>,
  classNames: Record<string, string>,
  depth = 0,
): string {
  const node = nodeMap[nodeId];
  if (!node || node.hidden) return '';

  const cls          = classNames[nodeId] ?? '';
  const clsAttr      = cls ? ` class="${cls}"` : '';
  const dataAnim     = entranceAttr(node);
  const indent       = '  '.repeat(Math.max(0, depth));
  const childContent = renderChildren(node, nodeMap, classNames, depth);

  switch (node.type) {

    // ── Layout ──────────────────────────────────────────────────────────────

    case 'root':
      return `<div id="nx-root"${clsAttr}${dataAnim}>\n${childContent}\n</div>`;

    case 'container':
    case 'section':
    case 'column':
    case 'grid':
    case 'flexbox': {
      const tag = node.type === 'section' ? 'section' : 'div';
      const children = childContent ? `\n${childContent}\n${indent}` : '';
      return `${indent}<${tag}${clsAttr}${dataAnim}>${children}</${tag}>`;
    }

    case 'spacer':
      return `${indent}<div${clsAttr} role="separator" aria-hidden="true"></div>`;

    case 'divider':
      return `${indent}<hr${clsAttr}>`;

    // ── Content ──────────────────────────────────────────────────────────────

    case 'heading': {
      const level = String(node.props.level ?? 'h2');
      const tag   = /^h[1-6]$/.test(level) ? level : 'h2';
      const text  = escHtml(String(node.props.text ?? ''));
      const align = node.props.align ? ` style="text-align:${escAttr(String(node.props.align))}"` : '';
      return `${indent}<${tag}${clsAttr}${align}${dataAnim}>${text}</${tag}>`;
    }

    case 'paragraph': {
      // Tiptap stores content as HTML string in props.html, fallback to props.text
      const html = String(node.props.html ?? '');
      const text = String(node.props.text ?? '');
      const content = html || escHtml(text);
      return `${indent}<p${clsAttr}${dataAnim}>${content}</p>`;
    }

    case 'rich-text': {
      const html = String(node.props.html ?? node.props.text ?? '');
      return `${indent}<div${clsAttr}${dataAnim}>${html}</div>`;
    }

    // ── Interactive ───────────────────────────────────────────────────────────

    case 'button': {
      const label   = escHtml(String(node.props.label ?? 'Button'));
      const href    = safeUrl(String(node.props.href ?? ''));
      const target  = node.props.newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
      if (href) {
        return `${indent}<a href="${href}"${target}${clsAttr}${dataAnim}>${label}</a>`;
      }
      return `${indent}<button type="button"${clsAttr}${dataAnim}>${label}</button>`;
    }

    // ── Media ─────────────────────────────────────────────────────────────────

    case 'image': {
      const src     = safeUrl(String(node.props.src ?? ''));
      const alt     = escAttr(String(node.props.alt ?? ''));
      const width   = node.props.width  ? ` width="${escAttr(String(node.props.width))}"` : '';
      const height  = node.props.height ? ` height="${escAttr(String(node.props.height))}"` : '';
      const loading = ' loading="lazy"';
      if (!src) return '';
      return `${indent}<img src="${src}" alt="${alt}"${width}${height}${loading}${clsAttr}${dataAnim}>`;
    }

    case 'video': {
      const src = String(node.props.src ?? '');
      if (!src) return `${indent}<div${clsAttr}></div>`;

      const ytId = extractYouTubeId(src);
      if (ytId) {
        return [
          `${indent}<div${clsAttr}${dataAnim} style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">`,
          `${indent}  <iframe src="https://www.youtube-nocookie.com/embed/${escAttr(ytId)}"`,
          `${indent}    style="position:absolute;top:0;left:0;width:100%;height:100%"`,
          `${indent}    frameborder="0" allow="autoplay;encrypted-media" allowfullscreen loading="lazy"></iframe>`,
          `${indent}</div>`,
        ].join('\n');
      }

      const vimeoMatch = src.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch?.[1]) {
        return [
          `${indent}<div${clsAttr}${dataAnim} style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden">`,
          `${indent}  <iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}"`,
          `${indent}    style="position:absolute;top:0;left:0;width:100%;height:100%"`,
          `${indent}    frameborder="0" allowfullscreen loading="lazy"></iframe>`,
          `${indent}</div>`,
        ].join('\n');
      }

      // Self-hosted video
      return [
        `${indent}<video${clsAttr}${dataAnim} controls preload="metadata">`,
        `${indent}  <source src="${safeUrl(src)}">`,
        `${indent}  Your browser does not support the video tag.`,
        `${indent}</video>`,
      ].join('\n');
    }

    // ── Embed / Custom ────────────────────────────────────────────────────────

    case 'html-embed': {
      // Raw HTML — passed through as-is (user is responsible for content safety)
      const html = String(node.props.html ?? '');
      return `${indent}<div${clsAttr}${dataAnim}>${html}</div>`;
    }

    // ── Fallback: unknown widget types ────────────────────────────────────────

    default: {
      const children = childContent ? `\n${childContent}\n${indent}` : '';
      return `${indent}<div${clsAttr}${dataAnim}>${children}</div>`;
    }
  }
}

// ─── Head meta builder ────────────────────────────────────────────────────────

function buildHeadMeta(page: NexusPage): string {
  const seo    = page.seoMeta ?? {};
  const title  = escHtml(seo.title || page.title || 'Untitled Page');
  const desc   = seo.description ? escAttr(seo.description) : '';
  const ogTitle= escAttr(seo.ogTitle || seo.title || page.title || '');
  const ogDesc = escAttr(seo.ogDescription || seo.description || '');
  const ogImg  = seo.ogImage ? safeUrl(seo.ogImage) : '';

  const lines: string[] = [
    `  <meta charset="UTF-8">`,
    `  <meta name="viewport" content="width=device-width,initial-scale=1">`,
    `  <title>${title}</title>`,
  ];

  if (desc)       lines.push(`  <meta name="description" content="${desc}">`);
  if (seo.noIndex) lines.push(`  <meta name="robots" content="noindex,nofollow">`);

  // Open Graph
  lines.push(`  <meta property="og:type" content="website">`);
  if (ogTitle) lines.push(`  <meta property="og:title" content="${ogTitle}">`);
  if (ogDesc)  lines.push(`  <meta property="og:description" content="${ogDesc}">`);
  if (ogImg)   lines.push(`  <meta property="og:image" content="${ogImg}">`);

  // Canonical
  if (seo.canonicalUrl) {
    lines.push(`  <link rel="canonical" href="${safeUrl(seo.canonicalUrl)}">`);
  }

  // Favicon
  if (seo.favicon) {
    lines.push(`  <link rel="icon" href="${safeUrl(seo.favicon)}">`);
  }

  return lines.join('\n');
}

// ─── Full document assembler ──────────────────────────────────────────────────

export interface HtmlCompileOptions {
  /** Compiled CSS text from compileCss(). Embedded in <style> tag. */
  compiledCss: string;
  classNames: Record<string, string>;
  /** Optional public URL of a separately hosted CSS file (used by WP adapter) */
  cssFileUrl?: string;
  /**
   * Page variables for __NEXUS_STATE__ injection (data-bind runtime).
   * If omitted, no __NEXUS_STATE__ script is injected.
   */
  variables?: NexusVariable[];
  /**
   * PWA config for manifest link + SW registration + install prompt deferral.
   * If omitted or pwaConfig.enabled=false, no PWA tags are injected.
   */
  pwaConfig?: PWAConfig;
}

export function compileHtml(page: NexusPage, options: HtmlCompileOptions): string {
  const { compiledCss, classNames, cssFileUrl, variables, pwaConfig } = options;

  const bodyHtml = renderNode(page.rootNodeId, page.nodeMap, classNames);

  const customCss = page.customCss?.trim();
  const customJs  = page.customJs?.trim();

  // Data-bind state injection
  const nexusStateScript = (variables && variables.length > 0)
    ? `  ${generateNexusStateScript(variables)}`
    : null;

  // PWA head tags
  const pwaHeadTags = pwaConfig?.enabled
    ? generatePWAHeadTags(pwaConfig)
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')
        .trim()
    : null;

  const parts: string[] = [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    buildHeadMeta(page),
    cssFileUrl
      ? `  <link rel="stylesheet" href="${safeUrl(cssFileUrl)}">`
      : `  <style id="nx-compiled">\n${compiledCss}\n  </style>`,
    customCss ? `  <style id="nx-custom">\n${customCss}\n  </style>` : null,
    nexusStateScript,
    pwaHeadTags,
    `  <!-- Nexus Architect v1 — compiled ${new Date().toISOString()} -->`,
    `</head>`,
    `<body>`,
    bodyHtml || '<div id="nx-root"></div>',
    customJs ? `<script>\n${customJs}\n</script>` : null,
    `<script>${ENTRANCE_OBSERVER_SCRIPT}</script>`,
    `</body>`,
    `</html>`,
  ].filter(Boolean) as string[];

  return parts.join('\n');
}
