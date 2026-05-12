/**
 * RightPanel — Element inspector + Page settings.
 *
 * Element inspector sections (11 existing + 4 new = 15 total):
 *   Content · Layout · Spacing · Position · Background · Typography ·
 *   Border · Shadow · Transform · Filters · Flex/Grid Item ·
 *   Appearance · Overflow · Animation · Advanced
 */

import { useState } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Accordion  from '@radix-ui/react-accordion';
import {
  Settings2, Palette, Layout, ChevronDown, Gauge,
  Lock, Eye, AlignLeft,
  Monitor, Tablet, Smartphone, Info,
  History, Type, Square, Layers, Sparkles,
  Move, Rows, Wind, RotateCcw, Sliders, Grid,
  EyeOff, Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUIStore, useSelectionStore, useCanvasStore } from '@nexus/core';
import { getWidget } from '@/widgets/registry';
import { getNexusWidget } from '@nexus/core';
import { SchemaContentTab } from '@/components/sidebar/SchemaRenderer';
import { InspectorInput, InspectorColor, InspectorSection, InspectorSelect } from '@/widgets/shared';
import { GlobalStylesPanel }    from '@/components/panels/GlobalStylesPanel';
import { PageSettingsPanel }    from '@/components/panels/PageSettingsPanel';
import { RevisionHistoryPanel } from '@/components/panels/RevisionHistoryPanel';
import { PerformancePanel }     from '@/components/panels/PerformancePanel';
import type { ActiveBreakpoint } from '@nexus/core';

const BP_STYLE_KEY: Record<ActiveBreakpoint, 'base' | 'md' | 'sm'> = {
  desktop: 'base',
  tablet:  'md',
  mobile:  'sm',
};

// ─── Accordion section ────────────────────────────────────────────────────────

function AccordionSection({
  id, label, icon: Icon, children,
}: {
  id: string; label: string; icon: typeof Layout; children: React.ReactNode;
}) {
  return (
    <Accordion.Item value={id} className="border-b border-white/[0.06]">
      <Accordion.Trigger
        className={cn(
          'flex w-full items-center justify-between px-4 py-3.5 group',
          'transition-colors duration-[140ms] hover:bg-white/[0.02]',
          'focus-visible:outline-none',
        )}
      >
        <span className="flex items-center gap-2.5">
          <Icon size={13} strokeWidth={2} className="text-[#10b77f] shrink-0" />
          <span className="text-[12px] font-bold tracking-[0.08em] text-[#94A3B8] uppercase">
            {label}
          </span>
        </span>
        <ChevronDown
          size={12} strokeWidth={2}
          className="text-[#64748B] transition-transform duration-[140ms] group-data-[state=open]:rotate-180"
        />
      </Accordion.Trigger>
      <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        {children}
      </Accordion.Content>
    </Accordion.Item>
  );
}

// ─── Breakpoint banner ────────────────────────────────────────────────────────

