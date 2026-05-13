/**
 * NexusAccordion — controlled accordion translated from code.html <details>/<summary>.
 *
 * Design contract (Executive Dark spec):
 *   • Summary:  px-md py-sm, hover:bg-white/5, label-caps uppercase tracking-[0.05em]
 *   • Chevron:  material-symbols-outlined, rotates 180° when open
 *   • Separator: border-b border-white/10 between each panel
 *   • Default:  only the FIRST accordion in a group is open; rest are closed.
 *               Pass `defaultOpen={true}` on the first item — all others omit it.
 */

import { useState, type ReactNode } from 'react';

interface NexusAccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function NexusAccordion({
  title,
  children,
  defaultOpen = false,
  className = '',
}: NexusAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`group border-b border-white/10 ${className}`} data-open={isOpen}>
      {/* ── Summary row ── */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-md py-sm cursor-pointer hover:bg-white/5 transition-colors select-none"
        aria-expanded={isOpen}
      >
        <span className="font-label-caps text-label-caps uppercase tracking-[0.05em] text-on-surface-variant group-hover:text-on-surface transition-colors">
          {title}
        </span>
        <span
          className="material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {/* ── Content panel ── */}
      {isOpen && (
        <div className="overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}
