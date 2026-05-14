/**
 * Accordion widget — expandable FAQ-style content sections.
 */

import { memo, useState } from 'react';
import { ChevronDown, PanelTopOpen } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorInput, InspectorSection, getVisualNodeStyles } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

interface AccordionItem { q: string; a: string; }

export interface AccordionProps {
  items:       string; // JSON array of {q, a}
  accentColor: string;
  textColor:   string;
  bgColor:     string;
  borderColor: string;
  fontSize:    string;
  defaultOpen: number;
}

const DEFAULT_ITEMS: AccordionItem[] = [
  { q: 'What is your return policy?', a: 'We offer a 30-day hassle-free return policy on all orders.' },
  { q: 'How long does shipping take?', a: 'Standard shipping takes 5–7 business days. Express options are available at checkout.' },
  { q: 'Do you offer customer support?', a: 'Yes! Our team is available Monday–Friday, 9am–6pm via live chat and email.' },
];

const DEFAULTS: AccordionProps = {
  items:       JSON.stringify(DEFAULT_ITEMS),
  accentColor: '#10b77f',
  textColor:   '#1a1a1a',
  bgColor:     '#ffffff',
  borderColor: '#e5e7eb',
  fontSize:    '15px',
  defaultOpen: 0,
};

const AccordionRenderer = memo(function AccordionRenderer({ nodeId }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const [openIdx, setOpenIdx] = useState<number>(() => {
    const p = node?.props as Partial<AccordionProps> | undefined;
    return p?.defaultOpen ?? 0;
  });
  if (!node) return null;
  const p = { ...DEFAULTS, ...(node.props as Partial<AccordionProps>) };
  const visualOverrides = getVisualNodeStyles(node.styles?.base as Record<string, string>);

  let items: AccordionItem[] = DEFAULT_ITEMS;
  try { items = JSON.parse(p.items); } catch { /* use default */ }

  return (
    <div style={{ width: '100%', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${p.borderColor}`, ...visualOverrides }}>
      {items.map((item, i) => (
        <div key={i} style={{ borderBottom: i < items.length - 1 ? `1px solid ${p.borderColor}` : 'none' }}>
          <button
            onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', padding: '16px 20px',
              background: p.bgColor, cursor: 'pointer', border: 'none',
              textAlign: 'left', fontSize: p.fontSize, fontWeight: 600,
              color: p.textColor,
            }}
          >
            {item.q}
            <ChevronDown
              size={16}
              style={{
                color: p.accentColor, flexShrink: 0, marginLeft: '12px',
                transform: openIdx === i ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms',
              }}
            />
          </button>
          {openIdx === i && (
            <div
              style={{
                padding: '0 20px 16px', background: p.bgColor,
                fontSize: p.fontSize, color: p.textColor, lineHeight: 1.6,
                borderTop: `1px solid ${p.borderColor}`,
              }}
            >
              <div style={{ paddingTop: '12px' }}>{item.a}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

function AccordionInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p   = { ...DEFAULTS, ...(node.props as Partial<AccordionProps>) };
  const set = (k: keyof AccordionProps) => (v: string) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Accordion" />
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#bbcabf]">Items (JSON)</span>
        <textarea
          value={p.items}
          onChange={(e) => update(nodeId, { items: e.target.value })}
          rows={5}
          className="w-full bg-[#09100c] border border-white/10 rounded px-2 py-1.5 text-[11px] text-[#dde4dd] font-mono resize-none focus:outline-none focus:border-[#50dea3]"
        />
        <span className="text-[10px] text-[#bbcabf]">Format: [{"{"}"q":"Question","a":"Answer"{"}"}]</span>
      </div>
      <InspectorInput label="Accent Color" value={p.accentColor} onChange={set('accentColor')} placeholder="#10b77f" />
      <InspectorInput label="Text Color"   value={p.textColor}   onChange={set('textColor')}   placeholder="#1a1a1a" />
      <InspectorInput label="Bg Color"     value={p.bgColor}     onChange={set('bgColor')}     placeholder="#ffffff" />
      <InspectorInput label="Border Color" value={p.borderColor} onChange={set('borderColor')} placeholder="#e5e7eb" />
      <InspectorInput label="Font Size"    value={p.fontSize}    onChange={set('fontSize')}    placeholder="15px" />
    </div>
  );
}

export const AccordionWidget: WidgetDefinition = {
  type:         'accordion',
  label:        'Accordion',
  icon:         PanelTopOpen,
  category:     'content',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['accordion', 'faq', 'collapse', 'expand', 'toggle'],
  Renderer:     AccordionRenderer,
  Inspector:    AccordionInspector,
};
