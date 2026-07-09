/**
 * RightSidebar — Nexus Architect web CSS property inspector.
 *
 * Executive Dark skin (MD3 Charcoal & Emerald palette).
 *
 * Design tab sections (top → bottom):
 *   • Dimensions : width, height, min/max width, min/max height
 *   • Spacing    : margin (T/R/B/L) + padding (T/R/B/L)
 *   • Layout     : display, flex-direction, align-items, justify-content, gap
 *   • Typography : font-family, weight, size, line-height, letter-spacing, text-color
 *   • Background : background-color, opacity
 *   • Border     : border-width, border-color, border-style, border-radius
 *   • Effects    : box-shadow, transform
 */

import { useState } from 'react';
import {
  Eye, EyeOff, Plus, ChevronDown, ChevronRight,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  ArrowRight, LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useCanvasStore, useSelectionStore, useUIStore } from '@nexus/core';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useBpKey() {
  const bp = useUIStore((s) => s.activeBreakpoint);
  return bp === 'desktop' ? 'base' : bp === 'tablet' ? 'md' : 'sm';
}

// ─── Inspector input ──────────────────────────────────────────────────────────
function IInput({
  value,
  onChange,
  label,
  prefix,
  placeholder = '—',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  prefix?: React.ReactNode;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-0.5 relative min-w-0', className)}>
      {prefix && (
        <span
          className="text-[11px] flex-shrink-0 leading-none select-none"
          style={{ color: '#bbcabf' }}
        >
          {prefix}
        </span>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="inspector-input"
        style={{ height: 24, fontSize: 12, textAlign: 'center', padding: '0 4px' }}
      />
    </div>
  );
}

// ─── Section accordion header ─────────────────────────────────────────────────
function SectionHeader({
  label,
  collapsed,
  onToggle,
  onAdd,
}: {
  label: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onAdd?: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-3 py-[5px] group cursor-pointer select-none"
      onClick={onToggle}
    >
      <div className="flex items-center gap-1">
        {onToggle && (
          collapsed
            ? <ChevronRight size={10} style={{ color: '#bbcabf' }} />
            : <ChevronDown  size={10} style={{ color: '#bbcabf' }} />
        )}
        <span className="text-[12px] font-semibold" style={{ color: '#dde4dd' }}>{label}</span>
      </div>
      {onAdd && (
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: '#bbcabf' }}
          title={`Add ${label}`}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#dde4dd')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#bbcabf')}
        >
          <Plus size={11} />
        </button>
      )}
    </div>
  );
}

// ─── Color hex helper ─────────────────────────────────────────────────────────
// Strips stray leading `#` from user input and returns a valid CSS color string.
// Empty input → '' (clears the property). Non-empty → '#rrggbb'.
function applyHex(raw: string): string {
  const stripped = raw.replace(/^#+/, '');
  return stripped ? `#${stripped}` : '';
}

// ─── Shared input-cell style ──────────────────────────────────────────────────
const cellStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 4,
  padding: '2px 6px',
};

