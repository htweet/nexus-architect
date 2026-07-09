/**
 * Button widget — CTA / link button with multiple style variants.
 * Named button-widget to avoid collision with the ui/Button component.
 *
 * VAE Task 143: uses useNodeProps for data-bind resolution.
 */

import { memo } from 'react';
import { MousePointerClick } from 'lucide-react';
import { useCanvasStore, useNodeProps } from '@nexus/core';
import { InspectorInput, InspectorToggle, InspectorSelect, InspectorSection, getVisualNodeStyles } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export interface ButtonWidgetProps {
  label: string;
  variant: 'primary' | 'outline' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  href: string;
  fullWidth: boolean;
  borderRadius: string;
}

const DEFAULTS: ButtonWidgetProps = {
  label:        'Click Me',
  variant:      'primary',
  size:         'md',
  href:         '',
  fullWidth:    false,
  borderRadius: '6px',
};

// All variants use CSS tokens — no hardcoded colours.
const VARIANT_STYLES: Record<ButtonWidgetProps['variant'], string> = {
  primary: 'background: #10b77f; color: #003824; border: none; box-shadow: 0 0 16px rgba(16,183,127,0.30);',
  outline: 'background: transparent; color: #50dea3; border: 2px solid #10b77f;',
  ghost:   'background: rgba(16,183,127,0.15); color: #50dea3; border: 1px solid rgba(16,183,127,0.08);',
  danger:  'background: rgba(147,0,10,0.20); color: #ffb4ab; border: 1px solid rgba(147,0,10,0.20);',
};

const SIZE_STYLES: Record<ButtonWidgetProps['size'], string> = {
  sm: 'padding: 7px 16px; font-size: 12px; letter-spacing: 0.02em;',
  md: 'padding: 10px 24px; font-size: 13px; letter-spacing: 0.01em;',
  lg: 'padding: 14px 32px; font-size: 15px; letter-spacing: 0.005em;',
};

const ButtonWidgetRenderer = memo(function ButtonWidgetRenderer({ nodeId, isPreview }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap[nodeId]);

  // VAE: resolved props with data-bind support
  const resolvedProps = useNodeProps(nodeId);

  if (!node) return null;

  const p   = { ...DEFAULTS, ...(resolvedProps as Partial<ButtonWidgetProps>) };
  const Tag = p.href && isPreview ? 'a' : 'button';
  const visualOverrides = getVisualNodeStyles(node.styles?.base as Record<string, string>);

  return (
    <div className={p.fullWidth ? 'w-full' : 'inline-flex'}>
      <Tag
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontWeight:     '700',       /* Bold is a must */
          fontFamily:     'inherit',
          cursor:         isPreview ? 'pointer' : 'default',
          borderRadius:   p.borderRadius,
          width:          p.fullWidth ? '100%' : undefined,
          transition:     'all 180ms cubic-bezier(0.2,0,0.2,1)',
          textTransform:  'none',
          whiteSpace:     'nowrap',
          ...Object.fromEntries(
            (VARIANT_STYLES[p.variant] + SIZE_STYLES[p.size])
              .split(';').filter(Boolean)
              .map(s => {
                const [k, ...v] = s.split(':');
                const key = (k?.trim() ?? '').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
                return [key, v.join(':').trim()];
              })
          ),
          ...visualOverrides, // RightPanel Style tab wins
        }}
        {...(p.href && isPreview ? { href: p.href } : {})}
      >
        {p.label}
      </Tag>
    </div>
  );
});

function ButtonWidgetInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;

  const p   = { ...DEFAULTS, ...(node.props as Partial<ButtonWidgetProps>) };
  const set = (k: keyof ButtonWidgetProps) => (v: string | boolean) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Content" />
      <InspectorInput
        label="Label"
        value={p.label}
        onChange={set('label') as (v: string) => void}
        placeholder="Button text"
      />
      <InspectorInput
        label="Link"
        value={p.href}
        onChange={set('href') as (v: string) => void}
        placeholder="https://…"
        type="url"
      />
      <InspectorSection label="Appearance" />
      <InspectorSelect
        label="Variant"
        value={p.variant}
        options={[
          { value: 'primary', label: 'Primary' },
          { value: 'outline', label: 'Outline' },
          { value: 'ghost',   label: 'Ghost'   },
          { value: 'danger',  label: 'Danger'  },
        ]}
        onChange={set('variant') as (v: string) => void}
      />
      <InspectorToggle
        label="Size"
        value={p.size}
        options={[
          { value: 'sm', label: 'S' },
          { value: 'md', label: 'M' },
          { value: 'lg', label: 'L' },
        ]}
        onChange={set('size') as (v: string) => void}
      />
      <InspectorToggle
        label="Full Width"
        value={p.fullWidth ? 'yes' : 'no'}
        options={[
          { value: 'no',  label: 'Auto' },
          { value: 'yes', label: 'Full' },
        ]}
        onChange={(v) => update(nodeId, { fullWidth: v === 'yes' })}
      />
      <p className="text-[11px] leading-relaxed px-0.5 pt-1" style={{ color: '#bbcabf' }}>
        Use the <strong style={{ color: '#dde4dd' }}>Style</strong> tab to configure border radius, padding, colours, and typography.
      </p>
    </div>
  );
}

export const ButtonWidget: WidgetDefinition = {
  type:         'button',
  label:        'Button',
  icon:         MousePointerClick,
  category:     'interactive',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['button', 'cta', 'link', 'action', 'click'],
  Renderer:     ButtonWidgetRenderer,
  Inspector:    ButtonWidgetInspector,
};
