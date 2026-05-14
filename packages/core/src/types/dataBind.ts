/**
 * Nexus Data-Bind — Visual MVC State Management types.
 *
 * Distinct from the existing `dynamic-data.ts` (which handles WordPress post
 * data / ACF / WooCommerce bindings). This module owns the canvas-local
 * reactive state system: user-defined variables + per-node prop bindings that
 * update the canvas in real-time via useDataBindStore.
 *
 * Design principles:
 *  - NexusVariable definitions are persisted in PageDocument.variables[]
 *  - Runtime values live exclusively in useDataBindStore (never serialized)
 *  - NexusBinding declarations are stored on NexusNode.stateBindings[]
 *  - The binding resolver is a pure function — no side effects, memoizable
 */

// ─── Variable Definition ──────────────────────────────────────────────────────

/** Scalar and composite types supported for canvas state variables. */
export type NexusVarType = 'string' | 'number' | 'boolean' | 'array' | 'object';

/**
 * A user-defined canvas state variable. Persisted in PageDocument.variables[].
 * The `id` (nanoid) is the stable reference — renaming a variable only updates
 * `label`, never breaks existing NexusBinding declarations.
 */
export interface NexusVariable {
  /** Stable nanoid reference key. Never changes after creation. */
  id: string;

  /** Machine-safe slug e.g. "cart_total". Slugified from label on creation. */
  name: string;

  /** Human-readable display name shown in the Variable Editor panel. */
  label: string;

  /** Declared type — used for coercion in the resolver and UI type hints. */
  type: NexusVarType;

  /**
   * Persisted default value. Loaded into the runtime store on page init.
   * Changing this in the editor triggers a store reset via initFromPage().
   */
  defaultValue: unknown;

  /** Optional description shown as a tooltip in the Variable Editor. */
  description?: string;

  /**
   * When true the variable cannot be mutated by Action Node steps from the
   * canvas. Useful for server-injected values (auth tokens, user roles).
   */
  readonly?: boolean;
}

// ─── Node Binding Declaration ─────────────────────────────────────────────────

/**
 * A declaration stored on NexusNode.stateBindings[] that maps a specific
 * widget prop to a NexusVariable. The resolver reads this at render time
 * and replaces the static prop value with the live runtime variable value.
 *
 * Named `stateBindings` on NexusNode to prevent any collision with the
 * existing DynamicDataStore.bindings (WordPress data source bindings).
 */
export interface NexusBinding {
  /**
   * The widget prop key being overridden, e.g. "text", "value", "src".
   * Must match a key in NexusNode.props.
   */
  prop: string;

  /** ID of the NexusVariable providing the value. */
  variableId: string;

  /**
   * Optional stateless JS expression applied to the resolved value before
   * passing it to the widget. The variable value is available as `$value`.
   * Examples: "$value.toFixed(2)", "String($value).toUpperCase()"
   * Evaluated inside a sandboxed Function — no closures, no cross-variable
   * references. Fails silently: raw value used if expression throws.
   */
  transform?: string;
}

// ─── Runtime Value Map ────────────────────────────────────────────────────────

/**
 * Shape of the live runtime values map in useDataBindStore.
 * Keys are NexusVariable.id values; values are the current (mutable) state.
 * This object is NEVER persisted — it is always reconstructed from
 * PageDocument.variables[].defaultValue on page load.
 */
export type NexusRuntimeValues = Record<string, unknown>;
