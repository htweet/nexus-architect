/**
 * useDynamicStyles — The Nexus Dynamic Style Parser.
 *
 * Translates a widget's config.styles JSON object into a memoized
 * React CSSProperties object. Supports the full Flexbox and CSS Grid
 * spec plus spacing, color, and typography primitives.
 *
 * Usage inside any widget renderer:
 *   const style = useDynamicStyles(node.props.styles);
 *   return <div style={style}>…</div>;
 *
 * The hook is fully typed and memoized — it only re-computes when the
 * serialized styles string changes, preventing unnecessary re-renders.
 */

import { useMemo } from 'react';
import type { CSSProperties } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Raw JSON style map as stored in node.props.styles */
export type StylesJson = Record<string, string | number | undefined>;

// ─── Allowed props whitelist ───────────────────────────────────────────────────

/**
 * Properties that map 1:1 from camelCase JSON key → CSS property.
 * We whitelist to prevent arbitrary CSS injection.
 */
const PASSTHROUGH_PROPS = new Set<string>([
  // Box model
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  // Spacing
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'paddingInline', 'paddingBlock',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'marginInline', 'marginBlock',
  // Flexbox
  'display', 'flexDirection', 'flexWrap', 'justifyContent', 'alignItems',
  'alignContent', 'alignSelf', 'justifySelf', 'flex', 'flexGrow',
  'flexShrink', 'flexBasis', 'order',
  // CSS Grid
  'gridTemplateColumns', 'gridTemplateRows', 'gridTemplateAreas',
  'gridColumn', 'gridRow', 'gridArea',
  'gridAutoFlow', 'gridAutoColumns', 'gridAutoRows',
  'justifyItems', 'placeItems', 'placeContent', 'placeSelf',
  // Shared
  'gap', 'rowGap', 'columnGap',
  // Position
  'position', 'top', 'right', 'bottom', 'left', 'zIndex',
  // Visual
  'background', 'backgroundColor', 'backgroundImage', 'backgroundSize',
  'backgroundPosition', 'backgroundRepeat',
  'color', 'opacity', 'visibility', 'overflow', 'overflowX', 'overflowY',
  // Border
  'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
  'borderWidth', 'borderStyle', 'borderColor', 'borderRadius',
  'borderTopLeftRadius', 'borderTopRightRadius',
  'borderBottomLeftRadius', 'borderBottomRightRadius',
  'outline',
  // Typography
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
  'lineHeight', 'letterSpacing', 'textAlign', 'textDecoration',
  'textTransform', 'whiteSpace', 'wordBreak',
  // Effects
  'boxShadow', 'textShadow', 'transform', 'transition',
  'filter', 'backdropFilter', 'mixBlendMode',
  // Cursor
  'cursor', 'pointerEvents', 'userSelect',
  // Aspect
  'aspectRatio', 'objectFit', 'objectPosition',
]);

// ─── Shorthand expanders ───────────────────────────────────────────────────────

/**
 * Accept shorthand aliases the designer may use, and expand them to the
 * canonical CSS property name expected by React.
 */
const ALIASES: Record<string, string> = {
  // Shorthand aliases
  bg:           'backgroundColor',
  bgColor:      'backgroundColor',
  fDirection:   'flexDirection',
  fWrap:        'flexWrap',
  justify:      'justifyContent',
  align:        'alignItems',
  cols:         'gridTemplateColumns',
  rows:         'gridTemplateRows',
  fSize:        'fontSize',
  fWeight:      'fontWeight',
  lHeight:      'lineHeight',
  lSpacing:     'letterSpacing',
  p:            'padding',
  px:           'paddingInline',
  py:           'paddingBlock',
  m:            'margin',
  mx:           'marginInline',
  my:           'marginBlock',
  radius:       'borderRadius',
  shadow:       'boxShadow',
  // Grid shorthand helpers (repeat syntax)
  // e.g. cols: "3" → "repeat(3, 1fr)"
};

/**
 * Auto-expand numeric "cols" / "rows" values to repeat syntax.
 * "3" → "repeat(3, 1fr)"
 */
function expandGridTemplate(value: string | number): string {
  const s = String(value).trim();
  // Pure integer → repeat(N, 1fr)
  if (/^\d+$/.test(s)) return `repeat(${s}, 1fr)`;
  return s;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useDynamicStyles(stylesJson: StylesJson | undefined): CSSProperties {
  // Stable serialization for memo dependency
  const key = stylesJson ? JSON.stringify(stylesJson) : '';

  return useMemo<CSSProperties>(() => {
    if (!stylesJson || Object.keys(stylesJson).length === 0) return {};

    const result: CSSProperties = {};

    for (const [rawKey, rawValue] of Object.entries(stylesJson)) {
      if (rawValue === undefined || rawValue === '') continue;

      // Resolve alias
      const key = ALIASES[rawKey] ?? rawKey;

      // Validate against whitelist
      if (!PASSTHROUGH_PROPS.has(key)) continue;

      // Grid template expansion
      if (key === 'gridTemplateColumns' || key === 'cols') {
        (result as Record<string, unknown>).gridTemplateColumns = expandGridTemplate(rawValue);
        continue;
      }
      if (key === 'gridTemplateRows' || key === 'rows') {
        (result as Record<string, unknown>).gridTemplateRows = expandGridTemplate(rawValue);
        continue;
      }

      // Safe assignment
      (result as Record<string, unknown>)[key] = rawValue;
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
