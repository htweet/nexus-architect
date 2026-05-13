/**
 * RightPanel — Element inspector + Page settings.
 *
 * Design: Executive Dark — compact 280px, inline labels, icon buttons,
 *         visual box-model, shadow presets, filter sliders, transform builder.
 *
 * Element tabs:   Content · Style · Advanced
 * Style sections (14):
 *   Layout · Spacing · Position · Background · Typography ·
 *   Border · Shadow · Transform · Filters · Flex/Grid Item ·
 *   Appearance · Overflow · Animation · Interactions
 * Advanced:
 *   Identity · HTML Attrs · Custom CSS · Custom JS ·
 *   Responsive Visibility · ARIA · Conditions · Node Info
 * Page tabs: Settings · Styles · Revisions · Performance
 */

import { useState, useCallback } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import * as Accordion  from '@radix-ui/react-accordion';
import {
  Settings2, Palette, Layout, ChevronDown, Gauge,
  Lock, Eye, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  Monitor, Tablet, Smartphone,
  History, Type, Square, Layers, Sparkles,
  Move, Rows, Wind, RotateCcw, Sliders, Grid,
  EyeOff, Maximize2, Plus, Minus, X,
  Code2, Shield, Zap, MousePointer2, Cpu,
  Italic, Bold, Underline as UnderlineIcon,
  AlignVerticalDistributeCenter, AlignHorizontalDistributeCenter,
  StretchHorizontal, WrapText, Image,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUIStore, useSelectionStore, useCanvasStore } from '@nexus/core';
import { getWidget } from '@/widgets/registry';
import { getNexusWidget } from '@nexus/core';
import { SchemaContentTab } from '@/components/sidebar/SchemaRenderer';
import { GlobalStylesPanel }    from '@/components/panels/GlobalStylesPanel';
import { PageSettingsPanel }    from '@/components/panels/PageSettingsPanel';
import { RevisionHistoryPanel } from '@/components/panels/RevisionHistoryPanel';
import { PerformancePanel }     from '@/components/panels/PerformancePanel';
import type { ActiveBreakpoint } from '@nexus/core';

// ─── Breakpoint key ───────────────────────────────────────────────────────────

const BP_KEY: Record<ActiveBreakpoint, 'base' | 'md' | 'sm'> = {
  desktop: 'base',
  tablet:  'md',
  mobile:  'sm',
};

// ─── Compact primitives ───────────────────────────────────────────────────────

function CInput({
  label, value, onChange, placeholder = '—', className, type = 'text',
}: {
  label?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; className?: string; type?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1 min-w-0', className)}>
      {label && (
        <span className="text-[10px] shrink-0 select-none leading-none" style={{ color: '#7a8f7e', minWidth: 14 }}>
          {label}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 text-center text-[12px] rounded"
        style={{
          height: 26, background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          color: '#dde4dd', outline: 'none', padding: '0 4px',
          transition: 'border-color 120ms',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#10b77f')}
        onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
      />
    </div>
  );
}

function CSelect({
  label, value, options, onChange, className,
}: {
  label?: string; value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1 min-w-0', className)}>
      {label && (
        <span className="text-[10px] shrink-0 select-none" style={{ color: '#7a8f7e' }}>{label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 text-[12px] rounded cursor-pointer outline-none"
        style={{
          height: 26, background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.09)',
          color: '#dde4dd', padding: '0 4px', appearance: 'none',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: '#0e1511', color: '#dde4dd' }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CColor({
  label, value, onChange,
}: {
  label?: string; value: string; onChange: (v: string) => void;
}) {
  const hex = value?.startsWith('#') ? value : '#000000';
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {label && (
        <span className="text-[10px] shrink-0 select-none" style={{ color: '#7a8f7e' }}>{label}</span>
      )}
      <div
        className="flex items-center gap-1.5 flex-1 rounded px-2"
        style={{ height: 26, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="w-4 h-4 rounded-sm cursor-pointer shrink-0 border-0 p-0 bg-transparent"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="transparent"
          className="flex-1 min-w-0 bg-transparent text-[12px] outline-none"
          style={{ color: '#dde4dd' }}
        />
      </div>
    </div>
  );
}

/** Range slider with live value readout */
function CSlider({
  label, value, min, max, step = 1, unit = '', onChange,
}: {
  label: string; value: number; min: number; max: number;
  step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] shrink-0 select-none" style={{ color: '#7a8f7e', width: 60 }}>{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1 rounded cursor-pointer accent-[#10b77f]"
      />
      <span className="text-[11px] font-mono text-right shrink-0" style={{ color: '#dde4dd', width: 36 }}>
        {value}{unit}
      </span>
    </div>
  );
}

function SLabel({ children }: { children: string }) {
  return (
    <span className="block text-[10px] font-bold uppercase tracking-[0.08em] pt-2 pb-1" style={{ color: '#5a7060' }}>
      {children}
    </span>
  );
}

function Divider() {
  return <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }} />;
}

function IconBtn({
  icon: Icon, active, onClick, title, size = 11,
}: {
  icon: LucideIcon; active?: boolean;
  onClick: () => void; title?: string; size?: number;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex items-center justify-center rounded transition-all duration-[100ms]"
      style={{
        width: 26, height: 26,
        background: active ? 'rgba(16,183,127,0.20)' : 'transparent',
        color:      active ? '#50dea3' : '#7a8f7e',
        border:     active ? '1px solid rgba(16,183,127,0.25)' : '1px solid transparent',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#dde4dd'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.color = '#7a8f7e'; }}
    >
      <Icon size={size} strokeWidth={2} />
    </button>
  );
}

// ─── Accordion section ────────────────────────────────────────────────────────

function AccSection({
  id, label, icon: Icon, children, badge,
}: {
  id: string; label: string;
  icon: LucideIcon;
  children: React.ReactNode; badge?: string;
}) {
  return (
    <Accordion.Item value={id} className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
      <Accordion.Trigger
        className={cn(
          'flex w-full items-center justify-between px-3 py-2.5 group',
          'transition-colors duration-[120ms] hover:bg-white/[0.02] focus-visible:outline-none',
        )}
      >
        <span className="flex items-center gap-2">
          <Icon size={12} strokeWidth={1.5} className="shrink-0 transition-colors duration-150 group-data-[state=open]:text-[#10b77f] text-[#94A3B8] group-hover:text-white" />
          <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: '#7a8f7e' }}>
            {label}
          </span>
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
              style={{ background: 'rgba(16,183,127,0.15)', color: '#10b77f' }}>
              {badge}
            </span>
          )}
        </span>
        <ChevronDown
          size={11} strokeWidth={1.5}
          className="shrink-0 transition-transform duration-[120ms] group-data-[state=open]:rotate-180 text-[#94A3B8] group-hover:text-white/60 group-data-[state=open]:text-[#10b77f]"
          style={{ color: '#5a7060' }}
        />
      </Accordion.Trigger>
      <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        {children}
      </Accordion.Content>
    </Accordion.Item>
  );
}

// ─── Breakpoint banner ────────────────────────────────────────────────────────

function BpBanner() {
  const bp  = useUIStore((s) => s.activeBreakpoint);
  const set = useUIStore((s) => s.setBreakpoint);

  const INFO: Record<ActiveBreakpoint, { icon: LucideIcon; label: string; color: string }> = {
    desktop: { icon: Monitor,    label: 'Desktop (base)',  color: '#10b77f' },
    tablet:  { icon: Tablet,     label: 'Tablet ≤768px',  color: '#fbbf24' },
    mobile:  { icon: Smartphone, label: 'Mobile ≤390px',  color: '#f97316' },
  };
  const { icon: I, label, color } = INFO[bp];

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
      style={{ background: '#09100c', borderColor: 'rgba(255,255,255,0.08)' }}>
      <I size={11} style={{ color, flexShrink: 0 }} />
      <span className="text-[11px] font-semibold flex-1" style={{ color }}>{label}</span>
      {bp !== 'desktop' && (
        <button onClick={() => set('desktop')}
          className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded transition-colors"
          style={{ color: '#7a8f7e', background: 'rgba(255,255,255,0.05)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#dde4dd')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#7a8f7e')}>
          Reset
        </button>
      )}
    </div>
  );
}

// ─── Style helper hook ────────────────────────────────────────────────────────

function useNS(nodeId: string) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeStyles);
  const bp     = useUIStore((s) => s.activeBreakpoint);

  const bpKey  = BP_KEY[bp];
  const bpS    = (node?.styles?.[bpKey] ?? {}) as Record<string, string>;
  const base   = (node?.styles?.base ?? {}) as Record<string, string>;
  const merged = bpKey === 'base' ? base : { ...base, ...bpS };

  const set = useCallback((prop: string) => (v: string) =>
    update(nodeId, { [bpKey]: { ...bpS, [prop]: v } }),
    [nodeId, bpKey, bpS, update],
  );
  const get = useCallback((prop: string) => merged[prop] ?? '', [merged]);

  return { node, bpKey, bpS, merged, set, get, update };
}

// ─── 1. LAYOUT ────────────────────────────────────────────────────────────────

function LayoutControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNS(nodeId);
  if (!node) return null;

  const display  = get('display') || 'block';
  const isFlex   = display === 'flex' || display === 'inline-flex';
  const isGrid   = display === 'grid' || display === 'inline-grid';

  const DIR_OPTS = [
    { value: 'row',            label: 'Row →'  },
    { value: 'row-reverse',    label: 'Row ←'  },
    { value: 'column',         label: 'Col ↓'  },
    { value: 'column-reverse', label: 'Col ↑'  },
  ];
  const WRAP_OPTS = [
    { value: 'nowrap',       label: 'No Wrap' },
    { value: 'wrap',         label: 'Wrap'    },
    { value: 'wrap-reverse', label: 'Rev'     },
  ];
  const DISPLAY_OPTS = [
    { value: 'block',        label: 'Block'        },
    { value: 'flex',         label: 'Flex'         },
    { value: 'grid',         label: 'Grid'         },
    { value: 'inline',       label: 'Inline'       },
    { value: 'inline-block', label: 'Inline Block' },
    { value: 'inline-flex',  label: 'Inline Flex'  },
    { value: 'inline-grid',  label: 'Inline Grid'  },
    { value: 'none',         label: 'None'         },
  ];

  const alignV = get('alignItems')     || 'stretch';
  const alignH = get('justifyContent') || 'flex-start';
  const alignC = get('alignContent')   || 'normal';

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      <CSelect label="Display" value={display} options={DISPLAY_OPTS} onChange={set('display')} />

      {isFlex && (
        <>
          <Divider />
          <div className="flex items-center gap-2">
            <CSelect label="Dir" value={get('flexDirection') || 'row'} options={DIR_OPTS} onChange={set('flexDirection')} className="flex-1" />
            <CSelect value={get('flexWrap') || 'nowrap'} options={WRAP_OPTS} onChange={set('flexWrap')} className="flex-1" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] select-none shrink-0 w-8" style={{ color: '#7a8f7e' }}>Align</span>
              <div className="flex gap-0.5">
                {([
                  { icon: AlignVerticalJustifyStart,  v: 'flex-start', t: 'Start'   },
                  { icon: AlignVerticalJustifyCenter, v: 'center',     t: 'Center'  },
                  { icon: AlignVerticalJustifyEnd,    v: 'flex-end',   t: 'End'     },
                  { icon: StretchHorizontal,          v: 'stretch',    t: 'Stretch' },
                  { icon: Minus,                      v: 'baseline',   t: 'Baseline'},
                ] as { icon: LucideIcon; v: string; t: string }[]).map(({ icon, v, t }) => (
                  <IconBtn key={v} icon={icon} active={alignV === v} onClick={() => set('alignItems')(v)} title={t} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] select-none shrink-0 w-8" style={{ color: '#7a8f7e' }}>Just</span>
              <div className="flex gap-0.5">
                {([
                  { icon: AlignLeft,    v: 'flex-start',    t: 'Start'   },
                  { icon: AlignCenter,  v: 'center',        t: 'Center'  },
                  { icon: AlignRight,   v: 'flex-end',      t: 'End'     },
                  { icon: AlignJustify, v: 'space-between', t: 'Between' },
                  { icon: AlignHorizontalDistributeCenter, v: 'space-around', t: 'Around' },
                ] as { icon: LucideIcon; v: string; t: string }[]).map(({ icon, v, t }) => (
                  <IconBtn key={v} icon={icon} active={alignH === v} onClick={() => set('justifyContent')(v)} title={t} />
                ))}
              </div>
            </div>
            {get('flexWrap') !== 'nowrap' && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] select-none shrink-0 w-8" style={{ color: '#7a8f7e' }}>Cont</span>
                <CSelect value={alignC}
                  options={[
                    { value: 'normal',        label: 'Normal'  },
                    { value: 'flex-start',    label: 'Start'   },
                    { value: 'center',        label: 'Center'  },
                    { value: 'flex-end',      label: 'End'     },
                    { value: 'space-between', label: 'Between' },
                    { value: 'space-around',  label: 'Around'  },
                    { value: 'stretch',       label: 'Stretch' },
                  ]}
                  onChange={set('alignContent')}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <CInput label="Gap"  value={get('gap')}       onChange={set('gap')}       placeholder="0" />
            <CInput label="ColG" value={get('columnGap')} onChange={set('columnGap')} placeholder="0" />
            <CInput label="RowG" value={get('rowGap')}    onChange={set('rowGap')}    placeholder="0" />
          </div>
        </>
      )}

      {isGrid && (
        <>
          <Divider />
          <CInput label="Cols"   value={get('gridTemplateColumns')} onChange={set('gridTemplateColumns')} placeholder="repeat(3,1fr)" />
          <CInput label="Rows"   value={get('gridTemplateRows')}    onChange={set('gridTemplateRows')}    placeholder="auto"            />
          <CInput label="Areas"  value={get('gridTemplateAreas')}   onChange={set('gridTemplateAreas')}   placeholder='"a b" "c d"'    />
          <div className="grid grid-cols-3 gap-1.5">
            <CInput label="Gap"  value={get('gap')}       onChange={set('gap')}       placeholder="0" />
            <CInput label="ColG" value={get('columnGap')} onChange={set('columnGap')} placeholder="0" />
            <CInput label="RowG" value={get('rowGap')}    onChange={set('rowGap')}    placeholder="0" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] select-none shrink-0 w-8" style={{ color: '#7a8f7e' }}>Align</span>
            <CSelect value={get('alignItems') || 'stretch'}
              options={[{value:'stretch',label:'Stretch'},{value:'start',label:'Start'},{value:'center',label:'Center'},{value:'end',label:'End'}]}
              onChange={set('alignItems')} className="flex-1" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] select-none shrink-0 w-8" style={{ color: '#7a8f7e' }}>Just</span>
            <CSelect value={get('justifyItems') || 'stretch'}
              options={[{value:'stretch',label:'Stretch'},{value:'start',label:'Start'},{value:'center',label:'Center'},{value:'end',label:'End'}]}
              onChange={set('justifyItems')} className="flex-1" />
          </div>
        </>
      )}
    </div>
  );
}