function BreakpointBanner() {
  const activeBreakpoint = useUIStore((s) => s.activeBreakpoint);
  const setBreakpoint    = useUIStore((s) => s.setBreakpoint);

  const info: Record<ActiveBreakpoint, { icon: typeof Monitor; label: string; color: string; note: string }> = {
    desktop: { icon: Monitor,    label: 'Desktop',        color: '#10b77f', note: 'Editing base styles (all breakpoints)' },
    tablet:  { icon: Tablet,     label: 'Tablet (768px)', color: '#fbbf24', note: 'Overrides applied at ≤ 768 px' },
    mobile:  { icon: Smartphone, label: 'Mobile (390px)', color: '#f97316', note: 'Overrides applied at ≤ 390 px' },
  };

  const { icon: BpIcon, label, color, note } = info[activeBreakpoint];

  return (
    <div className="flex items-start gap-2.5 px-4 py-2.5 border-b border-[rgba(255,255,255,0.10)]"
      style={{ background: '#09100c' }}>
      <BpIcon size={12} className="shrink-0 mt-0.5" style={{ color }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
        <p className="text-[11px] mt-0.5 leading-snug" style={{ color: '#bbcabf' }}>{note}</p>
      </div>
      {activeBreakpoint !== 'desktop' && (
        <button onClick={() => setBreakpoint('desktop')}
          className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded shrink-0 transition-colors"
          style={{ color: '#bbcabf', background: 'rgba(255,255,255,0.05)' }}>
          Reset
        </button>
      )}
    </div>
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

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

  return { node, bpKey, bpStyles, merged, set, get, hasOverride, inputStyle, update };
}

// ─── Layout (display / flex / grid) ──────────────────────────────────────────

function LayoutControls({ nodeId }: { nodeId: string }) {
  const { node, set, get, inputStyle } = useNodeStyles(nodeId);
  if (!node) return null;

  const display = get('display') || 'block';
  const isFlex  = display === 'flex' || display === 'inline-flex';
  const isGrid  = display === 'grid' || display === 'inline-grid';

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorSelect
        label="Display"
        value={display as string}
        options={[
          { value: 'block',        label: 'Block' },
          { value: 'flex',         label: 'Flex' },
          { value: 'grid',         label: 'Grid' },
          { value: 'inline',       label: 'Inline' },
          { value: 'inline-block', label: 'Inline Block' },
          { value: 'inline-flex',  label: 'Inline Flex' },
          { value: 'inline-grid',  label: 'Inline Grid' },
          { value: 'none',         label: 'None (hidden)' },
        ]}
        onChange={set('display')}
      />

      {isFlex && (
        <>
          <InspectorSection label="Flex" />
          <div className="grid grid-cols-2 gap-3">
            <InspectorSelect label="Direction"
              value={(get('flexDirection') || 'row') as string}
              options={[
                { value: 'row',            label: 'Row →' },
                { value: 'row-reverse',    label: 'Row ←' },
                { value: 'column',         label: 'Column ↓' },
                { value: 'column-reverse', label: 'Column ↑' },
              ]}
              onChange={set('flexDirection')} />
            <InspectorSelect label="Wrap"
              value={(get('flexWrap') || 'nowrap') as string}
              options={[
                { value: 'nowrap',       label: 'No Wrap' },
                { value: 'wrap',         label: 'Wrap' },
                { value: 'wrap-reverse', label: 'Wrap Rev.' },
              ]}
              onChange={set('flexWrap')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InspectorSelect label="Align Items"
              value={(get('alignItems') || 'stretch') as string}
              options={[
                { value: 'stretch',     label: 'Stretch' },
                { value: 'flex-start',  label: 'Start' },
                { value: 'center',      label: 'Center' },
                { value: 'flex-end',    label: 'End' },
                { value: 'baseline',    label: 'Baseline' },
              ]}
              onChange={set('alignItems')} />
            <InspectorSelect label="Justify"
              value={(get('justifyContent') || 'flex-start') as string}
              options={[
                { value: 'flex-start',    label: 'Start' },
                { value: 'center',        label: 'Center' },
                { value: 'flex-end',      label: 'End' },
                { value: 'space-between', label: 'Between' },
                { value: 'space-around',  label: 'Around' },
                { value: 'space-evenly',  label: 'Evenly' },
              ]}
              onChange={set('justifyContent')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <InspectorInput label="Gap"        value={get('gap')}       onChange={set('gap')}       placeholder="0px"  style={inputStyle('gap')} />
            <InspectorInput label="Col Gap"    value={get('columnGap')} onChange={set('columnGap')} placeholder="0px"  style={inputStyle('columnGap')} />
            <InspectorInput label="Row Gap"    value={get('rowGap')}    onChange={set('rowGap')}    placeholder="0px"  style={inputStyle('rowGap')} />
          </div>
        </>
      )}

      {isGrid && (
        <>
          <InspectorSection label="Grid" />
          <InspectorInput label="Template Columns" value={get('gridTemplateColumns')} onChange={set('gridTemplateColumns')} placeholder="repeat(3, 1fr)" style={inputStyle('gridTemplateColumns')} />
          <InspectorInput label="Template Rows"    value={get('gridTemplateRows')}    onChange={set('gridTemplateRows')}    placeholder="auto"           style={inputStyle('gridTemplateRows')} />
          <div className="grid grid-cols-3 gap-3">
            <InspectorInput label="Gap"     value={get('gap')}       onChange={set('gap')}       placeholder="0px" style={inputStyle('gap')} />
            <InspectorInput label="Col Gap" value={get('columnGap')} onChange={set('columnGap')} placeholder="0px" style={inputStyle('columnGap')} />
            <InspectorInput label="Row Gap" value={get('rowGap')}    onChange={set('rowGap')}    placeholder="0px" style={inputStyle('rowGap')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InspectorSelect label="Align Items"
              value={(get('alignItems') || 'stretch') as string}
              options={[
                { value: 'stretch',    label: 'Stretch' },
                { value: 'start',      label: 'Start' },
                { value: 'center',     label: 'Center' },
                { value: 'end',        label: 'End' },
              ]}
              onChange={set('alignItems')} />
            <InspectorSelect label="Justify Items"
              value={(get('justifyItems') || 'stretch') as string}
              options={[
                { value: 'stretch', label: 'Stretch' },
                { value: 'start',   label: 'Start' },
                { value: 'center',  label: 'Center' },
                { value: 'end',     label: 'End' },
              ]}
              onChange={set('justifyItems')} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Spacing ──────────────────────────────────────────────────────────────────

function SpacingControls({ nodeId }: { nodeId: string }) {
  const { node, set, get, inputStyle } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorSection label="Dimensions" />
      <div className="grid grid-cols-2 gap-3">
        <InspectorInput label="Width"      value={get('width')}     onChange={set('width')}     placeholder="auto" style={inputStyle('width')} />
        <InspectorInput label="Height"     value={get('height')}    onChange={set('height')}    placeholder="auto" style={inputStyle('height')} />
        <InspectorInput label="Min Width"  value={get('minWidth')}  onChange={set('minWidth')}  placeholder="0"    style={inputStyle('minWidth')} />
        <InspectorInput label="Min Height" value={get('minHeight')} onChange={set('minHeight')} placeholder="0"    style={inputStyle('minHeight')} />
        <InspectorInput label="Max Width"  value={get('maxWidth')}  onChange={set('maxWidth')}  placeholder="100%" style={inputStyle('maxWidth')} />
        <InspectorInput label="Max Height" value={get('maxHeight')} onChange={set('maxHeight')} placeholder="none" style={inputStyle('maxHeight')} />
      </div>

      <InspectorSection label="Margin" />
      <InspectorInput label="All Sides" value={get('margin')} onChange={set('margin')} placeholder="0px" style={inputStyle('margin')} />
      <div className="grid grid-cols-2 gap-3">
        <InspectorInput label="↑ Top"    value={get('marginTop')}    onChange={set('marginTop')}    placeholder="0px" style={inputStyle('marginTop')} />
        <InspectorInput label="→ Right"  value={get('marginRight')}  onChange={set('marginRight')}  placeholder="0px" style={inputStyle('marginRight')} />
        <InspectorInput label="↓ Bottom" value={get('marginBottom')} onChange={set('marginBottom')} placeholder="0px" style={inputStyle('marginBottom')} />
        <InspectorInput label="← Left"  value={get('marginLeft')}   onChange={set('marginLeft')}   placeholder="0px" style={inputStyle('marginLeft')} />
      </div>

      <InspectorSection label="Padding" />
      <InspectorInput label="All Sides" value={get('padding')} onChange={set('padding')} placeholder="0px" style={inputStyle('padding')} />
      <div className="grid grid-cols-2 gap-3">
        <InspectorInput label="↑ Top"    value={get('paddingTop')}    onChange={set('paddingTop')}    placeholder="0px" style={inputStyle('paddingTop')} />
        <InspectorInput label="→ Right"  value={get('paddingRight')}  onChange={set('paddingRight')}  placeholder="0px" style={inputStyle('paddingRight')} />
        <InspectorInput label="↓ Bottom" value={get('paddingBottom')} onChange={set('paddingBottom')} placeholder="0px" style={inputStyle('paddingBottom')} />
        <InspectorInput label="← Left"  value={get('paddingLeft')}   onChange={set('paddingLeft')}   placeholder="0px" style={inputStyle('paddingLeft')} />
      </div>
    </div>
  );
}

// ─── Position ─────────────────────────────────────────────────────────────────

function PositionControls({ nodeId }: { nodeId: string }) {
  const { node, set, get, inputStyle } = useNodeStyles(nodeId);
  if (!node) return null;

  const pos = get('position') || 'static';
  const isPositioned = pos !== 'static';

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorSelect label="Position"
        value={pos as string}
        options={[
          { value: 'static',   label: 'Static' },
          { value: 'relative', label: 'Relative' },
          { value: 'absolute', label: 'Absolute' },
          { value: 'fixed',    label: 'Fixed' },
          { value: 'sticky',   label: 'Sticky' },
        ]}
        onChange={set('position')}
      />
      {isPositioned && (
        <>
          <InspectorSection label="Offset" />
          <div className="grid grid-cols-2 gap-3">
            <InspectorInput label="↑ Top"    value={get('top')}    onChange={set('top')}    placeholder="auto" style={inputStyle('top')} />
            <InspectorInput label="→ Right"  value={get('right')}  onChange={set('right')}  placeholder="auto" style={inputStyle('right')} />
            <InspectorInput label="↓ Bottom" value={get('bottom')} onChange={set('bottom')} placeholder="auto" style={inputStyle('bottom')} />
            <InspectorInput label="← Left"  value={get('left')}   onChange={set('left')}   placeholder="auto" style={inputStyle('left')} />
          </div>
          <InspectorInput label="Z-Index" value={get('zIndex')} onChange={set('zIndex')} placeholder="auto" style={inputStyle('zIndex')} />
        </>
      )}
    </div>
  );
}

// ─── Background ───────────────────────────────────────────────────────────────

function BackgroundControls({ nodeId }: { nodeId: string }) {
  const { node, set, get, inputStyle } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorColor label="Background Color" value={get('background')} onChange={set('background')} />
      <InspectorInput label="Background Image"  value={get('backgroundImage')} onChange={set('backgroundImage')} placeholder="url('...')" />
      <div className="grid grid-cols-2 gap-3">
        <InspectorSelect label="Bg Size"
          value={(get('backgroundSize') || 'auto') as string}
          options={[
            { value: 'auto',    label: 'Auto' },
            { value: 'cover',   label: 'Cover' },
            { value: 'contain', label: 'Contain' },
            { value: '100%',    label: '100%' },
          ]}
          onChange={set('backgroundSize')}
        />
        <InspectorSelect label="Bg Repeat"
          value={(get('backgroundRepeat') || 'repeat') as string}
          options={[
            { value: 'repeat',    label: 'Repeat' },
            { value: 'no-repeat', label: 'No Repeat' },
            { value: 'repeat-x',  label: 'Repeat X' },
            { value: 'repeat-y',  label: 'Repeat Y' },
          ]}
          onChange={set('backgroundRepeat')}
        />
      </div>
      <InspectorInput label="Background Position" value={get('backgroundPosition')} onChange={set('backgroundPosition')} placeholder="center center" />
      <InspectorInput label="Background Gradient" value={get('backgroundImage')} onChange={set('backgroundImage')} placeholder="linear-gradient(135deg, #667eea, #764ba2)" />
      <div className="grid grid-cols-2 gap-3">
        <InspectorInput label="Radius"  value={get('borderRadius')} onChange={set('borderRadius')} placeholder="0px" />
        <InspectorInput label="Opacity" value={get('opacity')}      onChange={set('opacity')}      placeholder="1" />
      </div>
    </div>
  );
}

// ─── Typography ───────────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  { value: 'inherit',               label: 'Inherit' },
  { value: 'Inter, sans-serif',     label: 'Inter' },
  { value: 'Roboto, sans-serif',    label: 'Roboto' },
  { value: 'Poppins, sans-serif',   label: 'Poppins' },
  { value: 'Montserrat, sans-serif',label: 'Montserrat' },
  { value: 'Lato, sans-serif',      label: 'Lato' },
  { value: 'Open Sans, sans-serif', label: 'Open Sans' },
  { value: 'Nunito, sans-serif',    label: 'Nunito' },
  { value: 'DM Sans, sans-serif',   label: 'DM Sans' },
  { value: 'Outfit, sans-serif',    label: 'Outfit' },
  { value: 'Playfair Display, serif', label: 'Playfair Display' },
  { value: 'Merriweather, serif',   label: 'Merriweather' },
  { value: 'Georgia, serif',        label: 'Georgia' },
  { value: 'Lora, serif',           label: 'Lora' },
  { value: 'Fira Code, monospace',  label: 'Fira Code' },
  { value: 'JetBrains Mono, monospace', label: 'JetBrains Mono' },
  { value: 'IBM Plex Mono, monospace',  label: 'IBM Plex Mono' },
  { value: 'system-ui, sans-serif', label: 'System UI' },
];

function TypographyControls({ nodeId }: { nodeId: string }) {
  const { node, set, get, inputStyle } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorSelect
        label="Font Family"
        value={(get('fontFamily') || 'inherit') as string}
        options={FONT_OPTIONS}
        onChange={set('fontFamily')}
      />
      <div className="grid grid-cols-2 gap-3">
        <InspectorInput label="Font Size"   value={get('fontSize')}   onChange={set('fontSize')}   placeholder="16px" />
        <InspectorInput label="Line Height" value={get('lineHeight')} onChange={set('lineHeight')} placeholder="1.5" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InspectorSelect label="Font Weight"
          value={(get('fontWeight') || '400') as string}
          options={[
            { value: '100', label: '100 Thin' },
            { value: '200', label: '200 ExtraLight' },
            { value: '300', label: '300 Light' },
            { value: '400', label: '400 Regular' },
            { value: '500', label: '500 Medium' },
            { value: '600', label: '600 SemiBold' },
            { value: '700', label: '700 Bold' },
            { value: '800', label: '800 ExtraBold' },
            { value: '900', label: '900 Black' },
          ]}
          onChange={set('fontWeight')}
        />
        <InspectorInput label="Letter Spacing" value={get('letterSpacing')} onChange={set('letterSpacing')} placeholder="normal" />
      </div>
      <InspectorColor label="Color" value={get('color')} onChange={set('color')} />
      <div className="grid grid-cols-2 gap-3">
        <InspectorSelect label="Text Align"
          value={(get('textAlign') || 'left') as string}
          options={[
            { value: 'left',    label: 'Left' },
            { value: 'center',  label: 'Center' },
            { value: 'right',   label: 'Right' },
            { value: 'justify', label: 'Justify' },
          ]}
          onChange={set('textAlign')}
        />
        <InspectorSelect label="Transform"
          value={(get('textTransform') || 'none') as string}
          options={[
            { value: 'none',       label: 'None' },
            { value: 'uppercase',  label: 'UPPER' },
            { value: 'lowercase',  label: 'lower' },
            { value: 'capitalize', label: 'Title' },
          ]}
          onChange={set('textTransform')}
        />
      </div>
      <InspectorSelect label="Text Decoration"
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
  );
}

// ─── Border ───────────────────────────────────────────────────────────────────

function BorderControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorSection label="Border" />
      <div className="grid grid-cols-2 gap-3">
        <InspectorInput label="Width"  value={get('borderWidth')} onChange={set('borderWidth')} placeholder="0px" />
        <InspectorSelect label="Style"
          value={(get('borderStyle') || 'solid') as string}
          options={[
            { value: 'solid',  label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
            { value: 'none',   label: 'None' },
          ]}
          onChange={set('borderStyle')}
        />
      </div>
      <InspectorColor label="Border Color" value={get('borderColor')} onChange={set('borderColor')} />
      <InspectorInput label="Border Radius" value={get('borderRadius')} onChange={set('borderRadius')} placeholder="0px" hint="e.g. 4px or 50%" />
    </div>
  );
}

// ─── Shadow ───────────────────────────────────────────────────────────────────

function ShadowControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorInput
        label="Box Shadow"
        value={get('boxShadow')}
        onChange={set('boxShadow')}
        placeholder="0 4px 24px rgba(0,0,0,0.15)"
        hint="CSS box-shadow shorthand"
      />
      <InspectorInput
        label="Text Shadow"
        value={get('textShadow')}
        onChange={set('textShadow')}
        placeholder="0 2px 4px rgba(0,0,0,0.5)"
        hint="CSS text-shadow shorthand"
      />
    </div>
  );
}

