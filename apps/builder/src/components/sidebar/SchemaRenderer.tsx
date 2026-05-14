/**
 * SchemaRenderer.tsx — Dynamic properties panel renderer
 *
 * Reads a widget's settingsSchema array and renders the correct
 * NexusControl component for each entry. Writes changes back via
 * canvasStore.updateNodeProps — zero hand-written Inspector needed.
 *
 * Control type → component mapping:
 *   text    → InspectorInput  (or InspectorTextarea when multiline)
 *   number  → InspectorInput  (type="number")
 *   select  → InspectorSelect
 *   toggle  → InspectorToggle
 *   color   → InspectorColor
 *   switch  → SwitchControl   (inline toggle row)
 *   slider  → SliderControl
 *   image   → ImageUploadControl
 *   group   → Collapsible GroupControl → recurses
 */

import { useRef, useState } from 'react';
import { ChevronDown, Upload, X } from 'lucide-react';
import { useCanvasStore } from '@nexus/core';
import {
  InspectorInput,
  InspectorTextarea,
  InspectorSelect,
  InspectorToggle,
  InspectorColor,
  InspectorSection,
} from '@/widgets/shared';
import type {
  ControlSchema,
  TextControl,
  NumberControl,
  SelectControl,
  ToggleControl,
  ColorControl,
  SwitchControl,
  SliderControl,
  ImageControl,
  GroupControl,
} from '@nexus/core';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useNodeConfig(nodeId: string) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);
  return {
    config: (node?.props ?? {}) as Record<string, unknown>,
    set: (id: string, value: unknown) => update(nodeId, { [id]: value }),
  };
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === 'yes' || v === 1;
}

// ─── Individual control renderers ─────────────────────────────────────────────

function RenderText({ ctrl, nodeId }: { ctrl: TextControl; nodeId: string }) {
  const { config, set } = useNodeConfig(nodeId);
  if (ctrl.multiline) {
    return (
      <InspectorTextarea
        label={ctrl.label}
        value={str(config[ctrl.id])}
        onChange={(v) => set(ctrl.id, v)}
        placeholder={ctrl.placeholder ?? ''}
      />
    );
  }
  return (
    <InspectorInput
      label={ctrl.label}
      value={str(config[ctrl.id])}
      onChange={(v) => set(ctrl.id, v)}
      placeholder={ctrl.placeholder ?? ''}
      type={ctrl.inputType ?? 'text'}
      hint={ctrl.hint ?? ''}
    />
  );
}

function RenderNumber({ ctrl, nodeId }: { ctrl: NumberControl; nodeId: string }) {
  const { config, set } = useNodeConfig(nodeId);
  return (
    <div className="flex flex-col">
      <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#bbcabf] leading-none mb-2.5">
        {ctrl.label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={num(config[ctrl.id])}
          min={ctrl.min}
          max={ctrl.max}
          step={ctrl.step ?? 1}
          onChange={(e) => set(ctrl.id, e.target.valueAsNumber)}
          className="inspector-input flex-1"
        />
        {ctrl.unit && (
          <span className="text-[12px] font-medium text-[#bbcabf] shrink-0">{ctrl.unit}</span>
        )}
      </div>
      {ctrl.hint && (
        <span className="mt-1.5 text-[11px] text-[#bbcabf] leading-snug">{ctrl.hint}</span>
      )}
    </div>
  );
}

function RenderSelect({ ctrl, nodeId }: { ctrl: SelectControl; nodeId: string }) {
  const { config, set } = useNodeConfig(nodeId);
  return (
    <InspectorSelect
      label={ctrl.label}
      value={str(config[ctrl.id]) || (ctrl.options[0]?.value ?? '')}
      options={ctrl.options}
      onChange={(v) => set(ctrl.id, v)}
    />
  );
}

function RenderToggle({ ctrl, nodeId }: { ctrl: ToggleControl; nodeId: string }) {
  const { config, set } = useNodeConfig(nodeId);
  return (
    <InspectorToggle
      label={ctrl.label}
      value={str(config[ctrl.id]) || (ctrl.options[0]?.value ?? '')}
      options={ctrl.options}
      onChange={(v) => set(ctrl.id, v)}
    />
  );
}

function RenderColor({ ctrl, nodeId }: { ctrl: ColorControl; nodeId: string }) {
  const { config, set } = useNodeConfig(nodeId);
  return (
    <InspectorColor
      label={ctrl.label}
      value={str(config[ctrl.id])}
      onChange={(v) => set(ctrl.id, v)}
    />
  );
}

function RenderSwitch({ ctrl, nodeId }: { ctrl: SwitchControl; nodeId: string }) {
  const { config, set } = useNodeConfig(nodeId);
  const on = bool(config[ctrl.id]);
  const onLabel  = ctrl.onLabel  ?? 'On';
  const offLabel = ctrl.offLabel ?? 'Off';

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#bbcabf]">
        {ctrl.label}
      </span>
      <button
        onClick={() => set(ctrl.id, !on)}
        role="switch"
        aria-checked={on}
        className="relative flex items-center h-[22px] rounded-full transition-all duration-150 px-0.5"
        style={{
          width: '44px',
          background: on ? '#10b77f' : 'rgba(255,255,255,0.12)',
        }}
      >
        <span
          className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all duration-150"
          style={{ left: on ? '24px' : '3px' }}
        />
        <span className="sr-only">{on ? onLabel : offLabel}</span>
      </button>
    </div>
  );
}

