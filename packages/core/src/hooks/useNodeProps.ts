/**
 * useNodeProps — Selective Data-Bind subscription hook.
 *
 * Replaces the pattern `node.props` in widget renderers with a version
 * that is reactive to NexusVariable runtime values. Only subscribes to
 * the variable IDs declared in node.stateBindings — a heading bound to
 * "cart_total" will NOT re-render when "user_name" changes.
 *
 * Returns the raw node.props reference when no bindings are declared
 * (zero overhead for unbound nodes).
 */

import { useMemo, useCallback } from 'react';
import { useCanvasStore }       from '../store/canvas.store.js';
import { useDataBindStore }     from '../store/dataBind.store.js';
import { resolveStateBindings, interpolateTokens } from '../lib/binding-resolver.js';
import { shallow }              from 'zustand/shallow';

/**
 * Get the fully-resolved props for a node.
 *
 * Resolution order:
 *   1. node.props (static values from canvas store)
 *   2. NexusBinding overrides (from stateBindings + runtime values)
 *   3. interpolateTokens on all string prop values
 *
 * @param nodeId - The node whose props to resolve
 * @returns Resolved props merged with any active bindings
 */
export function useNodeProps(nodeId: string): Record<string, unknown> {
  // ── 1. Read the node from canvas store (stable selector) ───────────────
  const node = useCanvasStore(
    useCallback((s) => s.page?.nodeMap?.[nodeId], [nodeId]),
  );

  // ── 2. Extract bound variable IDs for selective subscription ───────────
  const boundVariableIds = useMemo(
    () => node?.stateBindings?.map((b) => b.variableId) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [node?.stateBindings],
  );

  // ── 3. Subscribe only to the variables this node actually uses ──────────
  const { runtimeValues, variables, namedValues } = useDataBindStore(
    useCallback(
      (s) => {
        if (boundVariableIds.length === 0) {
          // Fast path: no bindings — return empty object (stable reference)
          return { runtimeValues: s.values, variables: s.variables, namedValues: {} as Record<string, unknown> };
        }

        // Build a subset of values keyed by the bound variable IDs
        const subset: Record<string, unknown> = {};
        for (const id of boundVariableIds) {
          subset[id] = id in s.values ? s.values[id] : s.variables.find(v => v.id === id)?.defaultValue;
        }

        // Named values for {token} interpolation
        const named: Record<string, unknown> = {};
        for (const variable of s.variables) {
          const val = variable.id in s.values ? s.values[variable.id] : variable.defaultValue;
          named[variable.name] = val;
        }

        return { runtimeValues: subset, variables: s.variables, namedValues: named };
      },
      [boundVariableIds],
    ),
    shallow,
  );

  // ── 4. Resolve bindings → merged props ─────────────────────────────────
  return useMemo(() => {
    if (!node) return {};

    const rawProps = node.props;

    // No bindings — check for inline {token} interpolation in string props
    if (!node.stateBindings || node.stateBindings.length === 0) {
      if (Object.keys(namedValues).length === 0) return rawProps;
      // Interpolate string props only
      const interpolated: Record<string, unknown> = {};
      let changed = false;
      for (const [key, val] of Object.entries(rawProps)) {
        if (typeof val === 'string' && val.includes('{')) {
          const result = interpolateTokens(val, namedValues);
          interpolated[key] = result;
          if (result !== val) changed = true;
        } else {
          interpolated[key] = val;
        }
      }
      return changed ? interpolated : rawProps;
    }

    // Full binding resolution
    const resolved = resolveStateBindings(
      rawProps,
      node.stateBindings,
      runtimeValues,
      variables,
    );

    // Also interpolate any remaining string props
    if (Object.keys(namedValues).length === 0) return resolved;
    const interpolated: Record<string, unknown> = {};
    let changed = false;
    for (const [key, val] of Object.entries(resolved)) {
      if (typeof val === 'string' && val.includes('{')) {
        const result = interpolateTokens(val, namedValues);
        interpolated[key] = result;
        if (result !== val) changed = true;
      } else {
        interpolated[key] = val;
      }
    }
    return changed ? interpolated : resolved;

  }, [node, runtimeValues, variables, namedValues]);
}
