/**
 * NexusInput — styled text input translated from code.html.
 *
 * Exact classes from prototype:
 *   w-full h-8 bg-surface border border-white/10 rounded px-xs
 *   font-mono-label text-on-surface shadow-input-inset
 *   focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
 *   transition-all
 *
 * Used in Dimensions (W, H, Min W, Max W) and Effects (Opacity numeric).
 */

import { type InputHTMLAttributes } from 'react';

interface NexusInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function NexusInput({ label, className = '', ...props }: NexusInputProps) {
  return (
    <div className="flex-1 space-y-1">
      {label && (
        <label className="font-mono-label text-[10px] text-on-surface-variant block">
          {label}
        </label>
      )}
      <input
        className={[
          'w-full h-8',
          'bg-surface border border-white/10 rounded',
          'px-xs',
          'font-mono-label text-mono-label text-on-surface',
          'shadow-input-inset',
          'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
          'placeholder:text-on-surface-variant/50',
          'transition-all',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  );
}
