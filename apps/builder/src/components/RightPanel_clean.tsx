/**
 * RightPanel — Element inspector or Page settings (Phase 5 edition).
 *
 * When nothing is selected → Page settings tabs:
 *   • Settings  — title, slug, SEO, OG, favicon, custom CSS/JS (Phase 4.4)
 *   • Style     — global design token editor (Phase 4.2)
 *   • Revisions — snapshot timeline with one-click restore (Phase 5.1)
 *
 * When an element is selected → Element inspector accordion:
 *   Content · Spacing · Background · Typography · Border · Shadow · Animation · Advanced
 */

import { useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Accordion  from '@radix-ui/react-accordion';
import {
  Settings2, Palette, Layout, ChevronDown,
  Lock, Eye, AlignLeft,
  Monitor, Tablet, Smartphone, Info,
  History, Type, Square, Layers, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUIStore, useSelectionStore, useCanvasStore } from '@nexus/core';
import { getWidget } from '@/widgets/registry';
import { InspectorInput, InspectorColor, InspectorSection, InspectorSelect } from '@/widgets/shared';
import { GlobalStylesPanel }    from '@/components/panels/GlobalStylesPanel';
import { PageSettingsPanel }    from '@/components/panels/PageSettingsPanel';
import { RevisionHistoryPanel } from '@/components/panels/RevisionHistoryPanel';
import type { ActiveBreakpoint } from '@nexus/core';

// ─── Breakpoint key mapping ───────────────────────────────────────────────────

const BP_STYLE_KEY: Record<ActiveBreakpoint, 'base' | 'md' | 'sm'> = {
  desktop: 'base',
  tablet:  'md',
  mobile:  'sm',
};

// ─── Accordion section ────────────────────────────────────────────────────────

function AccordionSection({
  id, label, icon: Icon, children,
}: {
  id: string;
  label: string;
  icon: typeof Layout;
  children: React.ReactNode;
}) {
  return (
    <Accordion.Item value={id} className="border-b border-[rgba(255,255,255,0.10)]">
      <Accordion.Trigger
        className={cn(
          'flex w-full items-center justify-between px-3 py-2.5 group',
          'transition-colors duration-[140ms] hover:bg-[rgba(255,255,255,0.03)]',
          'focus-visible:outline-none',
        )}
      >
        <span className="flex items-center gap-2">
          <Icon size={12} strokeWidth={2.5} className="text-[#10b77f] shrink-0" />
          <span className="text-[11px] font-bold tracking-wider text-[#bbcabf] uppercase">
            {label}
          </span>
        </span>
        <ChevronDown
          size={12} strokeWidth={2.5}
          className="text-[#bbcabf] transition-transform duration-[140ms] group-data-[state=open]:rotate-180"
        />
      </Accordion.Trigger>
      <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        {children}
      </Accordion.Content>
    </Accordion.Item>
  );
}

// ─── Breakpoint indicator ─────────────────────────────────────────────────────

function BreakpointBanner() {
  const activeBreakpoint = useUIStore((s) => s.activeBreakpoint);
  const setBreakpoint    = useUIStore((s) => s.setBreakpoint);

  const info: Record<ActiveBreakpoint, { icon: typeof Monitor; label: string; color: string; note: string }> = {
    desktop: { icon: Monitor,    label: 'Desktop',       color: '#10b77f',       note: 'Editing base styles (all breakpoints)' },
    tablet:  { icon: Tablet,     label: 'Tablet (768px)', color: '#fbbf24',  note: 'Overrides applied at ≤ 768 px' },
    mobile:  { icon: Smartphone, label: 'Mobile (390px)', color: '#f97316',                   note: 'Overrides applied at ≤ 390 px' },
  };

  const { icon: BpIcon, label, color, note } = info[activeBreakpoint];

  return (
    <div className="flex items-start gap-2 px-3 py-2 border-b border-[rgba(255,255,255,0.10)]"
      style={{ background: '#09100c' }}>
      <BpIcon size={11} className="shrink-0 mt-0.5" style={{ color }} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
        <p className="text-[10px] mt-0.5" style={{ color: '#bbcabf' }}>{note}</p>
      </div>
      {activeBreakpoint !== 'desktop' && (
        <button onClick={() => setBreakpoint('desktop')}
          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 transition-colors"
          style={{ color: '#bbcabf', background: 'rgba(255,255,255,0.05)' }}>
          Reset
        </button>
      )}
    </div>
  );
}

// ─── Shared style helpers ──────────────────────────────────────────────────────

function useNodeStyles(nodeId: string) {
  const node             = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update           = useCanvasStore((s) => s.updateNodeStyles);
  const activeBreakpoint = useUIStore((s) => s.activeBreakpoint);

  const bpKey    = BP_STYLE_KEY[activeBreakpoint];
  const bpStyles = (node?.styles?.[bpKey] ?? {}) as Record<string, string>;
  const base     = (node?.styles?.base ?? {}) as Record<string, string>;
  const merged   = bpKey === 'base' ? base : { ...base, ...bpStyles };

  const set = (prop: string) => (v: string) =>
    update(nodeId, { [bpKey]: { ...bpStyles, [prop]: v } });
  const get = (prop: string) => merged[prop] ?? '';
  const hasOverride = (prop: string) => bpKey !== 'base' && bpStyles[prop] !== undefined;
  const inputStyle  = (prop: string): React.CSSProperties =>
    hasOverride(prop) ? { outline: '1px solid rgba(245,158,11,0.10)' } : {};

  return { node, bpKey, bpStyles, merged, set, get, hasOverride, inputStyle };
}

// ─── Spacing / Layout controls ────────────────────────────────────────────────

function SpacingControls({ nodeId }: { nodeId: string }) {
  const { node, set, get, inputStyle } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <InspectorInput label="Width"   value={get('width')}   onChange={set('width')}   placeholder="auto"  style={inputStyle('width')} />
        <InspectorInput label="Height"  value={get('height')}  onChange={set('height')}  placeholder="auto"  style={inputStyle('height')} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InspectorInput label="Margin"  value={get('margin')}  onChange={set('margin')}  placeholder="0px"   style={inputStyle('margin')} />
        <InspectorInput label="Padding" value={get('padding')} onChange={set('padding')} placeholder="0px"   style={inputStyle('padding')} />
      </div>
      <InspectorInput label="Max Width" value={get('maxWidth')} onChange={set('maxWidth')} placeholder="100%" style={inputStyle('maxWidth')} />
    </div>
  );
}