// ─── 2. SPACING ───────────────────────────────────────────────────────────────

function SpacingControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNS(nodeId);
  if (!node) return null;

  function BoxModel({
    label, topK, rightK, bottomK, leftK, allK, accent,
  }: {
    label: string;
    topK: string; rightK: string; bottomK: string; leftK: string; allK: string;
    accent: string;
  }) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>{label}</span>
          <CInput value={get(allK)} onChange={set(allK)} placeholder="all" className="w-16" />
        </div>
        <div className="grid gap-1" style={{ gridTemplateColumns: '1fr 2fr 1fr', gridTemplateRows: '1fr 1fr 1fr' }}>
          <div />
          <CInput value={get(topK)} onChange={set(topK)} placeholder="0" />
          <div />
          <CInput value={get(leftK)}   onChange={set(leftK)}   placeholder="0" />
          <div className="flex items-center justify-center rounded text-[9px]"
            style={{ background: `${accent}18`, border: `1px solid ${accent}30`, color: accent, height: 26 }}>
            {label.substring(0, 1).toUpperCase()}
          </div>
          <CInput value={get(rightK)}  onChange={set(rightK)}  placeholder="0" />
          <div />
          <CInput value={get(bottomK)} onChange={set(bottomK)} placeholder="0" />
          <div />
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <SLabel>Dimensions</SLabel>
      <div className="grid grid-cols-2 gap-1.5">
        <CInput label="W"   value={get('width')}     onChange={set('width')}     placeholder="auto" />
        <CInput label="H"   value={get('height')}    onChange={set('height')}    placeholder="auto" />
        <CInput label="min" value={get('minWidth')}  onChange={set('minWidth')}  placeholder="0"    />
        <CInput label="max" value={get('maxWidth')}  onChange={set('maxWidth')}  placeholder="100%" />
        <CInput label="mnH" value={get('minHeight')} onChange={set('minHeight')} placeholder="0"    />
        <CInput label="mxH" value={get('maxHeight')} onChange={set('maxHeight')} placeholder="none" />
      </div>
      <div className="flex items-center gap-2">
        <CSelect label="Box"
          value={get('boxSizing') || 'content-box'}
          options={[{value:'content-box',label:'Content Box'},{value:'border-box',label:'Border Box'}]}
          onChange={set('boxSizing')}
        />
      </div>
      <Divider />
      <BoxModel label="Margin"  topK="marginTop"  rightK="marginRight"  bottomK="marginBottom"  leftK="marginLeft"  allK="margin"  accent="#7a8f7e" />
      <BoxModel label="Padding" topK="paddingTop" rightK="paddingRight" bottomK="paddingBottom" leftK="paddingLeft" allK="padding" accent="#10b77f" />
    </div>
  );
}

// ─── 3. POSITION ──────────────────────────────────────────────────────────────

function PositionControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNS(nodeId);
  if (!node) return null;
  const pos = get('position') || 'static';

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      <CSelect label="Pos" value={pos}
        options={[
          { value: 'static',   label: 'Static'   },
          { value: 'relative', label: 'Relative' },
          { value: 'absolute', label: 'Absolute' },
          { value: 'fixed',    label: 'Fixed'    },
          { value: 'sticky',   label: 'Sticky'   },
        ]}
        onChange={set('position')}
      />
      {pos !== 'static' && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <CInput label="↑T" value={get('top')}    onChange={set('top')}    placeholder="auto" />
            <CInput label="→R" value={get('right')}  onChange={set('right')}  placeholder="auto" />
            <CInput label="↓B" value={get('bottom')} onChange={set('bottom')} placeholder="auto" />
            <CInput label="←L" value={get('left')}   onChange={set('left')}   placeholder="auto" />
          </div>
          <CInput label="Z" value={get('zIndex')} onChange={set('zIndex')} placeholder="auto" />
        </>
      )}
      <Divider />
      <CSelect label="Float"
        value={get('float') || 'none'}
        options={[{value:'none',label:'None'},{value:'left',label:'Left'},{value:'right',label:'Right'}]}
        onChange={set('float')}
      />
      <CSelect label="Clear"
        value={get('clear') || 'none'}
        options={[{value:'none',label:'None'},{value:'left',label:'Left'},{value:'right',label:'Right'},{value:'both',label:'Both'}]}
        onChange={set('clear')}
      />
    </div>
  );
}

// ─── 4. BACKGROUND ────────────────────────────────────────────────────────────

type BgType = 'solid' | 'gradient' | 'image';

function BackgroundControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNS(nodeId);
  const [bgType, setBgType] = useState<BgType>('solid');
  if (!node) return null;

  const bgTypeTabs: { id: BgType; label: string }[] = [
    { id: 'solid',    label: 'Solid'    },
    { id: 'gradient', label: 'Gradient' },
    { id: 'image',    label: 'Image'    },
  ];

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      {/* Type selector */}
      <div className="flex rounded overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.09)' }}>
        {bgTypeTabs.map(({ id, label }) => (
          <button key={id} onClick={() => setBgType(id)}
            className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors duration-[100ms]"
            style={{
              background: bgType === id ? 'rgba(16,183,127,0.18)' : 'transparent',
              color: bgType === id ? '#50dea3' : '#5a7060',
            }}>
            {label}
          </button>
        ))}
      </div>

      {bgType === 'solid' && (
        <CColor label="Color" value={get('backgroundColor') || get('background')} onChange={(v) => { set('backgroundColor')(v); set('backgroundImage')(''); }} />
      )}

      {bgType === 'gradient' && (
        <>
          <CSelect label="Type"
            value={get('--nx-grad-type') || 'linear'}
            options={[{value:'linear',label:'Linear'},{value:'radial',label:'Radial'},{value:'conic',label:'Conic'}]}
            onChange={set('--nx-grad-type')}
          />
          <CInput label="Angle" value={get('--nx-grad-angle') || '135deg'} onChange={(v) => {
            set('--nx-grad-angle')(v);
            const type = get('--nx-grad-type') || 'linear';
            const from = get('--nx-grad-from') || '#10b77f';
            const to   = get('--nx-grad-to')   || '#0e1511';
            if (type === 'linear') set('backgroundImage')(`linear-gradient(${v}, ${from}, ${to})`);
          }} placeholder="135deg" />
          <CColor label="From" value={get('--nx-grad-from') || '#10b77f'} onChange={(v) => {
            set('--nx-grad-from')(v);
            const type  = get('--nx-grad-type')  || 'linear';
            const angle = get('--nx-grad-angle') || '135deg';
            const to    = get('--nx-grad-to')    || '#0e1511';
            set('backgroundImage')(type === 'radial'
              ? `radial-gradient(circle, ${v}, ${to})`
              : `linear-gradient(${angle}, ${v}, ${to})`);
          }} />
          <CColor label="To" value={get('--nx-grad-to') || '#0e1511'} onChange={(v) => {
            set('--nx-grad-to')(v);
            const type  = get('--nx-grad-type')  || 'linear';
            const angle = get('--nx-grad-angle') || '135deg';
            const from  = get('--nx-grad-from')  || '#10b77f';
            set('backgroundImage')(type === 'radial'
              ? `radial-gradient(circle, ${from}, ${v})`
              : `linear-gradient(${angle}, ${from}, ${v})`);
          }} />
          <CInput label="CSS" value={get('backgroundImage')} onChange={set('backgroundImage')} placeholder="linear-gradient(…)" />
        </>
      )}

      {bgType === 'image' && (
        <>
          <CInput label="URL" value={get('--nx-bg-url') || ''} onChange={(v) => {
            set('--nx-bg-url')(v);
            if (v) set('backgroundImage')(`url('${v}')`);
          }} placeholder="https://… or /image.jpg" />
          <div className="grid grid-cols-2 gap-1.5">
            <CSelect label="Size"
              value={get('backgroundSize') || 'auto'}
              options={[{value:'auto',label:'Auto'},{value:'cover',label:'Cover'},{value:'contain',label:'Contain'},{value:'100% 100%',label:'Stretch'}]}
              onChange={set('backgroundSize')}
            />
            <CSelect label="Rpt"
              value={get('backgroundRepeat') || 'no-repeat'}
              options={[{value:'no-repeat',label:'No-Repeat'},{value:'repeat',label:'Repeat'},{value:'repeat-x',label:'Repeat X'},{value:'repeat-y',label:'Repeat Y'}]}
              onChange={set('backgroundRepeat')}
            />
          </div>
          <CInput label="Pos" value={get('backgroundPosition')} onChange={set('backgroundPosition')} placeholder="center center" />
          <CSelect label="Attach"
            value={get('backgroundAttachment') || 'scroll'}
            options={[{value:'scroll',label:'Scroll'},{value:'fixed',label:'Fixed (Parallax)'},{value:'local',label:'Local'}]}
            onChange={set('backgroundAttachment')}
          />
        </>
      )}

      <Divider />
      <div className="grid grid-cols-2 gap-1.5">
        <CInput label="⌐R"  value={get('borderRadius')} onChange={set('borderRadius')} placeholder="0px" />
        <CInput label="Op"  value={get('opacity')}      onChange={set('opacity')}      placeholder="1"   />
      </div>
    </div>
  );
}

// ─── 5. TYPOGRAPHY ────────────────────────────────────────────────────────────

const FONTS = [
  { value: 'inherit',                   label: 'Inherit'           },
  { value: 'Inter, sans-serif',         label: 'Inter'             },
  { value: 'Roboto, sans-serif',        label: 'Roboto'            },
  { value: 'Poppins, sans-serif',       label: 'Poppins'           },
  { value: 'Montserrat, sans-serif',    label: 'Montserrat'        },
  { value: 'Lato, sans-serif',          label: 'Lato'              },
  { value: 'Open Sans, sans-serif',     label: 'Open Sans'         },
  { value: 'Nunito, sans-serif',        label: 'Nunito'            },
  { value: 'DM Sans, sans-serif',       label: 'DM Sans'           },
  { value: 'Outfit, sans-serif',        label: 'Outfit'            },
  { value: 'Playfair Display, serif',   label: 'Playfair Display'  },
  { value: 'Merriweather, serif',       label: 'Merriweather'      },
  { value: 'Georgia, serif',            label: 'Georgia'           },
  { value: 'Fira Code, monospace',      label: 'Fira Code'         },
  { value: 'JetBrains Mono, monospace', label: 'JetBrains Mono'    },
  { value: 'system-ui, sans-serif',     label: 'System UI'         },
];

const WEIGHTS = [
  { value: '100', label: '100 Thin'       },
  { value: '200', label: '200 ExtraLight' },
  { value: '300', label: '300 Light'      },
  { value: '400', label: '400 Regular'    },
  { value: '500', label: '500 Medium'     },
  { value: '600', label: '600 SemiBold'   },
  { value: '700', label: '700 Bold'       },
  { value: '800', label: '800 ExtraBold'  },
  { value: '900', label: '900 Black'      },
];

function TypographyControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNS(nodeId);
  if (!node) return null;

  const align     = get('textAlign')    || 'left';
  const fontStyle = get('fontStyle')    || 'normal';
  const fontWt    = get('fontWeight')   || '400';
  const decoration = get('textDecoration') || 'none';

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      <CSelect value={get('fontFamily') || 'inherit'} options={FONTS} onChange={set('fontFamily')} />
      <div className="grid grid-cols-2 gap-1.5">
        <CSelect value={fontWt} options={WEIGHTS} onChange={set('fontWeight')} />
        <CInput label="px" value={get('fontSize')} onChange={set('fontSize')} placeholder="16" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <CInput label="↕"  value={get('lineHeight')}    onChange={set('lineHeight')}    placeholder="1.5" />
        <CInput label="LS" value={get('letterSpacing')} onChange={set('letterSpacing')} placeholder="0em" />
      </div>
      <CInput label="WS" value={get('wordSpacing')} onChange={set('wordSpacing')} placeholder="normal" />

      {/* Style icon buttons (italic / underline / strike) */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] select-none shrink-0 w-8" style={{ color: '#7a8f7e' }}>Style</span>
        <div className="flex gap-0.5">
          <IconBtn icon={Italic}        active={fontStyle === 'italic'}       onClick={() => set('fontStyle')(fontStyle === 'italic' ? 'normal' : 'italic')}         title="Italic" />
          <IconBtn icon={Bold}          active={fontWt === '700' || fontWt === 'bold'} onClick={() => set('fontWeight')(fontWt === '700' ? '400' : '700')}            title="Bold" />
          <IconBtn icon={UnderlineIcon} active={decoration === 'underline'}   onClick={() => set('textDecoration')(decoration === 'underline' ? 'none' : 'underline')} title="Underline" />
        </div>
      </div>

      {/* Text align */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] select-none shrink-0 w-8" style={{ color: '#7a8f7e' }}>Align</span>
        <div className="flex gap-0.5">
          {([
            { icon: AlignLeft,    v: 'left',    t: 'Left'    },
            { icon: AlignCenter,  v: 'center',  t: 'Center'  },
            { icon: AlignRight,   v: 'right',   t: 'Right'   },
            { icon: AlignJustify, v: 'justify', t: 'Justify' },
          ] as { icon: LucideIcon; v: string; t: string }[]).map(({ icon, v, t }) => (
            <IconBtn key={v} icon={icon} active={align === v} onClick={() => set('textAlign')(v)} title={t} />
          ))}
        </div>
      </div>

      <CColor label="Color" value={get('color')} onChange={set('color')} />

      <div className="grid grid-cols-2 gap-1.5">
        <CSelect value={get('textTransform') || 'none'}
          options={[{value:'none',label:'None'},{value:'uppercase',label:'UPPER'},{value:'lowercase',label:'lower'},{value:'capitalize',label:'Title'}]}
          onChange={set('textTransform')}
        />
        <CSelect value={decoration}
          options={[{value:'none',label:'None'},{value:'underline',label:'Underline'},{value:'line-through',label:'Strike'},{value:'overline',label:'Overline'}]}
          onChange={set('textDecoration')}
        />
      </div>

      <Divider />
      <SLabel>Advanced</SLabel>
      <CSelect label="Overflow"
        value={get('textOverflow') || 'clip'}
        options={[{value:'clip',label:'Clip'},{value:'ellipsis',label:'Ellipsis'}]}
        onChange={set('textOverflow')}
      />
      <CSelect label="Whitespace"
        value={get('whiteSpace') || 'normal'}
        options={[{value:'normal',label:'Normal'},{value:'nowrap',label:'No Wrap'},{value:'pre',label:'Pre'},{value:'pre-wrap',label:'Pre Wrap'},{value:'break-spaces',label:'Break Spaces'}]}
        onChange={set('whiteSpace')}
      />
      <CInput label="Line Clamp" value={get('-webkit-line-clamp') || ''} onChange={(v) => {
        set('-webkit-line-clamp')(v);
        if (v) { set('-webkit-box-orient')('vertical'); set('overflow')('hidden'); set('display')('-webkit-box'); }
      }} placeholder="3 (truncate after N lines)" />
      <CSelect label="Variant"
        value={get('fontVariant') || 'normal'}
        options={[{value:'normal',label:'Normal'},{value:'small-caps',label:'Small Caps'}]}
        onChange={set('fontVariant')}
      />
    </div>
  );
}