// ─── Transform ────────────────────────────────────────────────────────────────

function TransformControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorInput label="Transform" value={get('transform')} onChange={set('transform')} placeholder="translateX(10px) rotate(5deg)" hint="Full CSS transform string" />
      <div className="grid grid-cols-2 gap-3">
        <InspectorInput label="Scale"   value={get('scale')}   onChange={set('scale')}   placeholder="1" />
        <InspectorInput label="Rotate"  value={get('rotate')}  onChange={set('rotate')}  placeholder="0deg" />
      </div>
      <InspectorInput label="Transform Origin" value={get('transformOrigin')} onChange={set('transformOrigin')} placeholder="center center" />
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

function FiltersControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorInput label="Filter"        value={get('filter')}       onChange={set('filter')}       placeholder="blur(4px) brightness(0.9)" hint="CSS filter shorthand" />
      <InspectorInput label="Backdrop Filter" value={get('backdropFilter')} onChange={set('backdropFilter')} placeholder="blur(10px)" />
    </div>
  );
}

// ─── Flex/Grid Item ───────────────────────────────────────────────────────────

function FlexGridItemControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorSection label="Flex Item" />
      <div className="grid grid-cols-3 gap-3">
        <InspectorInput label="Flex Grow"   value={get('flexGrow')}   onChange={set('flexGrow')}   placeholder="0" />
        <InspectorInput label="Flex Shrink" value={get('flexShrink')} onChange={set('flexShrink')} placeholder="1" />
        <InspectorInput label="Flex Basis"  value={get('flexBasis')}  onChange={set('flexBasis')}  placeholder="auto" />
      </div>
      <InspectorInput label="Align Self" value={get('alignSelf')} onChange={set('alignSelf')} placeholder="auto" />
      <InspectorSection label="Grid Item" />
      <div className="grid grid-cols-2 gap-3">
        <InspectorInput label="Grid Column" value={get('gridColumn')} onChange={set('gridColumn')} placeholder="auto" />
        <InspectorInput label="Grid Row"    value={get('gridRow')}    onChange={set('gridRow')}    placeholder="auto" />
      </div>
    </div>
  );
}

