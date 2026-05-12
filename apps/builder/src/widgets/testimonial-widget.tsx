/**
 * Testimonial widget — a quote card with author, avatar initials, and star rating.
 */

import { memo } from 'react';
import { Quote } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorInput, InspectorToggle, InspectorSection } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export interface TestimonialProps {
  quote:       string;
  author:      string;
  role:        string;
  company:     string;
  rating:      number;
  avatarBg:    string;
  accentColor: string;
  layout:      'card' | 'minimal' | 'centered';
}

const DEFAULTS: TestimonialProps = {
  quote:       'This product has completely transformed how our team works. The results speak for themselves — we\'ve seen a 40% increase in productivity since switching.',
  author:      'Sarah Johnson',
  role:        'Head of Product',
  company:     'Acme Inc.',
  rating:      5,
  avatarBg:    '#10b77f',
  accentColor: '#10b77f',
  layout:      'card',
};

const StarRating = ({ count, color }: { count: number; color: string }) => (
  <div style={{ display: 'flex', gap: '2px' }}>
    {[1,2,3,4,5].map((i) => (
      <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= count ? color : '#e5e7eb'}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ))}
  </div>
);

const TestimonialRenderer = memo(function TestimonialRenderer({ nodeId }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  if (!node) return null;
  const p = { ...DEFAULTS, ...(node.props as Partial<TestimonialProps>) };
  const initials = p.author.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const isCard     = p.layout === 'card';
  const isCentered = p.layout === 'centered';

  return (
    <div style={{
      padding:       isCard ? '28px 32px' : '20px 0',
      background:    isCard ? '#ffffff' : 'transparent',
      borderRadius:  isCard ? '12px' : '0',
      border:        isCard ? '1px solid #e5e7eb' : 'none',
      textAlign:     isCentered ? 'center' : 'left',
      width:         '100%',
      boxShadow:     isCard ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
    }}>
      {/* Quote icon */}
      <Quote size={24} style={{ color: p.accentColor, marginBottom: '12px', ...(isCentered ? { margin: '0 auto 12px' } : {}) }} />

      {/* Stars */}
      <div style={{ marginBottom: '12px', ...(isCentered ? { display: 'flex', justifyContent: 'center' } : {}) }}>
        <StarRating count={p.rating} color={p.accentColor} />
      </div>

      {/* Quote text */}
      <p style={{ fontSize: '16px', lineHeight: 1.7, color: '#374151', marginBottom: '20px', fontStyle: 'italic' }}>
        "{p.quote}"
      </p>

      {/* Author row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', ...(isCentered ? { justifyContent: 'center' } : {}) }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: p.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: '13px', flexShrink: 0,
        }}>{initials}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{p.author}</div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            {p.role}{p.company ? `, ${p.company}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
});

function TestimonialInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p   = { ...DEFAULTS, ...(node.props as Partial<TestimonialProps>) };
  const set = (k: keyof TestimonialProps) => (v: string) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Testimonial" />
      <InspectorToggle
        label="Layout"
        value={p.layout}
        options={[
          { value: 'card',     label: 'Card'     },
          { value: 'minimal',  label: 'Minimal'  },
          { value: 'centered', label: 'Centered' },
        ]}
        onChange={set('layout')}
      />
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#bbcabf]">Quote</span>
        <textarea value={p.quote} onChange={(e) => update(nodeId, { quote: e.target.value })}
          rows={3} className="w-full bg-[#09100c] border border-white/10 rounded px-2 py-1.5 text-xs text-[#dde4dd] resize-none focus:outline-none focus:border-[#50dea3]" />
      </div>
      <InspectorInput label="Author"       value={p.author}      onChange={set('author')}      placeholder="Jane Smith" />
      <InspectorInput label="Role"         value={p.role}        onChange={set('role')}         placeholder="CEO" />
      <InspectorInput label="Company"      value={p.company}     onChange={set('company')}      placeholder="Acme Inc." />
      <InspectorToggle
        label="Stars"
        value={String(p.rating)}
        options={['1','2','3','4','5'].map(v => ({ value: v, label: v }))}
        onChange={(v) => update(nodeId, { rating: Number(v) })}
      />
      <InspectorInput label="Avatar Color" value={p.avatarBg}    onChange={set('avatarBg')}    placeholder="#10b77f" />
      <InspectorInput label="Accent Color" value={p.accentColor} onChange={set('accentColor')} placeholder="#10b77f" />
    </div>
  );
}

export const TestimonialWidget: WidgetDefinition = {
  type:         'testimonial',
  label:        'Testimonial',
  icon:         Quote,
  category:     'content',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['testimonial', 'quote', 'review', 'rating', 'social proof'],
  Renderer:     TestimonialRenderer,
  Inspector:    TestimonialInspector,
};