// ─── 6. BORDER ────────────────────────────────────────────────────────────────

function BorderControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNS(nodeId);
  const [indivSides, setIndivSides] = useState(false);
  if (!node) return null;

  const BORDER_STYLES = [
    { value: 'solid',  label: 'Solid'  },
    { value: 'dashed', label: 'Dashed' },
    { value: 'dotted', label: 'Dotted' },
    { value: 'double', label: 'Double' },
    { value: 'none',   label: 'None'   },
  ];

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      {/* Toggle all vs individual sides */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#5a7060' }}>Sides</span>
        <button
          onClick={() => setIndivSides((v) => !v)}
          className="text-[10px] px-2 py-0.5 rounded transition-colors"
          style={{ background: indivSides ? 'rgba(16,183,127,0.15)' : 'rgba(255,255,255,0.06)', color: indivSides ? '#50dea3' : '#7a8f7e' }}>
          {indivSides ? 'Individual' : 'All'}
        </button>
      </div>

      {!indivSides ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <CColor label="Col" value={get('borderColor')} onChange={set('borderColor')} />
            <CInput label="W"   value={get('borderWidth')} onChange={set('borderWidth')} placeholder="0px" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <CSelect value={get('borderStyle') || 'solid'} options={BORDER_STYLES} onChange={set('borderStyle')} />
            <CInput label="⌐R" value={get('borderRadius')} onChange={set('borderRadius')} placeholder="0px" />
          </div>
        </>
      ) : (
        <>
          {(['Top','Right','Bottom','Left'] as const).map((side) => (
            <div key={side} className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#5a7060' }}>{side}</span>
              <div className="grid grid-cols-3 gap-1">
                <CInput label="W" value={get(`border${side}Width`)} onChange={set(`border${side}Width`)} placeholder="0px" />
                <CSelect value={get(`border${side}Style`) || 'solid'} options={BORDER_STYLES} onChange={set(`border${side}Style`)} />
                <CColor  value={get(`border${side}Color`)} onChange={set(`border${side}Color`)} />
              </div>
            </div>
          ))}
        </>
      )}

      <SLabel>Corner Radius</SLabel>
      <div className="grid grid-cols-2 gap-1.5">
        <CInput label="↖" value={get('borderTopLeftRadius')}     onChange={set('borderTopLeftRadius')}     placeholder="0" />
        <CInput label="↗" value={get('borderTopRightRadius')}    onChange={set('borderTopRightRadius')}    placeholder="0" />
        <CInput label="↙" value={get('borderBottomLeftRadius')}  onChange={set('borderBottomLeftRadius')}  placeholder="0" />
        <CInput label="↘" value={get('borderBottomRightRadius')} onChange={set('borderBottomRightRadius')} placeholder="0" />
      </div>

      <Divider />
      <SLabel>Outline</SLabel>
      <div className="grid grid-cols-2 gap-1.5">
        <CColor label="Col" value={get('outlineColor')} onChange={set('outlineColor')} />
        <CInput label="W"   value={get('outlineWidth')} onChange={set('outlineWidth')} placeholder="2px" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <CSelect value={get('outlineStyle') || 'solid'} options={BORDER_STYLES} onChange={set('outlineStyle')} />
        <CInput label="Off" value={get('outlineOffset')} onChange={set('outlineOffset')} placeholder="0px" />
      </div>
    </div>
  );
}

// ─── 7. SHADOW ────────────────────────────────────────────────────────────────

function parseShadow(v: string) {
  if (!v || v === 'none')
    return { inset: false, x: '0px', y: '4px', blur: '12px', spread: '0px', color: 'rgba(0,0,0,0.15)' };
  const inset = v.includes('inset');
  const parts = v.replace(/\binset\b/g, '').trim().split(/\s+/);
  return { inset, x: parts[0]??'0px', y: parts[1]??'4px', blur: parts[2]??'12px', spread: parts[3]??'0px', color: parts.slice(4).join(' ')||'rgba(0,0,0,0.15)' };
}
function buildShadow(s: ReturnType<typeof parseShadow>) {
  return `${s.inset?'inset ':''}${s.x} ${s.y} ${s.blur} ${s.spread} ${s.color}`.trim();
}

const SHADOW_PRESETS = [
  { label: 'Subtle',  value: '0 1px 3px rgba(0,0,0,0.12)'        },
  { label: 'Medium',  value: '0 4px 12px rgba(0,0,0,0.20)'       },
  { label: 'Heavy',   value: '0 8px 32px rgba(0,0,0,0.35)'       },
  { label: 'Inset',   value: 'inset 0 2px 4px rgba(0,0,0,0.15)' },
  { label: 'Glow',    value: '0 0 20px rgba(16,183,127,0.30)'    },
  { label: 'Float',   value: '0 20px 60px rgba(0,0,0,0.25)'      },
  { label: 'Sharp',   value: '4px 4px 0 rgba(0,0,0,0.80)'        },
];

function ShadowControls({ nodeId }: { nodeId: string }) {
  const { node, bpKey, bpS, get, update } = useNS(nodeId);
  if (!node) return null;

  const sh  = parseShadow(get('boxShadow'));
  const upd = (part: Partial<typeof sh>) =>
    update(nodeId, { [bpKey]: { ...bpS, boxShadow: buildShadow({ ...sh, ...part }) } });

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {SHADOW_PRESETS.map(({ label, value }) => (
          <button key={label}
            onClick={() => update(nodeId, { [bpKey]: { ...bpS, boxShadow: value } })}
            className="text-[10px] px-2 py-0.5 rounded transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#7a8f7e' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color='#dde4dd'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color='#7a8f7e'; }}
          >{label}</button>
        ))}
        {get('boxShadow') && (
          <button onClick={() => update(nodeId, { [bpKey]: { ...bpS, boxShadow: '' } })}
            className="text-[10px] px-2 py-0.5 rounded"
            style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171' }}>
            Clear
          </button>
        )}
      </div>
      <Divider />
      <div className="grid grid-cols-2 gap-1.5">
        <CInput label="X"  value={sh.x}      onChange={(v) => upd({ x: v })}      placeholder="0px" />
        <CInput label="Y"  value={sh.y}      onChange={(v) => upd({ y: v })}      placeholder="4px" />
        <CInput label="Bl" value={sh.blur}   onChange={(v) => upd({ blur: v })}   placeholder="12px" />
        <CInput label="Sp" value={sh.spread} onChange={(v) => upd({ spread: v })} placeholder="0px" />
      </div>
      <CColor label="Col" value={sh.color} onChange={(v) => upd({ color: v })} />
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={sh.inset} onChange={(e) => upd({ inset: e.target.checked })}
          className="rounded accent-[#10b77f] w-3 h-3" />
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#7a8f7e' }}>Inset</span>
      </label>
      <Divider />
      <CInput label="Text Shadow" value={get('textShadow')} onChange={(v) => update(nodeId, { [bpKey]: { ...bpS, textShadow: v } })} placeholder="0 2px 4px rgba(0,0,0,0.5)" />
    </div>
  );
}

// ─── 8. TRANSFORM ─────────────────────────────────────────────────────────────

interface TransformParts {
  translateX: string; translateY: string;
  scaleX: string; scaleY: string;
  rotate: string;
  skewX: string; skewY: string;
}

function parseTransformParts(css: string): TransformParts {
  const m = (fn: string): string | null => {
    const r = new RegExp(`${fn}\\(([^)]+)\\)`).exec(css);
    return r ? (r[1] ?? null) : null;
  };
  return {
    translateX: m('translateX') ?? '0px',
    translateY: m('translateY') ?? '0px',
    scaleX:     m('scaleX')     ?? '1',
    scaleY:     m('scaleY')     ?? '1',
    rotate:     m('rotate')     ?? '0deg',
    skewX:      m('skewX')      ?? '0deg',
    skewY:      m('skewY')      ?? '0deg',
  };
}
function buildTransformParts(t: TransformParts): string {
  const parts: string[] = [];
  if (t.translateX !== '0px' || t.translateY !== '0px') parts.push(`translateX(${t.translateX}) translateY(${t.translateY})`);
  if (t.scaleX !== '1' || t.scaleY !== '1') parts.push(`scaleX(${t.scaleX}) scaleY(${t.scaleY})`);
  if (t.rotate !== '0deg' && t.rotate !== '0') parts.push(`rotate(${t.rotate})`);
  if (t.skewX !== '0deg' || t.skewY !== '0deg') parts.push(`skewX(${t.skewX}) skewY(${t.skewY})`);
  return parts.join(' ') || 'none';
}

const ORIGIN_OPTIONS = [
  'top left','top center','top right',
  'center left','center center','center right',
  'bottom left','bottom center','bottom right',
];

