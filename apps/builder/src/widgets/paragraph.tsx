/**
 * Paragraph widget — rich body text with inline editing.
 *
 * Phase 3 upgrade:
 *   • Double-click enters edit mode
 *   • FloatingTextToolbar on text selection (bold, italic, underline, links, alignment)
 *   • Stores both props.text (plain) and props.html (rich)
 *
 * VAE Task 143: uses useNodeProps for data-bind resolution.
 */

import { memo, useRef, useCallback, useEffect } from 'react';
import { AlignLeft } from 'lucide-react';
import { useCanvasStore, useSelectionStore, useNodeProps } from '@nexus/core';
import { InspectorInput, InspectorSection, getVisualNodeStyles } from './shared';
import { FloatingTextToolbar } from '@/components/canvas/FloatingTextToolbar';
import { pushHistory } from '@/lib/history';
import type { WidgetDefinition, WidgetRendererProps, WidgetInspectorProps } from './registry';

export interface ParagraphProps {
  text:       string;
  html:       string;
  align:      'left' | 'center' | 'right' | 'justify';
  color:      string;
  fontSize:   string;
  fontWeight: string;
  lineHeight: string;
  maxWidth:   string;
}

const DEFAULTS: ParagraphProps = {
  text:       'Add your paragraph text here. Double-click to edit with rich formatting.',
  html:       '',
  align:      'left',
  color:      'inherit',
  fontSize:   '1rem',
  fontWeight: '400',
  lineHeight: '1.7',
  maxWidth:   '',
};

const ParagraphRenderer = memo(function ParagraphRenderer({ nodeId, isPreview }: WidgetRendererProps) {
  const node         = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update       = useCanvasStore((s) => s.updateNodeProps);
  const editingNodeId= useSelectionStore((s) => s.editingNodeId);
  const setEditing   = useSelectionStore((s) => s.setEditingNode);
  const ref          = useRef<HTMLParagraphElement>(null);
  const isEditing    = editingNodeId === nodeId && !isPreview;

  // VAE: resolved props with data-bind support
  const resolvedProps = useNodeProps(nodeId);
  const p = { ...DEFAULTS, ...(resolvedProps as Partial<ParagraphProps>) };

  if (!node) return null;

  const visualOverrides = getVisualNodeStyles(node.styles?.base as Record<string, string>);

  const sharedStyle: React.CSSProperties = {
    textAlign:  p.align as React.CSSProperties['textAlign'],
    color:      p.color,
    fontSize:   p.fontSize,
    fontWeight: p.fontWeight,
    lineHeight: p.lineHeight,
    maxWidth:   p.maxWidth || undefined,
    ...visualOverrides, // RightPanel Style tab wins
  };

  // Enter edit mode: load stored HTML and focus
  useEffect(() => {
    if (!isEditing || !ref.current) return;
    const el = ref.current;
    el.innerHTML = p.html || p.text;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [isEditing]);

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
      ref.current?.blur();
    }
  }, []);

  // Display mode
  if (!isEditing) {
    if (isPreview || !p.html) {
      return (
        <p className="w-full" style={sharedStyle}>
          {p.text}
        </p>
      );
    }
    return (
      <p
        className="w-full"
        style={sharedStyle}
        dangerouslySetInnerHTML={{ __html: p.html }}
      />
    );
  }

  // Edit mode
  return (
    <>
      <p
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full outline-none cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
        data-placeholder="Type paragraph…"
        style={sharedStyle}
      />
      <FloatingTextToolbar containerRef={ref as React.RefObject<HTMLElement>} />
    </>
  );
});

function ParagraphInspector({ nodeId }: WidgetInspectorProps) {
  const node   = useCanvasStore((s) => s.page?.nodeMap?.[nodeId]);
  const update = useCanvasStore((s) => s.updateNodeProps);

  if (!node) return null;

  const p = { ...DEFAULTS, ...(node.props as Partial<ParagraphProps>) };

  return (
    <div className="px-3 pb-3 flex flex-col gap-2.5">
      <InspectorSection label="Content" />
      <InspectorInput
        label="Text"
        value={p.text}
        onChange={(v) => update(nodeId, { text: v, html: v })}
        placeholder="Paragraph text…"
      />
      <p className="text-[11px] leading-relaxed px-0.5" style={{ color: '#bbcabf' }}>
        Double-click the text on the canvas to edit inline with rich formatting. Use the <strong style={{ color: '#dde4dd' }}>Style</strong> tab for typography, colour, and spacing.
      </p>
    </div>
  );
}

export const ParagraphWidget: WidgetDefinition = {
  type:         'paragraph',
  label:        'Text',
  icon:         AlignLeft,
  category:     'content',
  defaultProps: DEFAULTS as unknown as Record<string, unknown>,
  keywords:     ['text', 'paragraph', 'body', 'copy', 'prose'],
  Renderer:     ParagraphRenderer,
  Inspector:    ParagraphInspector,
};