// ─── Appearance ───────────────────────────────────────────────────────────────

function AppearanceControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <InspectorInput label="Opacity"    value={get('opacity')}    onChange={set('opacity')}    placeholder="1" />
        <InspectorInput label="Cursor"     value={get('cursor')}     onChange={set('cursor')}     placeholder="default" />
      </div>
      <InspectorSelect label="Visibility"
        value={(get('visibility') || 'visible') as string}
        options={[
          { value: 'visible',  label: 'Visible' },
          { value: 'hidden',   label: 'Hidden' },
          { value: 'collapse', label: 'Collapse' },
        ]}
        onChange={set('visibility')}
      />
      <InspectorInput label="Pointer Events" value={get('pointerEvents')} onChange={set('pointerEvents')} placeholder="auto" />
    </div>
  );
}

// ─── Overflow ─────────────────────────────────────────────────────────────────

function OverflowControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <InspectorSelect label="Overflow X"
          value={(get('overflowX') || 'visible') as string}
          options={[
            { value: 'visible', label: 'Visible' },
            { value: 'hidden',  label: 'Hidden' },
            { value: 'auto',    label: 'Auto' },
            { value: 'scroll',  label: 'Scroll' },
          ]}
          onChange={set('overflowX')}
        />
        <InspectorSelect label="Overflow Y"
          value={(get('overflowY') || 'visible') as string}
          options={[
            { value: 'visible', label: 'Visible' },
            { value: 'hidden',  label: 'Hidden' },
            { value: 'auto',    label: 'Auto' },
            { value: 'scroll',  label: 'Scroll' },
          ]}
          onChange={set('overflowY')}
        />
      </div>
    </div>
  );
}

