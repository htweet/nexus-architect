/**
 * List widget — a styled bullet/icon list with multiple items.
 */

import { memo } from 'react';
import { List } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorInput, InspectorToggle, InspectorSection, getVisualNodeStyles } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export interface ListProps {
  items:     string;   // newline-separated
  style:     'disc' | 'check' | 'arrow' | 'numbered' | 'none';
  color:     string;
  iconColor: string;
  fontSize:  string;
  gap:       string;
  padding:   string;
}

const DEFAULTS: ListProps = {
  items:     'First item\nSecond item\nThird item',
  style:     'check',
  color:     '',
  iconColor: '#10b77f',
  fontSize:  '16px',
  gap:       '10px',
  padding:   '0',
};

const ICONS: Record<ListProps['style'], string> = {
  disc:     '•',
  check:    '✓',
  arrow:    '→',
  numbered: '',
  none:     '',
};

const ListRenderer = memo(function ListRenderer({ nodeId }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  if (!node) return null;
  const p = { ...DEFAULTS, ...(node.props as Partial<ListProps>) };
  const items = p.items.split('\n').filter(Boolean);
  const visualOverrides = getVisualNodeStyles(node.styles?.base as Record<string, string>);

  return (
    <ul
      style={{
        padding:   p.padding,
        listStyle: 'none',
        margin:    0,
        display:   'flex',
        flexDirection: 'column',
        gap:       p.gap,
        color:     p.color || undefined,
        fontSize:  p.fontSize,
        ...visualOverrides,
      }}
    >
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          {p.style !== 'none' && (
            <span style={{ color: p.iconColor, fontWeight: 700, minWidth: '18px', lineHeight: p.fontSize }}>
              {p.style === 'numbered' ? `${i + 1}.` : ICONS[p.style]}
            </span>
          )}
          <span style={{ lineHeight: 1.6 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
});

function ListInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p   = { ...DEFAULTS, ...(node.props as Partial<ListProps>) };
  const set = (k: keyof ListProps) => (v: string) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="List" />
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#bbcabf]">Items (one per line)</span>
        <textarea
          value={p.items}
          onChange={(e) => update(nodeId, { items: e.target.value })}
          rows={4}
          className="w-full bg-[#09100c] border border-white/10 rounded px-2 py-1.5 text-xs text-[#dde4dd] font-mono resize-none focus:outline-none focus:border-[#50dea3]"
        />
      </div>
      <InspectorToggle
        label="Style"
        value={p.style}
        options={[
          { value: 'check',    label: '✓' },
          { value: 'disc',     label: '•' },
          { value: 'arrow',    label: '→' },
          { value: 'numbered', label: '1.' },
          { value: 'none',     label: '—' },
        ]}
        onChange={set('style')}
      />
      <InspectorInput label="Icon Color" value={p.iconColor} onChange={set('iconColor')} placeholder="#10b77f" />
      <InspectorInput label="Font Size"  value={p.fontSize}  onChange={set('fontSize')}  placeholder="16px" />
      <InspectorInput label="Gap"        value={p.gap}       onChange={set('gap')}        placeholder="10px" />
    </div>
  );
}

export const ListWidget: WidgetDefinition = {
  type:         'list',
  label:        'List',
  icon:         List,
  category:     'content',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['list', 'bullet', 'check', 'items', 'ul', 'ol'],
  Renderer:     ListRenderer,
  Inspector:    ListInspector,
};
