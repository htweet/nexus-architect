/**
 * useDataBindStore — Runtime MVC state for the Nexus Data-Bind system.
 *
 * Holds live variable values that drive reactive canvas updates.
 * This store is intentionally EPHEMERAL — values are never serialized to
 * the page JSON. Only NexusVariable.defaultValue persists to disk.
 *
 * The store is initialized (or re-initialized) by calling initFromPage()
 * whenever a page is loaded into the canvas or a variable's defaultValue
 * is changed in the Variable Editor.
 *
 * Auto-injected system variables (prefixed "__"):
 *   __loading_<stepId>  — set true/false around Action Node webhook calls
 *   __role              — current viewer's role (set by RLS layer in Phase VAE-2)
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { NexusVariable, NexusRuntimeValues } from '../types/dataBind.js';

// ─── State ────────────────────────────────────────────────────────────────────

interface DataBindState {
  /**
   * Live variable values keyed by NexusVariable.id.
   * Includes user-defined variables AND system "__" variables.
   */
  values: NexusRuntimeValues;

  /**
   * Snapshot of the variable definitions loaded from the page.
   * Used by the resolver to look up type info and fallback defaults.
   */
  variables: NexusVariable[];

  /** True while initFromPage() is running (prevents mid-init flicker). */
  isInitializing: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface DataBindActions {
  /**
   * (Re-)initialize the runtime store from a page's variable definitions.
   * Resets ALL user-defined values to their defaultValue.
   * System "__" variables are preserved across re-inits.
   * Call this whenever a page is loaded or a defaultValue changes.
   */
  initFromPage: (variables: NexusVariable[]) => void;

  /**
   * Set a single variable value by ID.
   * Respects the `readonly` flag — silently ignores mutations to readonly vars.
   * @param id  — NexusVariable.id
   * @param value — new value (type coercion is handled by the resolver)
   */
  setVariable: (id: string, value: unknown) => void;

  /**
   * Set a system variable (e.g. __loading_<stepId>, __role).
   * Bypasses the readonly check — system vars are always writable by the engine.
   */
  setSystemVariable: (key: string, value: unknown) => void;

  /**
   * Read the current resolved value for a variable.
   * Falls back to defaultValue if the runtime value is undefined.
   * Returns undefined if no variable with that ID exists.
   */
  getResolved: (id: string) => unknown;

  /**
   * Reset all user-defined variables to their defaultValue.
   * System "__" variables are not affected.
   */
  resetToDefaults: () => void;

  /** Remove all runtime state. Called on canvas clear. */
  clearAll: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export type DataBindStore = DataBindState & DataBindActions;

export const useDataBindStore = create<DataBindStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // ── Initial State ─────────────────────────────────────────────────────
      values: {},
      variables: [],
      isInitializing: false,

      // ── Actions ───────────────────────────────────────────────────────────

      initFromPage: (variables) => {
        // Preserve any system "__" vars already in the store
        const existing = get().values;
        const systemVars: NexusRuntimeValues = {};
        for (const [k, v] of Object.entries(existing)) {
          if (k.startsWith('__')) systemVars[k] = v;
        }

        // Build fresh value map from defaultValues
        const userVars: NexusRuntimeValues = {};
        for (const v of variables) {
          userVars[v.id] = v.defaultValue;
        }

        set(
          { variables, values: { ...userVars, ...systemVars }, isInitializing: false },
          false,
          'dataBind/initFromPage',
        );
      },

      setVariable: (id, value) => {
        const variable = get().variables.find((v) => v.id === id);
        // Silently ignore mutations to readonly variables
        if (variable?.readonly) return;

        set(
          (s) => ({ values: { ...s.values, [id]: value } }),
          false,
          'dataBind/setVariable',
        );
      },

      setSystemVariable: (key, value) =>
        set(
          (s) => ({ values: { ...s.values, [key]: value } }),
          false,
          'dataBind/setSystemVariable',
        ),

      getResolved: (id) => {
        const { values, variables } = get();
        if (id in values) return values[id];
        // Fall back to defaultValue from the variable definition
        return variables.find((v) => v.id === id)?.defaultValue;
      },

      resetToDefaults: () => {
        const { variables, values } = get();
        const systemVars: NexusRuntimeValues = {};
        for (const [k, v] of Object.entries(values)) {
          if (k.startsWith('__')) systemVars[k] = v;
        }
        const userVars: NexusRuntimeValues = {};
        for (const v of variables) {
          userVars[v.id] = v.defaultValue;
        }
        set(
          { values: { ...userVars, ...systemVars } },
          false,
          'dataBind/resetToDefaults',
        );
      },

      clearAll: () =>
        set({ values: {}, variables: [], isInitializing: false }, false, 'dataBind/clearAll'),
    })),
    { name: 'NexusDataBindStore' },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Get the current runtime value for a variable ID (with defaultValue fallback). */
export const selectVariableValue = (id: string) => (s: DataBindStore) => {
  if (id in s.values) return s.values[id];
  return s.variables.find((v) => v.id === id)?.defaultValue;
};

/** Get all NexusVariable definitions. */
export const selectVariables = (s: DataBindStore) => s.variables;

/** Get a single NexusVariable definition by ID. */
export const selectVariable = (id: string) => (s: DataBindStore) =>
  s.variables.find((v) => v.id === id) ?? null;

/** Get the live values map (all variables including system). */
export const selectAllValues = (s: DataBindStore) => s.values;

/**
 * Get a named-key values map for token interpolation in text widgets.
 * Keys are NexusVariable.name (slug), not id — supports {variable_name} syntax.
 */
export const selectNamedValues = (s: DataBindStore): Record<string, unknown> => {
  const named: Record<string, unknown> = {};
  for (const variable of s.variables) {
    const val = variable.id in s.values ? s.values[variable.id] : variable.defaultValue;
    named[variable.name] = val;
  }
  return named;
};