function TransformControls({ nodeId }: { nodeId: string }) {
  const { node, bpKey, bpS, get, update } = useNS(nodeId);
  if (!node) return null;

  const rawCSS = get('transform');
  const t      = parseTransformParts(rawCSS);
  const updT   = (part: Partial<TransformParts>) => {
    const next = { ...t, ...part };
    update(nodeId, { [bpKey]: { ...bpS, transform: buildTransformParts(next) } });
  };

  const origin = get('transformOrigin') || 'center center';

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      <SLabel>Translate</SLabel>
      <div className="grid grid-cols-2 gap-1.5">
        <CInput label="X" value={t.translateX} onChange={(v) => updT({ translateX: v })} placeholder="0px" />
        <CInput label="Y" value={t.translateY} onChange={(v) => updT({ translateY: v })} placeholder="0px" />
      </div>
      <SLabel>Scale</SLabel>
      <div className="grid grid-cols-2 gap-1.5">
        <CInput label="X" value={t.scaleX} onChange={(v) => updT({ scaleX: v })} placeholder="1" />
        <CInput label="Y" value={t.scaleY} onChange={(v) => updT({ scaleY: v })} placeholder="1" />
      </div>
      <SLabel>Rotate & Skew</SLabel>
      <div className="grid grid-cols-3 gap-1.5">
        <CInput label="Rot"  value={t.rotate} onChange={(v) => updT({ rotate: v })} placeholder="0deg" />
        <CInput label="SkX"  value={t.skewX}  onChange={(v) => updT({ skewX: v })}  placeholder="0deg" />
        <CInput label="SkY"  value={t.skewY}  onChange={(v) => updT({ skewY: v })}  placeholder="0deg" />
      </div>
      <SLabel>Origin</SLabel>
      <div className="grid gap-0.5 mb-1" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {ORIGIN_OPTIONS.map((o) => (
          <button key={o} onClick={() => update(nodeId, { [bpKey]: { ...bpS, transformOrigin: o } })}
            className="h-5 rounded transition-colors"
            title={o}
            style={{
              background: origin === o ? 'rgba(16,183,127,0.25)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${origin === o ? 'rgba(16,183,127,0.4)' : 'rgba(255,255,255,0.06)'}`,
            }} />
        ))}
      </div>
      <CInput label="Origin" value={origin} onChange={(v) => update(nodeId, { [bpKey]: { ...bpS, transformOrigin: v } })} placeholder="center center" />
      <Divider />
      <CInput label="CSS" value={rawCSS} onChange={(v) => update(nodeId, { [bpKey]: { ...bpS, transform: v } })} placeholder="rotate(0deg) scale(1)" />
      <CInput label="Perspective" value={get('perspective')} onChange={(v) => update(nodeId, { [bpKey]: { ...bpS, perspective: v } })} placeholder="1000px" />
    </div>
  );
}

// ─── 9. FILTERS ───────────────────────────────────────────────────────────────

interface FilterParts {
  blur: number; brightness: number; contrast: number;
  saturate: number; hueRotate: number; grayscale: number;
  sepia: number; invert: number;
}

function parseFilterParts(css: string): FilterParts {
  const m   = (fn: string): string | null => { const r = new RegExp(`${fn}\\(([^)]+)\\)`).exec(css); return r ? (r[1] ?? null) : null; };
  const pct = (s: string | null, def: number) => s ? parseFloat(s) : def;
  const px  = (s: string | null, def: number) => s ? parseFloat(s) : def;
  return {
    blur:      px(m('blur'),           0),
    brightness: pct(m('brightness'), 100),
    contrast:  pct(m('contrast'),    100),
    saturate:  pct(m('saturate'),    100),
    hueRotate: px(m('hue-rotate'),     0),
    grayscale: pct(m('grayscale'),     0),
    sepia:     pct(m('sepia'),         0),
    invert:    pct(m('invert'),        0),
  };
}
function buildFilterParts(f: FilterParts): string {
  const p: string[] = [];
  if (f.blur      > 0)   p.push(`blur(${f.blur}px)`);
  if (f.brightness !== 100) p.push(`brightness(${f.brightness}%)`);
  if (f.contrast   !== 100) p.push(`contrast(${f.contrast}%)`);
  if (f.saturate   !== 100) p.push(`saturate(${f.saturate}%)`);
  if (f.hueRotate  !== 0)   p.push(`hue-rotate(${f.hueRotate}deg)`);
  if (f.grayscale  > 0)     p.push(`grayscale(${f.grayscale}%)`);
  if (f.sepia      > 0)     p.push(`sepia(${f.sepia}%)`);
  if (f.invert     > 0)     p.push(`invert(${f.invert}%)`);
  return p.join(' ') || '';
}

function FiltersControls({ nodeId }: { nodeId: string }) {
  const { node, bpKey, bpS, get, update } = useNS(nodeId);
  if (!node) return null;

  const f   = parseFilterParts(get('filter'));
  const upd = (part: Partial<FilterParts>) => {
    const next = { ...f, ...part };
    update(nodeId, { [bpKey]: { ...bpS, filter: buildFilterParts(next) } });
  };

  const fbd  = parseFilterParts(get('backdropFilter'));
  const updB = (part: Partial<FilterParts>) => {
    const next = { ...fbd, ...part };
    update(nodeId, { [bpKey]: { ...bpS, backdropFilter: buildFilterParts(next) } });
  };

  return (
    <div className="px-3 pb-3 flex flex-col gap-1.5">
      <SLabel>Element Filter</SLabel>
      <CSlider label="Blur"       value={f.blur}      min={0}   max={20}  unit="px" onChange={(v) => upd({ blur: v })} />
      <CSlider label="Brightness" value={f.brightness} min={0}  max={200} unit="%" onChange={(v) => upd({ brightness: v })} />
      <CSlider label="Contrast"   value={f.contrast}  min={0}   max={200} unit="%" onChange={(v) => upd({ contrast: v })} />
      <CSlider label="Saturate"   value={f.saturate}  min={0}   max={200} unit="%" onChange={(v) => upd({ saturate: v })} />
      <CSlider label="Hue Rotate" value={f.hueRotate} min={0}   max={360} unit="°" onChange={(v) => upd({ hueRotate: v })} />
      <CSlider label="Grayscale"  value={f.grayscale} min={0}   max={100} unit="%" onChange={(v) => upd({ grayscale: v })} />
      <CSlider label="Sepia"      value={f.sepia}     min={0}   max={100} unit="%" onChange={(v) => upd({ sepia: v })} />
      <CSlider label="Invert"     value={f.invert}    min={0}   max={100} unit="%" onChange={(v) => upd({ invert: v })} />
      <Divider />
      <SLabel>Backdrop Filter</SLabel>
      <CSlider label="Blur"       value={fbd.blur}       min={0}  max={30}  unit="px" onChange={(v) => updB({ blur: v })} />
      <CSlider label="Brightness" value={fbd.brightness} min={0}  max={200} unit="%" onChange={(v) => updB({ brightness: v })} />
      <CSlider label="Saturate"   value={fbd.saturate}   min={0}  max={200} unit="%" onChange={(v) => updB({ saturate: v })} />
    </div>
  );
}

// ─── 10. FLEX/GRID ITEM ───────────────────────────────────────────────────────

function FlexGridItemControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNS(nodeId);
  if (!node) return null;

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      <SLabel>Flex Item</SLabel>
      <div className="grid grid-cols-3 gap-1.5">
        <CInput label="Grow"   value={get('flexGrow')}   onChange={set('flexGrow')}   placeholder="0"    />
        <CInput label="Shrink" value={get('flexShrink')} onChange={set('flexShrink')} placeholder="1"    />
        <CInput label="Basis"  value={get('flexBasis')}  onChange={set('flexBasis')}  placeholder="auto" />
      </div>
      <CSelect label="Align Self"
        value={get('alignSelf') || 'auto'}
        options={[{value:'auto',label:'Auto'},{value:'flex-start',label:'Start'},{value:'center',label:'Center'},{value:'flex-end',label:'End'},{value:'stretch',label:'Stretch'},{value:'baseline',label:'Baseline'}]}
        onChange={set('alignSelf')}
      />
      <SLabel>Grid Item</SLabel>
      <div className="grid grid-cols-2 gap-1.5">
        <CInput label="Col"  value={get('gridColumn')}    onChange={set('gridColumn')}    placeholder="auto" />
        <CInput label="Row"  value={get('gridRow')}       onChange={set('gridRow')}       placeholder="auto" />
        <CInput label="ColS" value={get('gridColumnStart')} onChange={set('gridColumnStart')} placeholder="auto" />
        <CInput label="ColE" value={get('gridColumnEnd')}   onChange={set('gridColumnEnd')}   placeholder="auto" />
      </div>
      <CSelect label="Justify Self"
        value={get('justifySelf') || 'auto'}
        options={[{value:'auto',label:'Auto'},{value:'start',label:'Start'},{value:'center',label:'Center'},{value:'end',label:'End'},{value:'stretch',label:'Stretch'}]}
        onChange={set('justifySelf')}
      />
      <CInput label="Order" value={get('order')} onChange={set('order')} placeholder="0" />
    </div>
  );
}

// ─── 11. APPEARANCE ───────────────────────────────────────────────────────────

function AppearanceControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNS(nodeId);
  if (!node) return null;

  const BLEND_MODES = [
    {value:'normal',label:'Normal'},{value:'multiply',label:'Multiply'},
    {value:'screen',label:'Screen'},{value:'overlay',label:'Overlay'},
    {value:'darken',label:'Darken'},{value:'lighten',label:'Lighten'},
    {value:'color-dodge',label:'Color Dodge'},{value:'color-burn',label:'Color Burn'},
    {value:'hard-light',label:'Hard Light'},{value:'soft-light',label:'Soft Light'},
    {value:'difference',label:'Difference'},{value:'exclusion',label:'Exclusion'},
    {value:'hue',label:'Hue'},{value:'saturation',label:'Saturation'},
    {value:'color',label:'Color'},{value:'luminosity',label:'Luminosity'},
  ];

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        <CInput label="Op"  value={get('opacity')} onChange={set('opacity')} placeholder="1"       />
        <CInput label="Cur" value={get('cursor')}  onChange={set('cursor')}  placeholder="default" />
      </div>
      <CSelect label="Visibility" value={get('visibility') || 'visible'}
        options={[{value:'visible',label:'Visible'},{value:'hidden',label:'Hidden'},{value:'collapse',label:'Collapse'}]}
        onChange={set('visibility')}
      />
      <CSelect label="Blend" value={get('mixBlendMode') || 'normal'} options={BLEND_MODES} onChange={set('mixBlendMode')} />
      <CSelect label="User Select"
        value={get('userSelect') || 'auto'}
        options={[{value:'auto',label:'Auto'},{value:'none',label:'None'},{value:'text',label:'Text'},{value:'all',label:'All'}]}
        onChange={set('userSelect')}
      />
      <CSelect label="Will-Change"
        value={get('willChange') || 'auto'}
        options={[{value:'auto',label:'Auto'},{value:'transform',label:'Transform'},{value:'opacity',label:'Opacity'},{value:'transform, opacity',label:'Both'},{value:'scroll-position',label:'Scroll'}]}
        onChange={set('willChange')}
      />
      <CSelect label="Pointer"
        value={get('pointerEvents') || 'auto'}
        options={[{value:'auto',label:'Auto'},{value:'none',label:'None'}]}
        onChange={set('pointerEvents')}
      />
      <CSelect label="Color Scheme"
        value={get('colorScheme') || 'normal'}
        options={[{value:'normal',label:'Normal'},{value:'light',label:'Light'},{value:'dark',label:'Dark'},{value:'light dark',label:'Auto'}]}
        onChange={set('colorScheme')}
      />
    </div>
  );
}

