/**
 * shared.tsx — Inspector primitives: Executive Edition
 *
 * Design rules:
 *   • Inspector inputs: 34px height, 13px font
 *   • Labels: 12px bold uppercase, more breathing room
 *   • Selects: 36px height for comfortable tap target
 *   • Color picker row: 36px
 */

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

/* ─── FieldLabel ─────────────────────────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-[#bbcabf] leading-none mb-2.5">
      {children}
    </span>
  );
}

/* ─── InspectorInput ─────────────────────────────────────────────────────── */

export function InspectorInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint,
  readOnly,
  style,
}: {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  type?:        string;
  hint?:        string;
  readOnly?:    boolean;
  style?:       React.CSSProperties;
}) {
  return (
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={style}
        className={cn(
          'inspector-input',
          readOnly && 'opacity-50 cursor-not-allowed',
        )}
      />
      {hint && (
        <span className="mt-1.5 text-[11px] text-[#bbcabf] leading-snug">
          {hint}
        </span>
      )}
    </div>
  );
}

/* ─── InspectorTextarea ──────────────────────────────────────────────────── */

export function InspectorTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  rows?:        number;
}) {
  return (
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          'w-full rounded-md px-3 py-2.5 resize-none',
          'bg-[#09100c] border border-[rgba(255,255,255,0.10)]',
          'text-[13px] font-medium text-[#dde4dd]',
          'placeholder:text-[rgba(187,202,191,0.50)] placeholder:font-normal',
          'outline-none transition-all duration-[120ms]',
          'hover:border-[rgba(255,255,255,0.15)]',
          'focus:border-[#50dea3] focus:shadow-[0_0_0_3px_rgba(16,183,127,0.15)]',
        )}
      />
    </div>
  );
}

/* ─── InspectorToggle — Segmented control ────────────────────────────────── */

export function InspectorToggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label:    string;
  value:    T;
  options:  { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <div className="toggle-group">
        {options.map((opt, i) => {
          const isActive = opt.value === value;
          const isFirst  = i === 0;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              data-active={isActive ? 'true' : undefined}
              className={cn(
                'toggle-group-item',
                'text-[13px] font-bold transition-all duration-[120ms]',
                !isFirst && 'border-l border-[rgba(255,255,255,0.10)]',
                isActive
                  ? 'is-active active shadow-inner'
                  : 'hover:bg-[rgba(255,255,255,0.05)]',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── InspectorSelect ────────────────────────────────────────────────────── */

export function InspectorSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label:    string;
  value:    T;
  options:  { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={cn(
            'w-full h-[36px] appearance-none rounded-md pl-3 pr-9',
            'bg-[#09100c] border border-white/10',
            'text-[13px] text-[#dde4dd]',
            'shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]',
            'outline-none cursor-pointer',
            'transition-all duration-100',
            'hover:border-white/20',
            'focus:border-[#10b77f] focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5),0_0_0_1px_#10b77f]',
          )}
        >
          {options.map((o) => (
            <option
              key={o.value}
              value={o.value}
              style={{ background: '#0e1511', color: '#dde4dd' }}
            >
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#bbcabf]"
        />
      </div>
    </div>
  );
}

/* ─── InspectorSection — bold divider header ─────────────────────────────── */

export function InspectorSection({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-3 pb-1.5">
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#bbcabf]">
        {label}
      </span>
      <div className="flex-1 h-px bg-[rgba(255,255,255,0.10)]" />
    </div>
  );
}

/* ─── InspectorColor — color picker + hex text input combo ──────────────── */

export function InspectorColor({
  label,
  value,
  onChange,
}: {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <div
        className={cn(
          'flex items-center gap-2.5 h-[36px] rounded-md border px-3',
          'bg-[#09100c] border-white/10',
          'shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]',
          'transition-all duration-100',
          'hover:border-white/20',
          'focus-within:border-[#10b77f] focus-within:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5),0_0_0_1px_#10b77f]',
        )}
      >
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-5 rounded cursor-pointer border-0 bg-transparent p-0 shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000 or rgba(...)"
          className="flex-1 bg-transparent text-[13px] font-medium text-[#dde4dd] outline-none placeholder:text-[rgba(187,202,191,0.40)] placeholder:font-normal"
        />
      </div>
    </div>
  );
}
