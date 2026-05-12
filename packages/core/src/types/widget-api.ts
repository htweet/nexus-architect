/**
 * widget-api.ts — NexusWidget Registration API types
 *
 * This is the "Brain" of Nexus Architect. Every widget (built-in or plugin)
 * self-describes via a NexusWidget definition. The settingsSchema array drives
 * the dynamic RightPanel control renderer — no hand-written Inspector needed.
 *
 * Architecture note: These types are platform-agnostic. No WP globals, no React
 * imports at the type level. The ComponentType import is the only React surface.
 */

import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

// ─── Widget category ──────────────────────────────────────────────────────────

export type NexusWidgetCategory = 'layout' | 'content' | 'media' | 'interactive' | 'form' | 'data';

// ─── Metadata ─────────────────────────────────────────────────────────────────

export interface NexusWidgetMetadata {
  /** Human-readable name shown in the widget panel. */
  label: string;
  /** Lucide icon for the widget panel + layers panel. */
  icon: LucideIcon;
  /** Panel category this widget appears under. */
  category: NexusWidgetCategory;
  /** Optional description shown on hover in the panel. */
  description?: string;
  /** Keywords for the widget search / spotlight. */
  keywords?: string[];
  /** Gate this widget behind the premium flag. */
  isPremium?: boolean;
}

// ─── Renderer props ───────────────────────────────────────────────────────────

export interface NexusRendererProps {
  nodeId: string;
  isPreview?: boolean;
}

// ─── Control schemas ──────────────────────────────────────────────────────────

interface BaseControl {
  /** Must be unique within this widget's settingsSchema. Maps to node.props key. */
  id: string;
  /** Label shown above the control in the properties panel. */
  label: string;
  /** Optional helper text shown below the control. */
  hint?: string;
}

export interface TextControl extends BaseControl {
  type: 'text';
  placeholder?: string;
  /** Render a <textarea> instead of <input>. */
  multiline?: boolean;
  inputType?: 'text' | 'url' | 'email' | 'password' | 'tel';
}

export interface NumberControl extends BaseControl {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
  /** Unit shown as suffix, e.g. "px", "%", "ms". */
  unit?: string;
}

export interface SelectControl extends BaseControl {
  type: 'select';
  options: { value: string; label: string }[];
}

export interface ToggleControl extends BaseControl {
  type: 'toggle';
  options: { value: string; label: string }[];
}

export interface ColorControl extends BaseControl {
  type: 'color';
  allowTransparent?: boolean;
}

export interface SwitchControl extends BaseControl {
  type: 'switch';
  /** Label when ON. Defaults to "On". */
  onLabel?: string;
  /** Label when OFF. Defaults to "Off". */
  offLabel?: string;
}

export interface SliderControl extends BaseControl {
  type: 'slider';
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

export interface ImageControl extends BaseControl {
  type: 'image';
}

export interface GroupControl extends BaseControl {
  type: 'group';
  /** Nested controls inside this collapsible group. */
  controls: ControlSchema[];
  /** Start collapsed. Defaults to false. */
  collapsed?: boolean;
}

/** Union of all supported control schema types. */
export type ControlSchema =
  | TextControl
  | NumberControl
  | SelectControl
  | ToggleControl
  | ColorControl
  | SwitchControl
  | SliderControl
  | ImageControl
  | GroupControl;

// ─── Child node spec ──────────────────────────────────────────────────────────

export interface NexusChildNodeSpec {
  type: string;
  label?: string;
  props: Record<string, unknown>;
  children?: NexusChildNodeSpec[];
}

// ─── NexusWidget — the full registration contract ────────────────────────────

export interface NexusWidget {
  /** Unique string key — matches NexusNode.type. */
  type: string;
  /** Display metadata for panels and toolbars. */
  metadata: NexusWidgetMetadata;
  /** Props applied when a new node of this type is created. */
  defaultConfig: Record<string, unknown>;
  /**
   * Canvas renderer component.
   * Must accept NexusRendererProps. Should be wrapped in React.memo.
   */
  component: ComponentType<NexusRendererProps>;
  /**
   * Schema-driven settings — drives the dynamic RightPanel Content tab.
   * Order defines render order. Use GroupControl for collapsible sections.
   * Leave empty [] to hide the Content tab entirely.
   */
  settingsSchema: ControlSchema[];
  /**
   * Optional: return child node specs to auto-create inside this widget on drop.
   * Receives the resolved defaultConfig so column count etc. can be read.
   */
  createChildNodes?: (config: Record<string, unknown>) => NexusChildNodeSpec[];
}
