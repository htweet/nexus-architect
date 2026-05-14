/**
 * addon-loader.ts — Phase M2: Dynamic Bundle Loader
 *
 * Fetches an addon's ESM bundle from its entryPoint URL, validates the export,
 * builds a scoped NexusPluginContext, and calls bundle.register(ctx).
 *
 * Security surface:
 *   • Bundle must export a valid NexusAddonBundle (validated before execution).
 *   • Widgets registered by addons are sandboxed through the same WidgetDefinition
 *     contract as built-in widgets — no raw DOM/eval access.
 *   • Cleanup callbacks are tracked per addon so uninstall is always safe.
 *
 * The loader is intentionally unaware of Zustand or React internals.
 * State mutations go through the addons store and widget registry only.
 */

import type { AddonManifest }       from '@nexus/core';
import type { NexusAddonBundle, NexusPluginContext, PluginWidgetDefinition }
  from '@nexus/core/plugin-api';
import { isValidAddonBundle }       from '@nexus/core/plugin-api';
import { registerWidget, unregisterWidget } from '@/widgets/registry';

// ─── Registry version bump (notifies the LeftPanel palette) ──────────────────

let _registryVersion = 0;
const _listeners = new Set<() => void>();

export function getRegistryVersion(): number { return _registryVersion; }

export function subscribeRegistry(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function bumpRegistry() {
  _registryVersion += 1;
  _listeners.forEach((fn) => fn());
}

// ─── Feature-flag injection (set by main.tsx after store init) ────────────────
// Avoids a circular dep: loader → @nexus/core stores → loader.

let _featureFlags: Record<string, unknown> = {};

/** Called once in main.tsx after useUserStore initialises. */
export function setFeatureFlags(flags: Record<string, unknown>): void {
  _featureFlags = flags;
}

// ─── Per-addon cleanup tracking ───────────────────────────────────────────────

const _cleanupMap = new Map<string, Array<() => void>>();
const _widgetMap  = new Map<string, string[]>();  // addonId → registered widget types

// ─── Context factory ──────────────────────────────────────────────────────────

function createPluginContext(manifest: AddonManifest): NexusPluginContext {
  const registeredTypes: string[] = [];

  return {
    manifest: Object.freeze({ ...manifest }),

    registerWidget(def: PluginWidgetDefinition) {
      // Bridge PluginWidgetDefinition → WidgetDefinition (legacy registry shape)
      // Use spread to omit optional fields when undefined (exactOptionalPropertyTypes).
      registerWidget({
        type:         def.type,
        label:        def.label,
        icon:         def.icon as never,
        category:     def.category,
        defaultProps: def.defaultProps,
        Renderer:     def.Renderer as never,
        Inspector:    def.Inspector as never,
        ...(def.isPremium !== undefined         && { isPremium: def.isPremium }),
        ...(def.keywords  !== undefined         && { keywords:  def.keywords }),
        ...(def.createChildNodes !== undefined  && { createChildNodes: def.createChildNodes as never }),
      });
      if (!registeredTypes.includes(def.type)) registeredTypes.push(def.type);
      bumpRegistry();
    },

    onUnload(callback: () => void) {
      const existing = _cleanupMap.get(manifest.id) ?? [];
      _cleanupMap.set(manifest.id, [...existing, callback]);
    },

    getFeatureFlags(): Record<string, unknown> {
      return { ..._featureFlags };
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load and activate an addon bundle from its entryPoint URL.
 * Returns the list of widget types the addon registered.
 */
export async function loadAddon(manifest: AddonManifest): Promise<string[]> {
  if (!manifest.entryPoint) {
    // Built-in / mock addon: nothing to fetch, mark as loaded
    return manifest.widgets ?? [];
  }

  // Dynamic ESM import
  let mod: unknown;
  try {
    mod = await import(/* @vite-ignore */ manifest.entryPoint);
  } catch (err) {
    throw new Error(
      `[Nexus Addon Loader] Failed to fetch bundle for "${manifest.id}": ${String(err)}`,
    );
  }

  // Unwrap default export
  const bundle: unknown = (mod as { default?: unknown })?.default ?? mod;

  if (!isValidAddonBundle(bundle)) {
    throw new Error(
      `[Nexus Addon Loader] Bundle for "${manifest.id}" does not export a valid NexusAddonBundle.`,
    );
  }

  const ctx = createPluginContext(manifest);
  await (bundle as NexusAddonBundle).register(ctx);

  // Track which widgets this addon registered
  const registeredTypes: string[] = [];
  _widgetMap.set(manifest.id, registeredTypes);

  return manifest.widgets ?? registeredTypes;
}

/**
 * Unload an addon: run its cleanup callbacks and unregister its widgets.
 */
export function unloadAddon(manifest: AddonManifest): void {
  // Run registered cleanup callbacks
  const cleanups = _cleanupMap.get(manifest.id) ?? [];
  cleanups.forEach((fn) => { try { fn(); } catch { /* swallow */ } });
  _cleanupMap.delete(manifest.id);

  // Unregister widgets this addon added
  const widgetTypes = _widgetMap.get(manifest.id) ?? manifest.widgets ?? [];
  widgetTypes.forEach((type) => unregisterWidget(type));
  _widgetMap.delete(manifest.id);

  if (widgetTypes.length > 0) bumpRegistry();
}