// ─── Visual / Background controls ─────────────────────────────────────────────

function VisualControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorColor label="Background" value={get('background')} onChange={set('background')} />
      <div className="grid grid-cols-2 gap-2">
        <InspectorInput label="Radius"  value={get('borderRadius')} onChange={set('borderRadius')} placeholder="0px" />
        <InspectorInput label="Opacity" value={get('opacity')}      onChange={set('opacity')}      placeholder="1" />
      </div>
    </div>
  );
}

// ─── Typography controls (Phase 5.4) ─────────────────────────────────────────

function TypographyControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <InspectorInput label="Font Size"   value={get('fontSize')}   onChange={set('fontSize')}   placeholder="16px" />
        <InspectorInput label="Line Height" value={get('lineHeight')} onChange={set('lineHeight')} placeholder="1.5" />
      </div>
      <InspectorInput label="Font Family" value={get('fontFamily')} onChange={set('fontFamily')} placeholder="inherit" />
      <div className="grid grid-cols-2 gap-2">
        <InspectorSelect
          label="Weight"
          value={(get('fontWeight') || 'normal') as string}
          options={[
            { value: '100',    label: 'Thin 100' },
            { value: '200',    label: 'Extra Light' },
            { value: '300',    label: 'Light 300' },
            { value: 'normal', label: 'Normal 400' },
            { value: '500',    label: 'Medium 500' },
            { value: '600',    label: 'Semi Bold' },
            { value: 'bold',   label: 'Bold 700' },
            { value: '800',    label: 'Extra Bold' },
            { value: '900',    label: 'Black 900' },
          ]}
          onChange={set('fontWeight')}
        />
        <InspectorInput label="Letter Spacing" value={get('letterSpacing')} onChange={set('letterSpacing')} placeholder="0em" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InspectorSelect
          label="Transform"
          value={(get('textTransform') || 'none') as string}
          options={[
            { value: 'none',       label: 'None' },
            { value: 'uppercase',  label: 'UPPER' },
            { value: 'lowercase',  label: 'lower' },
            { value: 'capitalize', label: 'Capitalize' },
          ]}
          onChange={set('textTransform')}
        />
        <InspectorSelect
          label="Decoration"
          value={(get('textDecoration') || 'none') as string}
          options={[
            { value: 'none',         label: 'None' },
            { value: 'underline',    label: 'Underline' },
            { value: 'line-through', label: 'Strikethrough' },
            { value: 'overline',     label: 'Overline' },
          ]}
          onChange={set('textDecoration')}
        />
      </div>
      <InspectorColor label="Text Color" value={get('color')} onChange={set('color')} />
    </div>
  );
}

// ─── Border controls (Phase 5.4) ──────────────────────────────────────────────

function BorderControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <InspectorInput label="Width" value={get('borderWidth')} onChange={set('borderWidth')} placeholder="1px" />
        <InspectorSelect
          label="Style"
          value={(get('borderStyle') || 'solid') as string}
          options={[
            { value: 'none',   label: 'None' },
            { value: 'solid',  label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
            { value: 'double', label: 'Double' },
          ]}
          onChange={set('borderStyle')}
        />
      </div>
      <InspectorColor label="Border Color" value={get('borderColor')} onChange={set('borderColor')} />
      <InspectorSection label="Corner Radius" />
      <div className="grid grid-cols-2 gap-2">
        <InspectorInput label="↖ Top Left"     value={get('borderTopLeftRadius')}     onChange={set('borderTopLeftRadius')}     placeholder="0px" />
        <InspectorInput label="↗ Top Right"    value={get('borderTopRightRadius')}    onChange={set('borderTopRightRadius')}    placeholder="0px" />
        <InspectorInput label="↙ Bottom Left"  value={get('borderBottomLeftRadius')}  onChange={set('borderBottomLeftRadius')}  placeholder="0px" />
        <InspectorInput label="↘ Bottom Right" value={get('borderBottomRightRadius')} onChange={set('borderBottomRightRadius')} placeholder="0px" />
      </div>
    </div>
  );
}

// ─── Shadow controls (Phase 5.4) ──────────────────────────────────────────────

function parseShadow(val: string) {
  if (!val || val === 'none' || val === '') {
    return { offsetX: '0px', offsetY: '4px', blur: '12px', spread: '0px', color: 'rgba(0,0,0,0.15)', inset: false };
  }
  const inset = val.includes('inset');
  const clean = val.replace(/\binset\b/g, '').trim();
  // Split by spaces but group color functions like rgba(...)
  const parts = clean.split(/\s+/);
  return {
    offsetX: parts[0] ?? '0px',
    offsetY: parts[1] ?? '4px',
    blur:    parts[2] ?? '12px',
    spread:  parts[3] ?? '0px',
    color:   parts.slice(4).join(' ') || 'rgba(0,0,0,0.15)',
    inset,
  };
}

function buildShadow(s: ReturnType<typeof parseShadow>) {
  return `${s.inset ? 'inset ' : ''}${s.offsetX} ${s.offsetY} ${s.blur} ${s.spread} ${s.color}`.trim();
}

function ShadowControls({ nodeId }: { nodeId: string }) {
  const { node, bpKey, bpStyles, get } = useNodeStyles(nodeId);
  const update = useCanvasStore((s) => s.updateNodeStyles);
  if (!node) return null;

  const shadow = parseShadow(get('boxShadow'));

  const setShadow = (updates: Partial<ReturnType<typeof parseShadow>>) => {
    const next = { ...shadow, ...updates };
    update(nodeId, { [bpKey]: { ...bpStyles, boxShadow: buildShadow(next) } });
  };

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <InspectorInput label="Offset X" value={shadow.offsetX} onChange={(v) => setShadow({ offsetX: v })} placeholder="0px" />
        <InspectorInput label="Offset Y" value={shadow.offsetY} onChange={(v) => setShadow({ offsetY: v })} placeholder="4px" />
        <InspectorInput label="Blur"     value={shadow.blur}    onChange={(v) => setShadow({ blur: v })}    placeholder="12px" />
        <InspectorInput label="Spread"   value={shadow.spread}  onChange={(v) => setShadow({ spread: v })}  placeholder="0px" />
      </div>
      <InspectorColor label="Shadow Color" value={shadow.color} onChange={(v) => setShadow({ color: v })} />
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={shadow.inset}
          onChange={(e) => setShadow({ inset: e.target.checked })}
          className="rounded accent-[#10b77f]"
        />
        <span
          className="text-[11px] font-bold uppercase tracking-[0.07em]"
          style={{ color: '#bbcabf' }}
        >
          Inset Shadow
        </span>
      </label>
    </div>
  );
}

// ─── Animation controls (Phase 5.4) ───────────────────────────────────────────

