/**
 * GlobalStylesPanel — Phase 4.2
 *
 * Architecture:
 *   • Curated token groups (Colors, Typography, Spacing/Shape) are mapped to
 *     page.globalStyles (Record<string, string>).
 *   • On every change, a <style id="nx-global-styles"> tag is injected into
 *     the builder document so the canvas preview reflects the tokens live.
 *   • Tokens are stored as raw CSS values (hex, px, font-family string, etc.)
 *     — NOT as CSS var() references — so they are portable to any renderer.
 *   • updatePageMeta writes to the Zustand store → marks dirty → autosave fires.
 */

import { useEffect } from 'react';
import { useCanvasStore } from '@nexus/core';
import { InspectorColor, InspectorInput, InspectorSection } from '@/widgets/shared';

// ─── Token definitions ────────────────────────────────────────────────────────

interface TokenDef {
  key: string;
  label: string;
  type: 'color' | 'text';
  placeholder?: string;
  hint?: string;
}

const TOKEN_GROUPS: { label: string; tokens: TokenDef[] }[] = [
  {
    label: 'Brand Colors',
    tokens: [
      { key: '--nx-color-primary',   label: 'Primary',   type: 'color', placeholder: '#6366f1' },
      { key: '--nx-color-secondary', label: 'Secondary', type: 'color', placeholder: '#8b5cf6' },
      { key: '--nx-color-accent',    label: 'Accent',    type: 'color', placeholder: '#10b981' },
    ],
  },
  {
    label: 'Page Background',
    tokens: [
      { key: '--nx-page-bg',   label: 'Page Background', type: 'color', placeholder: '#ffffff' },
      { key: '--nx-page-text', label: 'Body Text Color', type: 'color', placeholder: '#111827' },
      { key: '--nx-page-muted', label: 'Muted Text',     type: 'color', placeholder: '#6b7280' },
    ],
  },
  {
    label: 'Typography',
    tokens: [
      { key: '--nx-font-body',      label: 'Body Font',      type: 'text', placeholder: 'Inter, sans-serif',           hint: 'Full font-family value' },
      { key: '--nx-font-heading',   label: 'Heading Font',   type: 'text', placeholder: 'Inter, sans-serif' },
      { key: '--nx-font-mono',      label: 'Mono Font',      type: 'text', placeholder: 'JetBrains Mono, monospace' },
      { key: '--nx-font-size-base', label: 'Base Font Size', type: 'text', placeholder: '16px', hint: 'Applied to body' },
      { key: '--nx-line-height',    label: 'Line Height',    type: 'text', placeholder: '1.6' },
    ],
  },
  {
    label: 'Shape & Spacing',
    tokens: [
      { key: '--nx-radius-sm',       label: 'Radius Small',       type: 'text', placeholder: '4px' },
      { key: '--nx-radius-md',       label: 'Radius Medium',      type: 'text', placeholder: '8px' },
      { key: '--nx-radius-lg',       label: 'Radius Large',       type: 'text', placeholder: '16px' },
      { key: '--nx-spacing-section', label: 'Section Spacing',    type: 'text', placeholder: '80px', hint: 'Vertical gap between sections' },
      { key: '--nx-container-width', label: 'Max Container Width', type: 'text', placeholder: '1200px' },
    ],
  },
  {
    label: 'Buttons',
    tokens: [
      { key: '--nx-btn-primary-bg',   label: 'Button Background', type: 'color', placeholder: '#6366f1' },
      { key: '--nx-btn-primary-text', label: 'Button Text',       type: 'color', placeholder: '#ffffff' },
      { key: '--nx-btn-radius',       label: 'Button Radius',     type: 'text',  placeholder: '8px' },
    ],
  },
];

// ─── Style injector ───────────────────────────────────────────────────────────

function buildCssBlock(tokens: Record<string, string>): string {
  const lines = Object.entries(tokens)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `  ${k}: ${v};`);
  if (lines.length === 0) return '';
  return `:root {\n${lines.join('\n')}\n}`;
}

export function injectGlobalStyles(tokens: Record<string, string>) {
  const css = buildCssBlock(tokens);
  let tag = document.getElementById('nx-global-styles') as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 'nx-global-styles';
    document.head.appendChild(tag);
  }
  tag.textContent = css;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobalStylesPanel() {
  const globalStyles   = useCanvasStore((s) => s.page?.globalStyles ?? {});
  const updatePageMeta = useCanvasStore((s) => s.updatePageMeta);

  // Sync tokens into the builder document on every change (live preview)
  useEffect(() => {
    injectGlobalStyles(globalStyles);
  }, [globalStyles]);

  const setToken = (key: string, value: string) => {
    updatePageMeta({ globalStyles: { ...globalStyles, [key]: value } });
  };

  const getToken = (key: string) => globalStyles[key] ?? '';

  return (
    <div className="flex flex-col gap-3 px-3 pb-4">
      <p className="text-[11px] leading-relaxed pt-1" style={{ color: '#bbcabf' }}>
        Design tokens applied globally to every published page. Changes preview live on canvas.
      </p>

      {TOKEN_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-2.5">
          <InspectorSection label={group.label} />
          {group.tokens.map((token) =>
            token.type === 'color' ? (
              <InspectorColor
                key={token.key}
                label={token.label}
                value={getToken(token.key)}
                onChange={(v) => setToken(token.key, v)}
              />
            ) : (
              <InspectorInput
                key={token.key}
                label={token.label}
                value={getToken(token.key)}
                onChange={(v) => setToken(token.key, v)}
                {...(token.placeholder ? { placeholder: token.placeholder } : {})}
                {...(token.hint ? { hint: token.hint } : {})}
              />
            ),
          )}
        </div>
      ))}

      <button
        onClick={() => { updatePageMeta({ globalStyles: {} }); injectGlobalStyles({}); }}
        className="mt-1 h-9 w-full rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors duration-[140ms]"
        style={{ background: '#09100c', border: '1px solid rgba(255,255,255,0.10)', color: '#bbcabf' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ffb4ab'; e.currentTarget.style.borderColor = 'rgba(147,0,10,0.20)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#bbcabf'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
      >
        Reset All Tokens
      </button>
    </div>
  );
}