// ─── 1. Dimensions ────────────────────────────────────────────────────────────
function DimensionsSection({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(true);
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeStyles);
  const bpKey  = useBpKey();

  const s   = (node?.styles?.[bpKey] ?? {}) as Record<string, string>;
  const set = (k: string) => (v: string) => update(nodeId, { [bpKey]: { [k]: v } });

  const FIELDS = [
    { key: 'width',     prefix: 'W',   ph: 'auto' },
    { key: 'height',    prefix: 'H',   ph: 'auto' },
    { key: 'minWidth',  prefix: 'min W', ph: '—'  },
    { key: 'maxWidth',  prefix: 'max W', ph: '—'  },
    { key: 'minHeight', prefix: 'min H', ph: '—'  },
    { key: 'maxHeight', prefix: 'max H', ph: '—'  },
  ];

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <SectionHeader label="Dimensions" collapsed={!open} onToggle={() => setOpen((p) => !p)} />
      {open && (
        <div className="px-3 pb-2 grid grid-cols-2 gap-1">
          {FIELDS.map(({ key, prefix, ph }) => (
            <div key={key} style={cellStyle}>
              <span className="text-[10px] flex-shrink-0 select-none" style={{ color: '#bbcabf' }}>{prefix}</span>
              <IInput value={s[key] ?? ''} onChange={set(key)} label={key} placeholder={ph} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 2. Spacing (Margin + Padding) ───────────────────────────────────────────
function SpacingSection({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(true);
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeStyles);
  const bpKey  = useBpKey();

  const s   = (node?.styles?.[bpKey] ?? {}) as Record<string, string>;
  const set = (k: string) => (v: string) => update(nodeId, { [bpKey]: { [k]: v } });

  const SpacingBox = ({
    label,
    top, right, bottom, left,
    setTop, setRight, setBottom, setLeft,
    accent,
  }: {
    label: string;
    top: string; right: string; bottom: string; left: string;
    setTop:(v:string)=>void; setRight:(v:string)=>void;
    setBottom:(v:string)=>void; setLeft:(v:string)=>void;
    accent: string;
  }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] pl-0.5" style={{ color: '#bbcabf' }}>{label}</span>
      <div className="grid grid-cols-3 gap-0.5">
        <div />
        <div style={cellStyle}><IInput value={top}    onChange={setTop}    label={`${label} top`}    placeholder="0" /></div>
        <div />
        <div style={cellStyle}><IInput value={left}   onChange={setLeft}   label={`${label} left`}   placeholder="0" /></div>
        <div
          className="rounded flex items-center justify-center"
          style={{ background: accent, opacity: 0.12 }}
        />
        <div style={cellStyle}><IInput value={right}  onChange={setRight}  label={`${label} right`}  placeholder="0" /></div>
        <div />
        <div style={cellStyle}><IInput value={bottom} onChange={setBottom} label={`${label} bottom`} placeholder="0" /></div>
        <div />
      </div>
    </div>
  );

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <SectionHeader label="Spacing" collapsed={!open} onToggle={() => setOpen((p) => !p)} />
      {open && (
        <div className="px-3 pb-2 flex flex-col gap-2">
          <SpacingBox
            label="Margin"
            top={s.marginTop ?? ''}    right={s.marginRight ?? ''}
            bottom={s.marginBottom ?? ''} left={s.marginLeft ?? ''}
            setTop={set('marginTop')}  setRight={set('marginRight')}
            setBottom={set('marginBottom')} setLeft={set('marginLeft')}
            accent="#bbcabf"
          />
          <SpacingBox
            label="Padding"
            top={s.paddingTop ?? ''}    right={s.paddingRight ?? ''}
            bottom={s.paddingBottom ?? ''} left={s.paddingLeft ?? ''}
            setTop={set('paddingTop')}  setRight={set('paddingRight')}
            setBottom={set('paddingBottom')} setLeft={set('paddingLeft')}
            accent="#10b77f"
          />
        </div>
      )}
    </div>
  );
}

// ─── 3. Layout (Flex / Grid) ─────────────────────────────────────────────────
function LayoutSection({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(true);
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeStyles);
  const bpKey  = useBpKey();

  const s       = (node?.styles?.[bpKey] ?? {}) as Record<string, string>;
  const set     = (k: string) => (v: string) => update(nodeId, { [bpKey]: { [k]: v } });
  const display = s.display ?? 'block';
  const isFlex  = display === 'flex' || display === 'inline-flex';
  const isGrid  = display === 'grid';

  // When switching display mode, purge props that only apply to the OLD mode
  // to avoid stale flex/grid values polluting block/inline layouts.
  const handleDisplayChange = (newDisplay: string) => {
    const FLEX_PROPS = ['flexDirection', 'alignItems', 'justifyContent', 'flexWrap'] as const;
    const GRID_PROPS = ['gridTemplateColumns'] as const;
    const clear: Record<string, string> = {};
    if (newDisplay !== 'flex' && newDisplay !== 'inline-flex') {
      FLEX_PROPS.forEach((p) => { clear[p] = ''; });
    }
    if (newDisplay !== 'grid') {
      GRID_PROPS.forEach((p) => { clear[p] = ''; });
    }
    update(nodeId, { [bpKey]: { display: newDisplay, ...clear } });
  };

  const ALIGN_H = [
    { icon: <AlignLeft size={11} />,    value: 'flex-start',   label: 'Start'        },
    { icon: <AlignCenter size={11} />,  value: 'center',       label: 'Center'       },
    { icon: <AlignRight size={11} />,   value: 'flex-end',     label: 'End'          },
    { icon: <AlignJustify size={11} />, value: 'space-between',label: 'Space Between'},
  ];
  const ALIGN_V = [
    { icon: <AlignVerticalJustifyStart  size={11} />, value: 'flex-start', label: 'Start'  },
    { icon: <AlignVerticalJustifyCenter size={11} />, value: 'center',     label: 'Center' },
    { icon: <AlignVerticalJustifyEnd    size={11} />, value: 'flex-end',   label: 'End'    },
  ];

  const selectStyle: React.CSSProperties = {
    flex: 1,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: '#dde4dd',
    fontSize: 12,
    padding: '3px 6px',
    outline: 'none',
    cursor: 'pointer',
  };

  const iconBtnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, borderRadius: 4, transition: 'background 120ms',
    border: 'none', cursor: 'pointer',
  };

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <SectionHeader label="Layout" collapsed={!open} onToggle={() => setOpen((p) => !p)} />
      {open && (
        <div className="px-3 pb-2 flex flex-col gap-1.5">
          {/* Display mode */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] flex-shrink-0 w-14" style={{ color: '#bbcabf' }}>Display</span>
            <select
              value={display}
              onChange={(e) => handleDisplayChange(e.target.value)}
              style={selectStyle}
              aria-label="Display"
            >
              {['block','flex','inline-flex','grid','inline-block','none'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Flex controls */}
          {isFlex && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[11px] flex-shrink-0 w-14" style={{ color: '#bbcabf' }}>Direction</span>
                <select
                  value={s.flexDirection ?? 'row'}
                  onChange={(e) => set('flexDirection')(e.target.value)}
                  style={selectStyle}
                  aria-label="Flex direction"
                >
                  {['row','row-reverse','column','column-reverse'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] flex-shrink-0 w-14" style={{ color: '#bbcabf' }}>Align</span>
                <div className="flex items-center gap-0.5">
                  {ALIGN_V.map((a) => (
                    <button
                      key={a.value} title={a.label}
                      onClick={() => set('alignItems')(a.value)}
                      style={{
                        ...iconBtnBase,
                        background: (s.alignItems ?? 'flex-start') === a.value
                          ? 'rgba(16,183,127,0.20)' : 'transparent',
                        color: (s.alignItems ?? 'flex-start') === a.value
                          ? '#50dea3' : '#bbcabf',
                      }}
                    >{a.icon}</button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] flex-shrink-0 w-14" style={{ color: '#bbcabf' }}>Justify</span>
                <div className="flex items-center gap-0.5">
                  {ALIGN_H.map((a) => (
                    <button
                      key={a.value} title={a.label}
                      onClick={() => set('justifyContent')(a.value)}
                      style={{
                        ...iconBtnBase,
                        background: (s.justifyContent ?? 'flex-start') === a.value
                          ? 'rgba(16,183,127,0.20)' : 'transparent',
                        color: (s.justifyContent ?? 'flex-start') === a.value
                          ? '#50dea3' : '#bbcabf',
                      }}
                    >{a.icon}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1">
                <div style={cellStyle}>
                  <span className="text-[10px] flex-shrink-0" style={{ color: '#bbcabf' }}>Gap</span>
                  <IInput value={s.gap ?? ''} onChange={set('gap')} label="Gap" placeholder="0" />
                </div>
                <select
                  value={s.flexWrap ?? 'nowrap'}
                  onChange={(e) => set('flexWrap')(e.target.value)}
                  style={{ ...selectStyle, flex: 'unset' }}
                  aria-label="Flex wrap"
                >
                  {['nowrap','wrap','wrap-reverse'].map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Grid controls */}
          {isGrid && (
            <div className="grid grid-cols-2 gap-1">
              <div style={cellStyle}>
                <span className="text-[10px] flex-shrink-0" style={{ color: '#bbcabf' }}>Cols</span>
                <IInput value={s.gridTemplateColumns ?? ''} onChange={set('gridTemplateColumns')} label="Grid columns" placeholder="1fr 1fr" />
              </div>
              <div style={cellStyle}>
                <span className="text-[10px] flex-shrink-0" style={{ color: '#bbcabf' }}>Gap</span>
                <IInput value={s.gap ?? ''} onChange={set('gap')} label="Grid gap" placeholder="0" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 4. Typography ────────────────────────────────────────────────────────────
function TypographySection({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(true);
  const node    = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const updateS = useCanvasStore((s) => s.updateNodeStyles);
  const bpKey   = useBpKey();

  const s   = (node?.styles?.[bpKey] ?? {}) as Record<string, string>;
  const set = (k: string) => (v: string) => updateS(nodeId, { [bpKey]: { [k]: v } });

  // Keys = display label, values = full CSS font-family stack
  const FONT_FAMILIES: Record<string, string> = {
    'Inter':            'Inter, sans-serif',
    'Roboto':           'Roboto, sans-serif',
    'Open Sans':        '"Open Sans", sans-serif',
    'Lato':             'Lato, sans-serif',
    'Montserrat':       'Montserrat, sans-serif',
    'Poppins':          'Poppins, sans-serif',
    'Raleway':          'Raleway, sans-serif',
    'Nunito':           'Nunito, sans-serif',
    'Source Sans Pro':  '"Source Sans Pro", sans-serif',
    'Playfair Display': '"Playfair Display", serif',
    'Georgia':          'Georgia, serif',
    'System UI':        'system-ui, sans-serif',
  };
  const WEIGHTS = [
    { v:'100', l:'Thin'       }, { v:'200', l:'ExtraLight' }, { v:'300', l:'Light'   },
    { v:'400', l:'Regular'    }, { v:'500', l:'Medium'     }, { v:'600', l:'SemiBold'},
    { v:'700', l:'Bold'       }, { v:'800', l:'ExtraBold'  }, { v:'900', l:'Black'   },
  ];
  const ALIGNS = [
    { icon: <AlignLeft size={11}/>,    v: 'left'    },
    { icon: <AlignCenter size={11}/>,  v: 'center'  },
    { icon: <AlignRight size={11}/>,   v: 'right'   },
    { icon: <AlignJustify size={11}/>, v: 'justify' },
  ];

  const color = s.color ?? '';
  const selectStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: '#dde4dd',
    fontSize: 12,
    padding: '3px 6px',
    outline: 'none',
    cursor: 'pointer',
  };
  const iconBtnBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 24, borderRadius: 4, border: 'none', cursor: 'pointer',
  };

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <SectionHeader label="Typography" collapsed={!open} onToggle={() => setOpen((p) => !p)} />
      {open && (
        <div className="px-3 pb-2 flex flex-col gap-1">
          {/* Font family */}
          <select
            value={s.fontFamily ?? 'Inter, sans-serif'}
            onChange={(e) => set('fontFamily')(e.target.value)}
            style={{ ...selectStyle, width: '100%' }}
            aria-label="Font family"
          >
            {Object.entries(FONT_FAMILIES).map(([label, value]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Weight + Size */}
          <div className="grid grid-cols-2 gap-1">
            <select
              value={s.fontWeight ?? '400'}
              onChange={(e) => set('fontWeight')(e.target.value)}
              style={selectStyle}
              aria-label="Font weight"
            >
              {WEIGHTS.map(({v, l}) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div style={cellStyle}>
              <span className="text-[10px] flex-shrink-0" style={{ color: '#bbcabf' }}>px</span>
              <IInput value={s.fontSize ?? ''} onChange={set('fontSize')} label="Font size" placeholder="16" />
            </div>
          </div>

          {/* Line height + Letter spacing */}
          <div className="grid grid-cols-2 gap-1">
            <div style={cellStyle}>
              <span className="text-[10px] flex-shrink-0" style={{ color: '#bbcabf' }}>↕</span>
              <IInput value={s.lineHeight ?? ''} onChange={set('lineHeight')} label="Line height" placeholder="1.5" />
            </div>
            <div style={cellStyle}>
              <span className="text-[10px] flex-shrink-0" style={{ color: '#bbcabf' }}>LS</span>
              <IInput value={s.letterSpacing ?? ''} onChange={set('letterSpacing')} label="Letter spacing" placeholder="0" />
            </div>
          </div>

          {/* Text align */}
          <div className="flex items-center gap-0.5">
            {ALIGNS.map((a) => (
              <button
                key={a.v} title={a.v}
                onClick={() => set('textAlign')(a.v)}
                style={{
                  ...iconBtnBase,
                  background: (s.textAlign ?? 'left') === a.v
                    ? 'rgba(16,183,127,0.20)' : 'transparent',
                  color: (s.textAlign ?? 'left') === a.v ? '#50dea3' : '#bbcabf',
                }}
              >{a.icon}</button>
            ))}
          </div>

          {/* Text color */}
          <div style={cellStyle}>
            <input
              type="color"
              value={color.startsWith('#') ? color : '#333333'}
              onChange={(e) => set('color')(e.target.value)}
              className="w-4 h-4 rounded-sm flex-shrink-0 cursor-pointer border-0 p-0 bg-transparent"
              style={{ appearance: 'none' }}
              aria-label="Text color"
            />
            <IInput
              value={color.replace(/^#+/, '')}
              onChange={(v) => set('color')(applyHex(v))}
              label="Text color hex"
              placeholder="333333"
              className="flex-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 5. Background ────────────────────────────────────────────────────────────
function BackgroundSection({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(true);
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeStyles);
  const bpKey  = useBpKey();

  const s         = (node?.styles?.[bpKey] ?? {}) as Record<string, string>;
  const fill      = s.backgroundColor ?? '';
  const opacity   = s.opacity ?? '';
  // Derive visibility from persisted CSS — defaults to visible when unset
  const isVisible = s.visibility !== 'hidden';
  const set       = (k: string) => (v: string) => update(nodeId, { [bpKey]: { [k]: v } });

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <SectionHeader label="Background" collapsed={!open} onToggle={() => setOpen((p) => !p)} onAdd={() => {}} />
      {open && (
        <div className="px-3 pb-2 flex flex-col gap-1">
          {/* Color row */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 flex-1" style={cellStyle}>
              <input
                type="color"
                value={fill.startsWith('#') ? fill : '#ffffff'}
                onChange={(e) => set('backgroundColor')(e.target.value)}
                className="w-4 h-4 rounded-sm flex-shrink-0 cursor-pointer border-0 p-0 bg-transparent"
                style={{ appearance: 'none' }}
                aria-label="Background color"
              />
              <IInput
                value={fill.replace(/^#+/, '').toUpperCase()}
                onChange={(v) => set('backgroundColor')(applyHex(v))}
                label="Background hex"
                placeholder="transparent"
                className="flex-1"
              />
            </div>
            <button
              onClick={() => set('visibility')(isVisible ? 'hidden' : 'visible')}
              style={{ color: isVisible ? '#bbcabf' : '#f87171' }}
              title={isVisible ? 'Hide element' : 'Show element'}
              aria-label={isVisible ? 'Hide element' : 'Show element'}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#dde4dd')}
              onMouseLeave={(e) => (e.currentTarget.style.color = isVisible ? '#bbcabf' : '#f87171')}
            >
              {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          </div>

          {/* Opacity row */}
          <div style={cellStyle}>
            <span className="text-[10px] flex-shrink-0" style={{ color: '#bbcabf' }}>Opacity</span>
            <IInput value={opacity} onChange={set('opacity')} label="CSS opacity" placeholder="1" className="flex-1" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 6. Border ────────────────────────────────────────────────────────────────
function BorderSection({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(false);
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeStyles);
  const bpKey  = useBpKey();

  const s      = (node?.styles?.[bpKey] ?? {}) as Record<string, string>;
  const set    = (k: string) => (v: string) => update(nodeId, { [bpKey]: { [k]: v } });
  const color  = s.borderColor ?? '';
  const width  = s.borderWidth ?? '';
  const bStyle = s.borderStyle ?? 'solid';
  const radius = s.borderRadius ?? '';

  const selectStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 4,
    color: '#dde4dd',
    fontSize: 12,
    padding: '3px 6px',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <SectionHeader label="Border" collapsed={!open} onToggle={() => setOpen((p) => !p)} />
      {open && (
        <div className="px-3 pb-2 flex flex-col gap-1">
          {/* Color + width */}
          <div className="grid grid-cols-2 gap-1">
            <div style={cellStyle}>
              <input
                type="color"
                value={color.startsWith('#') ? color : '#000000'}
                onChange={(e) => set('borderColor')(e.target.value)}
                className="w-4 h-4 rounded-sm flex-shrink-0 cursor-pointer border-0 p-0 bg-transparent"
                style={{ appearance: 'none' }}
                aria-label="Border color"
              />
              <IInput value={color.replace(/^#+/, '').toUpperCase()} onChange={(v) => set('borderColor')(applyHex(v))} label="Border color" placeholder="000000" className="flex-1" />
            </div>
            <div style={cellStyle}>
              <span className="text-[10px] flex-shrink-0" style={{ color: '#bbcabf' }}>W</span>
              <IInput value={width} onChange={set('borderWidth')} label="Border width" placeholder="0px" />
            </div>
          </div>

          {/* Style + Radius */}
          <div className="grid grid-cols-2 gap-1">
            <select
              value={bStyle}
              onChange={(e) => set('borderStyle')(e.target.value)}
              style={selectStyle}
              aria-label="Border style"
            >
              {['solid','dashed','dotted','double','none'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <div style={cellStyle}>
              <span className="text-[10px] flex-shrink-0" style={{ color: '#bbcabf' }}>⌐</span>
              <IInput value={radius} onChange={set('borderRadius')} label="Border radius" placeholder="0px" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 7. Effects (Box Shadow + Transform) ─────────────────────────────────────
function EffectsSection({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(false);
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeStyles);
  const bpKey  = useBpKey();

  const s   = (node?.styles?.[bpKey] ?? {}) as Record<string, string>;
  const set = (k: string) => (v: string) => update(nodeId, { [bpKey]: { [k]: v } });

  const PRESETS = [
    { label: 'Subtle', value: '0 1px 3px rgba(0,0,0,0.12)'        },
    { label: 'Medium', value: '0 4px 12px rgba(0,0,0,0.20)'       },
    { label: 'Heavy',  value: '0 8px 32px rgba(0,0,0,0.35)'       },
    { label: 'Inset',  value: 'inset 0 2px 4px rgba(0,0,0,0.15)' },
  ];

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <SectionHeader label="Effects" collapsed={!open} onToggle={() => setOpen((p) => !p)} />
      {open && (
        <div className="px-3 pb-2 flex flex-col gap-1">
          {/* Box shadow */}
          <div style={cellStyle}>
            <span className="text-[10px] flex-shrink-0" style={{ color: '#bbcabf' }}>Shadow</span>
            <IInput value={s.boxShadow ?? ''} onChange={set('boxShadow')} label="Box shadow" placeholder="0 2px 8px rgba(0,0,0,0.2)" className="flex-1" />
          </div>

          {/* Shadow presets */}
          <div className="flex flex-wrap gap-1 mt-0.5">
            {PRESETS.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => set('boxShadow')(value)}
                className="text-[11px] px-1.5 py-0.5 rounded transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#bbcabf' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)';
                  (e.currentTarget as HTMLElement).style.color = '#dde4dd';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLElement).style.color = '#bbcabf';
                }}
              >
                {label}
              </button>
            ))}
            {s.boxShadow && (
              <button
                onClick={() => set('boxShadow')('')}
                className="text-[11px] px-1.5 py-0.5 rounded transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#bbcabf' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#f87171';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#bbcabf';
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Transform */}
          <div style={cellStyle}>
            <span className="text-[10px] flex-shrink-0" style={{ color: '#bbcabf' }}>Transform</span>
            <IInput value={s.transform ?? ''} onChange={set('transform')} label="CSS transform" placeholder="rotate(0deg)" className="flex-1" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── No selection placeholder ─────────────────────────────────────────────────
function NoSelection() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-4 select-none">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: 'rgba(16,183,127,0.08)',
          border: '1px solid rgba(16,183,127,0.15)',
        }}
      >
        <LayoutTemplate size={18} style={{ color: '#10b77f', opacity: 0.7 }} />
      </div>
      <p className="text-[13px] leading-relaxed" style={{ color: '#bbcabf' }}>
        Select an element to edit<br />its CSS properties
      </p>
    </div>
  );
}

// ─── RightSidebar ─────────────────────────────────────────────────────────────
export function RightSidebar() {
  const rightPanelOpen   = useUIStore((s) => s.rightPanelOpen);
  const selectedId       = useSelectionStore((s) => s.primarySelectedId);
  const node             = useCanvasStore((s) => selectedId ? s.page?.nodeMap?.[selectedId] : null);
  const activeBreakpoint = useUIStore((s) => s.activeBreakpoint);
  const [tab, setTab]    = useState<'design' | 'prototype'>('design');

  if (!rightPanelOpen) return null;

  const BP_LABEL = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' }[activeBreakpoint];

  return (
    <aside
      data-testid="right-sidebar"
      className="flex flex-col shrink-0 overflow-hidden"
      style={{
        width:       240,
        background:  '#0e1511',
        borderLeft:  '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        {(['design', 'prototype'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 h-9 text-[13px] font-medium capitalize transition-colors duration-[120ms]"
            style={{
              color:        tab === t ? '#50dea3' : '#bbcabf',
              borderBottom: tab === t ? '2px solid #10b77f' : '2px solid transparent',
              background:   'transparent',
            }}
            onMouseEnter={(e) => {
              if (tab !== t) (e.currentTarget as HTMLElement).style.color = '#dde4dd';
            }}
            onMouseLeave={(e) => {
              if (tab !== t) (e.currentTarget as HTMLElement).style.color = '#bbcabf';
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* -- Breakpoint indicator -- */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b77f' }} />
        <span className="text-[11px]" style={{ color: '#bbcabf' }}>Editing {BP_LABEL} styles</span>
      </div>

      {tab === 'design' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!selectedId || !node ? (
            <NoSelection />
          ) : (
            <>
              <DimensionsSection nodeId={selectedId} />
              <SpacingSection    nodeId={selectedId} />
              <LayoutSection     nodeId={selectedId} />
              <TypographySection nodeId={selectedId} />
              <BackgroundSection nodeId={selectedId} />
              <BorderSection     nodeId={selectedId} />
              <EffectsSection    nodeId={selectedId} />
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
          <p className="text-[13px]" style={{ color: '#bbcabf' }}>No interactions added</p>
          <button
            className="flex items-center gap-1 mt-2 text-[13px] transition-colors"
            style={{ color: '#10b77f' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#50dea3')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#10b77f')}
          >
            <ArrowRight size={12} />Add interaction
          </button>
        </div>
      )}
    </aside>
  );
}