const ENTRANCE_OPTIONS = [
  { value: 'none',        label: 'None' },
  { value: 'fade-in',     label: 'Fade In' },
  { value: 'slide-up',    label: 'Slide Up' },
  { value: 'slide-down',  label: 'Slide Down' },
  { value: 'slide-left',  label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right' },
  { value: 'scale-in',    label: 'Scale In' },
  { value: 'flip-in',     label: 'Flip In' },
];

function AnimationControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  const entrance = get('--nx-entrance') || 'none';
  const hasAnim  = entrance !== 'none' && entrance !== '';

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSelect
        label="Entrance"
        value={entrance as string}
        options={ENTRANCE_OPTIONS}
        onChange={set('--nx-entrance')}
      />
      {hasAnim && (
        <div className="grid grid-cols-2 gap-2">
          <InspectorInput
            label="Duration"
            value={get('--nx-enter-duration') || '0.5s'}
            onChange={set('--nx-enter-duration')}
            placeholder="0.5s"
          />
          <InspectorInput
            label="Delay"
            value={get('--nx-enter-delay') || '0s'}
            onChange={set('--nx-enter-delay')}
            placeholder="0s"
          />
        </div>
      )}
      <p className="text-[10px] leading-relaxed" style={{ color: '#bbcabf' }}>
        Animations trigger on scroll / page load in the published output.
      </p>
    </div>
  );
}

// ─── Advanced controls ────────────────────────────────────────────────────────

function AdvancedControls({ nodeId }: { nodeId: string }) {
  const node        = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const updateLabel = useCanvasStore((s) => s.updateNodeLabel);
  const toggleLock  = useCanvasStore((s) => s.toggleNodeLock);
  const toggleHide  = useCanvasStore((s) => s.toggleNodeHidden);
  if (!node) return null;

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorInput
        label="Custom Label"
        value={node.label ?? ''}
        onChange={(v) => updateLabel(nodeId, v)}
        placeholder={node.type}
        hint="Shown in the Layers panel"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => toggleLock(nodeId)}
          className={cn('h-10 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] border transition-all duration-[140ms]',
            node.locked ? 'border-[rgba(245,158,11,0.10)] text-[#fbbf24]' : 'border-[rgba(255,255,255,0.10)] text-[#bbcabf] hover:text-[#dde4dd] hover:border-[rgba(255,255,255,0.15)]')}
          style={{ background: node.locked ? 'rgba(245,158,11,0.10)' : '#09100c' }}
        >
          <Lock size={11} strokeWidth={2.5} />
          {node.locked ? 'Locked' : 'Lock'}
        </button>
        <button
          onClick={() => toggleHide(nodeId)}
          className={cn('h-10 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] border transition-all duration-[140ms]',
            node.hidden ? 'border-[rgba(255,255,255,0.10)] text-[#bbcabf] opacity-50' : 'border-[rgba(255,255,255,0.10)] text-[#bbcabf] hover:text-[#dde4dd] hover:border-[rgba(255,255,255,0.15)]')}
          style={{ background: '#09100c' }}
        >
          <Eye size={11} strokeWidth={2.5} />
          {node.hidden ? 'Hidden' : 'Visible'}
        </button>
      </div>
      <div className="px-3 py-2 rounded-md font-mono text-[10px] truncate"
        style={{ background: '#09100c', border: '1px solid rgba(255,255,255,0.10)', color: '#bbcabf' }}
        title={node.id}>{node.id}</div>
    </div>
  );
}

// ─── Element inspector ────────────────────────────────────────────────────────