// ─── 12. OVERFLOW ─────────────────────────────────────────────────────────────

function OverflowControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNS(nodeId);
  if (!node) return null;
  const OVF = [
    {value:'visible',label:'Visible'},{value:'hidden',label:'Hidden'},
    {value:'auto',label:'Auto'},{value:'scroll',label:'Scroll'},
    {value:'clip',label:'Clip'},
  ];

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        <CSelect label="X" value={get('overflowX') || 'visible'} options={OVF} onChange={set('overflowX')} />
        <CSelect label="Y" value={get('overflowY') || 'visible'} options={OVF} onChange={set('overflowY')} />
      </div>
      <CInput label="Scroll Snap" value={get('scrollSnapType') || ''} onChange={set('scrollSnapType')} placeholder="x mandatory" />
      <CInput label="Snap Align"  value={get('scrollSnapAlign') || ''} onChange={set('scrollSnapAlign')} placeholder="start" />
      <CSelect label="Resize"
        value={get('resize') || 'none'}
        options={[{value:'none',label:'None'},{value:'both',label:'Both'},{value:'horizontal',label:'Horizontal'},{value:'vertical',label:'Vertical'}]}
        onChange={set('resize')}
      />
    </div>
  );
}

// ─── 13. ANIMATION ────────────────────────────────────────────────────────────

const ENTRANCE_OPTS = [
  {value:'none',       label:'None'       },
  {value:'fade-in',    label:'Fade In'    },
  {value:'fade-up',    label:'Fade Up'    },
  {value:'fade-down',  label:'Fade Down'  },
  {value:'fade-left',  label:'Fade Left'  },
  {value:'fade-right', label:'Fade Right' },
  {value:'zoom-in',    label:'Zoom In'    },
  {value:'zoom-out',   label:'Zoom Out'   },
  {value:'slide-up',   label:'Slide Up'   },
  {value:'slide-down', label:'Slide Down' },
  {value:'slide-left', label:'Slide Left' },
  {value:'slide-right',label:'Slide Right'},
  {value:'flip-x',     label:'Flip X'     },
  {value:'flip-y',     label:'Flip Y'     },
  {value:'rotate-in',  label:'Rotate In'  },
  {value:'bounce-in',  label:'Bounce In'  },
  {value:'elastic-in', label:'Elastic In' },
  {value:'blur-in',    label:'Blur In'    },
  {value:'swing',      label:'Swing'      },
  {value:'heartbeat',  label:'Heartbeat'  },
];

function AnimationControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNS(nodeId);
  if (!node) return null;

  const entrance = get('--nx-entrance') || 'none';
  const hasAnim  = entrance !== 'none' && entrance !== '';
  const scrollTrigger = get('--nx-scroll-trigger') === 'true';

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      <CSelect label="Enter" value={entrance} options={ENTRANCE_OPTS} onChange={set('--nx-entrance')} />
      {hasAnim && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <CInput label="Dur"   value={get('--nx-enter-duration') || '0.5s'} onChange={set('--nx-enter-duration')} placeholder="0.5s" />
            <CInput label="Delay" value={get('--nx-enter-delay')    || '0s'}   onChange={set('--nx-enter-delay')}    placeholder="0s"   />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <CSelect label="Easing"
              value={get('--nx-enter-easing') || 'ease'}
              options={[
                {value:'ease',label:'Ease'},{value:'ease-in',label:'Ease In'},
                {value:'ease-out',label:'Ease Out'},{value:'ease-in-out',label:'Ease In/Out'},
                {value:'linear',label:'Linear'},{value:'spring(1,100,10,0)',label:'Spring'},
              ]}
              onChange={set('--nx-enter-easing')}
            />
            <CSelect label="Iter"
              value={get('--nx-enter-iter') || '1'}
              options={[{value:'1',label:'1×'},{value:'2',label:'2×'},{value:'3',label:'3×'},{value:'infinite',label:'∞'}]}
              onChange={set('--nx-enter-iter')}
            />
          </div>
          <CSelect label="Fill"
            value={get('--nx-enter-fill') || 'forwards'}
            options={[{value:'none',label:'None'},{value:'forwards',label:'Forwards'},{value:'backwards',label:'Backwards'},{value:'both',label:'Both'}]}
            onChange={set('--nx-enter-fill')}
          />
          <label className="flex items-center justify-between cursor-pointer select-none">
            <span className="text-[11px]" style={{ color: '#dde4dd' }}>Scroll Trigger</span>
            <div
              onClick={() => set('--nx-scroll-trigger')(scrollTrigger ? '' : 'true')}
              className="relative cursor-pointer rounded-full transition-colors duration-200"
              style={{ width: 32, height: 18, background: scrollTrigger ? '#10b77f' : 'rgba(255,255,255,0.15)' }}
            >
              <div className="absolute top-0.5 rounded-full transition-all duration-200"
                style={{ width: 14, height: 14, background: '#fff', left: scrollTrigger ? 16 : 2 }} />
            </div>
          </label>
          {scrollTrigger && (
            <CSelect label="Trigger at"
              value={get('--nx-scroll-offset') || '0.1'}
              options={[{value:'0',label:'On Enter'},{value:'0.1',label:'10% in view'},{value:'0.25',label:'25% in view'},{value:'0.5',label:'50% in view'}]}
              onChange={set('--nx-scroll-offset')}
            />
          )}
        </>
      )}
      <Divider />
      <CInput label="Transition" value={get('transition')} onChange={set('transition')} placeholder="all 0.3s ease" />
      <CInput label="Animation"  value={get('animation')}  onChange={set('animation')}  placeholder="fadeIn 1s ease" />
      <p className="text-[10px] leading-relaxed" style={{ color: '#5a7060' }}>
        Entrance animations fire on page-load or scroll trigger in published output.
      </p>
    </div>
  );
}

// ─── 14. INTERACTIONS ────────────────────────────────────────────────────────

const CURSOR_OPTS = [
  {value:'auto',label:'Auto'},{value:'default',label:'Default'},
  {value:'pointer',label:'Pointer'},{value:'grab',label:'Grab'},
  {value:'grabbing',label:'Grabbing'},{value:'crosshair',label:'Crosshair'},
  {value:'text',label:'Text'},{value:'move',label:'Move'},
  {value:'not-allowed',label:'Not Allowed'},{value:'zoom-in',label:'Zoom In'},
  {value:'none',label:'None'},
];

const HOVER_EFFECTS = [
  { label: 'Lift',     css: 'translateY(-4px)',          type: 'transform' },
  { label: 'Grow',     css: 'scale(1.05)',               type: 'transform' },
  { label: 'Shrink',   css: 'scale(0.97)',               type: 'transform' },
  { label: 'Tilt',     css: 'rotate(2deg)',              type: 'transform' },
  { label: 'Glow',     css: '0 0 20px rgba(16,183,127,0.40)', type: 'shadow' },
  { label: 'Dim',      css: '0.7',                       type: 'opacity' },
  { label: 'Brighten', css: '1.1',                       type: 'opacity' },
];

function InteractionControls({ nodeId }: { nodeId: string }) {
  const { node, set, get } = useNS(nodeId);
  if (!node) return null;

  return (
    <div className="px-3 pb-3 flex flex-col gap-2">
      <CSelect label="Cursor" value={get('cursor') || 'auto'} options={CURSOR_OPTS} onChange={set('cursor')} />
      <Divider />
      <SLabel>Hover Effect Presets</SLabel>
      <p className="text-[10px] leading-relaxed -mt-1" style={{ color: '#5a7060' }}>
        One-click hover — sets transition + hover behaviour in published output.
      </p>
      <div className="flex flex-wrap gap-1">
        {HOVER_EFFECTS.map(({ label, css, type }) => (
          <button key={label}
            onClick={() => {
              set('--nx-hover-effect')(label.toLowerCase());
              set('--nx-hover-type')(type);
              set('--nx-hover-value')(css);
              if (!get('transition')) set('transition')('all 0.25s ease');
            }}
            className="text-[10px] px-2 py-0.5 rounded transition-colors"
            style={{
              background: get('--nx-hover-effect') === label.toLowerCase() ? 'rgba(16,183,127,0.18)' : 'rgba(255,255,255,0.06)',
              color: get('--nx-hover-effect') === label.toLowerCase() ? '#50dea3' : '#7a8f7e',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.12)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = get('--nx-hover-effect') === label.toLowerCase() ? 'rgba(16,183,127,0.18)' : 'rgba(255,255,255,0.06)'; }}
          >{label}</button>
        ))}
        {get('--nx-hover-effect') && (
          <button onClick={() => { set('--nx-hover-effect')(''); set('--nx-hover-value')(''); }}
            className="text-[10px] px-2 py-0.5 rounded"
            style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171' }}>Clear</button>
        )}
      </div>
      <Divider />
      <SLabel>Hover Styles (Published Output)</SLabel>
      <textarea
        value={get('--nx-hover-css') || ''}
        onChange={(e) => set('--nx-hover-css')(e.target.value)}
        placeholder={"color: #fff;\nbackground: #10b77f;\ntransform: translateY(-2px);"}
        rows={3}
        className="w-full rounded text-[12px] resize-none font-mono"
        style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', color:'#dde4dd', outline:'none', padding:'6px 8px' }}
      />
      <SLabel>Focus Styles (Published Output)</SLabel>
      <textarea
        value={get('--nx-focus-css') || ''}
        onChange={(e) => set('--nx-focus-css')(e.target.value)}
        placeholder={"outline: 2px solid #10b77f;\noutline-offset: 2px;"}
        rows={2}
        className="w-full rounded text-[12px] resize-none font-mono"
        style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', color:'#dde4dd', outline:'none', padding:'6px 8px' }}
      />
    </div>
  );
}

