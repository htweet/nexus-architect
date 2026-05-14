/**
 * Widget Registry — Central map of widget type → WidgetDefinition.
 *
 * Widgets register themselves at app boot (via widgets/index.ts).
 * The canvas renderer and left panel both query this registry at runtime.
 * This file has zero React/WP imports — it's a pure data structure.
 */

import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { NexusWidget } from '@nexus/core';

// ─── Category ────────────────────────────────────────────────────────────────

export type WidgetCategory = 'layout' | 'content' | 'media' | 'interactive';

export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string }[] = [
  { id: 'layout',      label: 'Layout' },
  { id: 'content',     label: 'Content' },
  { id: 'media',       label: 'Media' },
  { id: 'interactive', label: 'Interactive' },
];

// ─── Props passed to every Renderer ─────────────────────────────────────────

export interface WidgetRendererProps {
  nodeId: string;
  /** True when rendering the published/preview version (no chrome). */
  isPreview?: boolean | undefined;
}

// ─── Props passed to every Inspector (right panel) ──────────────────────────

export interface WidgetInspectorProps {
  nodeId: string;
}

// ─── Full widget definition ──────────────────────────────────────────────────

/** Describes a child node to auto-create when a widget is first dropped. */
export interface ChildNodeSpec {
  type: string;
  label?: string;
  props: Record<string, unknown>;
  /** Nested children to create inside this child. */
  children?: ChildNodeSpec[];
}

export interface WidgetDefinition {
  /** Unique string key — matches NexusNode.type. */
  type: string;
  label: string;
  icon: LucideIcon;
  category: WidgetCategory;
  /** Props applied when a new node of this type is created. */
  defaultProps: Record<string, unknown>;
  isPremium?: boolean;
  keywords?: string[];
  /**
   * Optional: return child node specs to auto-create inside this widget on drop.
   * Receives the resolved defaultProps so column count etc. can be read.
   */
  createChildNodes?: (props: Record<string, unknown>) => ChildNodeSpec[];
  /** Canvas renderer component. */
  Renderer: ComponentType<WidgetRendererProps>;
  /** Right-panel inspector component. */
  Inspector: ComponentType<WidgetInspectorProps>;
}

// ─── Registry map ────────────────────────────────────────────────────────────

const _registry = new Map<string, WidgetDefinition>();

export function registerWidget(def: WidgetDefinition): void {
  _registry.set(def.type, def);
}

/** Dynamically remove a widget (called by addon-loader on uninstall). */
export function unregisterWidget(type: string): void {
  _registry.delete(type);
}

export function getWidget(type: string): WidgetDefinition | undefined {
  return _registry.get(type);
}

export function getAllWidgets(): WidgetDefinition[] {
  return Array.from(_registry.values());
}

export function getWidgetsByCategory(cat: WidgetCategory): WidgetDefinition[] {
  return getAllWidgets().filter((w) => w.category === cat);
}

// ─── NexusWidget bridge ──────────────────────────────────────────────────────
// Allows a NexusWidget (new API) to be registered in the legacy WidgetDefinition
// registry so the canvas renderer can render it without modification.
// The RightPanel uses SchemaContentTab when getNexusWidget() finds a match —
// the NoOpInspector below is never rendered.

function NoOpInspector() { return null; }

/**
 * Register a NexusWidget into the legacy WidgetDefinition registry.
 * Pair with registerNexusWidget() from @nexus/core to register in both.
 */
export function bridgeNexusWidget(def: NexusWidget): void {
  const categoryMap: Record<string, WidgetCategory> = {
    layout:      'layout',
    content:     'content',
    media:       'media',
    interactive: 'interactive',
    form:        'interactive',
    data:        'content',
  };
  const category: WidgetCategory = categoryMap[def.metadata.category] ?? 'content';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shim: any = {
    type:         def.type,
    label:        def.metadata.label,
    icon:         def.metadata.icon,
    category,
    defaultProps: def.defaultConfig,
    Renderer:     def.component,
    Inspector:    NoOpInspector,
  };
  if (def.metadata.isPremium !== undefined) shim.isPremium = def.metadata.isPremium;
  if (def.metadata.keywords)               shim.keywords   = def.metadata.keywords;
  if (def.createChildNodes)                shim.createChildNodes = def.createChildNodes;
  registerWidget(shim as WidgetDefinition);
}
