/**
 * FloatingTextToolbar — appears above the user's text selection inside any
 * contentEditable widget (Heading, Paragraph, Button labels, etc.).
 *
 * Architecture:
 *   • Listens to the global `selectionchange` event.
 *   • If the selection is non-empty AND inside the passed containerRef,
 *     it positions itself above the selection's bounding rect using
 *     position:fixed (viewport coords, zoom-agnostic).
 *   • Uses document.execCommand for inline formatting — it's deprecated
 *     in the WHATWG spec but universally supported in all engines used today.
 *     Tiptap/ProseMirror can be swapped in at a later phase.
 *   • Renders via ReactDOM.createPortal to document.body so it's never
 *     clipped by overflow:hidden ancestors.
 *
 * Phase 3 gap fix: Added BulletList and OrderedList buttons (blueprint 3.3
 * requires "headings, bold, italic, link, alignment, and lists").
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Link2, Link2Off,
  List, ListOrdered,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FloatingTextToolbarProps {
  /** The DOM element that holds the contentEditable content. */
  containerRef: React.RefObject<HTMLElement | null>;
}

interface ToolbarRect {
  top: number;
  left: number;
  width: number;
}

// ─── Exec-command helpers ─────────────────────────────────────────────────────

function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function queryState(command: string): boolean {
  try { return document.queryCommandState(command); }
  catch { return false; }
}

// ─── Link dialog (inline) ─────────────────────────────────────────────────────

function LinkInput({
  onConfirm,
  onCancel,
}: {
  onConfirm: (url: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm(inputRef.current?.value ?? '');
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-1 px-1">
      <input
        ref={inputRef}
        type="url"
        placeholder="https://…"
        onKeyDown={handleKeyDown}
        className="h-6 w-40 rounded px-1.5 text-xs outline-none"
        style={{
          background: '#09100c',
          border: '1px solid rgba(255,255,255,0.10)',
          color: '#dde4dd',
        }}
      />
      <button
        onMouseDown={(e) => { e.preventDefault(); onConfirm(inputRef.current?.value ?? ''); }}
        className="text-xs px-1.5 h-6 rounded font-medium transition-colors"
        style={{ background: '#10b77f', color: '#fff' }}
      >
        OK
      </button>
      <button
        onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
        className="text-xs px-1.5 h-6 rounded font-medium transition-colors"
        style={{ background: 'rgba(255,255,255,0.05)', color: '#bbcabf' }}
      >
        ✕
      </button>
    </div>
  );
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────

function ToolbarBtn({
  icon: Icon,
  title,
  active,
  onMouseDown,
}: {
  icon: typeof Bold;
  title: string;
  active?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      title={title}
      onMouseDown={onMouseDown}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded transition-colors duration-100',
        active
          ? 'text-white'
          : 'text-[#bbcabf] hover:text-white hover:bg-[rgba(255,255,255,0.08)]',
      )}
      style={active ? { background: '#10b77f' } : {}}
    >
      <Icon size={15} strokeWidth={2} />
    </button>
  );
}

