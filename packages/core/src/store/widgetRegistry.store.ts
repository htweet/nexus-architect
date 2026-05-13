/**
 * widgetRegistry.store.ts — Zustand-powered Widget Registry
 *
 * Single Source of Truth for all registered NexusWidgets.
 * Both the Left Panel (widget palette) and Right Panel (schema renderer)
 * query this store at runtime.
 *
 * Design: Pure Zustand with no React/WP dependencies at module level.
 * Widgets self-register at app boot (widgets/index.ts calls registerNexusWidget).
 */

import { create } from 'zustand';
import type { NexusWidget, NexusWidgetCategory } from '../types/widget-api.js';

// ─── Store shape ──────────────────────────────────────────────────────────────

interface WidgetRegistryState {
  /** Internal map: type string → NexusWidget definition. */
  _map: Map<string, NexusWidget>;

  /**
   * Register a widget. Calling with the same type again replaces the previous
   * definition — useful for hot-module-replacement during development.
   */
  registerNexusWidget: (def: NexusWidget) => void;

  /** Look up a single widget by type string. Returns undefined if not found. */
  getNexusWidget: (type: string) => NexusWidget | undefined;

  /** All registered widgets as an ordered array (registration order). */
  getAllNexusWidgets: () => NexusWidget[];

  /** Filter by category — handy for the Left Panel palette groups. */
  getNexusWidgetsByCategory: (cat: NexusWidgetCategory) => NexusWidget[];
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useWidgetRegistry = create<WidgetRegistryState>((set, get) => ({
  _map: new Map(),

  registerNexusWidget(def) {
    set((state) => {
      const next = new Map(state._map);
      next.set(def.type, def);
      return { _map: next };
    });
  },

  getNexusWidget(type) {
    return get()._map.get(type);
  },

  getAllNexusWidgets() {
    return Array.from(get()._map.values());
  },

  getNexusWidgetsByCategory(cat) {
    return get()
      .getAllNexusWidgets()
      .filter((w) => w.metadata.category === cat);
  },
}));

// ─── Convenience singleton accessors (outside React) ────────────────────────

/**
 * Register a NexusWidget from module scope (no hook needed).
 * Call this in widgets/index.ts alongside registerWidget().
 */
export function registerNexusWidget(def: NexusWidget): void {
  useWidgetRegistry.getState().registerNexusWidget(def);
}

/** Read a widget definition outside a React component. */
export function getNexusWidget(type: string): NexusWidget | undefined {
  return useWidgetRegistry.getState().getNexusWidget(type);
}

export function getAllNexusWidgets(): NexusWidget[] {
  return useWidgetRegistry.getState().getAllNexusWidgets();
}
