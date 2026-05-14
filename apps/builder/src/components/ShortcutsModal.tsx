/**
 * ShortcutsModal.tsx — Phase 12.2
 * Keyboard shortcuts reference overlay.
 * Triggered by pressing '?' anywhere in the builder (outside of inputs).
 * Dismissed by pressing '?' again, pressing Escape, or clicking backdrop.
 */

import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShortcutEntry {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  label: string;
  entries: ShortcutEntry[];
}

// ─── Shortcut definitions ─────────────────────────────────────────────────────

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: 'Canvas & Selection',
    entries: [
      { keys: ['Click'],         description: 'Select element' },
      { keys: ['⇧', 'Click'],    description: 'Multi-select elements' },
      { keys: ['Dbl-click'],     description: 'Enter inline text edit' },
      { keys: ['Esc'],           description: 'Exit edit / deselect' },
      { keys: ['⌫', 'Del'],      description: 'Delete selected element' },
      { keys: ['⌘D'],            description: 'Duplicate selected element' },
    ],
  },
  {
    label: 'View & Layout',
    entries: [
      { keys: ['D'],             description: 'Switch to Desktop breakpoint' },
      { keys: ['T'],             description: 'Switch to Tablet breakpoint' },
      { keys: ['M'],             description: 'Switch to Mobile breakpoint' },
      { keys: ['P'],             description: 'Toggle Preview mode' },
      { keys: ['⌘', '+'],        description: 'Zoom in' },
      { keys: ['⌘', '−'],        description: 'Zoom out' },
      { keys: ['⌘', '0'],        description: 'Reset zoom to 100%' },
    ],
  },
  {
    label: 'History',
    entries: [
      { keys: ['⌘Z'],            description: 'Undo last action' },
      { keys: ['⌘⇧Z'],           description: 'Redo' },
    ],
  },
  {
    label: 'Panels',
    entries: [
      { keys: ['⌘⇧L'],           description: 'Toggle Left panel' },
      { keys: ['⌘⇧R'],           description: 'Toggle Right panel' },
      { keys: ['?'],             description: 'Open / close shortcuts' },
    ],
  },
  {
    label: 'Drag & Drop',
    entries: [
      { keys: ['Drag from Left'], description: 'Add new widget to canvas' },
      { keys: ['Drag on Canvas'], description: 'Reorder / move element' },
      { keys: ['Right-click'],    description: 'Open element context menu' },
    ],
  },
];

// ─── Key badge ────────────────────────────────────────────────────────────────

function KeyBadge({ label }: { label: string }) {
  const isLong = label.length > 3;
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center',
        'rounded border font-mono text-[10px] font-semibold leading-none',
        'select-none',
        isLong ? 'px-2 py-1' : 'min-w-[22px] h-[22px] px-1',
      )}
      style={{
        background:  'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.14)',
        color:       '#dde4dd',
      }}
    >
      {label}
    </kbd>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="relative w-[680px] max-h-[80vh] flex flex-col rounded-xl overflow-hidden"
        style={{
          background:  '#0e1511',
          border:      '1px solid rgba(255,255,255,0.10)',
          boxShadow:   '0 32px 64px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2.5">
            <Keyboard size={18} style={{ color: '#10b77f' }} />
            <span className="text-[15px] font-semibold" style={{ color: '#dde4dd' }}>
              Keyboard Shortcuts
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-150"
            style={{ color: '#6a7f6e' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            aria-label="Close shortcuts"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5" style={{ scrollbarWidth: 'thin' }}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.label}>
                <p
                  className="mb-3 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: '#10b77f' }}
                >
                  {group.label}
                </p>
                <div className="flex flex-col gap-2">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.description}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="text-[12px]" style={{ color: '#a8bfac' }}>
                        {entry.description}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {entry.keys.map((k) => (
                          <KeyBadge key={k} label={k} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <div
          className="shrink-0 px-6 py-3 text-center text-[11px]"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            color:     '#4a5d4e',
          }}
        >
          Press <KeyBadge label="?" /> or <KeyBadge label="Esc" /> to close
        </div>
      </div>
    </div>
  );
}