function Divider() {
  return <div className="h-4 w-px mx-0.5 shrink-0" style={{ background: 'rgba(255,255,255,0.10)' }} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FloatingTextToolbar({ containerRef }: FloatingTextToolbarProps) {
  const [rect, setRect] = useState<ToolbarRect | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  // We stash the selection range so we can restore it after button clicks
  const savedRange = useRef<Range | null>(null);

  // Save current selection before a toolbar button mousedown steals focus
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  // Restore saved selection (needed after toolbar button click)
  const restoreSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !containerRef.current) {
        setRect(null);
        return;
      }
      const range = sel.getRangeAt(0);
      // Make sure the selection is inside our container
      if (!containerRef.current.contains(range.commonAncestorContainer)) {
        setRect(null);
        return;
      }
      const r = range.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) { setRect(null); return; }
      setRect({ top: r.top, left: r.left + r.width / 2, width: r.width });
      setShowLinkInput(false); // hide link input when selection changes
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [containerRef]);

  if (!rect) return null;

  const isBold        = queryState('bold');
  const isItalic      = queryState('italic');
  const isUnderline   = queryState('underline');
  const isStrike      = queryState('strikeThrough');
  const hasLink       = queryState('createLink');
  const isBulletList  = queryState('insertUnorderedList');
  const isOrderedList = queryState('insertOrderedList');

  const handleFormat = (command: string, value?: string) => (e: React.MouseEvent) => {
    e.preventDefault(); // keep focus in editor
    restoreSelection();
    exec(command, value);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    saveSelection();
    if (hasLink) {
      restoreSelection();
      exec('unlink');
    } else {
      setShowLinkInput(true);
    }
  };

  const handleLinkConfirm = (url: string) => {
    restoreSelection();
    if (url) exec('createLink', url);
    setShowLinkInput(false);
  };

  const TOOLBAR_HEIGHT = 42;
  const TOOLBAR_GAP    = 8;

  return createPortal(
    <div
      role="toolbar"
      aria-label="Text formatting"
      style={{
        position: 'fixed',
        top:  rect.top - TOOLBAR_HEIGHT - TOOLBAR_GAP,
        left: rect.left,
        transform: 'translateX(-50%)',
        zIndex: 99999,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.preventDefault()} // Don't steal focus from editor
    >
      {/* Arrow down */}
      <div
        style={{
          position: 'absolute',
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 8, height: 8,
          background: '#0e1511',
          border: '1px solid rgba(255,255,255,0.10)',
          borderLeft: 'none',
          borderTop: 'none',
          rotate: '45deg',
        }}
      />

      <div
        className="flex items-center gap-0.5 rounded-lg px-1.5 py-1"
        style={{
          height: TOOLBAR_HEIGHT,
          background: '#0e1511',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          backdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap',
        }}
      >
        {showLinkInput ? (
          <LinkInput
            onConfirm={handleLinkConfirm}
            onCancel={() => setShowLinkInput(false)}
          />
        ) : (
          <>
            {/* Inline formatting */}
            <ToolbarBtn icon={Bold}          title="Bold (Ctrl+B)"      active={isBold}      onMouseDown={handleFormat('bold')} />
            <ToolbarBtn icon={Italic}        title="Italic (Ctrl+I)"    active={isItalic}    onMouseDown={handleFormat('italic')} />
            <ToolbarBtn icon={Underline}     title="Underline (Ctrl+U)" active={isUnderline} onMouseDown={handleFormat('underline')} />
            <ToolbarBtn icon={Strikethrough} title="Strikethrough"      active={isStrike}    onMouseDown={handleFormat('strikeThrough')} />

            <Divider />

            {/* Alignment */}
            <ToolbarBtn icon={AlignLeft}    title="Align left"    active={false} onMouseDown={handleFormat('justifyLeft')} />
            <ToolbarBtn icon={AlignCenter}  title="Align center"  active={false} onMouseDown={handleFormat('justifyCenter')} />
            <ToolbarBtn icon={AlignRight}   title="Align right"   active={false} onMouseDown={handleFormat('justifyRight')} />
            <ToolbarBtn icon={AlignJustify} title="Justify"       active={false} onMouseDown={handleFormat('justifyFull')} />

            <Divider />

            {/* Lists — Phase 3.3 gap fill */}
            <ToolbarBtn
              icon={List}
              title="Bullet list"
              active={isBulletList}
              onMouseDown={handleFormat('insertUnorderedList')}
            />
            <ToolbarBtn
              icon={ListOrdered}
              title="Numbered list"
              active={isOrderedList}
              onMouseDown={handleFormat('insertOrderedList')}
            />

            <Divider />

            {/* Link */}
            <ToolbarBtn
              icon={hasLink ? Link2Off : Link2}
              title={hasLink ? 'Remove link' : 'Add link'}
              active={hasLink}
              onMouseDown={handleLinkClick}
            />
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
