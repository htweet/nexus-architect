/**
 * Alert widget — notice/info/warning/error box.
 */

import { memo } from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle, Bell } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import { InspectorInput, InspectorToggle, InspectorSection } from './shared';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  variant:  AlertVariant;
  title:    string;
  message:  string;
  dismissible: boolean;
}

const DEFAULTS: AlertProps = {
  variant:     'info',
  title:       'Heads up!',
  message:     'This is an informational notice. Customize the text and style in the inspector.',
  dismissible: false,
};

const VARIANT_STYLES: Record<AlertVariant, { bg: string; border: string; icon: string; titleColor: string; msgColor: string }> = {
  info:    { bg: '#eff6ff', border: '#bfdbfe', icon: '#3b82f6', titleColor: '#1e40af', msgColor: '#1e3a8a' },
  success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', titleColor: '#15803d', msgColor: '#166534' },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', titleColor: '#b45309', msgColor: '#92400e' },
  error:   { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', titleColor: '#b91c1c', msgColor: '#991b1b' },
};

const VARIANT_ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle };

const AlertRenderer = memo(function AlertRenderer({ nodeId }: WidgetRendererProps) {
  const node = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  if (!node) return null;
  const p = { ...DEFAULTS, ...(node.props as Partial<AlertProps>) };
  const s = VARIANT_STYLES[p.variant];
  const IconComp = VARIANT_ICONS[p.variant];

  return (
    <div style={{
      display: 'flex', gap: '12px', padding: '16px 20px',
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: '8px', width: '100%',
    }}>
      <IconComp size={20} style={{ color: s.icon, flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {p.title && (
          <div style={{ fontWeight: 700, fontSize: '14px', color: s.titleColor, marginBottom: p.message ? '4px' : 0 }}>
            {p.title}
          </div>
        )}
        {p.message && (
          <div style={{ fontSize: '14px', color: s.msgColor, lineHeight: 1.5 }}>{p.message}</div>
        )}
      </div>
    </div>
  );
});

function AlertInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  if (!node) return null;
  const p   = { ...DEFAULTS, ...(node.props as Partial<AlertProps>) };
  const set = (k: keyof AlertProps) => (v: string) => update(nodeId, { [k]: v });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Alert" />
      <InspectorToggle
        label="Type"
        value={p.variant}
        options={[
          { value: 'info',    label: 'Info'    },
          { value: 'success', label: 'Success' },
          { value: 'warning', label: 'Warning' },
          { value: 'error',   label: 'Error'   },
        ]}
        onChange={set('variant')}
      />
      <InspectorInput label="Title"   value={p.title}   onChange={set('title')}   placeholder="Heads up!" />
      <InspectorInput label="Message" value={p.message} onChange={set('message')} placeholder="Your message here…" />
    </div>
  );
}

export const AlertWidget: WidgetDefinition = {
  type:         'alert',
  label:        'Alert',
  icon:         Bell,
  category:     'content',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['alert', 'notice', 'warning', 'info', 'error', 'message', 'callout'],
  Renderer:     AlertRenderer,
  Inspector:    AlertInspector,
};