// ─── Animation ────────────────────────────────────────────────────────────────

function AnimationControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorInput label="Transition" value={get('transition')} onChange={set('transition')} placeholder="all 0.3s ease" hint="CSS transition shorthand" />
      <InspectorInput label="Animation"  value={get('animation')}  onChange={set('animation')}  placeholder="fadeIn 1s ease both" hint="CSS animation shorthand" />
    </div>
  );
}

// ─── Advanced ─────────────────────────────────────────────────────────────────

function AdvancedControls({ nodeId }: { nodeId: string }) {
  const node        = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const updateLabel = useCanvasStore((s) => s.updateNodeLabel);
  const { set, get } = useNodeStyles(nodeId);
  if (!node) return null;

  return (
    <div className="px-4 pb-5 flex flex-col gap-3">
      <InspectorInput
        label="Custom Label"
        value={node.label ?? ''}
        onChange={(v) => updateLabel(nodeId, v)}
        placeholder={node.type}
        hint="Shown in the Layers panel"
      />
      <InspectorInput
        label="CSS Classes"
        value={get('--nx-class') || ''}
        onChange={set('--nx-class')}
        placeholder="my-class another-class"
        hint="Space-separated class names"
      />
      <InspectorInput
        label="Element ID"
        value={get('--nx-id') || ''}
        onChange={set('--nx-id')}
        placeholder="my-element-id"
        hint="Unique ID attribute"
      />
      <InspectorInput
        label="Custom CSS"
        value={get('--nx-custom-css') || ''}
        onChange={set('--nx-custom-css')}
        placeholder="color: red; font-size: 14px;"
        hint="Raw CSS injected inline"
      />
      <InspectorInput
        label="Data Attributes"
        value={get('--nx-data') || ''}
        onChange={set('--nx-data')}
        placeholder='data-id="123" data-type="card"'
        hint="HTML data attributes"
      />
      <InspectorSection label="Node ID" />
      <div
        className="px-3 py-2.5 rounded-md font-mono text-[11px] truncate break-all select-all cursor-text"
        style={{ background: '#09100c', border: '1px solid rgba(255,255,255,0.08)', color: '#bbcabf' }}
      >
        <span className="text-[#50dea3]">id: </span>{node.id}
      </div>
    </div>
  );
}

