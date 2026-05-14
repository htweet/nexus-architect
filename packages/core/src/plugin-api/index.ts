/**
 * Nexus Architect — Plugin API Contract
 *
 * Every addon bundle must export a default object conforming to NexusAddonBundle.
 * The builder creates a NexusPluginContext per addon and passes it to register().
 * Addons NEVER touch Zustand stores or React internals directly.
 *
 * Decoupled by design: this package has zero UI/WP dependencies.
 * When the SaaS phase ships, this contract is identical — only the delivery
 * mechanism for bundles changes (CDN vs WP media upload).
 */

import type { ComponentType } from 'react';
import type { AddonManifest } from '../types/addon.js';

// ─── Widget definition exposed to addon authors ───────────────────────────────

export type PluginWidgetCategory = 'layout' | 'content' | 'media' | 'interactive';

export interface PluginWidgetDefinition {
  /** Must be globally unique — use reverse-DNS: "com.mycompany.mywidget" */
  type: string;
  label: string;
  /** Lucide icon component (or any React component used as an icon). */
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  category: PluginWidgetCategory;
  defaultProps: Record<string, unknown>;
  isPremium?: boolean;
  keywords?: string[];
  /** Canvas renderer — receives { nodeId, isPreview? } */
  Renderer: ComponentType<{ nodeId: string; isPreview?: boolean }>;
  /** Right-panel inspector — receives { nodeId } */
  Inspector: ComponentType<{ nodeId: string }>;
  /** Optional child nodes to auto-create on drop */
  createChildNodes?: (props: Record<string, unknown>) => Array<{
    type: string;
    label?: string;
    props: Record<string, unknown>;
    children?: unknown[];
  }>;
}

// ─── Plugin Context (injected by the builder into each addon) ─────────────────

export interface NexusPluginContext {
  /** Addon manifest (read-only). */
  readonly manifest: Readonly<AddonManifest>;
  /**
   * Register a widget so it appears in the Elements palette and can be
   * dropped onto the canvas. Calling this multiple times for the same type
   * is idempotent — the last definition wins.
   */
  registerWidget(def: PluginWidgetDefinition): void;
  /**
   * Register a cleanup callback invoked when the addon is deactivated or
   * uninstalled. Use this to tear down event listeners, etc.
   */
  onUnload(callback: () => void): void;
  /** Current feature flags — read-only snapshot at registration time. */
  getFeatureFlags(): Record<string, unknown>;
}

// ─── Addon Bundle (the module an addon author exports as default) ─────────────

export interface NexusAddonBundle {
  /** Must match the manifest id in the remote catalogue. */
  readonly manifest: Pick<AddonManifest, 'id' | 'name' | 'version'>;
  /**
   * Called once when the addon is installed/activated.
   * All side effects (widget registration, etc.) go here.
   * May return a Promise for async initialisation.
   */
  register(ctx: NexusPluginContext): void | Promise<void>;
}

// ─── Validation helper ────────────────────────────────────────────────────────

export function isValidAddonBundle(obj: unknown): obj is NexusAddonBundle {
  if (!obj || typeof obj !== 'object') return false;
  const b = obj as Record<string, unknown>;
  return (
    typeof b['manifest'] === 'object' &&
    typeof b['register'] === 'function'
  );
}