// ─── Advanced controls ────────────────────────────────────────────────────────

function AdvancedControls({ nodeId }: { nodeId: string }) {
  const node        = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const updateLabel = useCanvasStore((s) => s.updateNodeLabel);
  const updateStyles = useCanvasStore((s) => s.updateNodeStyles);
  const { set, get } = useNS(nodeId);
  const [jsEvent, setJsEvent] = useState<string>('onload');
  if (!node) return null;

  const JS_EVENTS = [
    { value: 'onload',   label: 'On Load'   },
    { value: 'onclick',  label: 'On Click'  },
    { value: 'onscroll', label: 'On Scroll' },
    { value: 'oninit',   label: 'On Init'   },
  ];

  const baseStyles  = (node.styles?.base  ?? {}) as Record<string, string>;
  const mdStyles    = (node.styles?.md    ?? {}) as Record<string, string>;
  const smStyles    = (node.styles?.sm    ?? {}) as Record<string, string>;
  const isHiddenMd  = mdStyles['display'] === 'none';
  const isHiddenSm  = smStyles['display'] === 'none';

  const toggleMd = () =>
    updateStyles(nodeId, { md: { ...mdStyles, display: isHiddenMd ? '' : 'none' } });
  const toggleSm = () =>
    updateStyles(nodeId, { sm: { ...smStyles, display: isHiddenSm ? '' : 'none' } });

  return (
    <div className="px-3 pb-4 pt-2 flex flex-col gap-2.5">

      {/* Identity */}
      <SLabel>Identity</SLabel>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] select-none" style={{ color: '#7a8f7e' }}>Custom Label</span>
        <input value={node.label ?? ''} onChange={(e) => updateLabel(nodeId, e.target.value)}
          placeholder={node.type} className="inspector-input" style={{ fontSize: 12, height: 28 }} />
        <span className="text-[10px]" style={{ color: '#5a7060' }}>Shown in Layers panel</span>
      </div>

      {/* HTML Attributes */}
      <SLabel>HTML Attributes</SLabel>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] select-none" style={{ color: '#7a8f7e' }}>CSS Classes</span>
        <input value={get('--nx-class') || ''} onChange={(e) => set('--nx-class')(e.target.value)}
          placeholder="my-class another-class" className="inspector-input" style={{ fontSize: 12, height: 28 }} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] select-none" style={{ color: '#7a8f7e' }}>Element ID</span>
        <input value={get('--nx-id') || ''} onChange={(e) => set('--nx-id')(e.target.value)}
          placeholder="my-element-id" className="inspector-input" style={{ fontSize: 12, height: 28 }} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] select-none" style={{ color: '#7a8f7e' }}>Data Attributes</span>
        <input value={get('--nx-data') || ''} onChange={(e) => set('--nx-data')(e.target.value)}
          placeholder='data-id="123" data-category="blog"' className="inspector-input" style={{ fontSize: 12, height: 28 }} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] select-none" style={{ color: '#7a8f7e' }}>Tab Index</span>
        <input value={get('--nx-tabindex') || ''} onChange={(e) => set('--nx-tabindex')(e.target.value)}
          placeholder="0 (focusable) | -1 (skip)" className="inspector-input" style={{ fontSize: 12, height: 28 }} />
      </div>

      {/* Custom CSS */}
      <SLabel>Custom CSS</SLabel>
      <textarea
        value={get('--nx-custom-css') || ''}
        onChange={(e) => set('--nx-custom-css')(e.target.value)}
        placeholder={"color: red;\nfont-size: 14px;\nborder: 1px solid #ccc;"}
        rows={4}
        className="w-full rounded text-[12px] resize-none font-mono"
        style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', color:'#dde4dd', outline:'none', padding:'6px 8px' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#10b77f')}
        onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
      />

      {/* Custom JavaScript */}
      <SLabel>Custom JavaScript</SLabel>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] select-none shrink-0" style={{ color: '#7a8f7e' }}>Event</span>
          <select
            value={jsEvent}
            onChange={(e) => setJsEvent(e.target.value)}
            className="flex-1 text-[12px] rounded cursor-pointer outline-none"
            style={{ height:26, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'#dde4dd', padding:'0 4px', appearance:'none' }}>
            {JS_EVENTS.map(({ value, label }) => (
              <option key={value} value={value} style={{ background:'#0e1511', color:'#dde4dd' }}>{label}</option>
            ))}
          </select>
        </div>
        <textarea
          value={get(`--nx-js-${jsEvent}`) || ''}
          onChange={(e) => set(`--nx-js-${jsEvent}`)(e.target.value)}
          placeholder={"// 'el' refers to this element\nconsole.log('mounted', el);\nel.addEventListener('click', () => {\n  // your code\n});"}
          rows={5}
          className="w-full rounded text-[12px] resize-none font-mono"
          style={{ background:'rgba(16,183,127,0.04)', border:'1px solid rgba(16,183,127,0.15)', color:'#dde4dd', outline:'none', padding:'6px 8px' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#10b77f')}
          onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(16,183,127,0.15)')}
        />
        <span className="text-[10px]" style={{ color: '#5a7060' }}>
          Executes in published output. Use <code style={{ color: '#50dea3' }}>el</code> to reference this element.
        </span>
      </div>

      {/* Responsive Visibility */}
      <SLabel>Responsive Visibility</SLabel>
      <div className="flex flex-col gap-1.5">
        {([
          { label: 'Desktop',  icon: Monitor,    active: true,        onClick: () => {},    locked: true },
          { label: 'Tablet',   icon: Tablet,     active: !isHiddenMd, onClick: toggleMd,   locked: false },
          { label: 'Mobile',   icon: Smartphone, active: !isHiddenSm, onClick: toggleSm,   locked: false },
        ]).map(({ label, icon: Icon, active, onClick, locked }) => (
          <div key={label} className="flex items-center justify-between rounded px-2.5 py-1.5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <Icon size={12} style={{ color: '#7a8f7e' }} />
              <span className="text-[12px]" style={{ color: '#dde4dd' }}>{label}</span>
            </div>
            <button onClick={locked ? undefined : onClick}
              disabled={locked}
              className="text-[10px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider transition-colors"
              style={{ background: active ? 'rgba(16,183,127,0.15)' : 'rgba(239,68,68,0.12)', color: active ? '#50dea3' : '#f87171', opacity: locked ? 0.5 : 1, cursor: locked ? 'default' : 'pointer' }}>
              {active ? 'Visible' : 'Hidden'}
            </button>
          </div>
        ))}
      </div>

      {/* ARIA */}
      <SLabel>Accessibility (ARIA)</SLabel>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] select-none" style={{ color: '#7a8f7e' }}>Role</span>
          <select value={get('--nx-aria-role') || ''}
            onChange={(e) => set('--nx-aria-role')(e.target.value)}
            className="inspector-input text-[12px] cursor-pointer outline-none appearance-none"
            style={{ height:28, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'#dde4dd', padding:'0 8px' }}>
            {['','button','link','heading','img','list','listitem','navigation','main','section','article','dialog','alert','form','search','banner','contentinfo','complementary','region'].map((r) => (
              <option key={r} value={r} style={{ background:'#0e1511', color:'#dde4dd' }}>{r || '— None —'}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] select-none" style={{ color: '#7a8f7e' }}>aria-label</span>
          <input value={get('--nx-aria-label') || ''} onChange={(e) => set('--nx-aria-label')(e.target.value)}
            placeholder="Descriptive label for screen readers" className="inspector-input" style={{ fontSize:12, height:28 }} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] select-none" style={{ color: '#7a8f7e' }}>aria-describedby</span>
          <input value={get('--nx-aria-describedby') || ''} onChange={(e) => set('--nx-aria-describedby')(e.target.value)}
            placeholder="element-id" className="inspector-input" style={{ fontSize:12, height:28 }} />
        </div>
        <label className="flex items-center justify-between cursor-pointer select-none py-0.5">
          <span className="text-[12px]" style={{ color: '#dde4dd' }}>aria-hidden</span>
          <div
            onClick={() => set('--nx-aria-hidden')(get('--nx-aria-hidden') === 'true' ? '' : 'true')}
            className="relative cursor-pointer rounded-full transition-colors duration-200"
            style={{ width:32, height:18, background: get('--nx-aria-hidden') === 'true' ? '#10b77f' : 'rgba(255,255,255,0.15)' }}
          >
            <div className="absolute top-0.5 rounded-full transition-all duration-200"
              style={{ width:14, height:14, background:'#fff', left: get('--nx-aria-hidden') === 'true' ? 16 : 2 }} />
          </div>
        </label>
      </div>

      {/* Conditions */}
      <SLabel>Display Conditions</SLabel>
      <div className="flex flex-col gap-1.5">
        <CSelect label="Show if"
          value={get('--nx-condition') || 'always'}
          options={[
            {value:'always',label:'Always'},
            {value:'logged-in',label:'User Logged In'},
            {value:'logged-out',label:'User Logged Out'},
            {value:'admin',label:'Admin Only'},
            {value:'mobile',label:'Mobile Device'},
            {value:'desktop',label:'Desktop Device'},
            {value:'custom',label:'Custom (JS)'},
          ]}
          onChange={set('--nx-condition')}
        />
        {get('--nx-condition') === 'custom' && (
          <textarea
            value={get('--nx-condition-js') || ''}
            onChange={(e) => set('--nx-condition-js')(e.target.value)}
            placeholder={"// return true to show element\nreturn window.user?.isLoggedIn === true;"}
            rows={3}
            className="w-full rounded text-[12px] resize-none font-mono"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', color:'#dde4dd', outline:'none', padding:'6px 8px' }}
          />
        )}
        <span className="text-[10px]" style={{ color: '#5a7060' }}>
          Conditions are evaluated at render time in published output.
        </span>
      </div>

      {/* Node Info */}
      <SLabel>Node Info</SLabel>
      <div className="rounded px-2 py-1.5 font-mono text-[10px] truncate select-all cursor-text"
        style={{ background:'#09100c', border:'1px solid rgba(255,255,255,0.08)', color:'#5a7060' }} title={node.id}>
        <span style={{ color:'#50dea3' }}>id: </span>{node.id}
      </div>
      <div className="rounded px-2 py-1.5 font-mono text-[10px] truncate"
        style={{ background:'#09100c', border:'1px solid rgba(255,255,255,0.08)', color:'#5a7060' }}>
        <span style={{ color:'#50dea3' }}>type: </span>{node.type}
      </div>
    </div>
  );
}

