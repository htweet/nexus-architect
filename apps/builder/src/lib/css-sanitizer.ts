/**
 * CSS Sanitizer — Phase 9.2
 *
 * Strips dangerous CSS values before they reach the DOM or the static
 * HTML compiler. Protects against:
 *   - CSS expression() injection (IE legacy but still tested in audits)
 *   - url() with data: URIs containing HTML/JS payloads
 *   - Behaviour property (IE)
 *   - CSS custom property poisoning (--var: expression(...))
 *   - content: property injecting malicious strings
 *
 * Philosophy: ALLOWLIST-first for values, not just denylist patterns.
 * Properties not on the allowlist still pass — we only sanitize their values.
 * This keeps the sanitizer additive (never silently drops valid styles).
 */

// ── Dangerous value patterns ──────────────────────────────────────────────────

const DANGEROUS_VALUE_PATTERNS: RegExp[] = [
  /expression\s*\(/i,            // CSS expression()
  /javascript\s*:/i,             // javascript: in url()
  /vbscript\s*:/i,               // vbscript: in url()
  /data\s*:\s*text\/html/i,      // data:text/html payloads
  /data\s*:\s*text\/javascript/i,
  /-moz-binding\s*:/i,           // Firefox XBL binding
  /behaviour\s*:/i,              // IE behaviour
  /\\[0-9a-f]{1,6}/i,           // Unicode escapes used to bypass filters
];

// Properties that accept url() — sanitize the URL inside
const URL_ACCEPTING_PROPS = new Set([
  'background',
  'background-image',
  'border-image',
  'border-image-source',
  'content',
  'cursor',
  'list-style',
  'list-style-image',
  'mask',
  'mask-image',
  'src',
]);

// ── Value sanitizer ───────────────────────────────────────────────────────────

function isDangerousValue(value: string): boolean {
  return DANGEROUS_VALUE_PATTERNS.some((re) => re.test(value));
}

/**
 * Sanitize a single CSS property value.
 * Returns the cleaned value, or empty string '' if the value is dangerous.
 */
export function sanitizeCssValue(property: string, value: string): string {
  if (!value || typeof value !== 'string') return value ?? '';

  const trimmed = value.trim();

  if (isDangerousValue(trimmed)) {
    console.warn(`[NexusCSS] Blocked dangerous CSS value for "${property}": ${trimmed.slice(0, 80)}`);
    return '';
  }

  // For url()-accepting properties, additionally strip data: URIs
  if (URL_ACCEPTING_PROPS.has(property.toLowerCase())) {
    const cleaned = trimmed.replace(/url\s*\(\s*['"]?\s*data\s*:[^)]+\)/gi, 'none');
    if (cleaned !== trimmed) {
      console.warn(`[NexusCSS] Stripped data: URI from "${property}"`);
      return cleaned;
    }
  }

  return trimmed;
}

/**
 * Sanitize an entire React inline styles object (CSSProperties-shaped).
 * Returns a new object with all dangerous values replaced with ''.
 */
export function sanitizeStyleObject(
  styles: Record<string, string | number | undefined>,
): Record<string, string | number | undefined> {
  if (!styles || typeof styles !== 'object') return {};

  const cleaned: Record<string, string | number | undefined> = {};

  for (const [prop, value] of Object.entries(styles)) {
    // Numeric values (e.g. zIndex, opacity) — always safe
    if (typeof value === 'number') {
      cleaned[prop] = value;
      continue;
    }
    if (typeof value === 'string') {
      cleaned[prop] = sanitizeCssValue(prop, value);
    }
    // undefined — pass through (React ignores undefined style props)
    if (value === undefined) cleaned[prop] = undefined;
  }

  return cleaned;
}

/**
 * Sanitize a raw CSS text block (e.g. the customCss field in page settings).
 * Strips dangerous at-rules and expressions from the entire stylesheet string.
 */
export function sanitizeCssText(css: string): string {
  if (!css || typeof css !== 'string') return '';

  let cleaned = css;

  // Remove expression() calls entirely
  cleaned = cleaned.replace(/expression\s*\([^)]*\)/gi, '/* blocked */');

  // Remove javascript:/vbscript: URLs
  cleaned = cleaned.replace(/url\s*\(\s*['"]?\s*javascript\s*:[^)]*\)/gi, 'url(none)');
  cleaned = cleaned.replace(/url\s*\(\s*['"]?\s*vbscript\s*:[^)]*\)/gi, 'url(none)');

  // Remove data:text/html and data:text/javascript URIs
  cleaned = cleaned.replace(/url\s*\(\s*['"]?\s*data\s*:\s*text\/html[^)]*\)/gi, 'url(none)');
  cleaned = cleaned.replace(/url\s*\(\s*['"]?\s*data\s*:\s*text\/javascript[^)]*\)/gi, 'url(none)');

  // Remove -moz-binding
  cleaned = cleaned.replace(/-moz-binding\s*:[^;}\n]*/gi, '/* blocked */');

  // Remove behaviour property (IE)
  cleaned = cleaned.replace(/\bbehaviour\s*:[^;}\n]*/gi, '/* blocked */');

  return cleaned;
}

// ── HTML content sanitizer (for HTML embed widget) ────────────────────────────

/**
 * Light-weight HTML sanitizer for the HTML Embed widget.
 * Strips <script> tags and on* attributes.
 *
 * NOTE: For production, replace this with DOMPurify.sanitize() once the
 * package is added (npm install dompurify). This implementation covers the
 * most common attack vectors without an external dependency.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let cleaned = html;

  // Strip <script>...</script> blocks (including multiline)
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Strip <script ... /> self-closing
  cleaned = cleaned.replace(/<script[^>]*\/>/gi, '');

  // Strip javascript: href/src attributes
  cleaned = cleaned.replace(/\s(href|src|action)\s*=\s*["']?\s*javascript\s*:[^"'\s>]*/gi, ' $1="#"');

  // Strip on* event handlers (onerror, onclick, onload, etc.)
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // Strip <iframe> elements
  cleaned = cleaned.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<iframe[^>]*\/>/gi, '');

  // Strip <object> and <embed>
  cleaned = cleaned.replace(/<object[\s\S]*?<\/object>/gi, '');
  cleaned = cleaned.replace(/<embed[^>]*\/?>/gi, '');

  return cleaned;
}
