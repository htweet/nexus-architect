/**
 * Tabs widget — horizontal tabbed content panels.
 */

import { memo, useState } from 'react';
import { PanelTop } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorInput, InspectorSection } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

interface TabItem { label: string; content: string; }

export interface TabsProps {
  items:       string; // JSON
  accentColor: string;
  textColor:   string;
  bgColor:     string;
  borderColor: string;
}

const DEFAULT_ITEMS: TabItem[] = [
  { label: 'Features',   content: 'Describe your key features here. What makes your product stand out from the competition?' },
  { label: 'Benefits',   content: 'Highlight the concrete benefits. How does this improve your customer\'s life or business?' },
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

  let items: TabItem[] = DEFAULT_ITEMS;
  try { items = JSON.parse(p.items); } catch { /* use default */ }

  return (
    <div style={{ width: '100%', border: `1px solid ${p.borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
      {/* Tab bar */}
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

      {/* Active panel */}
      {items[active] && (
        <div style={{
          padding: '24px', background: p.bgColor,
          fontSize: '15px', color: p.textColor, lineHeight: 1.7,
        }}>
          {items[active].content}
        </div>
      )}
    </div>
  );
});

function TabsInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p = { ...DEFAULTS, ...(node.props as Partial<TabsProps>) };

  let items: TabItem[] = DEFAULT_ITEMS;
  try { items = JSON.parse(p.items); } catch { /* use default */ }

  const updateItem = (idx: number, field: keyof TabItem, val: string) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val } as TabItem;
    update(nodeId, { items: JSON.stringify(next) });
  };
  const addItem    = () => update(nodeId, { items: JSON.stringify([...items, { label: `Tab ${items.length + 1}`, content: 'Tab content goes here.' }]) });
  const removeItem = (idx: number) => update(nodeId, { items: JSON.stringify(items.filter((_, i) => i !== idx)) });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Tabs" />
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-1 p-2 rounded bg-white/5 border border-white/10">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#bbcabf]">Tab {i + 1}</span>
            <button onClick={() => removeItem(i)} className="text-[#ffb4ab] text-xs hover:opacity-80">✕</button>
          </div>
          <input value={item.label} onChange={(e) => updateItem(i, 'label', e.target.value)}
            placeholder="Tab label" className="w-full bg-[#09100c] border border-white/10 rounded px-2 py-1 text-xs text-[#dde4dd] focus:outline-none focus:border-[#50dea3]" />
          <textarea value={item.content} onChange={(e) => updateItem(i, 'content', e.target.value)}
            rows={2} placeholder="Tab content" className="w-full bg-[#09100c] border border-white/10 rounded px-2 py-1 text-xs text-[#dde4dd] resize-none focus:outline-none focus:border-[#50dea3]" />
        </div>
      ))}
      <button onClick={addItem} className="w-full py-1.5 rounded border border-dashed border-white/20 text-[#bbcabf] text-xs hover:border-white/40 transition-colors">
        + Add Tab
      </button>
      <InspectorInput label="Accent Color" value={p.accentColor} onChange={(v) => update(nodeId, { accentColor: v })} placeholder="#10b77f" />
    </div>
  );
}

export const TabsWidget: WidgetDefinition = {
  type:         'tabs',
  label:        'Tabs',
  icon:         PanelTop,
  category:     'interactive',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['tabs', 'tabbed', 'panel', 'switch', 'content'],
  Renderer:     TabsRenderer,
  Inspector:    TabsInspector,
};