// ─── Element properties ───────────────────────────────────────────────────────

type ElemTab = 'content' | 'style' | 'advanced';

function ElementProperties({ nodeId }: { nodeId: string }) {
  const [tab, setTab] = useState<ElemTab>('content');
  const node           = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const toggleLock     = useCanvasStore((s) => s.toggleNodeLock);
  const toggleHide     = useCanvasStore((s) => s.toggleNodeHidden);
  const widgetDef      = node ? getWidget(node.type) : null;
  const nexusDef       = node ? getNexusWidget(node.type) : undefined;
  if (!node || !widgetDef) return null;

  const WidgetInspector = widgetDef.Inspector;
  const nexusSchema     = nexusDef?.settingsSchema ?? null;

  const TABS: { id: ElemTab; label: string }[] = [
    { id: 'content',  label: 'Content'  },
    { id: 'style',    label: 'Style'    },
    { id: 'advanced', label: 'Advanced' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Node header */}
      <div className="flex items-center justify-between px-3 py-2.5 shrink-0 border-b"
        style={{ background:'#131a15', borderColor:'rgba(255,255,255,0.09)' }}>
        <div className="flex items-center gap-2 min-w-0">
          {widgetDef.icon && (
            <widgetDef.icon size={15} strokeWidth={2} style={{ color:'#10b77f', flexShrink:0 }} />
          )}
          <div className="min-w-0">
            <p className="text-[13px] font-bold truncate" style={{ color:'#dde4dd' }}>
              {node.label ?? widgetDef.label}
            </p>
            <p className="text-[10px] font-mono truncate" style={{ color:'#5a7060' }}>
              {node.type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => toggleLock(nodeId)} title={node.locked ? 'Unlock' : 'Lock'}
            className="flex items-center justify-center w-7 h-7 rounded transition-colors duration-[100ms]"
            style={node.locked ? {color:'#fbbf24',background:'rgba(245,158,11,0.12)'} : {color:'#5a7060'}}
            onMouseEnter={(e) => { if (!node.locked) (e.currentTarget as HTMLElement).style.color='#dde4dd'; }}
            onMouseLeave={(e) => { if (!node.locked) (e.currentTarget as HTMLElement).style.color='#5a7060'; }}>
            <Lock size={12} strokeWidth={2.5} />
          </button>
          <button onClick={() => toggleHide(nodeId)} title={node.hidden ? 'Show' : 'Hide'}
            className="flex items-center justify-center w-7 h-7 rounded transition-colors duration-[100ms]"
            style={node.hidden ? {color:'#7a8f7e',opacity:0.4} : {color:'#5a7060'}}
            onMouseEnter={(e) => { if (!node.hidden) (e.currentTarget as HTMLElement).style.color='#dde4dd'; }}
            onMouseLeave={(e) => { if (!node.hidden) (e.currentTarget as HTMLElement).style.color='#5a7060'; }}>
            <Eye size={12} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b" style={{ borderColor:'rgba(255,255,255,0.09)', background:'#0f1712' }}>
        {TABS.map(({ id, label }) => (
          <button key={id} data-testid={`element-tab-${id}`} onClick={() => setTab(id)}
            className={cn(
              'flex-1 py-2.5 text-[11px] font-bold uppercase tracking-[0.07em] transition-all duration-[100ms]',
              tab === id ? 'text-[#dde4dd] border-b-2 border-[#10b77f] -mb-px' : '-mb-px border-b-2 border-transparent',
            )}
            style={{ color: tab === id ? '#dde4dd' : '#5a7060' }}
            onMouseEnter={(e) => { if (tab !== id) (e.currentTarget as HTMLElement).style.color='#7a8f7e'; }}
            onMouseLeave={(e) => { if (tab !== id) (e.currentTarget as HTMLElement).style.color='#5a7060'; }}>
            {label}
          </button>
        ))}
      </div>

      {/* Scrollable body */}
      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full w-full">

          {tab === 'content' && (
            nexusSchema !== null
              ? <SchemaContentTab controls={nexusSchema} nodeId={nodeId} />
              : <div className="py-1"><WidgetInspector nodeId={nodeId} /></div>
          )}

          {tab === 'style' && (
            <>
              <BpBanner />
              <Accordion.Root type="multiple" defaultValue={['layout']}>
                <AccSection id="layout"       label="Layout"         icon={Layout}   ><LayoutControls        nodeId={nodeId} /></AccSection>
                <AccSection id="spacing"      label="Spacing"        icon={Rows}     ><SpacingControls       nodeId={nodeId} /></AccSection>
                <AccSection id="position"     label="Position"       icon={Move}     ><PositionControls      nodeId={nodeId} /></AccSection>
                <AccSection id="background"   label="Background"     icon={Square}   ><BackgroundControls    nodeId={nodeId} /></AccSection>
                <AccSection id="typography"   label="Typography"     icon={Type}     ><TypographyControls    nodeId={nodeId} /></AccSection>
                <AccSection id="border"       label="Border"         icon={Layers}   ><BorderControls        nodeId={nodeId} /></AccSection>
                <AccSection id="shadow"       label="Shadow"         icon={Wind}     ><ShadowControls        nodeId={nodeId} /></AccSection>
                <AccSection id="transform"    label="Transform"      icon={RotateCcw}><TransformControls     nodeId={nodeId} /></AccSection>
                <AccSection id="filters"      label="Filters"        icon={Sliders}  ><FiltersControls       nodeId={nodeId} /></AccSection>
                <AccSection id="flexgriditem" label="Flex/Grid Item" icon={Grid}     ><FlexGridItemControls  nodeId={nodeId} /></AccSection>
                <AccSection id="appearance"   label="Appearance"     icon={EyeOff}   ><AppearanceControls    nodeId={nodeId} /></AccSection>
                <AccSection id="overflow"     label="Overflow"       icon={Maximize2}><OverflowControls      nodeId={nodeId} /></AccSection>
                <AccSection id="animation"    label="Animation"      icon={Sparkles} ><AnimationControls     nodeId={nodeId} /></AccSection>
                <AccSection id="interactions" label="Interactions"   icon={Zap}      badge="NEW"><InteractionControls nodeId={nodeId} /></AccSection>
              </Accordion.Root>
            </>
          )}

          {tab === 'advanced' && <AdvancedControls nodeId={nodeId} />}

        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical"
          className="flex touch-none select-none w-1 bg-transparent p-0.5 transition-colors hover:bg-white/[0.04]">
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/[0.12]" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}

// ─── Page panel ───────────────────────────────────────────────────────────────

type PageTab = 'settings' | 'styles' | 'revisions' | 'performance';

const PAGE_TABS: { id: PageTab; label: string; icon: LucideIcon }[] = [
  { id: 'settings',    label: 'Settings', icon: Settings2 },
  { id: 'styles',      label: 'Styles',   icon: Palette   },
  { id: 'revisions',   label: 'Revisions',icon: History   },
  { id: 'performance', label: 'Perf',     icon: Gauge     },
];

function PagePanel() {
  const [tab, setTab] = useState<PageTab>('settings');

  return (
    <div className="flex flex-col h-full">
      <div className="grid shrink-0 border-b"
        style={{ gridTemplateColumns:'repeat(4,1fr)', borderColor:'rgba(255,255,255,0.09)', background:'#0f1712' }}>
        {PAGE_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-2',
              'text-[9px] font-bold uppercase tracking-wider transition-all duration-[100ms]',
              tab === id ? 'text-[#dde4dd] border-b-2 border-[#10b77f] -mb-px' : '-mb-px border-b-2 border-transparent',
            )}
            style={{ color: tab === id ? '#dde4dd' : '#5a7060' }}
            onMouseEnter={(e) => { if (tab !== id) (e.currentTarget as HTMLElement).style.color='#7a8f7e'; }}
            onMouseLeave={(e) => { if (tab !== id) (e.currentTarget as HTMLElement).style.color='#5a7060'; }}>
            <Icon size={11} strokeWidth={2.5} />
            {label}
          </button>
        ))}
      </div>
      <ScrollArea.Root className="flex-1 overflow-hidden">
        <ScrollArea.Viewport className="h-full w-full">
          {tab === 'settings'    && <PageSettingsPanel />}
          {tab === 'styles'      && <GlobalStylesPanel />}
          {tab === 'revisions'   && <RevisionHistoryPanel />}
          {tab === 'performance' && <PerformancePanel />}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical"
          className="flex touch-none select-none w-1 bg-transparent p-0.5 transition-colors hover:bg-white/[0.04]">
          <ScrollArea.Thumb className="relative flex-1 rounded-full bg-white/[0.12]" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}

// ─── RightPanel root ──────────────────────────────────────────────────────────

export function RightPanel() {
  const rightPanelOpen    = useUIStore((s) => s.rightPanelOpen);
  const primarySelectedId = useSelectionStore((s) => s.primarySelectedId);

  if (!rightPanelOpen) return null;

  return (
    <aside
      data-testid="right-panel"
      className="flex flex-col shrink-0 overflow-hidden"
      style={{ width:280, background:'#0e1511', borderLeft:'1px solid rgba(255,255,255,0.09)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 shrink-0 border-b"
        style={{ background:'#131a15', borderColor:'rgba(255,255,255,0.09)' }}>
        <span className="text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color:'#5a7060' }}>
          {primarySelectedId ? 'Element' : 'Page'}
        </span>
        {primarySelectedId && (
          <button onClick={() => useSelectionStore.getState().clearSelection()}
            className="text-[10px] font-bold uppercase tracking-[0.06em] transition-colors"
            style={{ color:'#5a7060' }}
            onMouseEnter={(e) => (e.currentTarget.style.color='#50dea3')}
            onMouseLeave={(e) => (e.currentTarget.style.color='#5a7060')}>
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