function ElementProperties({ nodeId }: { nodeId: string }) {
  const node       = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const toggleLock = useCanvasStore((s) => s.toggleNodeLock);
  const toggleHide = useCanvasStore((s) => s.toggleNodeHidden);
  const widgetDef  = node ? getWidget(node.type) : null;
  if (!node || !widgetDef) return null;

  const WidgetInspector = widgetDef.Inspector;

  return (
    <div className="flex flex-col">
      {/* Node header */}
      <div className="flex items-center justify-between px-3 py-2.5 shrink-0 border-b border-[rgba(255,255,255,0.10)]"
        style={{ background: '#1a211d' }}>
        <div className="flex items-center gap-2 min-w-0">
          {widgetDef.icon && <widgetDef.icon size={14} strokeWidth={2} className="text-[#10b77f] shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-bold capitalize truncate" style={{ color: '#dde4dd' }}>
              {node.label ?? widgetDef.label}
            </p>
            <p className="text-[10px] font-mono truncate" style={{ color: '#bbcabf' }}>
              {node.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => toggleLock(nodeId)}
            className={cn('h-7 w-7 rounded-md flex items-center justify-center transition-colors duration-[140ms]',
              node.locked ? 'text-[#fbbf24]' : 'text-[#bbcabf] hover:text-[#bbcabf] hover:bg-[rgba(255,255,255,0.06)]')}
            style={node.locked ? { background: 'rgba(245,158,11,0.10)' } : {}}
            title={node.locked ? 'Unlock element' : 'Lock element'}>
            <Lock size={11} strokeWidth={2.5} />
          </button>
          <button onClick={() => toggleHide(nodeId)}
            className={cn('h-7 w-7 rounded-md flex items-center justify-center transition-colors duration-[140ms]',
              node.hidden ? 'text-[#bbcabf] opacity-40' : 'text-[#bbcabf] hover:text-[#bbcabf] hover:bg-[rgba(255,255,255,0.06)]')}
            title={node.hidden ? 'Show element' : 'Hide element'}>
            <Eye size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <BreakpointBanner />

      <Accordion.Root
        type="multiple"
        defaultValue={['content', 'layout', 'style', 'typography']}
      >
        <AccordionSection id="content"    label="Content"     icon={AlignLeft}>
          <WidgetInspector nodeId={nodeId} />
        </AccordionSection>
        <AccordionSection id="layout"     label="Spacing"     icon={Layout}>
          <SpacingControls nodeId={nodeId} />
        </AccordionSection>
        <AccordionSection id="style"      label="Background"  icon={Palette}>
          <VisualControls nodeId={nodeId} />
        </AccordionSection>
        <AccordionSection id="typography" label="Typography"  icon={Type}>
          <TypographyControls nodeId={nodeId} />
        </AccordionSection>
        <AccordionSection id="border"     label="Border"      icon={Square}>
          <BorderControls nodeId={nodeId} />
        </AccordionSection>
        <AccordionSection id="shadow"     label="Shadow"      icon={Layers}>
          <ShadowControls nodeId={nodeId} />
        </AccordionSection>
        <AccordionSection id="animation"  label="Animation"   icon={Sparkles}>
          <AnimationControls nodeId={nodeId} />
        </AccordionSection>
        <AccordionSection id="advanced"   label="Advanced"    icon={Settings2}>
          <AdvancedControls nodeId={nodeId} />
        </AccordionSection>
      </Accordion.Root>
    </div>
  );
}

// ─── Page panel (settings + global styles + revisions tabs) ───────────────────

type PageTab = 'settings' | 'styles' | 'revisions';

function PagePanel() {
  const [activeTab, setActiveTab] = useState<PageTab>('settings');

  const TABS: { id: PageTab; label: string; icon: typeof Info }[] = [
    { id: 'settings',  label: 'Settings', icon: Info },
    { id: 'styles',    label: 'Styles',   icon: Palette },
    { id: 'revisions', label: 'History',  icon: History },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            data-testid={`page-tab-${id}`}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5',
              'text-[10px] font-bold uppercase tracking-wider transition-all duration-[140ms]',
              activeTab === id
                ? 'border-b-2 border-[#10b77f] text-[#dde4dd] -mb-px'
                : 'text-[#bbcabf] hover:text-[#bbcabf]',
            )}
          >
            <Icon size={11} strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'settings'  && <PageSettingsPanel />}
        {activeTab === 'styles'    && <GlobalStylesPanel />}
        {activeTab === 'revisions' && <RevisionHistoryPanel />}
      </div>
    </div>
  );
}

// ─── Right Panel root ─────────────────────────────────────────────────────────

export function RightPanel() {
  const rightPanelOpen    = useUIStore((s) => s.rightPanelOpen);
  const primarySelectedId = useSelectionStore((s) => s.primarySelectedId);

  if (!rightPanelOpen) return null;

  return (
    <aside
      data-testid="right-panel"
      className="flex flex-col shrink-0 overflow-hidden animate-slide-in-right"
      style={{
        width:      '280px)',
        background: '#161d19',
        borderLeft: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 shrink-0"
        style={{ background: '#1a211d', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
      >
        <span
          className="text-[11px] font-bold tracking-wider uppercase"
          style={{ color: '#bbcabf' }}
        >
          {primarySelectedId ? 'Element' : 'Page'}
        </span>
        {primarySelectedId && (
          <button
            onClick={() => useSelectionStore.getState().clearSelection()}
            className="text-[10px] font-bold uppercase tracking-[0.06em] transition-colors duration-[140ms]"
            style={{ color: '#bbcabf' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#50dea3')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#bbcabf')}
          >
            Deselect
          </button>
        )}
      </div>

      {/* Body */}
      {primarySelectedId ? (
        <ScrollArea.Root className="flex-1 overflow-hidden">
          <ScrollArea.Viewport className="h-full w-full">
            <ElementProperties nodeId={primarySelectedId} />
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" className="flex w-1.5 touch-none select-none p-px">
            <ScrollArea.Thumb className="relative flex-1 rounded-full" style={{ background: 'rgba(187,202,191,0.20)' }} />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <PagePanel />
        </div>
      )}
    </aside>
  );
}
