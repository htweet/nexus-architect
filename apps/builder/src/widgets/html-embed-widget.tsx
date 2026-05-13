/**
 * HTML Embed widget — arbitrary HTML/CSS/JS snippet rendered in a sandboxed iframe.
 */

import { memo } from 'react';
import { Code2 } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorTextarea, InspectorInput, InspectorToggle, InspectorSection, getVisualNodeStyles } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export interface HtmlEmbedWidgetProps {
  html:       string;
  height:     string;
  scrollable: boolean;
}

const DEFAULTS: HtmlEmbedWidgetProps = {
  html:       '',
  height:     '200px',
  scrollable: false,
};

function CodePreview({ html }: { html: string }) {
  const preview = html.trim().slice(0, 120) + (html.length > 120 ? '…' : '');
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-md"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '2px dashed rgba(255,255,255,0.12)',
        padding: '16px',
      }}
    >
      <Code2 size={28} style={{ color: '#bbcabf', opacity: 0.5 }} strokeWidth={1.5} />
      {html.trim() ? (
        <pre className="text-[10px] text-[#bbcabf] opacity-70 max-w-full overflow-hidden text-ellipsis whitespace-pre-wrap break-all"
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

const HtmlEmbedWidgetRenderer = memo(function HtmlEmbedWidgetRenderer({
  nodeId,
  isPreview,
}: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  if (!node) return null;

  const p = { ...DEFAULTS, ...(node.props as Partial<HtmlEmbedWidgetProps>) };
  const visualOverrides = getVisualNodeStyles(node.styles?.base as Record<string, string>);

  if (!isPreview) {
    return (
      <div style={{ width: '100%', height: p.height, ...visualOverrides }}>
        <CodePreview html={p.html} />
      </div>
    );
  }

  return (
    <iframe
      title="HTML Embed"
      srcDoc={p.html}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      style={{
        width:    '100%',
        height:   p.height,
        border:   'none',
        overflow: p.scrollable ? 'auto' : 'hidden',
        ...visualOverrides,
      }}
    />
  );
});

function HtmlEmbedWidgetInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p   = { ...DEFAULTS, ...(node.props as Partial<HtmlEmbedWidgetProps>) };
  const set = (k: keyof HtmlEmbedWidgetProps) => (v: string) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Code" />
      <InspectorTextarea
        label="HTML / CSS / JS"
        value={p.html}
        onChange={set('html')}
        placeholder="<div>Hello world</div>"
        rows={6}
      />
      <InspectorInput
        label="Height"
        value={p.height}
        onChange={set('height')}
        placeholder="200px"
        hint="Fixed height for the embed container"
      />
      <InspectorToggle
        label="Scrollable"
        value={p.scrollable ? 'yes' : 'no'}
        options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
        onChange={(v) => update(nodeId, { scrollable: v === 'yes' })}
      />
    </div>
  );
}

export const HtmlEmbedWidget: WidgetDefinition = {
  type:         'html-embed',
  label:        'HTML Embed',
  icon:         Code2,
  category:     'content',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['html', 'embed', 'code', 'custom', 'iframe', 'script'],
  Renderer:     HtmlEmbedWidgetRenderer,
  Inspector:    HtmlEmbedWidgetInspector,
};
