/**
 * Icon Box widget — icon + heading + text. Essential for feature grids.
 */

import { memo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Zap } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorInput, InspectorToggle, InspectorSection } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export interface IconBoxProps {
  iconName:    string;
  iconSize:    number;
  iconColor:   string;
  iconBg:      string;
  iconShape:   'circle' | 'square' | 'none';
  heading:     string;
  headingSize: string;
  text:        string;
  textColor:   string;
  align:       'left' | 'center' | 'right';
  iconPos:     'top' | 'left';
  gap:         string;
  padding:     string;
}

const DEFAULTS: IconBoxProps = {
  iconName:    'Zap',
  iconSize:    24,
  iconColor:   '#10b77f',
  iconBg:      'rgba(16,183,127,0.10)',
  iconShape:   'circle',
  heading:     'Blazing Fast Performance',
  headingSize: '18px',
  text:        'Built for speed from the ground up. Our infrastructure handles millions of requests with sub-millisecond latency.',
  textColor:   '#6b7280',
  align:       'left',
  iconPos:     'top',
  gap:         '16px',
  padding:     '24px',
};

const IconBoxRenderer = memo(function IconBoxRenderer({ nodeId }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  if (!node) return null;
  const p = { ...DEFAULTS, ...(node.props as Partial<IconBoxProps>) };

  const IconComp = ((LucideIcons as Record<string, unknown>)[p.iconName] as React.FC<{ size: number; color: string }>) || Zap;
  const isCircle = p.iconShape === 'circle';
  const isSquare = p.iconShape === 'square';

  const iconEl = (
    <div style={{
      display:         'inline-flex',
      alignItems:      'center',
      justifyContent:  'center',
      width:           isCircle || isSquare ? `${p.iconSize + 24}px` : undefined,
      height:          isCircle || isSquare ? `${p.iconSize + 24}px` : undefined,
      borderRadius:    isCircle ? '50%' : isSquare ? '8px' : undefined,
      background:      (isCircle || isSquare) ? p.iconBg : 'transparent',
      flexShrink:      0,
    }}>
      <IconComp size={p.iconSize} color={p.iconColor} />
    </div>
  );

  const textBlock = (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: p.headingSize, fontWeight: 700, color: '#111827', marginBottom: '8px', lineHeight: 1.3 }}>
        {p.heading}
      </div>
      <div style={{ fontSize: '15px', color: p.textColor, lineHeight: 1.7 }}>{p.text}</div>
    </div>
  );

  return (
    <div style={{
      padding:    p.padding,
      textAlign:  p.iconPos === 'top' ? p.align : 'left',
    }}>
      {p.iconPos === 'left' ? (
        <div style={{ display: 'flex', gap: p.gap, alignItems: 'flex-start' }}>
          {iconEl}
          {textBlock}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: p.gap, alignItems: p.align === 'center' ? 'center' : p.align === 'right' ? 'flex-end' : 'flex-start' }}>
          {iconEl}
          {textBlock}
        </div>
      )}
    </div>
  );
});

function IconBoxInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p   = { ...DEFAULTS, ...(node.props as Partial<IconBoxProps>) };
  const set = (k: keyof IconBoxProps) => (v: string) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Icon" />
      <InspectorInput label="Icon Name"  value={p.iconName}  onChange={set('iconName')}  placeholder="Zap, Star, Shield…" />
      <InspectorInput label="Size"       value={String(p.iconSize)} onChange={(v) => update(nodeId, { iconSize: Number(v) })} placeholder="24" />
      <InspectorInput label="Icon Color" value={p.iconColor} onChange={set('iconColor')} placeholder="#10b77f" />
      <InspectorInput label="Icon Bg"    value={p.iconBg}    onChange={set('iconBg')}    placeholder="rgba(16,183,127,0.1)" />
      <InspectorToggle
        label="Shape"
        value={p.iconShape}
        options={[
          { value: 'circle', label: 'Circle' },
          { value: 'square', label: 'Square' },
          { value: 'none',   label: 'None'   },
        ]}
        onChange={set('iconShape')}
      />
      <InspectorToggle
        label="Icon Position"
        value={p.iconPos}
        options={[
          { value: 'top',  label: 'Top'  },
          { value: 'left', label: 'Left' },
        ]}
        onChange={set('iconPos')}
      />
      <InspectorSection label="Content" />
      <InspectorInput label="Heading"      value={p.heading}      onChange={set('heading')}      placeholder="Feature title" />
      <InspectorInput label="Heading Size" value={p.headingSize}  onChange={set('headingSize')}  placeholder="18px" />
      <InspectorInput label="Text Color"   value={p.textColor}    onChange={set('textColor')}    placeholder="#6b7280" />
      <InspectorToggle
        label="Align"
        value={p.align}
        options={[
          { value: 'left',   label: 'Left'   },
          { value: 'center', label: 'Center' },
          { value: 'right',  label: 'Right'  },
        ]}
        onChange={set('align')}
      />
    </div>
  );
}

import React from 'react';

export const IconBoxWidget: WidgetDefinition = {
  type:         'icon-box',
  label:        'Icon Box',
  icon:         Zap,
  category:     'content',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['icon box', 'feature', 'card', 'icon text', 'benefit'],
  Renderer:     IconBoxRenderer,
  Inspector:    IconBoxInspector,
};