function RenderSlider({ ctrl, nodeId }: { ctrl: SliderControl; nodeId: string }) {
  const { config, set } = useNodeConfig(nodeId);
  const v = num(config[ctrl.id]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#bbcabf]">
          {ctrl.label}
        </span>
        <span className="text-[12px] font-mono text-[#50dea3]">
          {v}{ctrl.unit ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={ctrl.min}
        max={ctrl.max}
        step={ctrl.step ?? 1}
        value={v}
        onChange={(e) => set(ctrl.id, e.target.valueAsNumber)}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #10b77f ${((v - ctrl.min) / (ctrl.max - ctrl.min)) * 100}%, rgba(255,255,255,0.12) 0%)`,
        }}
      />
      {ctrl.hint && (
        <span className="text-[11px] text-[#bbcabf] leading-snug">{ctrl.hint}</span>
      )}
    </div>
  );
}

function RenderImage({ ctrl, nodeId }: { ctrl: ImageControl; nodeId: string }) {
  const { config, set } = useNodeConfig(nodeId);
  const src = str(config[ctrl.id]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') set(ctrl.id, result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#bbcabf] leading-none">
        {ctrl.label}
      </span>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        onClick={() => fileRef.current?.click()}
        className="flex items-center justify-center gap-2 h-10 rounded-md border border-dashed border-[rgba(16,183,127,0.40)] text-[13px] font-semibold transition-all duration-[140ms] hover:border-[#10b77f] hover:bg-[rgba(16,183,127,0.06)]"
        style={{ color: '#50dea3', background: 'rgba(16,183,127,0.04)' }}
      >
        <Upload size={14} strokeWidth={2} />
        {src ? 'Replace image…' : 'Upload image…'}
      </button>
      {src && (
        <div className="relative rounded-md overflow-hidden border border-[rgba(255,255,255,0.10)]" style={{ background: '#09100c' }}>
          <img src={src} alt="" className="w-full block object-cover" style={{ maxHeight: '100px', objectFit: 'cover' }} />
          <button
            onClick={() => set(ctrl.id, '')}
            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.65)', color: '#dde4dd' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(220,50,50,0.80)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.65)')}
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>
      )}
      {ctrl.hint && (
        <span className="text-[11px] text-[#bbcabf] leading-snug">{ctrl.hint}</span>
      )}
    </div>
  );
}

function RenderGroup({ ctrl, nodeId }: { ctrl: GroupControl; nodeId: string }) {
  const [open, setOpen] = useState(!ctrl.collapsed);

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 py-2 w-full text-left"
      >
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className="text-[#bbcabf] transition-transform duration-150 shrink-0"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        />
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#bbcabf]">
          {ctrl.label}
        </span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.10)]" />
      </button>
      {open && (
        <div className="flex flex-col gap-2.5 pl-2">
          <SchemaRenderer controls={ctrl.controls} nodeId={nodeId} />
        </div>
      )}
    </div>
  );
}

// ─── Main SchemaRenderer ──────────────────────────────────────────────────────

interface SchemaRendererProps {
  controls: ControlSchema[];
  nodeId: string;
}

export function SchemaRenderer({ controls, nodeId }: SchemaRendererProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {controls.map((ctrl) => {
        switch (ctrl.type) {
          case 'text':    return <RenderText    key={ctrl.id} ctrl={ctrl} nodeId={nodeId} />;
          case 'number':  return <RenderNumber  key={ctrl.id} ctrl={ctrl} nodeId={nodeId} />;
          case 'select':  return <RenderSelect  key={ctrl.id} ctrl={ctrl} nodeId={nodeId} />;
          case 'toggle':  return <RenderToggle  key={ctrl.id} ctrl={ctrl} nodeId={nodeId} />;
          case 'color':   return <RenderColor   key={ctrl.id} ctrl={ctrl} nodeId={nodeId} />;
          case 'switch':  return <RenderSwitch  key={ctrl.id} ctrl={ctrl} nodeId={nodeId} />;
          case 'slider':  return <RenderSlider  key={ctrl.id} ctrl={ctrl} nodeId={nodeId} />;
          case 'image':   return <RenderImage   key={ctrl.id} ctrl={ctrl} nodeId={nodeId} />;
          case 'group':   return <RenderGroup   key={ctrl.id} ctrl={ctrl} nodeId={nodeId} />;
          default:        return null;
        }
      })}
    </div>
  );
}

// ─── Wrapper with outer padding for the Content tab ──────────────────────────

export function SchemaContentTab({ controls, nodeId }: SchemaRendererProps) {
  if (controls.length === 0) {
    return (
      <div className="px-4 py-8 flex flex-col items-center gap-2 opacity-50">
        <p className="text-[12px] text-[#bbcabf] text-center">
          This widget has no content settings.
          <br />
          Use the <strong style={{ color: '#dde4dd' }}>Style</strong> tab to configure its appearance.
        </p>
      </div>
    );
  }
  return (
    <div className="px-3 pb-4 pt-1">
      <SchemaRenderer controls={controls} nodeId={nodeId} />
    </div>
  );
}
