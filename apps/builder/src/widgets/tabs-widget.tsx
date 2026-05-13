/**
 * Tabs widget — horizontal tabbed content panels.
 */

import { memo, useState } from 'react';
import { PanelTop } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorInput, InspectorSection, getVisualNodeStyles } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

interface TabItem { label: string; content: string; }

export interface TabsProps {
  items:       string;
  accentColor: string;
  textColor:   string;
  bgColor:     string;
  borderColor: string;
}

const DEFAULT_ITEMS: TabItem[] = [
  { label: 'Features',   content: 'Describe your key features here. What makes your product stand out from the competition?' },
  { label: 'Benefits',   content: "Highlight the concrete benefits. How does this improve your customer's life or business?" },
  { label: 'Pricing',    content: 'Present your pricing options clearly. Include your most popular plan with a visual highlight.' },
];

const DEFAULTS: TabsProps = {
  items:       JSON.stringify(DEFAULT_ITEMS),
  accentColor: '#10b77f',
  textColor:   '#1a1a1a',
  bgColor:     '#ffffff',
  borderColor: '#e5e7eb',
};

const TabsRenderer = memo(function TabsRenderer({ nodeId }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const [active, setActive] = useState(0);
  if (!node) return null;
  const p = { ...DEFAULTS, ...(node.props as Partial<TabsProps>) };
  const visualOverrides = getVisualNodeStyles(node.styles?.base as Record<string, string>);

  let items: TabItem[] = DEFAULT_ITEMS;
  try { items = JSON.parse(p.items); } catch { /* use default */ }

  return (
    <div style={{ width: '100%', border: `1px solid ${p.borderColor}`, borderRadius: '8px', overflow: 'hidden', ...visualOverrides }}>
      <div style={{ display: 'flex', borderBottom: `1px solid ${p.borderColor}`, background: '#f9fafb' }}>
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              padding: '12px 20px', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: active === i ? 700 : 500,
              color: active === i ? p.accentColor : '#6b7280',
              background: active === i ? p.bgColor : 'transparent',
              borderBottom: active === i ? `2px solid ${p.accentColor}` : '2px solid transparent',
              transition: 'all 140ms',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ padding: '20px 24px', background: p.bgColor, fontSize: '15px', color: p.textColor, lineHeight: 1.7 }}>
        {items[active]?.content ?? ''}
      </div>
    </div>
  );
});

function TabsInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p   = { ...DEFAULTS, ...(node.props as Partial<TabsProps>) };
  const set = (k: keyof TabsProps) => (v: string) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Tabs" />
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#bbcabf]">Items (JSON)</span>
        <textarea
          value={p.items}
          onChange={(e) => update(nodeId, { items: e.target.value })}
          rows={5}
          className="w-full bg-[#09100c] border border-white/10 rounded px-2 py-1.5 text-[11px] text-[#dde4dd] font-mono resize-none focus:outline-none focus:border-[#50dea3]"
        />
        <span className="text-[10px] text-[#bbcabf]">Format: [{"{"}"label":"Tab","content":"Body"{"}"}]</span>
      </div>
      <InspectorInput label="Accent Color" value={p.accentColor} onChange={set('accentColor')} placeholder="#10b77f" />
      <InspectorInput label="Text Color"   value={p.textColor}   onChange={set('textColor')}   placeholder="#1a1a1a" />
      <InspectorInput label="Bg Color"     value={p.bgColor}     onChange={set('bgColor')}     placeholder="#ffffff" />
      <InspectorInput label="Border Color" value={p.borderColor} onChange={set('borderColor')} placeholder="#e5e7eb" />
    </div>
  );
}

export const TabsWidget: WidgetDefinition = {
  type:         'tabs',
  label:        'Tabs',
  icon:         PanelTop,
  category:     'content',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['tabs', 'tabbed', 'panels', 'content', 'navigation'],
  Renderer:     TabsRenderer,
  Inspector:    TabsInspector,
};
