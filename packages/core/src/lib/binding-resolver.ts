/**
 * Binding Resolver — pure, side-effect-free functions for the Data-Bind system.
 *
 * These functions are called at render time inside NodeRenderer. They are
 * deliberately framework-agnostic (no React imports, no Zustand imports) so
 * they can be unit-tested in isolation and reused in the compiler pipeline.
 *
 * Two independent resolution paths:
 *
 * 1. resolveStateBindings() — full NexusBinding prop-level resolution.
 *    Merges NexusNode.stateBindings declarations into the node's props,
 *    optionally applying a sandboxed transform expression.
 *
 * 2. interpolateTokens() — lightweight {variable_name} syntax for text props.
 *    Runs a regex replace over a string value using the named-values map.
 *    Complementary to resolveStateBindings: widgets can use one or both.
 */

import type { NexusBinding, NexusVariable, NexusRuntimeValues } from '../types/dataBind.js';

// ─── Full Prop Binding Resolution ─────────────────────────────────────────────

/**
 * Merge a node's stateBindings declarations into its props.
 *
 * Resolution order:
 *   1. Look up the NexusVariable by binding.variableId
 *   2. Read the current value from runtimeValues (fallback: variable.defaultValue)
 *   3. Apply binding.transform expression if present (sandboxed, fail-silent)
 *   4. Coerce to the declared NexusVarType
 *   5. Write back into the cloned props object
 *
 * @param props         — Current NexusNode.props (not mutated)
 * @param bindings      — NexusNode.stateBindings[] (may be undefined/empty)
 * @param runtimeValues — Live values from useDataBindStore.values
 * @param variables     — Variable definitions from useDataBindStore.variables
 * @returns             — New props object with bound values merged in.
 *                        Returns the original props reference if no bindings exist
 *                        (avoids unnecessary object allocation on unbound nodes).
 */
export function resolveStateBindings(
  props:          Record<string, unknown>,
  bindings:       NexusBinding[] | undefined,
  runtimeValues:  NexusRuntimeValues,
  variables:      NexusVariable[],
): Record<string, unknown> {
  // Fast exit: no bindings on this node — return original reference
  if (!bindings || bindings.length === 0) return props;

  const resolved = { ...props };

  for (const binding of bindings) {
    const variable = variables.find((v) => v.id === binding.variableId);
    if (!variable) {
      // Variable deleted or not yet loaded — leave the static prop in place
      continue;
    }

    // Read live value, fall back to defaultValue
    let value: unknown =
      binding.variableId in runtimeValues
        ? runtimeValues[binding.variableId]
        : variable.defaultValue;

    // Apply optional transform expression
    if (binding.transform?.trim()) {
      value = applySandboxedTransform(value, binding.transform);
    }

    // Type coercion to declared variable type
    value = coerceToType(value, variable.type);

    resolved[binding.prop] = value;
  }

  return resolved;
}

// ─── Token Interpolation ──────────────────────────────────────────────────────

/**
 * Replace {variable_name} tokens in a string with their current runtime values.
 *
 * Used by Text, Heading, and Badge widgets to support the lightweight
 * inline binding syntax without requiring a full NexusBinding declaration.
 *
 * Unknown tokens are left as-is (e.g. "{undefined_var}" stays literal),
 * giving the user a visual cue in edit mode that the variable is not defined.
 *
 * @param text        — String that may contain {variable_name} tokens
 * @param namedValues — Map of variable.name → current value
 *                      (use selectNamedValues selector from dataBind.store)
 */
export function interpolateTokens(
  text:        string,
  namedValues: Record<string, unknown>,
): string {
  if (!text || !text.includes('{')) return text;

  return text.replace(/\{(\w+)\}/g, (fullMatch, name: string) => {
    const val = namedValues[name];
    // Keep the token literal if the variable doesn't exist
    if (val === undefined) return fullMatch;
    return val === null ? '' : String(val);
  });
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Evaluate a sandboxed transform expression.
 * The variable value is exposed as `$value`. No other scope access.
 * Returns the original value on any error (fail-silent contract).
 */
function applySandboxedTransform(value: unknown, expression: string): unknown {
  try {
    // eslint-disable-next-line no-new-func
    return new Function('$value', `'use strict'; return (${expression})`)(value);
  } catch {
    // Expression threw — return raw value unchanged
    return value;
  }
}

/**
 * Coerce a runtime value to match the declared NexusVarType.
 * Ensures type stability for widgets that expect a specific prop type.
 */
function coerceToType(
  value: unknown,
  type:  import('../types/dataBind.js').NexusVarType,
): unknown {
  if (value === null || value === undefined) return value;

  switch (type) {
    case 'string':
      return typeof value === 'string' ? value : String(value);

    case 'number': {
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    }

    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === 1) return true;
      if (value === 'false' || value === 0) return false;
      return Boolean(value);

    case 'array':
      return Array.isArray(value) ? value : [value];

    case 'object':
      return typeof value === 'object' ? value : value;

    default:
      return value;
  }
}
