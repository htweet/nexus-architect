/**
 * Heading widget — h1–h6 with inline rich-text editing.
 *
 * Phase 3 upgrade:
 *   • Double-click enters edit mode (editingNodeId set in SelectionStore)
 *   • While editing: FloatingTextToolbar appears on text selection
 *   • Stores both plain text (props.text) and rich HTML (props.html)
 *   • Display-mode renders stored HTML via dangerouslySetInnerHTML for
 *     preserved bold/italic/link formatting
 *   • Escape or click-outside exits edit mode and saves
 */

import { memo, useRef, useCallback, useEffect } from 'react';
import { Heading1 } from 'lucide-react';
import { useCanvasStore, useSelectionStore } from '@nexus/core';
import { InspectorInput, InspectorSelect, InspectorSection, getVisualNodeStyles } from './shared';
import { FloatingTextToolbar } from '@/components/canvas/FloatingTextToolbar';
import { pushHistory } from '@/lib/history';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

// ─── Default props ────────────────────────────────────────────────────────────

export interface HeadingProps {
  text:          string;
  html:          string;   // rich HTML, fallback to text if empty
  level:         'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  align:         'left' | 'center' | 'right';
  color:         string;
  fontSize:      string;
  fontWeight:    string;
  lineHeight:    string;
  letterSpacing: string;
}

const DEFAULTS: HeadingProps = {
  text:          'Your Heading',
  html:          '',
  level:         'h2',
  align:         'left',
  color:         'inherit',
  fontSize:      '',
  fontWeight:    '700',
  lineHeight:    '1.2',
  letterSpacing: '-0.02em',
};

const LEVEL_SIZES: Record<HeadingProps['level'], string> = {
  h1: '2.5rem', h2: '2rem', h3: '1.5rem',
  h4: '1.25rem', h5: '1.125rem', h6: '1rem',
};

// ─── Renderer ────────────────────────────────────────────────────────────────

const HeadingRenderer = memo(function HeadingRenderer({ nodeId, isPreview }: WidgetRendererProps) {
  const node         = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update       = useCanvasStore((s) => s.updateNodeProps);
  const editingNodeId= useSelectionStore((s) => s.editingNodeId);
  const setEditing   = useSelectionStore((s) => s.setEditingNode);
  const ref          = useRef<HTMLElement>(null);
  const isEditing    = editingNodeId === nodeId && !isPreview;

  if (!node) return null;

  const p   = { ...DEFAULTS, ...(node.props as Partial<HeadingProps>) };
  const Tag = p.level;

  // Merge RightPanel style overrides (node.styles.base) on top of prop defaults.
  // getVisualNodeStyles filters out layout-only props (margin, padding, etc.)
  // to prevent doubling with the CanvasNodeWrapper wrapper styles.
  const visualOverrides = getVisualNodeStyles(node.styles?.base as Record<string, string>);

  const sharedStyle: React.CSSProperties = {
    textAlign:     p.align,
    color:         p.color,
    fontSize:      p.fontSize || LEVEL_SIZES[p.level],
    fontWeight:    p.fontWeight,
    lineHeight:    p.lineHeight,
    letterSpacing: p.letterSpacing,
    ...visualOverrides, // RightPanel Style tab wins
  };

  // ── Enter edit mode: focus + place cursor at end ──────────────────────────
  useEffect(() => {
    if (!isEditing || !ref.current) return;
    const el = ref.current;
    // Set HTML content from stored value
    el.innerHTML = p.html || p.text;
    el.focus();
    // Move cursor to end
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [isEditing]); // run only when isEditing flips

  // ── Save on blur ─────────────────────────────────────────────────────────
  const handleBlur = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    const text = ref.current.innerText;
    pushHistory('Edit Text');
    update(nodeId, { text, html });
    setEditing(null);
  }, [nodeId, update, setEditing]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      ref.current?.blur(); // triggers handleBlur → saves + exits
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ref.current?.blur();
    }
  }, []);

  // ── Display mode (not editing) ────────────────────────────────────────────
  if (!isEditing) {
    const displayContent = p.html || p.text;
    if (isPreview || !p.html) {
      // plain text or preview: safe render
      return (
        <Tag className="w-full" style={sharedStyle}>
          {p.text}
        </Tag>
      );
    }
    // Rich HTML display
    return (
      <Tag
        className="w-full"
        style={sharedStyle}
        dangerouslySetInnerHTML={{ __html: displayContent }}
      />
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  return (
    <>
      <Tag
        ref={ref as React.RefObject<HTMLHeadingElement>}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full outline-none cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
        data-placeholder="Type heading…"
        style={sharedStyle}
      />
      <FloatingTextToolbar containerRef={ref as React.RefObject<HTMLElement>} />
    </>
  );
});

// ─── Inspector ────────────────────────────────────────────────────────────────

function HeadingInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);

  if (!node) return null;

  const p   = { ...DEFAULTS, ...(node.props as Partial<HeadingProps>) };

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Content" />
      <InspectorInput
        label="Text"
        value={p.text}
        onChange={(v) => update(nodeId, { text: v, html: v })}
        placeholder="Heading text…"
      />
      <InspectorSelect
        label="Level"
        value={p.level}
        options={(['h1','h2','h3','h4','h5','h6'] as HeadingProps['level'][]).map(l => ({ value: l, label: l.toUpperCase() }))}
        onChange={(v) => update(nodeId, { level: v })}
      />
      <p className="text-[11px] leading-relaxed px-0.5" style={{ color: '#bbcabf' }}>
        Double-click the heading on the canvas to edit text inline. Use the <strong style={{ color: '#dde4dd' }}>Style</strong> tab to configure typography, colour, and spacing.
      </p>
    </div>
  );
}

// ─── Definition ───────────────────────────────────────────────────────────────

export const HeadingWidget: WidgetDefinition = {
  type:         'heading',
  label:        'Heading',
  icon:         Heading1,
  category:     'content',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['h1', 'h2', 'h3', 'title', 'headline', 'text'],
  Renderer:     HeadingRenderer,
  Inspector:    HeadingInspector,
};