// ─── Element tab config ───────────────────────────────────────────────────────

type ElementTab = 'content' | 'style' | 'advanced';

const ELEMENT_TABS: { id: ElementTab; label: string; icon: typeof AlignLeft }[] = [
  { id: 'content',  label: 'Content',  icon: AlignLeft  },
  { id: 'style',    label: 'Style',    icon: Palette    },
  { id: 'advanced', label: 'Advanced', icon: Settings2  },
];

// ─── Element properties panel ─────────────────────────────────────────────────

function ElementProperties({ nodeId }: { nodeId: string }) {
  const [tab, setTab] = useState<ElementTab>('content');
  const node          = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const toggleLock    = useCanvasStore((s) => s.toggleNodeLock);
  const toggleHide    = useCanvasStore((s) => s.toggleNodeHidden);
  const widgetDef     = node ? getWidget(node.type) : null;
  const nexusWidgetDef = node ? getNexusWidget(node.type) : undefined;
  if (!node || !widgetDef) return null;

  const WidgetInspector = widgetDef.Inspector;
  const nexusSchema     = nexusWidgetDef?.settingsSchema ?? null;

  return (
    <div className="flex flex-col h-full">

      {/* ── Node identity header ─────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3.5 shrink-0 border-b border-[rgba(255,255,255,0.10)]"
        style={{ background: '#1a211d' }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {widgetDef.icon && (
            <widgetDef.icon size={16} strokeWidth={2} className="text-[#10b77f] shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-[14px] font-bold capitalize truncate" style={{ color: '#dde4dd' }}>
              {node.label ?? widgetDef.label}
            </p>
            <p className="text-[11px] font-mono truncate mt-0.5" style={{ color: '#bbcabf' }}>
              {node.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => toggleLock(nodeId)}
            className={cn(
              'h-8 w-8 rounded-md flex items-center justify-center transition-colors duration-[140ms]',
              node.locked ? 'text-[#fbbf24]' : 'text-[#bbcabf] hover:bg-[rgba(255,255,255,0.06)]',
            )}
            style={node.locked ? { background: 'rgba(245,158,11,0.10)' } : {}}
            title={node.locked ? 'Unlock' : 'Lock'}
          >
            <Lock size={13} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => toggleHide(nodeId)}
            className={cn(
              'h-8 w-8 rounded-md flex items-center justify-center transition-colors duration-[140ms]',
              node.hidden ? 'text-[#bbcabf] opacity-40' : 'text-[#bbcabf] hover:bg-[rgba(255,255,255,0.06)]',
            )}
            title={node.hidden ? 'Show' : 'Hide'}
          >
            <Eye size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Content | Style | Advanced tab bar ──────────────────────────── */}
      <div
        className="flex shrink-0 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.10)', background: '#161d19' }}
      >
        {ELEMENT_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            data-testid={`element-tab-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-3',
              'text-[11px] font-bold uppercase tracking-wider transition-all duration-[140ms]',
              tab === id
                ? 'border-b-2 border-[#10b77f] text-[#dde4dd] -mb-px'
                : 'text-[#bbcabf] hover:text-[#dde4dd]',
            )}
          >
            <Icon size={12} strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Scrollable tab body ──────────────────────────────────────────── */}
      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full w-full">

          {/* CONTENT tab: schema-driven (NexusWidget) or static Inspector */}
          {tab === 'content' && (
            nexusSchema !== null
              ? <SchemaContentTab controls={nexusSchema} nodeId={nodeId} />
              : <div className="py-1"><WidgetInspector nodeId={nodeId} /></div>
          )}

          {/* STYLE tab: full CSS accordion */}
          {tab === 'style' && (
            <>
              <BreakpointBanner />
              <Accordion.Root
                type="multiple"
                defaultValue={['layout', 'spacing', 'background', 'typography']}
                className="flex flex-col"
              >
                <AccordionSection id="layout"       label="Layout"       icon={Layout}>
                  <LayoutControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="spacing"      label="Spacing"      icon={Rows}>
                  <SpacingControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="position"     label="Position"     icon={Move}>
                  <PositionControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="background"   label="Background"   icon={Square}>
                  <BackgroundControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="typography"   label="Typography"   icon={Type}>
                  <TypographyControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="border"       label="Border"       icon={Layers}>
                  <BorderControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="shadow"       label="Shadow"       icon={Wind}>
                  <ShadowControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="transform"    label="Transform"    icon={RotateCcw}>
                  <TransformControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="filters"      label="Filters"      icon={Sliders}>
                  <FiltersControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="flexgriditem" label="Flex/Grid Item" icon={Grid}>
                  <FlexGridItemControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="appearance"   label="Appearance"   icon={EyeOff}>
                  <AppearanceControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="overflow"     label="Overflow"     icon={Maximize2}>
                  <OverflowControls nodeId={nodeId} />
                </AccordionSection>
                <AccordionSection id="animation"    label="Animation"    icon={Sparkles}>
                  <AnimationControls nodeId={nodeId} />
                </AccordionSection>
              </Accordion.Root>
            </>
          )}

          {/* ADVANCED tab */}
          {tab === 'advanced' && <AdvancedControls nodeId={nodeId} />}

        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex touch-none select-none w-1.5 bg-transparent p-0.5 transition-colors hover:bg-white/[0.04]">
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/[0.15]" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}

// ─── Page panel ───────────────────────────────────────────────────────────────

type PageTab = 'settings' | 'styles' | 'revisions' | 'performance';

const PAGE_TABS: { id: PageTab; label: string; icon: typeof Settings2 }[] = [
  { id: 'settings',    label: 'Settings',    icon: Settings2 },
  { id: 'styles',      label: 'Styles',      icon: Palette   },
  { id: 'revisions',   label: 'Revisions',   icon: History   },
  { id: 'performance', label: 'Performance', icon: Gauge     },
];

function PagePanel() {
  const [activeTab, setActiveTab] = useState<PageTab>('settings');

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div
        className="grid shrink-0 border-b"
        style={{
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderColor: 'rgba(255,255,255,0.10)',
          background: '#161d19',
        }}
      >
        {PAGE_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2.5',
              'text-[10px] font-bold uppercase tracking-wider transition-all duration-[140ms]',
              activeTab === id
                ? 'border-b-2 border-[#10b77f] text-[#dde4dd] -mb-px'
                : 'text-[#bbcabf] hover:text-[#dde4dd]',
            )}
          >
            <Icon size={12} strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full w-full">
          {activeTab === 'settings'    && <PageSettingsPanel />}
          {activeTab === 'styles'      && <GlobalStylesPanel />}
          {activeTab === 'revisions'   && <RevisionHistoryPanel />}
          {activeTab === 'performance' && <PerformancePanel />}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="flex touch-none select-none w-1.5 bg-transparent p-0.5 transition-colors hover:bg-white/[0.04]">
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/[0.15]" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
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
      className="flex flex-col shrink-0 overflow-hidden"
      style={{
        width:      '320px',
        background: '#161d19',
        borderLeft: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 shrink-0"
        style={{ background: '#1a211d', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
      >
        <span className="text-[13px] font-bold tracking-wider uppercase" style={{ color: '#bbcabf' }}>
          {primarySelectedId ? 'Element' : 'Page'}
        </span>
        {primarySelectedId && (
          <button
            onClick={() => useSelectionStore.getState().clearSelection()}
            className="text-[12px] font-bold uppercase tracking-[0.06em] transition-colors duration-[140ms]"
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
        <div className="flex-1 overflow-hidden flex flex-col">
          <ElementProperties nodeId={primarySelectedId} />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <PagePanel />
        </div>
      )}
    </aside>
  );
}
