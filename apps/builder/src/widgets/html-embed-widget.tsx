/**
 * HTML Embed widget — arbitrary HTML/CSS/JS snippet rendered in a sandboxed
 * iframe so embedded code cannot interact with the builder's own DOM.
 *
 * Security model:
 *   • srcdoc + sandbox="allow-scripts allow-same-origin" on the iframe.
 *   • In builder mode we show a read-only code preview + placeholder frame.
 *   • In preview / publish mode the iframe renders with full scripts allowed.
 *
 * The inspector uses a <textarea> so multi-line HTML is comfortable to edit.
 */

import { memo } from 'react';
import { Code2 } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorTextarea, InspectorInput, InspectorToggle, InspectorSection } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HtmlEmbedWidgetProps {
  html:        string;
  height:      string;  // CSS height, e.g. "200px"
  scrollable:  boolean;
}

const DEFAULTS: HtmlEmbedWidgetProps = {
  html:       '',
  height:     '200px',
  scrollable: false,
};

// ─── Canvas Placeholder (builder mode) ───────────────────────────────────────

function CodePreview({ html }: { html: string }) {
  const preview = html.trim().slice(0, 120) + (html.length > 120 ? '…' : '');
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-md"
      style={{
        background:  '#09100c',
        border:      '1px dashed rgba(255,255,255,0.10)',
        minHeight:   '80px',
      }}
    >
      <Code2 size={22} style={{ color: '#bbcabf', opacity: 0.6 }} />
      {html.trim() ? (
        <pre
          className="text-[10px] leading-snug max-w-[90%] overflow-hidden text-ellipsis whitespace-pre-wrap text-center"
          style={{ color: '#bbcabf', fontFamily: 'monospace' }}
        >
          {preview}
        </pre>
      ) : (
        <span className="text-[11px]" style={{ color: '#bbcabf' }}>
          HTML Embed — paste code in the inspector
        </span>
      )}
    </div>
  );
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

const HtmlEmbedWidgetRenderer = memo(function HtmlEmbedWidgetRenderer({
  nodeId,
  isPreview,
}: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  if (!node) return null;

  const p = { ...DEFAULTS, ...(node.props as Partial<HtmlEmbedWidgetProps>) };

  if (!isPreview) {
    return (
      <div style={{ width: '100%', height: p.height }}>
        <CodePreview html={p.html} />
      </div>
    );
  }

  // Preview / publish: render in sandboxed iframe
  return (
    <iframe
      title="HTML Embed"
      srcDoc={p.html}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      style={{
        width:      '100%',
        height:     p.height,
        border:     'none',
        display:    'block',
        overflow:   p.scrollable ? 'auto' : 'hidden',
        background: 'transparent',
      }}
    />
  );
});

// ─── Inspector ────────────────────────────────────────────────────────────────

function HtmlEmbedWidgetInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;

  const p   = { ...DEFAULTS, ...(node.props as Partial<HtmlEmbedWidgetProps>) };
  const set = (k: keyof HtmlEmbedWidgetProps) => (v: string | boolean) =>
    update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Code" />
      <InspectorTextarea
        label="HTML / CSS / JS"
        value={p.html}
        onChange={set('html') as (v: string) => void}
        placeholder={'<div style="color:red">Hello world</div>'}
        rows={8}
      />

      <InspectorSection label="Frame" />
      <InspectorInput
        label="Height"
        value={p.height}
        onChange={set('height') as (v: string) => void}
        placeholder="200px"
        hint="Any CSS height value — px, vh, em…"
      />
      <InspectorToggle
        label="Scrollable"
        value={p.scrollable ? 'yes' : 'no'}
        options={[
          { value: 'no',  label: 'Clip'   },
          { value: 'yes', label: 'Scroll' },
        ]}
        onChange={(v) => update(nodeId, { scrollable: v === 'yes' })}
      />
    </div>
  );
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const HtmlEmbedWidget: WidgetDefinition = {
  type:         'html-embed',
  label:        'HTML Embed',
  icon:         Code2,
  category:     'media',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['html', 'code', 'embed', 'custom', 'script', 'iframe', 'raw'],
  Renderer:     HtmlEmbedWidgetRenderer,
  Inspector:    HtmlEmbedWidgetInspector,
};
