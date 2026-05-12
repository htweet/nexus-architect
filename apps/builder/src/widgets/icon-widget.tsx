/**
 * Icon widget — renders a single Lucide icon with size/color/alignment controls.
 */

import { memo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Star } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorInput, InspectorToggle, InspectorSection } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export interface IconProps {
  iconName:  string;
  size:      number;
  color:     string;
  align:     string;
  link:      string;
  padding:   string;
}

const DEFAULTS: IconProps = {
  iconName: 'Star',
  size:     40,
  color:    '#10b77f',
  align:    'center',
  link:     '',
  padding:  '8px 0',
};

const IconRenderer = memo(function IconRenderer({ nodeId, isPreview }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  if (!node) return null;
  const p = { ...DEFAULTS, ...(node.props as Partial<IconProps>) };

  // Dynamically resolve lucide icon
  const IconComp = (LucideIcons as Record<string, unknown>)[p.iconName] as React.FC<{ size: number; color: string }> | undefined;

  const icon = IconComp
    ? <IconComp size={p.size} color={p.color} />
    : <Star size={p.size} color={p.color} />;

  return (
    <div style={{ padding: p.padding, textAlign: p.align as 'left' | 'center' | 'right' }}>
      {p.link && !isPreview
        ? <span style={{ cursor: 'pointer', display: 'inline-block' }}>{icon}</span>
        : p.link
        ? <a href={p.link} style={{ display: 'inline-block' }}>{icon}</a>
        : <span style={{ display: 'inline-block' }}>{icon}</span>
      }
    </div>
  );
});

function IconInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p   = { ...DEFAULTS, ...(node.props as Partial<IconProps>) };
  const set = (k: keyof IconProps) => (v: string) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Icon" />
      <InspectorInput label="Icon Name" value={p.iconName} onChange={set('iconName')} placeholder="Star, Heart, Zap…" />
      <InspectorInput label="Size"      value={String(p.size)} onChange={(v) => update(nodeId, { size: Number(v) })} placeholder="40" />
      <InspectorInput label="Color"     value={p.color}   onChange={set('color')}   placeholder="#10b77f" />
      <InspectorInput label="Link"      value={p.link}    onChange={set('link')}    placeholder="https://…" />
      <InspectorInput label="Padding"   value={p.padding} onChange={set('padding')} placeholder="8px 0" />
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

export const IconWidget: WidgetDefinition = {
  type:         'icon',
  label:        'Icon',
  icon:         Star,
  category:     'content',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['icon', 'symbol', 'star', 'check', 'lucide'],
  Renderer:     IconRenderer,
  Inspector:    IconInspector,
};
