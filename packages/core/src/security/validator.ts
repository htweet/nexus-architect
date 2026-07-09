/**
 * Security Validator — Phase 9.2
 *
 * Zero-dependency schema validator for NexusNode and NexusPage objects.
 * Runs before every save/publish operation to prevent:
 *   - Prototype pollution via __proto__ keys in node props
 *   - Oversized payloads (DoS via extremely deep/wide trees)
 *   - XSS via script-bearing strings in text/html props
 *   - Invalid type values that could crash the renderer
 *
 * Architecture note:
 *   Validation is ADDITIVE — it never mutates the page data; it only
 *   returns a typed ValidationResult. Consumers decide how to handle
 *   failures (show warning, block save, log to Sentry, etc.).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid:    boolean;
  errors:   ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path:    string;
  code:    ValidationErrorCode;
  message: string;
}

export interface ValidationWarning {
  path:    string;
  message: string;
}

export type ValidationErrorCode =
  | 'INVALID_TYPE'
  | 'MISSING_REQUIRED'
  | 'PROTOTYPE_POLLUTION'
  | 'XSS_DETECTED'
  | 'DEPTH_EXCEEDED'
  | 'SIZE_EXCEEDED'
  | 'INVALID_NODE_ID'
  | 'CIRCULAR_REFERENCE';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_TREE_DEPTH    = 32;
const MAX_NODE_COUNT    = 2000;
const MAX_PROP_LENGTH   = 50_000;   // characters per prop value
const MAX_JSON_SIZE     = 2_000_000; // 2 MB total page JSON

// Dangerous keys that indicate prototype pollution attempts
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// XSS detection patterns — covers the most common injection vectors
const XSS_PATTERNS: RegExp[] = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,         // onerror=, onclick=, etc.
  /data\s*:\s*text\/html/i,
  /vbscript\s*:/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /expression\s*\(/i,   // CSS expression()
];

// Valid node ID format: "node-" followed by alphanumeric chars + hyphens
const NODE_ID_RE = /^(root|node-[a-z0-9_-]{4,40})$/;

// ── XSS helpers ───────────────────────────────────────────────────────────────

function containsXss(value: string): boolean {
  return XSS_PATTERNS.some((re) => re.test(value));
}

function checkString(
  value: string,
  path: string,
  errors: ValidationError[],
): void {
  if (value.length > MAX_PROP_LENGTH) {
    errors.push({
      path,
      code: 'SIZE_EXCEEDED',
      message: `String prop at "${path}" exceeds ${MAX_PROP_LENGTH} characters`,
    });
  }
  if (containsXss(value)) {
    errors.push({
      path,
      code: 'XSS_DETECTED',
      message: `Potential XSS payload detected at "${path}"`,
    });
  }
}

// ── Object key safety ─────────────────────────────────────────────────────────

function checkObjectKeys(
  obj: Record<string, unknown>,
  path: string,
  errors: ValidationError[],
): void {
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(key)) {
      errors.push({
        path: `${path}.${key}`,
        code: 'PROTOTYPE_POLLUTION',
        message: `Dangerous key "${key}" detected at "${path}"`,
      });
    }
  }
}

// ── Recursive prop validator ──────────────────────────────────────────────────

function validateProps(
  props: unknown,
  path: string,
  depth: number,
  errors: ValidationError[],
): void {
  if (depth > MAX_TREE_DEPTH) {
    errors.push({ path, code: 'DEPTH_EXCEEDED', message: `Props nesting too deep at "${path}"` });
    return;
  }
  if (props === null || props === undefined) return;
  if (typeof props === 'string') { checkString(props, path, errors); return; }
  if (typeof props !== 'object') return;
  if (Array.isArray(props)) {
    (props as unknown[]).forEach((item, i) =>
      validateProps(item, `${path}[${i}]`, depth + 1, errors));
    return;
  }
  const obj = props as Record<string, unknown>;
  checkObjectKeys(obj, path, errors);
  for (const [key, value] of Object.entries(obj)) {
    validateProps(value, `${path}.${key}`, depth + 1, errors);
  }
}

// ── Node validator ────────────────────────────────────────────────────────────

function validateNode(
  node: unknown,
  path: string,
  visitedIds: Set<string>,
  errors: ValidationError[],
  warnings: ValidationWarning[],
  depth: number,
): void {
  if (depth > MAX_TREE_DEPTH) {
    errors.push({ path, code: 'DEPTH_EXCEEDED', message: `Tree depth exceeded at "${path}"` });
    return;
  }
  if (!node || typeof node !== 'object') {
    errors.push({ path, code: 'INVALID_TYPE', message: `Node at "${path}" is not an object` });
    return;
  }
  const n = node as Record<string, unknown>;

  // Required fields
  if (typeof n.id !== 'string' || !n.id) {
    errors.push({ path: `${path}.id`, code: 'MISSING_REQUIRED', message: 'Node.id is required' });
  } else {
    if (!NODE_ID_RE.test(n.id)) {
      warnings.push({ path: `${path}.id`, message: `Non-standard node id format: "${n.id}"` });
    }
    if (visitedIds.has(n.id)) {
      errors.push({ path: `${path}.id`, code: 'CIRCULAR_REFERENCE', message: `Duplicate node id: "${n.id}"` });
    } else {
      visitedIds.add(n.id as string);
    }
  }

  if (typeof n.type !== 'string' || !n.type) {
    errors.push({ path: `${path}.type`, code: 'MISSING_REQUIRED', message: 'Node.type is required' });
  }

  // Prototype pollution on node itself
  checkObjectKeys(n, path, errors);

  // Props validation — most likely XSS vector
  if (n.props) {
    validateProps(n.props, `${path}.props`, 0, errors);
  }

  // Styles validation
  if (n.styles) {
    validateProps(n.styles, `${path}.styles`, 0, errors);
  }
}

// ── Page validator (main export) ──────────────────────────────────────────────

export function validatePage(page: unknown): ValidationResult {
  const errors:   ValidationError[]   = [];
  const warnings: ValidationWarning[] = [];

  if (!page || typeof page !== 'object') {
    errors.push({ path: 'page', code: 'INVALID_TYPE', message: 'Page is not an object' });
    return { valid: false, errors, warnings };
  }

  const p = page as Record<string, unknown>;

  // Size guard — prevent processing absurdly large payloads
  try {
    const json = JSON.stringify(page);
    if (json.length > MAX_JSON_SIZE) {
      errors.push({
        path: 'page',
        code: 'SIZE_EXCEEDED',
        message: `Page JSON exceeds ${MAX_JSON_SIZE / 1000} KB limit`,
      });
      return { valid: false, errors, warnings };
    }
  } catch {
    errors.push({ path: 'page', code: 'INVALID_TYPE', message: 'Page is not JSON-serialisable' });
    return { valid: false, errors, warnings };
  }

  // Required page fields
  if (typeof p.id !== 'string' || !p.id) {
    errors.push({ path: 'page.id', code: 'MISSING_REQUIRED', message: 'Page.id is required' });
  }
  if (typeof p.rootNodeId !== 'string') {
    errors.push({ path: 'page.rootNodeId', code: 'MISSING_REQUIRED', message: 'Page.rootNodeId is required' });
  }
  if (!p.nodeMap || typeof p.nodeMap !== 'object') {
    errors.push({ path: 'page.nodeMap', code: 'MISSING_REQUIRED', message: 'Page.nodeMap is required' });
    return { valid: false, errors, warnings };
  }

  // Prototype pollution at page level
  checkObjectKeys(p, 'page', errors);

  const nodeMap = p.nodeMap as Record<string, unknown>;
  const nodeCount = Object.keys(nodeMap).length;

  if (nodeCount > MAX_NODE_COUNT) {
    errors.push({
      path: 'page.nodeMap',
      code: 'SIZE_EXCEEDED',
      message: `Page contains ${nodeCount} nodes (max ${MAX_NODE_COUNT})`,
    });
    return { valid: false, errors, warnings };
  }

  const visitedIds = new Set<string>();
  let nodeIndex = 0;

  for (const [nodeId, node] of Object.entries(nodeMap)) {
    validateNode(node, `page.nodeMap[${nodeId}]`, visitedIds, errors, warnings, 0);
    nodeIndex++;
    // Safety exit if error count explodes (malicious payload)
    if (errors.length > 50) {
      warnings.push({ path: 'page', message: `Validation stopped after 50 errors (${nodeIndex}/${nodeCount} nodes checked)` });
      break;
    }
  }

  return {
    valid:  errors.length === 0,
    errors,
    warnings,
  };
}

// ── Quick guard (throws on failure) ──────────────────────────────────────────

/**
 * Convenience wrapper — throws a descriptive error if the page is invalid.
 * Use in save/publish pipelines where you want fail-fast behaviour.
 */
export function assertPageValid(page: unknown): void {
  const result = validatePage(page);
  if (!result.valid) {
    const summary = result.errors.slice(0, 5).map((e) => e.message).join('; ');
    throw new Error(`[NexusValidator] Invalid page data: ${summary}`);
  }
}
